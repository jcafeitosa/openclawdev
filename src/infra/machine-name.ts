import os from "node:os";

let cachedPromise: Promise<string> | null = null;

function tryScutil(key: "ComputerName" | "LocalHostName"): string | null {
  if (typeof Bun === "undefined") {
    return null;
  }
  try {
    const proc = Bun.spawnSync(["/usr/sbin/scutil", "--get", key], {
      stdout: "pipe",
      stderr: "pipe",
    });
    if (!proc.success) {
      return null;
    }
    const value = proc.stdout ? proc.stdout.toString("utf-8").trim() : "";
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function fallbackHostName() {
  return (
    os
      .hostname()
      .replace(/\.local$/i, "")
      .trim() || "openclaw"
  );
}

export async function getMachineDisplayName(): Promise<string> {
  if (cachedPromise) {
    return cachedPromise;
  }
  cachedPromise = (async () => {
    if (process.env.VITEST || process.env.NODE_ENV === "test") {
      return fallbackHostName();
    }
    if (process.platform === "darwin") {
      const computerName = tryScutil("ComputerName");
      if (computerName) {
        return computerName;
      }
      const localHostName = tryScutil("LocalHostName");
      if (localHostName) {
        return localHostName;
      }
    }
    return fallbackHostName();
  })();
  return cachedPromise;
}
