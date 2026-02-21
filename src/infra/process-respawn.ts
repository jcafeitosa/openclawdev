type RespawnMode = "spawned" | "supervised" | "disabled" | "failed";

export type GatewayRespawnResult = {
  mode: RespawnMode;
  pid?: number;
  detail?: string;
};

type SpawnLike = (argv: string[], opts: object) => { pid: number; unref(): void };

const SUPERVISOR_HINT_ENV_VARS = [
  "LAUNCH_JOB_LABEL",
  "LAUNCH_JOB_NAME",
  "INVOCATION_ID",
  "SYSTEMD_EXEC_PID",
  "JOURNAL_STREAM",
];

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isLikelySupervisedProcess(env: NodeJS.ProcessEnv = process.env): boolean {
  return SUPERVISOR_HINT_ENV_VARS.some((key) => {
    const value = env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/**
 * Attempt to restart this process with a fresh PID.
 * - supervised environments (launchd/systemd): caller should exit and let supervisor restart
 * - OPENCLAW_NO_RESPAWN=1: caller should keep in-process restart behavior (tests/dev)
 * - otherwise: spawn detached child with current argv/execArgv, then caller exits
 */
export function restartGatewayProcessWithFreshPid(opts?: {
  spawnImpl?: SpawnLike;
}): GatewayRespawnResult {
  if (isTruthy(process.env.OPENCLAW_NO_RESPAWN)) {
    return { mode: "disabled" };
  }
  if (isLikelySupervisedProcess(process.env)) {
    return { mode: "supervised" };
  }

  const spawnFn: SpawnLike = opts?.spawnImpl ?? Bun.spawn;

  try {
    const args = [...process.execArgv, ...process.argv.slice(1)];
    const child = spawnFn([process.execPath, ...args], {
      env: process.env as Record<string, string>,
      detached: true,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    child.unref();
    return { mode: "spawned", pid: child.pid };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { mode: "failed", detail };
  }
}
