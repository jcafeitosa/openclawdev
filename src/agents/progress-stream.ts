/**
 * Progress Streaming — enables sub-agents to stream real-time progress
 * updates to parent orchestrators via the gateway event system.
 */

export type ProgressEvent = {
  type: "progress";
  sessionKey: string;
  parentSessionKey: string;
  runId: string;
  agentId?: string;
  progress: {
    percent: number; // 0-100
    status: string; // Current status message
    detail?: string; // Optional details
    phase?: string; // Current phase/step
    eta?: number; // Estimated time remaining (ms)
  };
  timestamp: number;
};

type ProgressListener = (event: ProgressEvent) => void;
const listeners = new Map<string, Set<ProgressListener>>();

/**
 * Subscribe to progress events for a parent session.
 * Returns unsubscribe function.
 */
export function onProgress(parentSessionKey: string, listener: ProgressListener): () => void {
  if (!listeners.has(parentSessionKey)) {
    listeners.set(parentSessionKey, new Set());
  }
  listeners.get(parentSessionKey)!.add(listener);
  return () => {
    listeners.get(parentSessionKey)?.delete(listener);
    if (listeners.get(parentSessionKey)?.size === 0) {
      listeners.delete(parentSessionKey);
    }
  };
}

/**
 * Emit a progress event from a sub-agent.
 * Called by sub-agents during execution to report progress.
 */
export function emitProgress(event: Omit<ProgressEvent, "type" | "timestamp">): void {
  const fullEvent: ProgressEvent = {
    ...event,
    type: "progress",
    timestamp: Date.now(),
  };

  const parentListeners = listeners.get(event.parentSessionKey);
  if (parentListeners) {
    for (const listener of parentListeners) {
      try {
        listener(fullEvent);
      } catch {
        // Don't let listener errors propagate
      }
    }
  }
}

/**
 * Aggregate progress from multiple sub-agents into a summary.
 */
export function aggregateProgress(events: ProgressEvent[]): {
  overall: number;
  byAgent: Record<string, { percent: number; status: string }>;
  summary: string;
} {
  if (events.length === 0) {
    return { overall: 0, byAgent: {}, summary: "No progress updates yet." };
  }

  // Get latest event per agent
  const latestByAgent = new Map<string, ProgressEvent>();
  for (const evt of events) {
    const key = evt.agentId ?? evt.sessionKey;
    const existing = latestByAgent.get(key);
    if (!existing || evt.timestamp > existing.timestamp) {
      latestByAgent.set(key, evt);
    }
  }

  const byAgent: Record<string, { percent: number; status: string }> = {};
  let totalPercent = 0;
  let count = 0;

  for (const [key, evt] of latestByAgent) {
    byAgent[key] = {
      percent: evt.progress.percent,
      status: evt.progress.status,
    };
    totalPercent += evt.progress.percent;
    count++;
  }

  const overall = count > 0 ? Math.round(totalPercent / count) : 0;
  const statusParts = [...latestByAgent.values()]
    .map((e) => `${e.agentId ?? "agent"}: ${e.progress.percent}%`)
    .join(", ");

  return {
    overall,
    byAgent,
    summary: `Overall: ${overall}% (${statusParts})`,
  };
}
