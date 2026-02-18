/**
 * Post-Run Hook — Called after each LLM turn completes
 *
 * Records the outcome (success/failure/partial based on response quality heuristics),
 * updates energy state (tokens consumed, context switches), extracts learnings if
 * applicable, updates reputation score incrementally, and detects patterns for
 * intuition rule creation.
 *
 * All updates are fire-and-forget — this hook must not block the pipeline.
 */

import type { AutoMemoryEntry } from "../../../memory/auto-memory.js";
import { recordLearning } from "../../../memory/auto-memory.js";
import type { EnergyState, DecisionLog } from "../models/types.js";
import {
  isHumanizationEnabled,
  getHumanizationService,
  fireAndForget,
  setCachedEnergy,
  getCachedEnergy,
  incrementMistakeCount,
  incrementSuccessCount,
} from "./shared.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RunOutcome = "success" | "failure" | "partial";

export interface PostRunHookParams {
  agentId: string;
  sessionKey?: string;
  /** Duration of the LLM turn in milliseconds. */
  durationMs: number;
  /** Token usage from the run. */
  usage?: {
    input?: number;
    output?: number;
    total?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  /** Number of tool calls made during the turn. */
  toolCallCount?: number;
  /** Whether any tool calls returned errors. */
  hasToolErrors?: boolean;
  /** The assistant's final text output (for heuristic analysis). */
  assistantText?: string;
  /** Whether the run was aborted by the user. */
  aborted?: boolean;
  /** Whether this was an error response (context overflow, auth failure, etc.). */
  isError?: boolean;
  /** Error kind if applicable (context_overflow, role_ordering, etc.). */
  errorKind?: string;
  /** Whether the response was sent via messaging tool (fire-and-forget delivery). */
  didSendViaMessagingTool?: boolean;
  /** Previous session key — used to detect context switches. */
  previousSessionKey?: string;
  /** Full session transcript for auto-memory extraction (optional). */
  transcript?: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>;
}

export interface PostRunResult {
  /** The determined outcome of the run. */
  outcome: RunOutcome;
  /** Updated energy level after this turn. */
  energyLevel?: number;
  /** Whether a mistake pattern was detected (3+ occurrences). */
  mistakePatternDetected?: string;
  /** Whether an intuition rule candidate was detected (5+ successes). */
  intuitionCandidate?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base energy cost per LLM turn (as a fraction of 1.0). */
const BASE_TURN_COST = 0.02;

/** Additional energy cost per 1000 tokens. */
const COST_PER_1K_TOKENS = 0.005;

/** Additional energy cost per tool call. */
const COST_PER_TOOL_CALL = 0.008;

/** Extra cost for a context switch (different session). */
const CONTEXT_SWITCH_COST = 0.03;

/** Deep work bonus — reduces energy cost when staying on the same session. */
const DEEP_WORK_DISCOUNT = 0.3; // 30% less cost

/** Threshold for creating a mistake pattern entry. */
const MISTAKE_PATTERN_THRESHOLD = 3;

/** Threshold for creating an intuition rule candidate. */
const INTUITION_RULE_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

/**
 * Execute the post-run hook.
 *
 * The synchronous path determines the outcome and energy delta quickly.
 * Heavy DB writes are scheduled via fire-and-forget.
 */
export function postRunHook(params: PostRunHookParams): PostRunResult {
  if (!isHumanizationEnabled()) {
    return { outcome: "success" };
  }

  const outcome = determineOutcome(params);
  const energyDelta = calculateEnergyDelta(params);
  const newEnergyLevel = updateLocalEnergy(params.agentId, energyDelta);

  // Detect patterns synchronously
  const mistakePatternDetected = detectMistakePattern(params, outcome);
  const intuitionCandidate = detectIntuitionCandidate(params, outcome);

  // Schedule all DB writes as fire-and-forget
  fireAndForget("post-run:record", async () => {
    await recordOutcome(params, outcome, newEnergyLevel);
  });

  if (mistakePatternDetected) {
    fireAndForget("post-run:mistake-pattern", async () => {
      await recordMistakePattern(params.agentId, mistakePatternDetected);
    });
  }

  if (intuitionCandidate) {
    fireAndForget("post-run:intuition-candidate", async () => {
      await recordIntuitionCandidate(params.agentId, intuitionCandidate);
    });
  }

  // Record learnings to auto-memory for future reference
  if (params.sessionKey) {
    fireAndForget("post-run:auto-memory", () => {
      recordAutoMemoryLearnings(params, outcome);
      return Promise.resolve();
    });
  }

  return {
    outcome,
    energyLevel: newEnergyLevel,
    mistakePatternDetected,
    intuitionCandidate,
  };
}

// ---------------------------------------------------------------------------
// Outcome determination — quality heuristics
// ---------------------------------------------------------------------------

function determineOutcome(params: PostRunHookParams): RunOutcome {
  // Clear failures
  if (params.aborted) {
    return "failure";
  }
  if (params.isError) {
    return "failure";
  }
  if (params.errorKind === "context_overflow") {
    return "failure";
  }
  if (params.errorKind === "role_ordering") {
    return "failure";
  }

  // Check for error indicators in assistant text
  if (params.assistantText) {
    const text = params.assistantText.toLowerCase();
    // Explicit error/apology markers
    if (
      text.includes("i apologize") ||
      text.includes("i'm sorry, i can't") ||
      text.includes("error occurred")
    ) {
      return "partial";
    }
  }

  // Mixed tool call results
  if (params.hasToolErrors && params.toolCallCount && params.toolCallCount > 0) {
    // If some tools errored but not all, it's partial
    return "partial";
  }

  // Tool errors with no successful output
  if (params.hasToolErrors && !params.assistantText?.trim()) {
    return "failure";
  }

  // No output at all (shouldn't happen normally)
  if (!params.assistantText?.trim() && !params.didSendViaMessagingTool) {
    return "partial";
  }

  return "success";
}

// ---------------------------------------------------------------------------
// Energy model
// ---------------------------------------------------------------------------

function calculateEnergyDelta(params: PostRunHookParams): number {
  let cost = BASE_TURN_COST;

  // Token cost
  const totalTokens =
    params.usage?.total ?? (params.usage?.input ?? 0) + (params.usage?.output ?? 0);
  if (totalTokens > 0) {
    cost += (totalTokens / 1000) * COST_PER_1K_TOKENS;
  }

  // Tool call cost
  if (params.toolCallCount && params.toolCallCount > 0) {
    cost += params.toolCallCount * COST_PER_TOOL_CALL;
  }

  // Context switch penalty
  if (
    params.previousSessionKey &&
    params.sessionKey &&
    params.previousSessionKey !== params.sessionKey
  ) {
    cost += CONTEXT_SWITCH_COST;
  } else if (params.previousSessionKey && params.previousSessionKey === params.sessionKey) {
    // Deep work discount — same session, sequential turns
    cost *= 1 - DEEP_WORK_DISCOUNT;
  }

  // Cap the cost per turn at 0.15 to avoid energy crashing on big runs
  return -Math.min(cost, 0.15);
}

function updateLocalEnergy(agentId: string, delta: number): number {
  const current = getCachedEnergy(agentId);
  const currentLevel = current?.energyLevel ?? 0.7;
  const newLevel = Math.max(0, Math.min(1, currentLevel + delta));

  // Update the local cache
  const newState: EnergyState = {
    id: current?.id ?? "",
    agentId,
    currentHour: new Date().toISOString().slice(11, 16),
    energyLevel: newLevel,
    focusLevel: current?.focusLevel ?? 0.7,
    contextSwitchesToday:
      (current?.contextSwitchesToday ?? 0) + (delta < -CONTEXT_SWITCH_COST + 0.001 ? 0 : 0),
    deepWorkMinutes: current?.deepWorkMinutes ?? 0,
    qualityVariance: current?.qualityVariance ?? 0,
    lastUpdated: new Date(),
  };

  setCachedEnergy(agentId, newState);
  return newLevel;
}

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

function detectMistakePattern(params: PostRunHookParams, outcome: RunOutcome): string | undefined {
  if (outcome === "success") {
    return undefined;
  }

  // Categorize the error type
  const errorType = categorizeError(params);
  if (!errorType) {
    return undefined;
  }

  const count = incrementMistakeCount(params.agentId, errorType);
  if (count >= MISTAKE_PATTERN_THRESHOLD) {
    return errorType;
  }
  return undefined;
}

function detectIntuitionCandidate(
  params: PostRunHookParams,
  outcome: RunOutcome,
): string | undefined {
  if (outcome !== "success") {
    return undefined;
  }

  // Categorize the approach type based on what tools were used / task type
  const approachType = categorizeApproach(params);
  if (!approachType) {
    return undefined;
  }

  const count = incrementSuccessCount(params.agentId, approachType);
  if (count >= INTUITION_RULE_THRESHOLD) {
    return approachType;
  }
  return undefined;
}

function categorizeError(params: PostRunHookParams): string | undefined {
  if (params.errorKind) {
    return params.errorKind;
  }
  if (params.aborted) {
    return "user_abort";
  }
  if (params.hasToolErrors) {
    return "tool_execution_error";
  }
  if (params.assistantText?.toLowerCase().includes("i apologize")) {
    return "apology_response";
  }
  if (params.assistantText?.toLowerCase().includes("error occurred")) {
    return "runtime_error";
  }
  return "unknown_failure";
}

function categorizeApproach(params: PostRunHookParams): string | undefined {
  if (!params.sessionKey) {
    return undefined;
  }

  // Derive approach from tool usage pattern
  if (params.toolCallCount && params.toolCallCount > 3) {
    return "multi_tool_orchestration";
  }
  if (params.toolCallCount && params.toolCallCount > 0) {
    return "tool_assisted";
  }
  if (params.didSendViaMessagingTool) {
    return "messaging_delivery";
  }
  if ((params.usage?.output ?? 0) > 2000) {
    return "detailed_response";
  }
  return "direct_response";
}

// ---------------------------------------------------------------------------
// Async DB writes (fire-and-forget)
// ---------------------------------------------------------------------------

async function recordOutcome(
  params: PostRunHookParams,
  outcome: RunOutcome,
  energyLevel: number,
): Promise<void> {
  const service = getHumanizationService();
  if (!service) {
    return;
  }

  const decisionLog: DecisionLog = {
    time: new Date(),
    agentId: params.agentId,
    decisionType: "autonomous",
    decisionQuality: outcomeToQuality(outcome),
    outcome: outcome === "success" ? "success" : outcome === "failure" ? "failure" : "partial",
    confidenceLevel: outcome === "success" ? 80 : outcome === "partial" ? 50 : 20,
    impactScore: undefined,
    context: {
      sessionKey: params.sessionKey,
      durationMs: params.durationMs,
      toolCallCount: params.toolCallCount,
      tokenUsage: params.usage?.total,
      energyLevel,
    },
  };

  await Promise.allSettled([
    service.recordDecision(decisionLog),
    service.updateEnergyState(params.agentId, { energyLevel }),
    service.updateReputationIncremental(params.agentId, outcome),
  ]);
}

async function recordMistakePattern(agentId: string, errorType: string): Promise<void> {
  const service = getHumanizationService();
  if (service) {
    await service.recordMistakePattern(agentId, {
      mistakeType: errorType,
      description: `Repeated error pattern: ${errorType} (3+ occurrences in 24h)`,
    });
  }
}

async function recordIntuitionCandidate(agentId: string, approachType: string): Promise<void> {
  const service = getHumanizationService();
  if (service) {
    await service.recordIntuitionCandidate(agentId, {
      patternName: approachType,
      patternDescription: `Successful approach pattern: ${approachType} (5+ successes)`,
    });
  }
}

function outcomeToQuality(outcome: RunOutcome): DecisionLog["decisionQuality"] {
  switch (outcome) {
    case "success":
      return "good";
    case "partial":
      return "acceptable";
    case "failure":
      return "poor";
  }
}

// ---------------------------------------------------------------------------
// Auto-Memory Integration
// ---------------------------------------------------------------------------

/**
 * Record learnings from this run to auto-memory for future reference.
 * Creates entries based on the run outcome and extracted patterns.
 */
function recordAutoMemoryLearnings(params: PostRunHookParams, outcome: RunOutcome): void {
  const timestamp = new Date().toISOString();

  // Always record the outcome as a basic learning
  const outcomeEntry: AutoMemoryEntry = {
    timestamp,
    agentId: params.agentId,
    sessionKey: params.sessionKey ?? "",
    category: outcome === "failure" ? "error-pattern" : "success-pattern",
    summary: buildOutcomeSummary(params, outcome),
    detail: params.assistantText?.slice(0, 300),
  };

  recordLearning(outcomeEntry);

  // Record tool usage patterns
  if (params.toolCallCount && params.toolCallCount > 0) {
    const toolEntry: AutoMemoryEntry = {
      timestamp,
      agentId: params.agentId,
      sessionKey: params.sessionKey ?? "",
      category: "tool-usage",
      summary: `Executed ${params.toolCallCount} tool call(s) ${outcome === "success" ? "successfully" : "with errors"}`,
      occurrenceCount: params.toolCallCount,
    };
    recordLearning(toolEntry);
  }

  // Record error patterns for failures
  if (outcome === "failure" && params.errorKind) {
    const errorEntry: AutoMemoryEntry = {
      timestamp,
      agentId: params.agentId,
      sessionKey: params.sessionKey ?? "",
      category: "error-pattern",
      summary: `Error: ${params.errorKind}`,
      detail: buildErrorDetail(params),
    };
    recordLearning(errorEntry);
  }

  // Record performance insights if available
  if (params.usage && params.durationMs > 0) {
    const performanceEntry: AutoMemoryEntry = {
      timestamp,
      agentId: params.agentId,
      sessionKey: params.sessionKey ?? "",
      category: "optimization",
      summary: `Completed in ${params.durationMs}ms using ${params.usage.total ?? 0} tokens`,
      detail: `Input: ${params.usage.input ?? 0}, Output: ${params.usage.output ?? 0}`,
    };
    recordLearning(performanceEntry);
  }
}

/**
 * Build a human-readable summary of the run outcome
 */
function buildOutcomeSummary(params: PostRunHookParams, outcome: RunOutcome): string {
  if (outcome === "success") {
    if (params.toolCallCount && params.toolCallCount > 0) {
      return `Successfully completed task using ${params.toolCallCount} tool(s)`;
    }
    return "Task completed successfully";
  }

  if (outcome === "failure") {
    if (params.errorKind) {
      return `Failed with error: ${params.errorKind}`;
    }
    if (params.aborted) {
      return "Task was aborted by user";
    }
    return "Task failed to complete";
  }

  return "Task partially completed";
}

/**
 * Build detailed error information
 */
function buildErrorDetail(params: PostRunHookParams): string | undefined {
  const details = [];

  if (params.errorKind) {
    details.push(`Error Kind: ${params.errorKind}`);
  }
  if (params.hasToolErrors) {
    details.push("Tool execution errors occurred");
  }
  if (params.assistantText?.trim()) {
    details.push(`Context: ${params.assistantText.slice(0, 200)}`);
  }

  return details.length > 0 ? details.join(" | ") : undefined;
}
