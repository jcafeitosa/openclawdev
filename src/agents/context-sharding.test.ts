import { describe, it, expect } from "vitest";
import {
  estimateStringTokens,
  computeShardCount,
  splitIntoShards,
  createShardPlan,
  mergeConcat,
  mergeVote,
  buildMergePrompt,
} from "./context-sharding.js";

describe("context-sharding", () => {
  describe("estimateStringTokens", () => {
    it("should estimate tokens as chars/4", () => {
      expect(estimateStringTokens("")).toBe(0);
      expect(estimateStringTokens("abcd")).toBe(1);
      expect(estimateStringTokens("a".repeat(100))).toBe(25);
      expect(estimateStringTokens("a".repeat(101))).toBe(26); // ceil
    });
  });

  describe("computeShardCount", () => {
    it("should return 1 when content fits in a single context", () => {
      // 100 tokens, context 200k, 60% utilization = 120k usable
      expect(computeShardCount(100, 200_000, 200)).toBe(1);
    });

    it("should return correct shard count for large content", () => {
      // 300k tokens, context 200k, 60% util = 120k per shard, overlap 200
      // Effective shard size = 120000 - 200 = 119800
      // (300000 - 200) / 119800 ≈ 2.5 → 3
      expect(computeShardCount(300_000, 200_000, 200)).toBe(3);
    });

    it("should return 1 for exact fit", () => {
      // 120000 tokens exactly fills 200k * 0.6
      expect(computeShardCount(120_000, 200_000, 200)).toBe(1);
    });

    it("should handle zero overlap", () => {
      expect(computeShardCount(250_000, 200_000, 0)).toBeGreaterThan(1);
    });
  });

  describe("splitIntoShards", () => {
    it("should return single shard when shardCount is 1", () => {
      const shards = splitIntoShards("Hello world", 1, 0);
      expect(shards).toHaveLength(1);
      expect(shards[0].content).toBe("Hello world");
      expect(shards[0].isFirst).toBe(true);
      expect(shards[0].isLast).toBe(true);
    });

    it("should split into multiple shards", () => {
      const content = "A".repeat(1000);
      const shards = splitIntoShards(content, 3, 0);
      expect(shards).toHaveLength(3);
      expect(shards[0].isFirst).toBe(true);
      expect(shards[0].isLast).toBe(false);
      expect(shards[2].isFirst).toBe(false);
      expect(shards[2].isLast).toBe(true);
    });

    it("should include overlap between shards", () => {
      const content = "A".repeat(1200);
      const overlapTokens = 25; // 25 tokens = ~100 chars
      const shards = splitIntoShards(content, 3, overlapTokens);
      expect(shards).toHaveLength(3);
      // Second shard should start before where first shard ends (overlap)
      // Total chars in all shards should be > original due to overlap
      const totalChars = shards.reduce((sum, s) => sum + s.content.length, 0);
      expect(totalChars).toBeGreaterThan(content.length);
    });

    it("should set correct shard indices", () => {
      const shards = splitIntoShards("A".repeat(300), 3, 0);
      expect(shards[0].index).toBe(0);
      expect(shards[1].index).toBe(1);
      expect(shards[2].index).toBe(2);
    });

    it("should estimate tokens per shard", () => {
      const shards = splitIntoShards("A".repeat(400), 2, 0);
      for (const shard of shards) {
        expect(shard.estimatedTokens).toBeGreaterThan(0);
      }
    });
  });

  describe("createShardPlan", () => {
    it("should auto-detect shard count", () => {
      const plan = createShardPlan({
        content: "A".repeat(800_000), // ~200k tokens
        shardCount: "auto",
        overlapTokens: 200,
        taskPerShard: "Analyze this content",
        mergeStrategy: "concat",
        contextWindowTokens: 200_000,
      });
      expect(plan.shards.length).toBeGreaterThanOrEqual(1);
      expect(plan.mergeStrategy).toBe("concat");
      expect(plan.taskPerShard).toBe("Analyze this content");
    });

    it("should use explicit shard count", () => {
      const plan = createShardPlan({
        content: "Hello world",
        shardCount: 3,
        overlapTokens: 0,
        taskPerShard: "Process",
        mergeStrategy: "vote",
      });
      expect(plan.shards).toHaveLength(3);
      expect(plan.mergeStrategy).toBe("vote");
    });

    it("should return single shard for small content", () => {
      const plan = createShardPlan({
        content: "Short text",
        shardCount: "auto",
        overlapTokens: 200,
        taskPerShard: "Analyze",
        mergeStrategy: "concat",
      });
      expect(plan.shards).toHaveLength(1);
    });
  });

  describe("mergeConcat", () => {
    it("should join results with separator", () => {
      const result = mergeConcat(["Result A", "Result B"]);
      expect(result).toContain("Result A");
      expect(result).toContain("Result B");
      expect(result).toContain("---");
    });

    it("should filter empty results", () => {
      const result = mergeConcat(["Result A", "", "Result B"]);
      expect(result).toBe("Result A\n\n---\n\nResult B");
    });

    it("should use custom separator", () => {
      const result = mergeConcat(["A", "B"], " | ");
      expect(result).toBe("A | B");
    });
  });

  describe("mergeVote", () => {
    it("should return majority winner", () => {
      const result = mergeVote(["Yes", "Yes", "No"]);
      expect(result.winner).toBe("Yes");
      expect(result.votes).toBe(2);
      expect(result.total).toBe(3);
    });

    it("should handle case-insensitive comparison", () => {
      const result = mergeVote(["yes", "YES", "no"]);
      expect(result.votes).toBe(2);
    });

    it("should handle single result", () => {
      const result = mergeVote(["Only"]);
      expect(result.winner).toBe("Only");
      expect(result.votes).toBe(1);
    });

    it("should handle tie (returns first to reach max)", () => {
      const result = mergeVote(["A", "B"]);
      expect(result.votes).toBe(1);
      expect(result.total).toBe(2);
    });
  });

  describe("buildMergePrompt", () => {
    it("should include original task", () => {
      const prompt = buildMergePrompt("Analyze the code", [
        { shardIndex: 0, result: "Found bug A" },
        { shardIndex: 1, result: "Found bug B" },
      ]);
      expect(prompt).toContain("Analyze the code");
    });

    it("should include all shard results", () => {
      const prompt = buildMergePrompt("Task", [
        { shardIndex: 0, result: "Result 0" },
        { shardIndex: 1, result: "Result 1" },
      ]);
      expect(prompt).toContain("Shard 1 Result");
      expect(prompt).toContain("Result 0");
      expect(prompt).toContain("Shard 2 Result");
      expect(prompt).toContain("Result 1");
    });

    it("should include merge instructions", () => {
      const prompt = buildMergePrompt("Task", [{ shardIndex: 0, result: "R" }]);
      expect(prompt).toContain("Merge these partial results");
    });
  });
});
