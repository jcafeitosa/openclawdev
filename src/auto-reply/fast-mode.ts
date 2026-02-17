/**
 * Fast Mode — optimizes for speed by reducing thinking depth and
 * using a faster model variant when available.
 */

let fastModeEnabled = false;

export function toggleFastMode(): boolean {
  fastModeEnabled = !fastModeEnabled;
  return fastModeEnabled;
}

export function isFastMode(): boolean {
  return fastModeEnabled;
}

export function setFastMode(enabled: boolean): void {
  fastModeEnabled = enabled;
}

/**
 * Resolve effective thinking level when fast mode is active.
 * In fast mode, thinking is reduced to "minimal" regardless of config.
 */
export function resolveFastModeThinkLevel(configuredLevel: string): string {
  if (!fastModeEnabled) {
    return configuredLevel;
  }
  return "minimal";
}

/**
 * Resolve effective model when fast mode is active.
 * Prefers faster model variants (e.g., Haiku over Sonnet).
 */
export function resolveFastModeModel(configuredModel: string): string {
  if (!fastModeEnabled) {
    return configuredModel;
  }

  const fastVariants: Record<string, string> = {
    "claude-opus-4-6": "claude-sonnet-4-5",
    "claude-opus-4-5": "claude-sonnet-4-5",
    "claude-sonnet-4-5": "claude-haiku-4-5",
    "gpt-4o": "gpt-4o-mini",
    "gpt-4-turbo": "gpt-4o-mini",
  };

  for (const [pattern, fast] of Object.entries(fastVariants)) {
    if (configuredModel.includes(pattern)) {
      return fast;
    }
  }
  return configuredModel;
}
