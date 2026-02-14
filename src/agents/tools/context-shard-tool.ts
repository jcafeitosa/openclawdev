/**
 * Tool: context_shard
 *
 * Allows orchestrator/lead agents to split large content across multiple
 * agents for parallel processing. Creates a shard plan and returns
 * spawn-ready task configurations for sessions_spawn_batch.
 */

import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import {
  createShardPlan,
  estimateStringTokens,
  mergeConcat,
  mergeVote,
  buildMergePrompt,
  type MergeStrategy,
} from "../context-sharding.js";
import { optionalStringEnum } from "../schema/typebox.js";
import { jsonResult } from "./common.js";

const ContextShardToolSchema = Type.Object({
  content: Type.String({ description: "The large content to shard across agents" }),
  taskPerShard: Type.String({
    description: "The task/prompt to execute on each shard",
  }),
  shardCount: Type.Optional(
    Type.Number({
      minimum: 1,
      description: "Number of shards. Omit for auto-detection based on content size.",
    }),
  ),
  overlapTokens: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "Token overlap between shards for context continuity (default: 200)",
    }),
  ),
  mergeStrategy: optionalStringEnum(["concat", "summarize", "vote"] as const),
  contextWindowTokens: Type.Optional(
    Type.Number({
      minimum: 1000,
      description: "Target context window per shard (default: 200000)",
    }),
  ),
  shardResults: Type.Optional(
    Type.Array(
      Type.Object({
        shardIndex: Type.Number(),
        result: Type.String(),
      }),
      { description: "Shard results to merge (for the merge phase)" },
    ),
  ),
});

export function createContextShardTool(): AnyAgentTool {
  return {
    label: "Planning",
    name: "context_shard",
    description:
      "Split large content into shards for parallel processing across multiple agents, " +
      "or merge shard results. Call without shardResults to create a shard plan. " +
      "Call with shardResults to merge completed results.",
    parameters: ContextShardToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const content = typeof params.content === "string" ? params.content : "";
      const taskPerShard =
        typeof params.taskPerShard === "string" ? params.taskPerShard.trim() : "";
      const mergeStrategy: MergeStrategy =
        params.mergeStrategy === "concat" ||
        params.mergeStrategy === "summarize" ||
        params.mergeStrategy === "vote"
          ? params.mergeStrategy
          : "concat";

      // Merge phase: combine shard results
      const shardResults = Array.isArray(params.shardResults) ? params.shardResults : null;
      if (shardResults && shardResults.length > 0) {
        return handleMerge(
          taskPerShard || "merge",
          mergeStrategy,
          shardResults as Array<{ shardIndex: number; result: string }>,
        );
      }

      // Plan phase: create shard plan
      if (!content) {
        return jsonResult({ status: "error", error: "Content is required" });
      }
      if (!taskPerShard) {
        return jsonResult({ status: "error", error: "taskPerShard is required" });
      }

      const shardCount =
        typeof params.shardCount === "number" && Number.isFinite(params.shardCount)
          ? Math.max(1, Math.floor(params.shardCount))
          : ("auto" as const);
      const overlapTokens =
        typeof params.overlapTokens === "number" && Number.isFinite(params.overlapTokens)
          ? Math.max(0, Math.floor(params.overlapTokens))
          : 200;
      const contextWindowTokens =
        typeof params.contextWindowTokens === "number" &&
        Number.isFinite(params.contextWindowTokens)
          ? Math.max(1000, Math.floor(params.contextWindowTokens))
          : undefined;

      const totalTokens = estimateStringTokens(content);

      const plan = createShardPlan({
        content,
        shardCount,
        overlapTokens,
        taskPerShard,
        mergeStrategy,
        contextWindowTokens,
      });

      return jsonResult({
        status: "ok",
        totalTokens,
        shardCount: plan.shards.length,
        mergeStrategy,
        shards: plan.shards.map((s) => ({
          index: s.index,
          estimatedTokens: s.estimatedTokens,
          contentPreview: s.content.slice(0, 100) + (s.content.length > 100 ? "..." : ""),
          isFirst: s.isFirst,
          isLast: s.isLast,
        })),
        // Ready-to-use task descriptors for sessions_spawn_batch
        spawnTasks: plan.shards.map((s) => ({
          task:
            `[Shard ${s.index + 1}/${plan.shards.length}] ${taskPerShard}\n\n` +
            `--- Content (shard ${s.index + 1}) ---\n${s.content}`,
          label: `shard-${s.index + 1}-of-${plan.shards.length}`,
        })),
        hint:
          plan.shards.length > 1
            ? `Use sessions_spawn_batch with waitMode="all" to process all shards in parallel, then call context_shard again with shardResults to merge.`
            : "Content fits in a single shard — no sharding needed.",
      });
    },
  };
}

function handleMerge(
  originalTask: string,
  strategy: MergeStrategy,
  results: Array<{ shardIndex: number; result: string }>,
) {
  const sorted = results.sort((a, b) => a.shardIndex - b.shardIndex);

  if (strategy === "concat") {
    const merged = mergeConcat(sorted.map((r) => r.result));
    return jsonResult({
      status: "ok",
      mergeStrategy: "concat",
      merged,
    });
  }

  if (strategy === "vote") {
    const voteResult = mergeVote(sorted.map((r) => r.result));
    return jsonResult({
      status: "ok",
      mergeStrategy: "vote",
      winner: voteResult.winner,
      votes: voteResult.votes,
      total: voteResult.total,
    });
  }

  // summarize: return a merge prompt for a merge agent
  const mergePrompt = buildMergePrompt(originalTask, sorted);
  return jsonResult({
    status: "ok",
    mergeStrategy: "summarize",
    mergePrompt,
    hint: "Send this mergePrompt to an agent via sessions_spawn to get the final synthesized result.",
  });
}
