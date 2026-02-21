import type { RuntimeEnv } from "../runtime.js";

export type SignalDaemonOpts = {
  cliPath: string;
  account?: string;
  httpHost: string;
  httpPort: number;
  receiveMode?: "on-start" | "manual";
  ignoreAttachments?: boolean;
  ignoreStories?: boolean;
  sendReadReceipts?: boolean;
  runtime?: RuntimeEnv;
};

export type SignalDaemonHandle = {
  pid?: number;
  stop: () => void;
};

export function classifySignalCliLogLine(line: string): "log" | "error" | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  // signal-cli commonly writes all logs to stderr; treat severity explicitly.
  if (/\b(ERROR|WARN|WARNING)\b/.test(trimmed)) {
    return "error";
  }
  // Some signal-cli failures are not tagged with WARN/ERROR but should still be surfaced loudly.
  if (/\b(FAILED|SEVERE|EXCEPTION)\b/i.test(trimmed)) {
    return "error";
  }
  return "log";
}

async function consumeAndLogStream(params: {
  stream: ReadableStream<Uint8Array> | number | null;
  log: (message: string) => void;
  error: (message: string) => void;
}): Promise<void> {
  if (!(params.stream instanceof ReadableStream)) {
    return;
  }
  const reader = params.stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        const kind = classifySignalCliLogLine(line);
        if (kind === "log") {
          params.log(`signal-cli: ${line.trim()}`);
        } else if (kind === "error") {
          params.error(`signal-cli: ${line.trim()}`);
        }
      }
    }
    // Flush any remaining buffered line.
    if (buffer.trim()) {
      const kind = classifySignalCliLogLine(buffer);
      if (kind === "log") {
        params.log(`signal-cli: ${buffer.trim()}`);
      } else if (kind === "error") {
        params.error(`signal-cli: ${buffer.trim()}`);
      }
    }
  } catch {
    // Stream closed or cancelled — nothing to do.
  } finally {
    reader.releaseLock();
  }
}

function buildDaemonArgs(opts: SignalDaemonOpts): string[] {
  const args: string[] = [];
  if (opts.account) {
    args.push("-a", opts.account);
  }
  args.push("daemon");
  args.push("--http", `${opts.httpHost}:${opts.httpPort}`);
  args.push("--no-receive-stdout");

  if (opts.receiveMode) {
    args.push("--receive-mode", opts.receiveMode);
  }
  if (opts.ignoreAttachments) {
    args.push("--ignore-attachments");
  }
  if (opts.ignoreStories) {
    args.push("--ignore-stories");
  }
  if (opts.sendReadReceipts) {
    args.push("--send-read-receipts");
  }

  return args;
}

export function spawnSignalDaemon(opts: SignalDaemonOpts): SignalDaemonHandle {
  const args = buildDaemonArgs(opts);
  const log = opts.runtime?.log ?? (() => {});
  const error = opts.runtime?.error ?? (() => {});

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn([opts.cliPath, ...args], {
      stdin: null,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err) {
    error(`signal-cli spawn error: ${String(err)}`);
    return { pid: undefined, stop: () => {} };
  }

  void consumeAndLogStream({ stream: proc.stdout ?? null, log, error });
  void consumeAndLogStream({ stream: proc.stderr ?? null, log, error });

  let stopped = false;
  return {
    pid: proc.pid,
    stop: () => {
      if (!stopped) {
        stopped = true;
        try {
          proc.kill("SIGTERM");
        } catch {}
      }
    },
  };
}
