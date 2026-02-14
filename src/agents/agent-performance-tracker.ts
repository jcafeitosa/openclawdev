/**
 * Agent performance tracker.
 *
 * Tracks per-agent, per-task-type outcomes (success/failure/latency/cost)
 * and exposes a performance multiplier for use in capabilities-based routing.
 *
 * Design:
 * - Key: "agentId:taskType" (e.g., "coder:coding", "researcher:reasoning")
 * - New agents (< 3 attempts) get an exploration bonus (1.1x)
 * - Performance multiplier: 0.6 + (successRate * 0.4)
 *   - 100% success → 1.0 (full score)
 *   - 0% success → 0.6 (still considered but deprioritized)
 * - Persisted to disk every 60s, restored on startup
 */

import {
  loadPerformanceStoreFromDisk,
  savePerformanceStoreToDisk,
  type PerformanceRecord,
} from "./agent-performance-store.js";

const performanceRecords = new Map<string, PerformanceRecord>();
let persistTimer: NodeJS.Timeout | null = null;
let dirty = false;
let restored = false;

function makeKey(agentId: string, taskType: string): string {
  return `${agentId}:${taskType}`;
}

function ensurePersistTimer(): void {
  if (persistTimer) {
    return;
  }
  persistTimer = setInterval(() => {
    if (!dirty) {
      return;
    }
    dirty = false;
    try {
      savePerformanceStoreToDisk(performanceRecords);
    } catch {
      // ignore persistence failures
    }
  }, 60_000);
  persistTimer.unref?.();
}

/** Restore performance data from disk. Call once at startup. */
export function restorePerformanceTracker(): void {
  if (restored) {
    return;
  }
  restored = true;
  try {
    const loaded = loadPerformanceStoreFromDisk();
    for (const [key, record] of loaded.entries()) {
      if (!performanceRecords.has(key)) {
        performanceRecords.set(key, record);
      }
    }
  } catch {
    // ignore restore failures
  }
  ensurePersistTimer();
}

/**
 * Record an agent outcome (success or failure) for a specific task type.
 */
export function recordAgentOutcome(params: {
  agentId: string;
  taskType: string;
  success: boolean;
  latencyMs?: number;
  tokens?: number;
}): void {
  const key = makeKey(params.agentId, params.taskType);
  const existing = performanceRecords.get(key);
  const now = Date.now();

  if (existing) {
    existing.attempts += 1;
    if (params.success) {
      existing.successes += 1;
    } else {
      existing.failures += 1;
    }
    if (params.latencyMs) {
      existing.totalLatencyMs += params.latencyMs;
    }
    if (params.tokens) {
      existing.totalTokens += params.tokens;
    }
    existing.lastUsed = now;
  } else {
    performanceRecords.set(key, {
      agentId: params.agentId,
      taskType: params.taskType,
      attempts: 1,
      successes: params.success ? 1 : 0,
      failures: params.success ? 0 : 1,
      totalLatencyMs: params.latencyMs ?? 0,
      totalTokens: params.tokens ?? 0,
      lastUsed: now,
    });
  }

  dirty = true;
  ensurePersistTimer();
}

/** Minimum attempts before we trust the success rate (exploration phase). */
const EXPLORATION_THRESHOLD = 3;

/** Exploration bonus for new agents. */
const EXPLORATION_BONUS = 1.1;

/**
 * Get the performance multiplier for an agent on a specific task type.
 *
 * Returns a value between 0.6 and 1.1:
 * - New agents (< 3 attempts): 1.1 (exploration bonus)
 * - 100% success rate: 1.0
 * - 0% success rate: 0.6
 */
export function getPerformanceMultiplier(agentId: string, taskType: string): number {
  const key = makeKey(agentId, taskType);
  const record = performanceRecords.get(key);

  if (!record || record.attempts < EXPLORATION_THRESHOLD) {
    return EXPLORATION_BONUS;
  }

  const successRate = record.successes / record.attempts;
  return 0.6 + successRate * 0.4;
}

/**
 * Get performance stats for a specific agent across all task types.
 */
export function getAgentPerformanceStats(agentId: string): PerformanceRecord[] {
  const results: PerformanceRecord[] = [];
  for (const record of performanceRecords.values()) {
    if (record.agentId === agentId) {
      results.push({ ...record });
    }
  }
  return results;
}

/**
 * Get all performance records. Used by the gateway API endpoint.
 */
export function getAllPerformanceRecords(): PerformanceRecord[] {
  return Array.from(performanceRecords.values()).map((r) => ({ ...r }));
}

/** Flush pending changes to disk immediately. */
export function flushPerformanceTracker(): void {
  if (!dirty) {
    return;
  }
  dirty = false;
  try {
    savePerformanceStoreToDisk(performanceRecords);
  } catch {
    // ignore
  }
}

/** Reset for test isolation. */
export function resetPerformanceTrackerForTests(): void {
  performanceRecords.clear();
  dirty = false;
  restored = false;
  if (persistTimer) {
    clearInterval(persistTimer);
    persistTimer = null;
  }
}
