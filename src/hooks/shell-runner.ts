/**
 * Shell/Python hook handler executor.
 *
 * Runs shell commands registered via hooks.json with timeout
 * and environment variable injection for hook context.
 */

import type { InternalHookEvent } from "./internal-hooks.js";
import type { JsonHookEntry, JsonHookMatcher } from "./json-loader.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_LENGTH = 8192;

export type ShellHookResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
};

/**
 * Check if a hook entry's matcher matches the given event context.
 */
export function matchesEvent(entry: JsonHookEntry, event: InternalHookEvent): boolean {
  const eventKey = `${event.type}:${event.action}`;
  if (entry.event !== eventKey && entry.event !== event.type) {
    return false;
  }

  if (!entry.matcher) {
    return true;
  }

  return matchesMatcher(entry.matcher, event);
}

function matchesMatcher(matcher: JsonHookMatcher, event: InternalHookEvent): boolean {
  const ctx = event.context;

  if (matcher.agentId) {
    const agentId = typeof ctx.agentId === "string" ? ctx.agentId : "";
    if (matcher.agentId !== "*" && matcher.agentId !== agentId) {
      return false;
    }
  }

  if (matcher.sessionKey) {
    if (matcher.sessionKey !== "*" && matcher.sessionKey !== event.sessionKey) {
      return false;
    }
  }

  return true;
}

/**
 * Build environment variables for the hook command.
 *
 * Exposes event context as OPENCLAW_HOOK_* environment variables.
 */
function buildHookEnv(event: InternalHookEvent): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENCLAW_HOOK_TYPE: event.type,
    OPENCLAW_HOOK_ACTION: event.action,
    OPENCLAW_HOOK_SESSION_KEY: event.sessionKey,
    OPENCLAW_HOOK_TIMESTAMP: event.timestamp.toISOString(),
  };

  const ctx = event.context;
  if (typeof ctx.agentId === "string") {
    env.OPENCLAW_HOOK_AGENT_ID = ctx.agentId;
  }
  if (typeof ctx.sessionId === "string") {
    env.OPENCLAW_HOOK_SESSION_ID = ctx.sessionId;
  }
  if (typeof ctx.workspaceDir === "string") {
    env.OPENCLAW_HOOK_WORKSPACE_DIR = ctx.workspaceDir;
  }

  return env;
}

/**
 * Execute a shell hook command with timeout.
 */
export async function runShellHook(
  entry: JsonHookEntry,
  event: InternalHookEvent,
): Promise<ShellHookResult> {
  const timeoutMs = entry.timeout ?? DEFAULT_TIMEOUT_MS;
  const env = buildHookEnv(event);
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const shellArgs = process.platform === "win32" ? ["/c", entry.command] : ["-c", entry.command];

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn([shell, ...shellArgs], {
      env: env as Record<string, string>,
      stdin: null,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err) {
    return {
      ok: false,
      stdout: "",
      stderr: `Spawn error: ${err instanceof Error ? err.message : String(err)}`,
      exitCode: null,
      timedOut: false,
    };
  }

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);

  const stdoutP =
    proc.stdout instanceof ReadableStream ? new Response(proc.stdout).text() : Promise.resolve("");
  const stderrP =
    proc.stderr instanceof ReadableStream ? new Response(proc.stderr).text() : Promise.resolve("");

  const exitCode = await proc.exited;
  clearTimeout(timer);

  const [stdoutRaw, stderrRaw] = await Promise.all([stdoutP, stderrP]);
  const stdout = stdoutRaw.slice(0, MAX_OUTPUT_LENGTH);
  const stderr = stderrRaw.slice(0, MAX_OUTPUT_LENGTH);

  return {
    ok: exitCode === 0 && !timedOut,
    stdout,
    stderr,
    exitCode: timedOut ? null : exitCode,
    timedOut,
  };
}
