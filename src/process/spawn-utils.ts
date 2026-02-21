export function resolveCommandStdio(params: {
  hasInput: boolean;
  preferInherit: boolean;
}): ["pipe" | "inherit" | "ignore", "pipe", "pipe"] {
  const stdin = params.hasInput ? "pipe" : params.preferInherit ? "inherit" : "pipe";
  return [stdin, "pipe", "pipe"];
}

export function formatSpawnError(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const details = err as NodeJS.ErrnoException;
  const parts: string[] = [];
  const message = err.message?.trim();
  if (message) {
    parts.push(message);
  }
  if (details.code && !message?.includes(details.code)) {
    parts.push(details.code);
  }
  if (details.syscall) {
    parts.push(`syscall=${details.syscall}`);
  }
  if (typeof details.errno === "number") {
    parts.push(`errno=${details.errno}`);
  }
  return parts.join(" ");
}
