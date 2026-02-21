/**
 * Gmail Watcher Service
 *
 * Automatically starts `gog gmail watch serve` when the gateway starts,
 * if hooks.gmail is configured with an account.
 */

import { hasBinary } from "../agents/skills.js";
import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { runCommandWithTimeout } from "../process/exec.js";
import { ensureTailscaleEndpoint } from "./gmail-setup-utils.js";
import {
  buildGogWatchServeArgs,
  buildGogWatchStartArgs,
  type GmailHookRuntimeConfig,
  resolveGmailHookRuntimeConfig,
} from "./gmail.js";

const log = createSubsystemLogger("gmail-watcher");

const ADDRESS_IN_USE_RE = /address already in use|EADDRINUSE/i;

export function isAddressInUseError(line: string): boolean {
  return ADDRESS_IN_USE_RE.test(line);
}

type GogSubprocess = {
  pid: number;
  signalCode: NodeJS.Signals | null;
  exited: Promise<number | null>;
  kill: (signal?: NodeJS.Signals | number) => void;
  stdout: ReadableStream<Uint8Array> | null | number;
  stderr: ReadableStream<Uint8Array> | null | number;
};

let watcherProcess: GogSubprocess | null = null;
let renewInterval: ReturnType<typeof setInterval> | null = null;
let shuttingDown = false;
let currentConfig: GmailHookRuntimeConfig | null = null;

/**
 * Check if gog binary is available
 */
function isGogAvailable(): boolean {
  return hasBinary("gog");
}

/**
 * Consume a ReadableStream line-by-line, calling onLine for each trimmed line.
 */
async function consumeStream(
  stream: ReadableStream<Uint8Array>,
  onLine: (line: string) => void,
): Promise<void> {
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
        onLine(part.trim());
      }
    }
    if (buffer.trim()) {
      onLine(buffer.trim());
    }
  } catch {
    // Stream closed.
  } finally {
    reader.releaseLock();
  }
}

/**
 * Start the Gmail watch (registers with Gmail API)
 */
async function startGmailWatch(
  cfg: Pick<GmailHookRuntimeConfig, "account" | "label" | "topic">,
): Promise<boolean> {
  const args = ["gog", ...buildGogWatchStartArgs(cfg)];
  try {
    const result = await runCommandWithTimeout(args, { timeoutMs: 120_000 });
    if (result.code !== 0) {
      const message = result.stderr || result.stdout || "gog watch start failed";
      log.error(`watch start failed: ${message}`);
      return false;
    }
    log.info(`watch started for ${cfg.account}`);
    return true;
  } catch (err) {
    log.error(`watch start error: ${String(err)}`);
    return false;
  }
}

/**
 * Spawn the gog gmail watch serve process
 */
function spawnGogServe(cfg: GmailHookRuntimeConfig): GogSubprocess {
  const args = buildGogWatchServeArgs(cfg);
  log.info(`starting gog ${args.join(" ")}`);
  let addressInUse = false;

  const proc = Bun.spawn(["gog", ...args], {
    stdin: null,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (proc.stdout instanceof ReadableStream) {
    void consumeStream(proc.stdout, (line) => {
      if (line) {
        log.info(`[gog] ${line}`);
      }
    });
  }

  if (proc.stderr instanceof ReadableStream) {
    void consumeStream(proc.stderr, (line) => {
      if (!line) {
        return;
      }
      if (isAddressInUseError(line)) {
        addressInUse = true;
      }
      log.warn(`[gog] ${line}`);
    });
  }

  void proc.exited.then((code) => {
    if (shuttingDown) {
      return;
    }
    if (addressInUse) {
      log.warn(
        "gog serve failed to bind (address already in use); stopping restarts. " +
          "Another watcher is likely running. Set OPENCLAW_SKIP_GMAIL_WATCHER=1 or stop the other process.",
      );
      watcherProcess = null;
      return;
    }
    const signal = proc.signalCode;
    log.warn(`gog exited (code=${code}, signal=${signal}); restarting in 5s`);
    watcherProcess = null;
    setTimeout(() => {
      if (shuttingDown || !currentConfig) {
        return;
      }
      watcherProcess = spawnGogServe(currentConfig);
    }, 5000);
  });

  return proc;
}

export type GmailWatcherStartResult = {
  started: boolean;
  reason?: string;
};

/**
 * Start the Gmail watcher service.
 * Called automatically by the gateway if hooks.gmail is configured.
 */
export async function startGmailWatcher(cfg: OpenClawConfig): Promise<GmailWatcherStartResult> {
  // Check if gmail hooks are configured
  if (!cfg.hooks?.enabled) {
    return { started: false, reason: "hooks not enabled" };
  }

  if (!cfg.hooks?.gmail?.account) {
    return { started: false, reason: "no gmail account configured" };
  }

  // Check if gog is available
  const gogAvailable = isGogAvailable();
  if (!gogAvailable) {
    return { started: false, reason: "gog binary not found" };
  }

  // Resolve the full runtime config
  const resolved = resolveGmailHookRuntimeConfig(cfg, {});
  if (!resolved.ok) {
    return { started: false, reason: resolved.error };
  }

  const runtimeConfig = resolved.value;
  currentConfig = runtimeConfig;

  // Set up Tailscale endpoint if needed
  if (runtimeConfig.tailscale.mode !== "off") {
    try {
      await ensureTailscaleEndpoint({
        mode: runtimeConfig.tailscale.mode,
        path: runtimeConfig.tailscale.path,
        port: runtimeConfig.serve.port,
        target: runtimeConfig.tailscale.target,
      });
      log.info(
        `tailscale ${runtimeConfig.tailscale.mode} configured for port ${runtimeConfig.serve.port}`,
      );
    } catch (err) {
      log.error(`tailscale setup failed: ${String(err)}`);
      return {
        started: false,
        reason: `tailscale setup failed: ${String(err)}`,
      };
    }
  }

  // Start the Gmail watch (register with Gmail API)
  const watchStarted = await startGmailWatch(runtimeConfig);
  if (!watchStarted) {
    log.warn("gmail watch start failed, but continuing with serve");
  }

  // Spawn the gog serve process
  shuttingDown = false;
  watcherProcess = spawnGogServe(runtimeConfig);

  // Set up renewal interval
  const renewMs = runtimeConfig.renewEveryMinutes * 60_000;
  renewInterval = setInterval(() => {
    if (shuttingDown) {
      return;
    }
    void startGmailWatch(runtimeConfig);
  }, renewMs);

  log.info(
    `gmail watcher started for ${runtimeConfig.account} (renew every ${runtimeConfig.renewEveryMinutes}m)`,
  );

  return { started: true };
}

/**
 * Stop the Gmail watcher service.
 */
export async function stopGmailWatcher(): Promise<void> {
  shuttingDown = true;

  if (renewInterval) {
    clearInterval(renewInterval);
    renewInterval = null;
  }

  if (watcherProcess) {
    log.info("stopping gmail watcher");
    const proc = watcherProcess;
    try {
      proc.kill("SIGTERM");
    } catch {
      // ignore
    }
    const killTimer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, 3000);
    try {
      await proc.exited;
    } finally {
      clearTimeout(killTimer);
    }
    watcherProcess = null;
  }

  currentConfig = null;
  log.info("gmail watcher stopped");
}

/**
 * Check if the Gmail watcher is running.
 */
export function isGmailWatcherRunning(): boolean {
  return watcherProcess !== null && !shuttingDown;
}
