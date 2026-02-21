import { isTruthyEnvValue } from "./env.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BUFFER_BYTES = 2 * 1024 * 1024;
let lastAppliedKeys: string[] = [];
let cachedShellPath: string | null | undefined;

type ExecFileSyncBufferFn = (
  command: string,
  args: string[],
  options: {
    encoding: "buffer";
    timeout: number;
    maxBuffer: number;
    env: NodeJS.ProcessEnv;
    stdio: unknown[];
  },
) => Buffer;

function bunExecLoginShell(
  command: string,
  args: string[],
  options: {
    encoding: "buffer";
    timeout: number;
    maxBuffer: number;
    env: NodeJS.ProcessEnv;
    stdio: unknown[];
  },
): Buffer {
  const proc = Bun.spawnSync([command, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: options.env as Record<string, string>,
    timeout: options.timeout,
  });
  if (proc.exitCode !== 0 && (!proc.stdout || proc.stdout.byteLength === 0)) {
    const stderr = proc.stderr ? proc.stderr.toString("utf-8") : "";
    throw Object.assign(new Error(stderr.trim() || `${command} exited with ${proc.exitCode}`), {
      status: proc.exitCode,
    });
  }
  return proc.stdout ? Buffer.from(proc.stdout) : Buffer.alloc(0);
}

function resolveShell(env: NodeJS.ProcessEnv): string {
  const shell = env.SHELL?.trim();
  return shell && shell.length > 0 ? shell : "/bin/sh";
}

function execLoginShellEnvZero(params: {
  shell: string;
  env: NodeJS.ProcessEnv;
  exec: ExecFileSyncBufferFn;
  timeoutMs: number;
}): Buffer {
  return params.exec(params.shell, ["-l", "-c", "env -0"], {
    encoding: "buffer",
    timeout: params.timeoutMs,
    maxBuffer: DEFAULT_MAX_BUFFER_BYTES,
    env: params.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseShellEnv(stdout: Buffer): Map<string, string> {
  const shellEnv = new Map<string, string>();
  const parts = stdout.toString("utf8").split("\0");
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const eq = part.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (!key) {
      continue;
    }
    shellEnv.set(key, value);
  }
  return shellEnv;
}

export type ShellEnvFallbackResult =
  | { ok: true; applied: string[]; skippedReason?: never }
  | { ok: true; applied: []; skippedReason: "already-has-keys" | "disabled" }
  | { ok: false; error: string; applied: [] };

export type ShellEnvFallbackOptions = {
  enabled: boolean;
  env: NodeJS.ProcessEnv;
  expectedKeys: string[];
  logger?: Pick<typeof console, "warn">;
  timeoutMs?: number;
  exec?: ExecFileSyncBufferFn;
};

export function loadShellEnvFallback(opts: ShellEnvFallbackOptions): ShellEnvFallbackResult {
  const logger = opts.logger ?? console;
  const exec = opts.exec ?? bunExecLoginShell;

  if (!opts.enabled) {
    lastAppliedKeys = [];
    return { ok: true, applied: [], skippedReason: "disabled" };
  }

  const hasAnyKey = opts.expectedKeys.some((key) => Boolean(opts.env[key]?.trim()));
  if (hasAnyKey) {
    lastAppliedKeys = [];
    return { ok: true, applied: [], skippedReason: "already-has-keys" };
  }

  const timeoutMs =
    typeof opts.timeoutMs === "number" && Number.isFinite(opts.timeoutMs)
      ? Math.max(0, opts.timeoutMs)
      : DEFAULT_TIMEOUT_MS;

  const shell = resolveShell(opts.env);

  let stdout: Buffer;
  try {
    stdout = execLoginShellEnvZero({ shell, env: opts.env, exec, timeoutMs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[openclaw] shell env fallback failed: ${msg}`);
    lastAppliedKeys = [];
    return { ok: false, error: msg, applied: [] };
  }

  const shellEnv = parseShellEnv(stdout);

  const applied: string[] = [];
  for (const key of opts.expectedKeys) {
    if (opts.env[key]?.trim()) {
      continue;
    }
    const value = shellEnv.get(key);
    if (!value?.trim()) {
      continue;
    }
    opts.env[key] = value;
    applied.push(key);
  }

  lastAppliedKeys = applied;
  return { ok: true, applied };
}

export function shouldEnableShellEnvFallback(env: NodeJS.ProcessEnv): boolean {
  return isTruthyEnvValue(env.OPENCLAW_LOAD_SHELL_ENV);
}

export function shouldDeferShellEnvFallback(env: NodeJS.ProcessEnv): boolean {
  return isTruthyEnvValue(env.OPENCLAW_DEFER_SHELL_ENV_FALLBACK);
}

export function resolveShellEnvFallbackTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = env.OPENCLAW_SHELL_ENV_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.max(0, parsed);
}

export function getShellPathFromLoginShell(opts: {
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
  exec?: ExecFileSyncBufferFn;
}): string | null {
  if (cachedShellPath !== undefined) {
    return cachedShellPath;
  }
  if (process.platform === "win32") {
    cachedShellPath = null;
    return cachedShellPath;
  }

  const exec = opts.exec ?? bunExecLoginShell;
  const timeoutMs =
    typeof opts.timeoutMs === "number" && Number.isFinite(opts.timeoutMs)
      ? Math.max(0, opts.timeoutMs)
      : DEFAULT_TIMEOUT_MS;
  const shell = resolveShell(opts.env);

  let stdout: Buffer;
  try {
    stdout = execLoginShellEnvZero({ shell, env: opts.env, exec, timeoutMs });
  } catch {
    cachedShellPath = null;
    return cachedShellPath;
  }

  const shellEnv = parseShellEnv(stdout);
  const shellPath = shellEnv.get("PATH")?.trim();
  cachedShellPath = shellPath && shellPath.length > 0 ? shellPath : null;
  return cachedShellPath;
}

export function resetShellPathCacheForTests(): void {
  cachedShellPath = undefined;
}

export function getShellEnvAppliedKeys(): string[] {
  return [...lastAppliedKeys];
}
