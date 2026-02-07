/**
 * Progress tracking for subagent runs.
 * Subagents can call emitProgress() from tools to report real-time progress to the parent.
 */

import { getSubagentRunBySessionKey, updateSubagentProgress } from "./subagent-registry.js";

export type ProgressUpdate = {
  percent: number;
  status: string;
  detail?: string;
};

/**
 * Emit a progress update for the current subagent run.
 * This function should be called by tools within a subagent to report progress.
 *
 * @param sessionKey - The session key of the subagent (can be obtained from context)
 * @param update - Progress update containing percent (0-100), status, and optional detail
 *
 * @example
 * ```ts
 * emitProgress(sessionKey, {
 *   percent: 25,
 *   status: "Analyzing code structure",
 *   detail: "Processing 15/60 files"
 * });
 * ```
 */
export function emitProgress(sessionKey: string, update: ProgressUpdate): void {
  const run = getSubagentRunBySessionKey(sessionKey);
  if (!run) {
    // Silently ignore if not a tracked subagent run
    return;
  }

  updateSubagentProgress(run.runId, {
    percent: update.percent,
    status: update.status,
    detail: update.detail,
  });
}
