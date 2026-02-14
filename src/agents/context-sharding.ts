/**
 * Context sharding: split large content across multiple agents for parallel processing.
 *
 * When a task exceeds a single model's context window, shard the content
 * into overlapping chunks and dispatch each to a separate agent.
 *
 * Shard strategies:
 * - Auto: compute shard count from estimated tokens vs context window
 * - Manual: specify exact shard count
 *
 * Merge strategies:
 * - concat: join results (independent analysis like code review)
 * - summarize: spawn merge agent to synthesize partial results
 * - vote: majority vote (classification/decision tasks)
 */

// ── Token estimation (lightweight, no pi-agent dependency) ──

/**
 * Estimate token count from a string.
 * Uses chars/4 heuristic (standard GPT tokenizer approximation).
 */
export function estimateStringTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Types ──

export type MergeStrategy = "concat" | "summarize" | "vote";

export type ShardConfig = {
  /** Content to shard. */
  content: string;
  /** Number of shards, or "auto" to compute from content size. */
  shardCount: number | "auto";
  /** Number of overlap tokens between adjacent shards for context continuity. */
  overlapTokens: number;
  /** Task/prompt to execute on each shard. */
  taskPerShard: string;
  /** How to merge shard results. */
  mergeStrategy: MergeStrategy;
  /** Target context window in tokens (used for auto shard count). */
  contextWindowTokens?: number;
};

export type Shard = {
  index: number;
  content: string;
  estimatedTokens: number;
  /** Whether this is the first shard (may have special context). */
  isFirst: boolean;
  /** Whether this is the last shard. */
  isLast: boolean;
};

export type ShardPlan = {
  shards: Shard[];
  totalTokens: number;
  overlapTokens: number;
  mergeStrategy: MergeStrategy;
  taskPerShard: string;
};

// ── Default context window ──

const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;
/** Use 60% of context window per shard to leave room for system prompt + response. */
const CONTEXT_UTILIZATION = 0.6;

// ── Sharding logic ──

/**
 * Compute optimal shard count for given content and context window.
 */
export function computeShardCount(
  totalTokens: number,
  contextWindowTokens: number,
  overlapTokens: number,
): number {
  const usableTokens = Math.floor(contextWindowTokens * CONTEXT_UTILIZATION);
  if (totalTokens <= usableTokens) {
    return 1; // fits in a single context
  }
  // Account for overlap: each shard adds overlapTokens except the first
  const effectiveShardSize = usableTokens - overlapTokens;
  if (effectiveShardSize <= 0) {
    return Math.ceil(totalTokens / usableTokens);
  }
  return Math.ceil((totalTokens - overlapTokens) / effectiveShardSize);
}

/**
 * Split content into overlapping shards based on character boundaries.
 * Tries to split at paragraph or line boundaries when possible.
 */
export function splitIntoShards(
  content: string,
  shardCount: number,
  overlapTokens: number,
): Shard[] {
  if (shardCount <= 1) {
    return [
      {
        index: 0,
        content,
        estimatedTokens: estimateStringTokens(content),
        isFirst: true,
        isLast: true,
      },
    ];
  }

  const totalChars = content.length;
  const overlapChars = overlapTokens * 4; // reverse token estimation
  const baseChunkSize = Math.ceil(totalChars / shardCount);
  const shards: Shard[] = [];

  for (let i = 0; i < shardCount; i++) {
    const rawStart = i * baseChunkSize - (i > 0 ? overlapChars : 0);
    const start = Math.max(0, rawStart);
    const rawEnd = (i + 1) * baseChunkSize;
    const end = Math.min(totalChars, rawEnd);

    // Try to find a clean break point (paragraph or line boundary)
    let adjustedEnd = end;
    if (i < shardCount - 1 && end < totalChars) {
      const searchWindow = Math.min(200, baseChunkSize / 4);
      const searchStart = Math.max(end - searchWindow, start);
      const searchText = content.slice(searchStart, end + searchWindow);

      // Prefer paragraph break
      const paragraphBreak = searchText.lastIndexOf("\n\n");
      if (paragraphBreak > 0) {
        adjustedEnd = searchStart + paragraphBreak + 2;
      } else {
        // Fall back to line break
        const lineBreak = searchText.lastIndexOf("\n");
        if (lineBreak > 0) {
          adjustedEnd = searchStart + lineBreak + 1;
        }
      }
    }

    const shardContent = content.slice(start, adjustedEnd);
    shards.push({
      index: i,
      content: shardContent,
      estimatedTokens: estimateStringTokens(shardContent),
      isFirst: i === 0,
      isLast: i === shardCount - 1,
    });
  }

  return shards;
}

/**
 * Create a shard plan for the given configuration.
 */
export function createShardPlan(config: ShardConfig): ShardPlan {
  const totalTokens = estimateStringTokens(config.content);
  const contextWindow = config.contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW_TOKENS;

  const shardCount =
    config.shardCount === "auto"
      ? computeShardCount(totalTokens, contextWindow, config.overlapTokens)
      : Math.max(1, config.shardCount);

  const shards = splitIntoShards(config.content, shardCount, config.overlapTokens);

  return {
    shards,
    totalTokens,
    overlapTokens: config.overlapTokens,
    mergeStrategy: config.mergeStrategy,
    taskPerShard: config.taskPerShard,
  };
}

// ── Merge strategies ──

/**
 * Merge shard results using the concat strategy.
 * Simply joins all results with a separator.
 */
export function mergeConcat(results: string[], separator = "\n\n---\n\n"): string {
  return results.filter(Boolean).join(separator);
}

/**
 * Merge shard results using the vote strategy.
 * Returns the most common result (majority vote).
 */
export function mergeVote(results: string[]): {
  winner: string;
  votes: number;
  total: number;
} {
  const counts = new Map<string, number>();
  for (const result of results) {
    const normalized = result.trim().toLowerCase();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  let winner = "";
  let maxVotes = 0;
  for (const [result, count] of counts) {
    if (count > maxVotes) {
      winner = result;
      maxVotes = count;
    }
  }

  // Find the original (non-normalized) version
  const originalWinner = results.find((r) => r.trim().toLowerCase() === winner) ?? winner;

  return {
    winner: originalWinner,
    votes: maxVotes,
    total: results.length,
  };
}

/**
 * Build a merge prompt for the "summarize" strategy.
 * This prompt is sent to a merge agent to synthesize partial results.
 */
export function buildMergePrompt(
  originalTask: string,
  shardResults: Array<{ shardIndex: number; result: string }>,
): string {
  const shardSummaries = shardResults
    .map((s) => `## Shard ${s.shardIndex + 1} Result\n${s.result}`)
    .join("\n\n");

  return (
    `You are synthesizing results from ${shardResults.length} parallel analysis shards.\n\n` +
    `**Original Task:** ${originalTask}\n\n` +
    `**Shard Results:**\n\n${shardSummaries}\n\n` +
    `**Instructions:** Merge these partial results into a single coherent response. ` +
    `Resolve any contradictions. Eliminate redundancy. Preserve all unique insights. ` +
    `The final response should read as if a single agent processed the entire content.`
  );
}
