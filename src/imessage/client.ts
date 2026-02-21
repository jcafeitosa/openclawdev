import type { RuntimeEnv } from "../runtime.js";
import { resolveUserPath } from "../utils.js";
import { DEFAULT_IMESSAGE_PROBE_TIMEOUT_MS } from "./constants.js";

export type IMessageRpcError = {
  code?: number;
  message?: string;
  data?: unknown;
};

export type IMessageRpcResponse<T> = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: T;
  error?: IMessageRpcError;
  method?: string;
  params?: unknown;
};

export type IMessageRpcNotification = {
  method: string;
  params?: unknown;
};

export type IMessageRpcClientOptions = {
  cliPath?: string;
  dbPath?: string;
  runtime?: RuntimeEnv;
  onNotification?: (msg: IMessageRpcNotification) => void;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer?: NodeJS.Timeout;
};

// Minimal structural type for the imsg subprocess.
type ImsgProcess = {
  stdin: { write: (data: string) => unknown; end?: () => void } | null;
  stdout: ReadableStream<Uint8Array> | null | number;
  stderr: ReadableStream<Uint8Array> | null | number;
  exited: Promise<number | null>;
  exitCode: number | null;
  signalCode: NodeJS.Signals | null;
  kill: (signal?: NodeJS.Signals | number) => void;
};

function isTestEnv(): boolean {
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  const vitest = process.env.VITEST?.trim().toLowerCase();
  return Boolean(vitest);
}

/**
 * Read lines from a ReadableStream and call onLine for each non-empty line.
 */
async function readLines(
  stream: ReadableStream<Uint8Array> | null | number,
  onLine: (line: string) => void,
): Promise<void> {
  if (!(stream instanceof ReadableStream)) {
    return;
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        onLine(part);
      }
    }
    if (buffer) {
      onLine(buffer);
    }
  } catch {
    // Stream closed.
  } finally {
    reader.releaseLock();
  }
}

export class IMessageRpcClient {
  private readonly cliPath: string;
  private readonly dbPath?: string;
  private readonly runtime?: RuntimeEnv;
  private readonly onNotification?: (msg: IMessageRpcNotification) => void;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly closed: Promise<void>;
  private closedResolve: (() => void) | null = null;
  private child: ImsgProcess | null = null;
  private nextId = 1;

  constructor(opts: IMessageRpcClientOptions = {}) {
    this.cliPath = opts.cliPath?.trim() || "imsg";
    this.dbPath = opts.dbPath?.trim() ? resolveUserPath(opts.dbPath) : undefined;
    this.runtime = opts.runtime;
    this.onNotification = opts.onNotification;
    this.closed = new Promise((resolve) => {
      this.closedResolve = resolve;
    });
  }

  async start(): Promise<void> {
    if (this.child) {
      return;
    }
    if (isTestEnv()) {
      throw new Error("Refusing to start imsg rpc in test environment; mock iMessage RPC client");
    }
    const args = ["rpc"];
    if (this.dbPath) {
      args.push("--db", this.dbPath);
    }
    const proc = Bun.spawn([this.cliPath, ...args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    this.child = proc;

    // Read stdout line by line (fire-and-forget).
    void readLines(proc.stdout, (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      this.handleLine(trimmed);
    });

    // Log stderr lines (fire-and-forget).
    void readLines(proc.stderr, (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      this.runtime?.error?.(`imsg rpc: ${trimmed}`);
    });

    // Handle process exit.
    void proc.exited.then((code) => {
      const signal = proc.signalCode;
      if (code !== 0 && code !== null) {
        const reason = signal ? `signal ${signal}` : `code ${code}`;
        this.failAll(new Error(`imsg rpc exited (${reason})`));
      } else {
        this.failAll(new Error("imsg rpc closed"));
      }
      this.closedResolve?.();
    });
  }

  async stop(): Promise<void> {
    if (!this.child) {
      return;
    }
    const proc = this.child;
    this.child = null;

    try {
      proc.stdin?.end?.();
    } catch {
      // ignore
    }

    await Promise.race([
      this.closed,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          try {
            proc.kill("SIGTERM");
          } catch {
            // ignore
          }
          resolve();
        }, 500);
      }),
    ]);
  }

  async waitForClose(): Promise<void> {
    await this.closed;
  }

  async request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    opts?: { timeoutMs?: number },
  ): Promise<T> {
    if (!this.child || !this.child.stdin) {
      throw new Error("imsg rpc not running");
    }
    const id = this.nextId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    };
    const line = `${JSON.stringify(payload)}\n`;
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_IMESSAGE_PROBE_TIMEOUT_MS;

    const response = new Promise<T>((resolve, reject) => {
      const key = String(id);
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              this.pending.delete(key);
              reject(new Error(`imsg rpc timeout (${method})`));
            }, timeoutMs)
          : undefined;
      this.pending.set(key, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
    });

    this.child.stdin.write(line);
    return await response;
  }

  private handleLine(line: string) {
    let parsed: IMessageRpcResponse<unknown>;
    try {
      parsed = JSON.parse(line) as IMessageRpcResponse<unknown>;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.runtime?.error?.(`imsg rpc: failed to parse ${line}: ${detail}`);
      return;
    }

    if (parsed.id !== undefined && parsed.id !== null) {
      const key = String(parsed.id);
      const pending = this.pending.get(key);
      if (!pending) {
        return;
      }
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      this.pending.delete(key);

      if (parsed.error) {
        const baseMessage = parsed.error.message ?? "imsg rpc error";
        const details = parsed.error.data;
        const code = parsed.error.code;
        const suffixes = [] as string[];
        if (typeof code === "number") {
          suffixes.push(`code=${code}`);
        }
        if (details !== undefined) {
          const detailText =
            typeof details === "string" ? details : JSON.stringify(details, null, 2);
          if (detailText) {
            suffixes.push(detailText);
          }
        }
        const msg = suffixes.length > 0 ? `${baseMessage}: ${suffixes.join(" ")}` : baseMessage;
        pending.reject(new Error(msg));
        return;
      }
      pending.resolve(parsed.result);
      return;
    }

    if (parsed.method) {
      this.onNotification?.({
        method: parsed.method,
        params: parsed.params,
      });
    }
  }

  private failAll(err: Error) {
    for (const [key, pending] of this.pending.entries()) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.reject(err);
      this.pending.delete(key);
    }
  }
}

export async function createIMessageRpcClient(
  opts: IMessageRpcClientOptions = {},
): Promise<IMessageRpcClient> {
  const client = new IMessageRpcClient(opts);
  await client.start();
  return client;
}
