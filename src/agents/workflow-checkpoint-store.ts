/**
 * Disk persistence for workflow checkpoints.
 * Follows the same pattern as subagent-registry.store.ts.
 */

import fs from "node:fs";
import path from "node:path";
import { STATE_DIR } from "../config/paths.js";
import { loadJsonFile, saveJsonFile } from "../infra/json-file.js";

export type CheckpointData = {
  id: string;
  workflowId: string;
  phase: string;
  completedSubtasks: Record<string, { result?: string; model?: string; tokens?: number }>;
  pendingSubtaskIds: string[];
  sharedContext: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

type PersistedCheckpointStore = {
  version: 1;
  checkpoints: Record<string, CheckpointData>;
};

function resolveCheckpointDir(): string {
  return path.join(STATE_DIR, "checkpoints");
}

function resolveCheckpointIndexPath(): string {
  return path.join(resolveCheckpointDir(), "index.json");
}

function resolveCheckpointPath(id: string): string {
  return path.join(resolveCheckpointDir(), `${id}.json`);
}

/** Load the checkpoint index (lightweight metadata). */
export function loadCheckpointIndex(): Map<string, CheckpointData> {
  const pathname = resolveCheckpointIndexPath();
  const raw = loadJsonFile(pathname);
  if (!raw || typeof raw !== "object") {
    return new Map();
  }
  const store = raw as Partial<PersistedCheckpointStore>;
  if (store.version !== 1) {
    return new Map();
  }
  const checkpoints = store.checkpoints;
  if (!checkpoints || typeof checkpoints !== "object") {
    return new Map();
  }
  const out = new Map<string, CheckpointData>();
  for (const [id, cp] of Object.entries(checkpoints)) {
    if (!cp || typeof cp !== "object" || typeof cp.id !== "string") {
      continue;
    }
    out.set(id, cp);
  }
  return out;
}

/** Save the full checkpoint index. */
export function saveCheckpointIndex(checkpoints: Map<string, CheckpointData>): void {
  const pathname = resolveCheckpointIndexPath();
  const serialized: Record<string, CheckpointData> = {};
  for (const [id, cp] of checkpoints.entries()) {
    serialized[id] = cp;
  }
  const out: PersistedCheckpointStore = { version: 1, checkpoints: serialized };
  saveJsonFile(pathname, out);
}

/** Save an individual checkpoint to its own file (for large data). */
export function saveCheckpointData(cp: CheckpointData): void {
  const pathname = resolveCheckpointPath(cp.id);
  saveJsonFile(pathname, cp);
}

/** Load a specific checkpoint by ID. */
export function loadCheckpointData(id: string): CheckpointData | null {
  const pathname = resolveCheckpointPath(id);
  const raw = loadJsonFile(pathname);
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const cp = raw as Partial<CheckpointData>;
  if (typeof cp.id !== "string" || typeof cp.workflowId !== "string") {
    return null;
  }
  return cp as CheckpointData;
}

/** Delete a checkpoint file. */
export function deleteCheckpointData(id: string): void {
  const pathname = resolveCheckpointPath(id);
  try {
    fs.unlinkSync(pathname);
  } catch {
    // ignore
  }
}

/** List all checkpoint files in the directory. */
export function listCheckpointFiles(): string[] {
  const dir = resolveCheckpointDir();
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "index.json")
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}
