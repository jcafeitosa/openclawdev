import os from "node:os";

export type OsSummary = {
  platform: NodeJS.Platform;
  arch: string;
  release: string;
  label: string;
};

function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function macosVersion(): string {
  if (typeof Bun !== "undefined") {
    const proc = Bun.spawnSync(["sw_vers", "-productVersion"], { stdout: "pipe" });
    const out = proc.stdout ? safeTrim(proc.stdout.toString("utf-8")) : "";
    return out || os.release();
  }
  return os.release();
}

export function resolveOsSummary(): OsSummary {
  const platform = os.platform();
  const release = os.release();
  const arch = os.arch();
  const label = (() => {
    if (platform === "darwin") {
      return `macos ${macosVersion()} (${arch})`;
    }
    if (platform === "win32") {
      return `windows ${release} (${arch})`;
    }
    return `${platform} ${release} (${arch})`;
  })();
  return { platform, arch, release, label };
}
