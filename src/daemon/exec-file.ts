export type ExecResult = { stdout: string; stderr: string; code: number };

type ExecFileSubOpts = {
  timeout?: number;
  cwd?: string | URL;
  env?: NodeJS.ProcessEnv;
  // Windows-only option; ignored on other platforms
  windowsHide?: boolean;
};

export async function execFileUtf8(
  command: string,
  args: string[],
  options: ExecFileSubOpts = {},
): Promise<ExecResult> {
  const timeoutMs = typeof options.timeout === "number" ? options.timeout : undefined;
  let timedOut = false;

  const proc = Bun.spawn([command, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    ...(options.cwd !== undefined && { cwd: String(options.cwd) }),
    ...(options.env !== undefined && { env: options.env as Record<string, string> }),
  });

  const stdoutP = proc.stdout ? new Response(proc.stdout).text() : Promise.resolve("");
  const stderrP = proc.stderr ? new Response(proc.stderr).text() : Promise.resolve("");

  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs !== undefined) {
    timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeoutMs);
  }

  const exitCode = await proc.exited;
  if (timer !== undefined) {
    clearTimeout(timer);
  }

  const [stdout, stderr] = await Promise.all([stdoutP, stderrP]);

  if (timedOut) {
    return { stdout, stderr: stderr || "timed out", code: 1 };
  }
  if (exitCode !== 0) {
    return { stdout, stderr, code: exitCode ?? 1 };
  }
  return { stdout, stderr, code: 0 };
}
