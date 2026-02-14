/**
 * Disk persistence for agent performance data.
 * Follows the same pattern as subagent-registry.store.ts.
 */

import path from "node:path";
import { STATE_DIR } from "../config/paths.js";
import { loadJsonFile, saveJsonFile } from "../infra/json-file.js";

export type PerformanceRecord = {
  agentId: string;
  taskType: string;
  attempts: number;
  successes: number;
  failures: number;
  totalLatencyMs: number;
  totalTokens: number;
  lastUsed: number;
};

type PersistedPerformanceStore = {
  version: 1;
  records: Record<string, PerformanceRecord>;
};

function resolvePerformanceStorePath(): string {
  return path.join(STATE_DIR, "agents", "performance.json");
}

export function loadPerformanceStoreFromDisk(): Map<string, PerformanceRecord> {
  const pathname = resolvePerformanceStorePath();
  const raw = loadJsonFile(pathname);
  if (!raw || typeof raw !== "object") {
    return new Map();
  }
  const store = raw as Partial<PersistedPerformanceStore>;
  if (store.version !== 1) {
    return new Map();
  }
  const records = store.records;
  if (!records || typeof records !== "object") {
    return new Map();
  }
  const out = new Map<string, PerformanceRecord>();
  for (const [key, record] of Object.entries(records)) {
    if (!record || typeof record !== "object") {
      continue;
    }
    if (typeof record.agentId !== "string" || typeof record.taskType !== "string") {
      continue;
    }
    out.set(key, record);
  }
  return out;
}

export function savePerformanceStoreToDisk(records: Map<string, PerformanceRecord>): void {
  const pathname = resolvePerformanceStorePath();
  const serialized: Record<string, PerformanceRecord> = {};
  for (const [key, record] of records.entries()) {
    serialized[key] = record;
  }
  const out: PersistedPerformanceStore = {
    version: 1,
    records: serialized,
  };
  saveJsonFile(pathname, out);
}
