/**
 * Model Budget Manager — dynamic provider priority scoring.
 *
 * Tracks token/cost usage per provider in a rolling 7-day window.
 * Computes priority scores (lower = preferred) based on:
 *   1. Static base priority: free < google < anthropic < openai
 *   2. Dynamic penalty: providers approaching quota limits get deprioritized
 *
 * Goal: distribute usage so Claude (Anthropic) weekly subscription limits
 * are not hit early by preferring free models first, then Google, then
 * Anthropic, then OpenAI.
 */

export type ProviderCategory = "free" | "google" | "anthropic" | "openai" | "other";

// Base priority scores — lower = preferred in model ranking
export const PROVIDER_BASE_PRIORITY: Record<ProviderCategory, number> = {
  free: 0,
  google: 10,
  other: 15,
  anthropic: 20,
  openai: 30,
};

// Map normalized provider IDs → category
const PROVIDER_CATEGORY_MAP: Record<string, ProviderCategory> = {
  "google-antigravity": "google",
  google: "google",
  "github-copilot": "google",
  cerebras: "google",
  groq: "google",
  sambanova: "google",
  openrouter: "free",
  ollama: "free",
  lmstudio: "free",
  huggingface: "free",
  anthropic: "anthropic",
  openai: "openai",
  "openai-codex": "openai",
  "openai-responses": "openai",
  mistral: "other",
  cohere: "other",
  together: "other",
};

// 7-day rolling window (in ms)
const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type ProviderLimits = {
  /** Weekly token limit before penalty kicks in (0 = unlimited) */
  weeklyTokens: number;
  /** Weekly cost limit (USD) before penalty kicks in (0 = unlimited) */
  weeklyCostUsd: number;
};

// Conservative weekly limits per category.
// When usage exceeds 50%, penalty starts scaling up proportionally.
const PROVIDER_LIMITS: Record<ProviderCategory, ProviderLimits> = {
  free: { weeklyTokens: 0, weeklyCostUsd: 0 },
  google: { weeklyTokens: 10_000_000, weeklyCostUsd: 50 },
  anthropic: { weeklyTokens: 1_000_000, weeklyCostUsd: 20 },
  openai: { weeklyTokens: 5_000_000, weeklyCostUsd: 30 },
  other: { weeklyTokens: 2_000_000, weeklyCostUsd: 20 },
};

type UsageRecord = {
  ts: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type ProviderUsage = {
  records: UsageRecord[];
};

const providerUsageMap = new Map<string, ProviderUsage>();

export function resolveProviderCategory(provider: string): ProviderCategory {
  const lower = provider.toLowerCase();
  // ":free" or "/free" suffix → OpenRouter free tier models
  if (lower.endsWith(":free") || lower.includes("/free")) {
    return "free";
  }
  return PROVIDER_CATEGORY_MAP[lower] ?? "other";
}

function pruneOldRecords(usage: ProviderUsage): void {
  const cutoff = Date.now() - ROLLING_WINDOW_MS;
  if (usage.records.length > 0 && usage.records[0].ts < cutoff) {
    usage.records = usage.records.filter((r) => r.ts >= cutoff);
  }
}

function getRollingTotals(usage: ProviderUsage): { tokens: number; costUsd: number } {
  pruneOldRecords(usage);
  let tokens = 0;
  let costUsd = 0;
  for (const r of usage.records) {
    tokens += r.inputTokens + r.outputTokens;
    costUsd += r.costUsd;
  }
  return { tokens, costUsd };
}

/**
 * Record completed API call usage for a provider.
 * Called after each successful LLM API response.
 */
export function recordProviderUsage(params: {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}): void {
  const { provider, inputTokens, outputTokens, costUsd = 0 } = params;
  if (!provider || (inputTokens === 0 && outputTokens === 0)) {
    return;
  }

  let usage = providerUsageMap.get(provider);
  if (!usage) {
    usage = { records: [] };
    providerUsageMap.set(provider, usage);
  }

  usage.records.push({ ts: Date.now(), inputTokens, outputTokens, costUsd });

  // Prune old records periodically to keep memory bounded
  if (usage.records.length % 50 === 0) {
    pruneOldRecords(usage);
  }
}

/**
 * Get the dynamic priority score for a provider.
 * Lower score = higher priority (model will be ranked first).
 *
 * Score = basePriority + dynamicPenalty
 * dynamicPenalty = 0–40 based on how close to quota limits (kicks in at 50% usage)
 */
export function getProviderPriorityScore(provider: string, isFree?: boolean): number {
  // Explicitly free models (isFree catalog flag) always win
  if (isFree) {
    return 0;
  }

  const category = resolveProviderCategory(provider);
  const baseScore = PROVIDER_BASE_PRIORITY[category];

  // Free category has no limits, so no penalty ever applies
  if (category === "free") {
    return baseScore;
  }

  const limits = PROVIDER_LIMITS[category];
  const usage = providerUsageMap.get(provider);
  if (!usage || usage.records.length === 0) {
    return baseScore;
  }

  const { tokens, costUsd } = getRollingTotals(usage);

  let maxUsageFraction = 0;
  if (limits.weeklyTokens > 0) {
    maxUsageFraction = Math.max(maxUsageFraction, tokens / limits.weeklyTokens);
  }
  if (limits.weeklyCostUsd > 0) {
    maxUsageFraction = Math.max(maxUsageFraction, costUsd / limits.weeklyCostUsd);
  }

  // Penalty: 0 at <50% usage, scales to 40 at 100%+ usage
  // Ensures providers at quota get deprioritized within their tier
  // without jumping above a higher-priority provider tier in most cases
  const penalty =
    maxUsageFraction > 0.5 ? Math.min(40, Math.round((maxUsageFraction - 0.5) * 80)) : 0;

  return baseScore + penalty;
}

export type BudgetStatusEntry = {
  provider: string;
  category: ProviderCategory;
  baseScore: number;
  dynamicScore: number;
  weeklyTokens: number;
  weeklyCostUsd: number;
  tokenLimit: number;
  costLimit: number;
  tokenUsagePct: number;
  costUsagePct: number;
};

/**
 * Get budget status for all tracked providers.
 * Used by the `models.budget.status` gateway RPC.
 */
export function getBudgetStatus(): BudgetStatusEntry[] {
  const results: BudgetStatusEntry[] = [];

  for (const [provider, usage] of providerUsageMap.entries()) {
    const category = resolveProviderCategory(provider);
    const limits = PROVIDER_LIMITS[category];
    const baseScore = PROVIDER_BASE_PRIORITY[category];
    const dynamicScore = getProviderPriorityScore(provider);
    const { tokens, costUsd } = getRollingTotals(usage);

    results.push({
      provider,
      category,
      baseScore,
      dynamicScore,
      weeklyTokens: tokens,
      weeklyCostUsd: costUsd,
      tokenLimit: limits.weeklyTokens,
      costLimit: limits.weeklyCostUsd,
      tokenUsagePct: limits.weeklyTokens > 0 ? Math.round((tokens / limits.weeklyTokens) * 100) : 0,
      costUsagePct:
        limits.weeklyCostUsd > 0 ? Math.round((costUsd / limits.weeklyCostUsd) * 100) : 0,
    });
  }

  return results.toSorted((a, b) => a.dynamicScore - b.dynamicScore);
}

/** Clear all usage data (for test isolation). */
export function resetBudgetManager(): void {
  providerUsageMap.clear();
}
