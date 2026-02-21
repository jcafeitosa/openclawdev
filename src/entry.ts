#!/usr/bin/env node
import { applyCliProfileEnv, parseCliProfileArgs } from "./cli/profile.js";
import { shouldSkipRespawnForArgv } from "./cli/respawn-policy.js";
import { normalizeWindowsArgv } from "./cli/windows-argv.js";
import { isTruthyEnvValue, normalizeEnv } from "./infra/env.js";
import { installProcessWarningFilter } from "./infra/warning-filter.js";

process.title = "openclaw";
installProcessWarningFilter();
normalizeEnv();

// When piping output (e.g. `openclaw ... | head`), the downstream process may close the pipe early.
// Without this handler, Node can emit an unhandled EPIPE error event on stdout/stderr.
for (const stream of [process.stdout, process.stderr]) {
  stream.on("error", (err: NodeJS.ErrnoException) => {
    if (err?.code === "EPIPE") {
      process.exit(0);
    }
  });
}

if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
}

const EXPERIMENTAL_WARNING_FLAG = "--disable-warning=ExperimentalWarning";

function hasExperimentalWarningSuppressed(): boolean {
  const nodeOptions = process.env.NODE_OPTIONS ?? "";
  if (nodeOptions.includes(EXPERIMENTAL_WARNING_FLAG) || nodeOptions.includes("--no-warnings")) {
    return true;
  }
  for (const arg of process.execArgv) {
    if (arg === EXPERIMENTAL_WARNING_FLAG || arg === "--no-warnings") {
      return true;
    }
  }
  return false;
}

function buildSpawnEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) {
      env[k] = v;
    }
  }
  return env;
}

function ensureExperimentalWarningSuppressed(): boolean {
  if (shouldSkipRespawnForArgv(process.argv)) {
    return false;
  }
  if (isTruthyEnvValue(process.env.OPENCLAW_NO_RESPAWN)) {
    return false;
  }
  if (isTruthyEnvValue(process.env.OPENCLAW_NODE_OPTIONS_READY)) {
    return false;
  }
  if (hasExperimentalWarningSuppressed()) {
    return false;
  }

  // Respawn guard (and keep recursion bounded if something goes wrong).
  process.env.OPENCLAW_NODE_OPTIONS_READY = "1";
  // Pass flag as a Node CLI option, not via NODE_OPTIONS (--disable-warning is disallowed in NODE_OPTIONS).
  const spawnEnv = buildSpawnEnv();
  const child = Bun.spawn(
    [process.execPath, EXPERIMENTAL_WARNING_FLAG, ...process.execArgv, ...process.argv.slice(1)],
    {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: spawnEnv,
    },
  );

  // Forward termination signals to child process.
  const signals: NodeJS.Signals[] =
    process.platform === "win32"
      ? ["SIGTERM", "SIGINT"]
      : ["SIGTERM", "SIGINT", "SIGHUP", "SIGQUIT"];

  const signalListeners = new Map<NodeJS.Signals, () => void>();
  const detachSignals = (): void => {
    for (const [signal, listener] of signalListeners) {
      process.off(signal, listener);
    }
    signalListeners.clear();
  };

  for (const signal of signals) {
    const listener = (): void => {
      try {
        child.kill(signal);
      } catch {
        // ignore
      }
    };
    try {
      process.on(signal, listener);
      signalListeners.set(signal, listener);
    } catch {
      // Unsupported signal on this platform.
    }
  }

  void child.exited.then((code) => {
    detachSignals();
    const sig = child.signalCode;
    if (sig) {
      process.exitCode = 1;
      return;
    }
    process.exit(code ?? 1);
  });

  // Parent must not continue running the CLI.
  return true;
}

process.argv = normalizeWindowsArgv(process.argv);

if (!ensureExperimentalWarningSuppressed()) {
  const parsed = parseCliProfileArgs(process.argv);
  if (!parsed.ok) {
    // Keep it simple; Commander will handle rich help/errors after we strip flags.
    console.error(`[openclaw] ${parsed.error}`);
    process.exit(2);
  }

  if (parsed.profile) {
    applyCliProfileEnv({ profile: parsed.profile });
    // Keep Commander and ad-hoc argv checks consistent.
    process.argv = parsed.argv;
  }

  import("./cli/run-main.js")
    .then(({ runCli }) => runCli(process.argv))
    .catch((error) => {
      console.error(
        "[openclaw] Failed to start CLI:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exitCode = 1;
    });
}
