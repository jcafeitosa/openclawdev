import { killProcessTree } from "../../kill-tree.js";
import type { ManagedRunStdin } from "../types.js";
import { toStringEnv } from "./env.js";

function resolveCommand(command: string): string {
  if (process.platform !== "win32") {
    return command;
  }
  const lower = command.toLowerCase();
  if (lower.endsWith(".exe") || lower.endsWith(".cmd") || lower.endsWith(".bat")) {
    return command;
  }
  const basename = lower.split(/[\\/]/).pop() ?? lower;
  if (basename === "npm" || basename === "pnpm" || basename === "yarn" || basename === "npx") {
    return `${command}.cmd`;
  }
  return command;
}

/**
 * Read chunks from a ReadableStream and call onChunk for each decoded string.
 */
async function readStreamChunks(
  stream: ReadableStream<Uint8Array> | null | number,
  onChunk: (chunk: string) => void,
): Promise<void> {
  if (!(stream instanceof ReadableStream)) {
    return;
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      onChunk(decoder.decode(value, { stream: true }));
    }
  } catch {
    // Stream closed.
  } finally {
    reader.releaseLock();
  }
}

export type ChildAdapter = {
  pid?: number;
  stdin?: ManagedRunStdin;
  onStdout: (listener: (chunk: string) => void) => void;
  onStderr: (listener: (chunk: string) => void) => void;
  wait: () => Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  kill: (signal?: NodeJS.Signals) => void;
  dispose: () => void;
};

export async function createChildAdapter(params: {
  argv: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  windowsVerbatimArguments?: boolean;
  input?: string;
  stdinMode?: "inherit" | "pipe-open" | "pipe-closed";
}): Promise<ChildAdapter> {
  const resolvedArgv = [...params.argv];
  resolvedArgv[0] = resolveCommand(resolvedArgv[0] ?? "");

  const stdinMode = params.stdinMode ?? (params.input !== undefined ? "pipe-closed" : "inherit");

  // Determine Bun stdin option.
  // When input is provided, pass it as a Buffer so Bun sends it and auto-closes stdin.
  // Otherwise, use "inherit" or "pipe" based on stdinMode.
  let stdinOption: "inherit" | "pipe" | Buffer;
  if (params.input !== undefined) {
    stdinOption = Buffer.from(params.input, "utf8");
  } else if (stdinMode === "inherit") {
    stdinOption = "inherit";
  } else {
    stdinOption = "pipe";
  }

  const proc = Bun.spawn(resolvedArgv, {
    stdin: stdinOption,
    stdout: "pipe",
    stderr: "pipe",
    cwd: params.cwd,
    env: params.env ? toStringEnv(params.env) : undefined,
  });

  // If pipe-closed with no initial input, close stdin immediately.
  if (stdinOption === "pipe" && typeof proc.stdin !== "number" && proc.stdin) {
    if (stdinMode === "pipe-closed") {
      try {
        void proc.stdin.end();
      } catch {
        // ignore
      }
    }
  }

  // Expose stdin for pipe-open mode.
  let managedStdin: ManagedRunStdin | undefined;
  if (
    stdinOption === "pipe" &&
    stdinMode === "pipe-open" &&
    typeof proc.stdin !== "number" &&
    proc.stdin
  ) {
    const fileSink = proc.stdin;
    managedStdin = {
      write: (data: string, cb?: (err?: Error | null) => void) => {
        try {
          void fileSink.write(data);
          cb?.();
        } catch (err) {
          cb?.(err as Error);
        }
      },
      end: () => {
        try {
          void fileSink.end();
        } catch {
          // ignore
        }
      },
      destroy: () => {
        try {
          void fileSink.end();
        } catch {
          // ignore
        }
      },
      destroyed: false,
    };
  }

  // Multiplex stdout/stderr to registered listeners via arrays.
  const stdoutListeners: Array<(chunk: string) => void> = [];
  const stderrListeners: Array<(chunk: string) => void> = [];

  const stdoutDone = readStreamChunks(proc.stdout, (chunk) => {
    for (const listener of stdoutListeners) {
      listener(chunk);
    }
  });

  const stderrDone = readStreamChunks(proc.stderr, (chunk) => {
    for (const listener of stderrListeners) {
      listener(chunk);
    }
  });

  const onStdout = (listener: (chunk: string) => void) => {
    stdoutListeners.push(listener);
  };

  const onStderr = (listener: (chunk: string) => void) => {
    stderrListeners.push(listener);
  };

  const wait = async () => {
    const code = await proc.exited;
    await Promise.all([stdoutDone, stderrDone]);
    return { code, signal: proc.signalCode };
  };

  const kill = (signal?: NodeJS.Signals) => {
    const pid = proc.pid ?? undefined;
    if (signal === undefined || signal === "SIGKILL") {
      if (pid) {
        killProcessTree(pid);
      } else {
        try {
          proc.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
      return;
    }
    try {
      proc.kill(signal);
    } catch {
      // ignore
    }
  };

  const dispose = () => {
    stdoutListeners.length = 0;
    stderrListeners.length = 0;
  };

  return {
    pid: proc.pid ?? undefined,
    stdin: managedStdin,
    onStdout,
    onStderr,
    wait,
    kill,
    dispose,
  };
}
