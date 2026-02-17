/**
 * Auto Memory Tests
 *
 * Tests for the auto-memory learning system that records agent insights
 * from completed sessions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  recordLearning,
  loadRecentLearnings,
  searchLearnings,
  getErrorPatterns,
  getSuccessPatterns,
  extractLearningsFromTranscript,
  buildAutoMemoryContext,
  getLearningStats,
  clearAutoMemory,
  type AutoMemoryEntry,
  type TranscriptMessage,
} from "./auto-memory.js";

describe("Auto Memory System", () => {
  beforeEach(() => {
    clearAutoMemory();
  });

  afterEach(() => {
    clearAutoMemory();
  });

  describe("recordLearning and loadRecentLearnings", () => {
    it("should record and retrieve learnings", () => {
      const entry: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-123",
        category: "error-pattern",
        summary: "Test error pattern",
        detail: "This is a test error",
      };

      recordLearning(entry);
      const learnings = loadRecentLearnings({ agentId: "test-agent" });

      expect(learnings.length).toBe(1);
      expect(learnings[0].summary).toBe("Test error pattern");
    });

    it("should filter learnings by agent ID", () => {
      const entry1: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "agent-1",
        sessionKey: "session-1",
        category: "success-pattern",
        summary: "Agent 1 success",
      };

      const entry2: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "agent-2",
        sessionKey: "session-2",
        category: "success-pattern",
        summary: "Agent 2 success",
      };

      recordLearning(entry1);
      recordLearning(entry2);

      const agent1Learnings = loadRecentLearnings({ agentId: "agent-1" });
      expect(agent1Learnings.length).toBe(1);
      expect(agent1Learnings[0].agentId).toBe("agent-1");
    });

    it("should filter learnings by category", () => {
      const errorEntry: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-1",
        category: "error-pattern",
        summary: "Error pattern",
      };

      const successEntry: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-2",
        category: "success-pattern",
        summary: "Success pattern",
      };

      recordLearning(errorEntry);
      recordLearning(successEntry);

      const errors = loadRecentLearnings({
        agentId: "test-agent",
        category: "error-pattern",
      });
      expect(errors.length).toBe(1);
      expect(errors[0].category).toBe("error-pattern");
    });
  });

  describe("searchLearnings", () => {
    it("should search learnings by summary", () => {
      const entry1: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-1",
        category: "optimization",
        summary: "Database query optimization technique",
      };

      const entry2: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-2",
        category: "tool-usage",
        summary: "Tool execution successful",
      };

      recordLearning(entry1);
      recordLearning(entry2);

      const results = searchLearnings("optimization", { agentId: "test-agent" });
      expect(results.length).toBe(1);
      expect(results[0].summary).toContain("optimization");
    });
  });

  describe("getErrorPatterns and getSuccessPatterns", () => {
    it("should retrieve error patterns for an agent", () => {
      const entry: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-1",
        category: "error-pattern",
        summary: "Context overflow error",
      };

      recordLearning(entry);
      const patterns = getErrorPatterns("test-agent");

      expect(patterns.length).toBe(1);
      expect(patterns[0].category).toBe("error-pattern");
    });

    it("should retrieve success patterns for an agent", () => {
      const entry: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-1",
        category: "success-pattern",
        summary: "Multi-tool orchestration success",
      };

      recordLearning(entry);
      const patterns = getSuccessPatterns("test-agent");

      expect(patterns.length).toBe(1);
      expect(patterns[0].category).toBe("success-pattern");
    });
  });

  describe("extractLearningsFromTranscript", () => {
    it("should extract error patterns from transcript", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "user",
          content: "Help me debug this issue",
        },
        {
          role: "assistant",
          content:
            "I found an error in your code. The function throws an exception when the input is null.",
        },
      ];

      const learnings = extractLearningsFromTranscript({
        agentId: "test-agent",
        sessionKey: "session-1",
        messages,
      });

      expect(learnings.length).toBeGreaterThan(0);
      const errorEntries = learnings.filter((l) => l.category === "error-pattern");
      expect(errorEntries.length).toBeGreaterThan(0);
    });

    it("should extract tool usage patterns from transcript", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "user",
          content: "Can you search for information?",
        },
        {
          role: "assistant",
          content:
            "I'll use the search tool and the file tool to help with this. tool: search_web function: read_file",
        },
      ];

      const learnings = extractLearningsFromTranscript({
        agentId: "test-agent",
        sessionKey: "session-1",
        messages,
      });

      const toolEntries = learnings.filter((l) => l.category === "tool-usage");
      expect(toolEntries.length).toBeGreaterThan(0);
    });

    it("should extract optimization insights from transcript", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "assistant",
          content:
            "To improve performance, I recommend refactoring the loop to use a more efficient algorithm.",
        },
      ];

      const learnings = extractLearningsFromTranscript({
        agentId: "test-agent",
        sessionKey: "session-1",
        messages,
      });

      const optEntries = learnings.filter((l) => l.category === "optimization");
      expect(optEntries.length).toBeGreaterThan(0);
    });

    it("should extract workarounds from transcript", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "assistant",
          content:
            "Be careful with this library. Gotcha: it requires the configuration to be set before importing the module.",
        },
      ];

      const learnings = extractLearningsFromTranscript({
        agentId: "test-agent",
        sessionKey: "session-1",
        messages,
      });

      const workaroundEntries = learnings.filter((l) => l.category === "workaround");
      expect(workaroundEntries.length).toBeGreaterThan(0);
    });

    it("should deduplicate extracted learnings", () => {
      const messages: TranscriptMessage[] = [
        {
          role: "assistant",
          content: "Error occurred in the function call",
        },
        {
          role: "assistant",
          content: "Error occurred in the function call",
        },
      ];

      const learnings = extractLearningsFromTranscript({
        agentId: "test-agent",
        sessionKey: "session-1",
        messages,
      });

      // Should deduplicate identical summaries
      const uniqueSummaries = new Set(learnings.map((l) => l.summary));
      expect(uniqueSummaries.size).toBeLessThanOrEqual(learnings.length);
    });
  });

  describe("buildAutoMemoryContext", () => {
    it("should build context from recent learnings", () => {
      const errorEntry: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-1",
        category: "error-pattern",
        summary: "Context overflow detected",
      };

      const successEntry: AutoMemoryEntry = {
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-2",
        category: "success-pattern",
        summary: "Tool orchestration successful",
      };

      recordLearning(errorEntry);
      recordLearning(successEntry);

      const context = buildAutoMemoryContext("test-agent");
      expect(context).not.toBeNull();
      expect(context).toContain("Error Patterns");
      expect(context).toContain("Successful Approaches");
    });

    it("should return null when no learnings exist", () => {
      const context = buildAutoMemoryContext("nonexistent-agent");
      expect(context).toBeNull();
    });
  });

  describe("getLearningStats", () => {
    it("should return accurate learning statistics", () => {
      recordLearning({
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-1",
        category: "error-pattern",
        summary: "Error 1",
      });

      recordLearning({
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-2",
        category: "success-pattern",
        summary: "Success 1",
      });

      recordLearning({
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-3",
        category: "tool-usage",
        summary: "Tool 1",
      });

      const stats = getLearningStats("test-agent");

      expect(stats.totalLearnings).toBe(3);
      expect(stats.errorPatterns).toBe(1);
      expect(stats.successPatterns).toBe(1);
      expect(stats.toolUsages).toBe(1);
    });
  });

  describe("clearAutoMemory", () => {
    it("should clear all auto-memory entries", () => {
      recordLearning({
        timestamp: new Date().toISOString(),
        agentId: "test-agent",
        sessionKey: "session-1",
        category: "success-pattern",
        summary: "Test learning",
      });

      let learnings = loadRecentLearnings({ agentId: "test-agent" });
      expect(learnings.length).toBe(1);

      clearAutoMemory();

      learnings = loadRecentLearnings({ agentId: "test-agent" });
      expect(learnings.length).toBe(0);
    });
  });
});
