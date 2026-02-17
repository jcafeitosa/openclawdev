/**
 * Auto Memory - Automatically records agent learnings after each run.
 * Extracts key insights from conversations and saves them to persistent storage.
 *
 * Similar to Claude Code CLI's auto memory, this system:
 * - Captures learnings from completed agent sessions
 * - Records patterns, errors, and successful approaches
 * - Maintains a searchable history of insights
 * - Integrates with the post-run hook system
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Auto Memory Entry - represents a single recorded learning or insight
 */
export type AutoMemoryEntry = {
  /** ISO timestamp of when this learning was recorded */
  timestamp: string;
  /** The agent ID that generated this learning */
  agentId: string;
  /** Session key where the learning occurred */
  sessionKey: string;
  /** Category of the learning */
  category:
    | "error-pattern"
    | "success-pattern"
    | "tool-usage"
    | "codebase-insight"
    | "user-preference"
    | "optimization"
    | "pitfall"
    | "workaround";
  /** Short summary of the learning */
  summary: string;
  /** Detailed explanation of the learning */
  detail?: string;
  /** Related codebase paths or file names */
  relatedFiles?: string[];
  /** Occurrence count for recurring patterns */
  occurrenceCount?: number;
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const AUTO_MEMORY_DIR = join(homedir(), ".openclaw", "auto-memory");
const AUTO_MEMORY_FILE = join(AUTO_MEMORY_DIR, "learnings.jsonl");
const MAX_ENTRIES = 1000;

// ---------------------------------------------------------------------------
// Directory & File Management
// ---------------------------------------------------------------------------

/**
 * Ensure the auto-memory directory exists
 */
function ensureDir(): void {
  if (!existsSync(AUTO_MEMORY_DIR)) {
    mkdirSync(AUTO_MEMORY_DIR, { recursive: true });
  }
}

/**
 * Record a single learning entry to the auto-memory store
 */
export function recordLearning(entry: AutoMemoryEntry): void {
  ensureDir();
  const line = JSON.stringify(entry) + "\n";
  appendFileSync(AUTO_MEMORY_FILE, line, "utf-8");
  pruneOldEntries();
}

/**
 * Load recent learnings from the auto-memory store
 */
export function loadRecentLearnings(params?: {
  agentId?: string;
  limit?: number;
  category?: AutoMemoryEntry["category"];
}): AutoMemoryEntry[] {
  if (!existsSync(AUTO_MEMORY_FILE)) {
    return [];
  }

  try {
    const raw = readFileSync(AUTO_MEMORY_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    let entries: AutoMemoryEntry[] = lines
      .map((line) => {
        try {
          return JSON.parse(line) as AutoMemoryEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is AutoMemoryEntry => e !== null);

    // Filter by agent ID if provided
    if (params?.agentId) {
      entries = entries.filter((e) => e.agentId === params.agentId);
    }

    // Filter by category if provided
    if (params?.category) {
      entries = entries.filter((e) => e.category === params.category);
    }

    // Return most recent N entries
    const limit = params?.limit ?? 50;
    return entries.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Search learnings by keywords
 */
export function searchLearnings(
  query: string,
  params?: { agentId?: string; limit?: number },
): AutoMemoryEntry[] {
  const learnings = loadRecentLearnings({
    agentId: params?.agentId,
    limit: params?.limit ?? 100,
  });

  const lowerQuery = query.toLowerCase();
  return learnings.filter(
    (entry) =>
      entry.summary.toLowerCase().includes(lowerQuery) ||
      entry.detail?.toLowerCase().includes(lowerQuery) ||
      entry.relatedFiles?.some((f) => f.toLowerCase().includes(lowerQuery)),
  );
}

/**
 * Get all unique error patterns for an agent
 */
export function getErrorPatterns(agentId: string): AutoMemoryEntry[] {
  return loadRecentLearnings({
    agentId,
    category: "error-pattern",
    limit: 100,
  });
}

/**
 * Get all successful approaches for an agent
 */
export function getSuccessPatterns(agentId: string): AutoMemoryEntry[] {
  return loadRecentLearnings({
    agentId,
    category: "success-pattern",
    limit: 100,
  });
}

// ---------------------------------------------------------------------------
// Pruning & Maintenance
// ---------------------------------------------------------------------------

/**
 * Remove old entries when we exceed MAX_ENTRIES
 */
function pruneOldEntries(): void {
  if (!existsSync(AUTO_MEMORY_FILE)) {
    return;
  }
  try {
    const raw = readFileSync(AUTO_MEMORY_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    if (lines.length <= MAX_ENTRIES) {
      return;
    }
    const pruned = lines.slice(-MAX_ENTRIES);
    writeFileSync(AUTO_MEMORY_FILE, pruned.join("\n") + "\n", "utf-8");
  } catch {
    // ignore prune errors
  }
}

/**
 * Clear all auto-memory entries (useful for testing or reset)
 */
export function clearAutoMemory(): void {
  if (existsSync(AUTO_MEMORY_FILE)) {
    writeFileSync(AUTO_MEMORY_FILE, "", "utf-8");
  }
}

// ---------------------------------------------------------------------------
// Learning Extraction from Transcripts
// ---------------------------------------------------------------------------

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string }>;
}

/**
 * Extract learnings from a session transcript.
 * Called after a session completes to identify key patterns and insights.
 */
export function extractLearningsFromTranscript(params: {
  agentId: string;
  sessionKey: string;
  messages: TranscriptMessage[];
}): AutoMemoryEntry[] {
  const { agentId, sessionKey, messages } = params;
  const entries: AutoMemoryEntry[] = [];
  const timestamp = new Date().toISOString();

  for (const msg of messages) {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : (msg.content?.map((c) => c.text ?? "").join(" ") ?? "");

    if (!text || text.length < 20) {
      continue;
    }

    // Detect error patterns
    if (msg.role === "assistant" && /error|failed|bug|fix|issue|exception/i.test(text)) {
      const summary = extractSummary(text, 200);
      entries.push({
        timestamp,
        agentId,
        sessionKey,
        category: "error-pattern",
        summary: `Error encountered: ${summary}`,
        detail: text.slice(0, 500),
      });
    }

    // Detect tool usage patterns — match explicit patterns or named tool references
    if (msg.role === "assistant") {
      const toolMatches = extractToolNames(text);
      // If no named tools found but generic keywords present, note generic usage
      if (toolMatches.length === 0 && /tool_use|function_call|invoke|execute/i.test(text)) {
        toolMatches.push("unknown");
      }
      if (toolMatches.length > 0) {
        entries.push({
          timestamp,
          agentId,
          sessionKey,
          category: "tool-usage",
          summary: `Tools used: ${toolMatches.join(", ")}`,
          relatedFiles: toolMatches,
        });
      }
    }

    // Detect optimization opportunities
    if (
      msg.role === "assistant" &&
      /optim|performance|faster|efficient|improve|refactor|simplif/i.test(text)
    ) {
      const summary = extractSummary(text, 200);
      entries.push({
        timestamp,
        agentId,
        sessionKey,
        category: "optimization",
        summary: `Optimization insight: ${summary}`,
        detail: text.slice(0, 500),
      });
    }

    // Detect workarounds and pitfalls
    if (
      msg.role === "assistant" &&
      /workaround|gotcha|pitfall|caution|warning|beware/i.test(text)
    ) {
      const summary = extractSummary(text, 200);
      entries.push({
        timestamp,
        agentId,
        sessionKey,
        category: "workaround",
        summary: `Workaround/Pitfall: ${summary}`,
        detail: text.slice(0, 500),
      });
    }

    // Detect user preferences
    if (msg.role === "user") {
      const prefMatches = extractUserPreferences(text);
      for (const pref of prefMatches) {
        entries.push({
          timestamp,
          agentId,
          sessionKey,
          category: "user-preference",
          summary: pref,
        });
      }
    }
  }

  // Deduplicate and limit to avoid spam
  const uniqueEntries = deduplicateEntries(entries);
  return uniqueEntries.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Learning Extraction Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a summary from text by taking the first N characters of the first sentence
 */
function extractSummary(text: string, maxLength: number): string {
  const cleaned = text.replace(/\n/g, " ").trim();
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim() || cleaned;
  return firstSentence.slice(0, maxLength);
}

/**
 * Extract tool/function names from text
 */
function extractToolNames(text: string): string[] {
  const toolPattern = /(?:tool|function|method):\s*(\w+)/gi;
  const matches = [];
  let match;
  while ((match = toolPattern.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return Array.from(new Set(matches)); // deduplicate
}

/**
 * Extract user preferences from user messages
 */
function extractUserPreferences(text: string): string[] {
  const prefs = [];

  // Check for format/style preferences
  if (/prefer|like|use|always|never|avoid|don't use/i.test(text)) {
    prefs.push(text.slice(0, 150));
  }

  return prefs;
}

/**
 * Remove duplicate entries based on summary and category
 */
function deduplicateEntries(entries: AutoMemoryEntry[]): AutoMemoryEntry[] {
  const seen = new Set<string>();
  const result = [];

  for (const entry of entries) {
    const key = `${entry.category}::${entry.summary}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Context Building for Agent Prompts
// ---------------------------------------------------------------------------

/**
 * Build auto-memory context snippet for injection into system prompts.
 * Returns recent learnings formatted for the agent to consume.
 */
export function buildAutoMemoryContext(agentId: string): string | null {
  const errorPatterns = getErrorPatterns(agentId);
  const successPatterns = getSuccessPatterns(agentId);

  if (errorPatterns.length === 0 && successPatterns.length === 0) {
    return null;
  }

  const sections = [];

  if (errorPatterns.length > 0) {
    sections.push("## Recent Error Patterns to Avoid");
    sections.push(
      errorPatterns
        .slice(-3)
        .map((e) => `- ${e.summary}`)
        .join("\n"),
    );
  }

  if (successPatterns.length > 0) {
    sections.push("## Successful Approaches");
    sections.push(
      successPatterns
        .slice(-3)
        .map((e) => `- ${e.summary}`)
        .join("\n"),
    );
  }

  return "\n" + sections.join("\n\n") + "\n";
}

/**
 * Get learning statistics for an agent
 */
export function getLearningStats(agentId: string): {
  totalLearnings: number;
  errorPatterns: number;
  successPatterns: number;
  toolUsages: number;
  optimizations: number;
} {
  const all = loadRecentLearnings({ agentId, limit: 500 });

  return {
    totalLearnings: all.length,
    errorPatterns: all.filter((e) => e.category === "error-pattern").length,
    successPatterns: all.filter((e) => e.category === "success-pattern").length,
    toolUsages: all.filter((e) => e.category === "tool-usage").length,
    optimizations: all.filter((e) => e.category === "optimization").length,
  };
}
