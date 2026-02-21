import path from "node:path";
import { danger, shouldLogVerbose } from "../globals.js";
import { logDebug, logError } from "../logger.js";

/**
 * Resolves a command for Windows compatibility.
 * On Windows, non-.exe commands (like npm, pnpm) require their .cmd extension.
 */
function resolveCommand(command: string): string {
  if (process.platform !== "win32") {
    return command;
  }
  const basename = path.basename(command).toLowerCase();
  // Skip if already has an extension (.cmd, .exe, .bat, etc.)
  const ext = path.extname(basename);
  if (ext) {
    return command;
  }
  // Common npm-related commands that need .cmd extension on Windows
  const cmdCommands = ["npm", "pnpm", "yarn", "npx"];
  if (cmdCommands.includes(basename)) {
    return `${command}.cmd`;
  }
  return command;
}

export function shouldSpawnWithShell(params: {
  resolvedCommand: string;
  platform: NodeJS.Platform;
}): boolean {
  // SECURITY: never enable `shell` for argv-based execution.
  // `shell` routes through cmd.exe on Windows, which turns untrusted argv values
  // (like chat prompts passed as CLI args) into command-injection primitives.
  // If you need a shell, use an explicit shell-wrapper argv (e.g. `cmd.exe /c ...`)
  // and validate/escape at the call site.
  void params;
  return false;
}

// Simple promise-wrapped command execution with optional verbosity logging.
export async function runExec(
  command: string,
  args: string[],
  opts: number | { timeoutMs?: number; maxBuffer?: number } = 10_000,
): Promise<{ stdout: string; stderr: string }> {
  const timeoutMs = typeof opts === "number" ? opts : (opts.timeoutMs ?? 10_000);
  let timedOut = false;
  const proc = Bun.spawn([resolveCommand(command), ...args], { stdout: "pipe", stderr: "pipe" });
  const stdoutP = proc.stdout ? new Response(proc.stdout).text() : Promise.resolve("");
  const stderrP = proc.stderr ? new Response(proc.stderr).text() : Promise.resolve("");
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);
  try {
    const exitCode = await proc.exited;
    clearTimeout(timer);
    const [stdout, stderr] = await Promise.all([stdoutP, stderrP]);
    if (timedOut) {
      const err = Object.assign(new Error(`Command timed out after ${timeoutMs}ms`), {
        killed: true,
        stdout,
        stderr,
        code: null,
      });
      throw err;
    }
    if (exitCode !== 0) {
      const err = Object.assign(new Error(stderr.trim() || `exit code ${exitCode}`), {
        killed: false,
        stdout,
        stderr,
        code: exitCode,
      });
      throw err;
    }
    if (shouldLogVerbose()) {
      if (stdout.trim()) {
        logDebug(stdout.trim());
      }
      if (stderr.trim()) {
        logError(stderr.trim());
      }
    }
    return { stdout, stderr };
  } catch (err) {
    clearTimeout(timer);
    if (shouldLogVerbose()) {
      logError(danger(`Command failed: ${command} ${args.join(" ")}`));
    }
    throw err;
  }
}

export type SpawnResult = {
  pid?: number;
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
  killed: boolean;
  termination: "exit" | "timeout" | "no-output-timeout" | "signal";
  noOutputTimedOut?: boolean;
};

export type CommandOptions = {
  timeoutMs: number;
  cwd?: string;
  input?: string;
  env?: NodeJS.ProcessEnv;
  windowsVerbatimArguments?: boolean;
  noOutputTimeoutMs?: number;
};

export async function runCommandWithTimeout(
  argv: string[],
  optionsOrTimeout: number | CommandOptions,
): Promise<SpawnResult> {
  const options: CommandOptions =
    typeof optionsOrTimeout === "number" ? { timeoutMs: optionsOrTimeout } : optionsOrTimeout;
  const { timeoutMs, cwd, input, env, noOutputTimeoutMs } = options;
  const hasInput = input !== undefined;

  const shouldSuppressNpmFund = (() => {
    const cmd = path.basename(argv[0] ?? "");
    if (cmd === "npm" || cmd === "npm.cmd" || cmd === "npm.exe") {
      return true;
    }
    if (cmd === "node" || cmd === "node.exe") {
      const script = argv[1] ?? "";
      return script.includes("npm-cli.js");
    }
    return false;
  })();

  const mergedEnv = env ? { ...process.env, ...env } : { ...process.env };
  const resolvedEnv = Object.fromEntries(
    Object.entries(mergedEnv)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  if (shouldSuppressNpmFund) {
    if (resolvedEnv.NPM_CONFIG_FUND == null) {
      resolvedEnv.NPM_CONFIG_FUND = "false";
    }
    if (resolvedEnv.npm_config_fund == null) {
      resolvedEnv.npm_config_fund = "false";
    }
  }

  const resolvedCommand = resolveCommand(argv[0] ?? "");
  const stdinMode: Buffer | "inherit" = hasInput ? Buffer.from(input ?? "", "utf8") : "inherit";

  const proc = Bun.spawn([resolvedCommand, ...argv.slice(1)], {
    stdin: stdinMode,
    stdout: "pipe",
    stderr: "pipe",
    ...(cwd !== undefined && { cwd }),
    env: resolvedEnv,
  });

  let killed = false;
  let timedOut = false;
  let noOutputTimedOut = false;
  let settled = false;

  const noOutputMs =
    typeof noOutputTimeoutMs === "number" &&
    Number.isFinite(noOutputTimeoutMs) &&
    noOutputTimeoutMs > 0
      ? Math.floor(noOutputTimeoutMs)
      : 0;
  const shouldTrackOutputTimeout = noOutputMs > 0;

  let noOutputTimer: ReturnType<typeof setTimeout> | null = null;

  const clearNoOutputTimer = () => {
    if (!noOutputTimer) {
      return;
    }
    clearTimeout(noOutputTimer);
    noOutputTimer = null;
  };

  const armNoOutputTimer = () => {
    if (!shouldTrackOutputTimeout || settled) {
      return;
    }
    clearNoOutputTimer();
    noOutputTimer = setTimeout(() => {
      if (settled) {
        return;
      }
      noOutputTimedOut = true;
      killed = true;
      try {
        proc.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, noOutputMs);
  };

  const overallTimer = setTimeout(() => {
    timedOut = true;
    killed = true;
    try {
      proc.kill("SIGKILL");
    } catch {
      // ignore
    }
  }, timeoutMs);

  armNoOutputTimer();

  const readStream = async (
    stream: ReadableStream<Uint8Array> | number | null | undefined,
  ): Promise<string> => {
    if (!(stream instanceof ReadableStream)) {
      return "";
    }
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        result += decoder.decode(value, { stream: true });
        armNoOutputTimer();
      }
    } catch {
      // Stream closed.
    } finally {
      reader.releaseLock();
    }
    return result;
  };

  const stdoutP = readStream(proc.stdout);
  const stderrP = readStream(proc.stderr);

  let exitCode: number | null = null;
  try {
    exitCode = await proc.exited;
  } finally {
    settled = true;
    clearTimeout(overallTimer);
    clearNoOutputTimer();
  }

  const [stdout, stderr] = await Promise.all([stdoutP, stderrP]);

  const signal = proc.signalCode;
  const termination: SpawnResult["termination"] = noOutputTimedOut
    ? "no-output-timeout"
    : timedOut
      ? "timeout"
      : signal != null
        ? "signal"
        : "exit";

  return {
    pid: proc.pid,
    stdout,
    stderr,
    code: exitCode,
    signal,
    killed,
    termination,
    noOutputTimedOut,
  };
}
