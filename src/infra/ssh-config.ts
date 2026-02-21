import type { SshParsedTarget } from "./ssh-tunnel.js";

export type SshResolvedConfig = {
  user?: string;
  host?: string;
  port?: number;
  identityFiles: string[];
};

type SshSpawnImpl = (
  argv: string[],
  opts: { stdin: null; stdout: "pipe"; stderr: null },
) => {
  stdout: ReadableStream<Uint8Array> | number | null;
  exited: Promise<number | null>;
  kill: (signal?: NodeJS.Signals | number) => void;
};

function parsePort(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

export function parseSshConfigOutput(output: string): SshResolvedConfig {
  const result: SshResolvedConfig = { identityFiles: [] };
  const lines = output.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const [key, ...rest] = line.split(/\s+/);
    const value = rest.join(" ").trim();
    if (!key || !value) {
      continue;
    }
    switch (key) {
      case "user":
        result.user = value;
        break;
      case "hostname":
        result.host = value;
        break;
      case "port":
        result.port = parsePort(value);
        break;
      case "identityfile":
        if (value !== "none") {
          result.identityFiles.push(value);
        }
        break;
      default:
        break;
    }
  }
  return result;
}

export async function resolveSshConfig(
  target: SshParsedTarget,
  opts: { identity?: string; timeoutMs?: number } = {},
  spawnImpl: SshSpawnImpl = (argv, spawnOpts) => Bun.spawn(argv, spawnOpts),
): Promise<SshResolvedConfig | null> {
  const sshPath = "/usr/bin/ssh";
  const args = ["-G"];
  if (target.port > 0 && target.port !== 22) {
    args.push("-p", String(target.port));
  }
  if (opts.identity?.trim()) {
    args.push("-i", opts.identity.trim());
  }
  const userHost = target.user ? `${target.user}@${target.host}` : target.host;
  // Use "--" so userHost can't be parsed as an ssh option.
  args.push("--", userHost);

  const timeoutMs = Math.max(200, opts.timeoutMs ?? 800);
  let proc: ReturnType<SshSpawnImpl>;
  try {
    proc = spawnImpl([sshPath, ...args], { stdin: null, stdout: "pipe", stderr: null });
  } catch {
    return null;
  }

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      proc.kill("SIGKILL");
    } catch {}
  }, timeoutMs);

  const stdoutP =
    proc.stdout instanceof ReadableStream ? new Response(proc.stdout).text() : Promise.resolve("");

  let exitCode: number | null = null;
  let stdout = "";
  try {
    [exitCode, stdout] = await Promise.all([proc.exited, stdoutP]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (timedOut || exitCode !== 0 || !stdout.trim()) {
    return null;
  }
  return parseSshConfigOutput(stdout);
}
