/**
 * Memory Context Integration - Practical Example
 *
 * This file shows how to integrate agent memory context
 * into the system prompt building process.
 *
 * Location: Where buildEmbeddedSystemPrompt is called
 * Files: src/agents/pi-embedded-runner/run/attempt.ts
 *        src/agents/pi-embedded-runner/compact.ts
 */

import {
  buildMemoryContext,
  shouldUseMemoryContext,
} from "../../agents/hooks/memory-context-hook.js";
import { buildEmbeddedSystemPrompt } from "../../agents/pi-embedded-runner/system-prompt.js";

/**
 * EXAMPLE 1: Basic Integration
 *
 * Add this BEFORE calling buildEmbeddedSystemPrompt
 */
async function example1_basicIntegration(params: { agentId: string; userMessage: string }) {
  // Build memory context (async, non-blocking)
  let memoryContext = "";

  if (shouldUseMemoryContext({ agentId: params.agentId })) {
    try {
      memoryContext = await buildMemoryContext({
        agentId: params.agentId,
        currentMessage: params.userMessage,
        maxTokens: 1500,
      });
    } catch (error) {
      // Non-blocking: if memory fails, continue without it
      console.warn(`[${params.agentId}] Failed to build memory context:`, error);
    }
  }

  // Pass to buildEmbeddedSystemPrompt
  const systemPrompt = buildEmbeddedSystemPrompt({
    // ... existing params
    // @ts-expect-error -- agentMemoryContext is a planned addition to buildEmbeddedSystemPrompt
    agentMemoryContext: memoryContext, // <-- Add this parameter
  });

  return systemPrompt;
}

/**
 * EXAMPLE 2: With Config Toggle
 *
 * Allow enabling/disabling per agent via config
 */
async function example2_withConfigToggle(params: {
  agentId: string;
  userMessage: string;
  agentConfig?: {
    memory?: {
      enabled?: boolean;
      maxTokens?: number;
    };
  };
}) {
  let memoryContext = "";

  // Check config toggle
  const memoryEnabled = params.agentConfig?.memory?.enabled !== false; // Default: true
  const maxTokens = params.agentConfig?.memory?.maxTokens || 1500;

  if (memoryEnabled && shouldUseMemoryContext({ agentId: params.agentId })) {
    try {
      memoryContext = await buildMemoryContext({
        agentId: params.agentId,
        currentMessage: params.userMessage,
        maxTokens,
      });
    } catch (error) {
      console.warn(`[${params.agentId}] Memory context build failed:`, error);
    }
  }

  const systemPrompt = buildEmbeddedSystemPrompt({
    // ... existing params
    // @ts-expect-error -- agentMemoryContext is a planned addition to buildEmbeddedSystemPrompt
    agentMemoryContext: memoryContext,
  });

  return systemPrompt;
}

/**
 * EXAMPLE 3: With Timeout Protection
 *
 * Prevent slow memory lookups from blocking execution
 */
async function example3_withTimeout(params: { agentId: string; userMessage: string }) {
  let memoryContext = "";

  if (shouldUseMemoryContext({ agentId: params.agentId })) {
    try {
      // Race with timeout (500ms max)
      memoryContext = await Promise.race([
        buildMemoryContext({
          agentId: params.agentId,
          currentMessage: params.userMessage,
          maxTokens: 1500,
        }),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 500)),
      ]);
    } catch (error) {
      // Timeout or error: continue without memory
      console.warn(`[${params.agentId}] Memory context timeout/error:`, error);
    }
  }

  const systemPrompt = buildEmbeddedSystemPrompt({
    // ... existing params
    // @ts-expect-error -- agentMemoryContext is a planned addition to buildEmbeddedSystemPrompt
    agentMemoryContext: memoryContext,
  });

  return systemPrompt;
}

/**
 * EXAMPLE 4: Incremental Rollout (A/B Testing)
 *
 * Enable memory for only X% of requests initially
 */
async function example4_incrementalRollout(params: {
  agentId: string;
  userMessage: string;
  rolloutPercentage?: number; // 0-100, default 100
}) {
  let memoryContext = "";
  const rollout = params.rolloutPercentage ?? 100;

  // Random sampling for gradual rollout
  const shouldUseMemory =
    Math.random() * 100 < rollout && shouldUseMemoryContext({ agentId: params.agentId });

  if (shouldUseMemory) {
    try {
      memoryContext = await buildMemoryContext({
        agentId: params.agentId,
        currentMessage: params.userMessage,
        maxTokens: 1500,
      });
    } catch (error) {
      console.warn(`[${params.agentId}] Memory context failed:`, error);
    }
  }

  const systemPrompt = buildEmbeddedSystemPrompt({
    // ... existing params
    // @ts-expect-error -- agentMemoryContext is a planned addition to buildEmbeddedSystemPrompt
    agentMemoryContext: memoryContext,
  });

  return systemPrompt;
}

/**
 * IMPLEMENTATION LOCATION
 *
 * File: src/agents/pi-embedded-runner/run/attempt.ts
 * Function: attemptPiAgentRun (around line 437)
 *
 * BEFORE:
 * ```typescript
 * const appendPrompt = buildEmbeddedSystemPrompt({
 *   workspaceDir,
 *   defaultThinkLevel,
 *   // ... other params
 * });
 * ```
 *
 * AFTER:
 * ```typescript
 * // Build memory context (async)
 * let agentMemoryContext = "";
 * if (shouldUseMemoryContext({ agentId: runtimeInfo.agentId })) {
 *   try {
 *     agentMemoryContext = await buildMemoryContext({
 *       agentId: runtimeInfo.agentId || "unknown",
 *       currentMessage: userMessage,
 *       maxTokens: 1500,
 *     });
 *   } catch (error) {
 *     // Non-blocking: continue without memory
 *   }
 * }
 *
 * const appendPrompt = buildEmbeddedSystemPrompt({
 *   workspaceDir,
 *   defaultThinkLevel,
 *   // ... other params
 *   agentMemoryContext, // <-- ADD THIS
 * });
 * ```
 */

/**
 * EXPECTED RESULTS
 *
 * System prompt will now include (if memory context found):
 *
 * ```
 * ## Agent Context (backend-architect)
 *
 * **Current State:**
 * - Energy: 0.8/1.0
 * - Focus: 0.7/1.0
 *
 * **Relevant Memories (semantic search):**
 * 1. [mistake] Forgot to add index on foreign key
 *    In Issue #120, query was slow because...
 *    (similarity: 0.45, importance: 9/10)
 * 2. [pattern] PostgreSQL query optimization pattern
 *    EXPLAIN ANALYZE → identify seq scan...
 *    (similarity: 0.41, importance: 8/10)
 *
 * *Context size: ~214 tokens*
 * ```
 *
 * TOKEN SAVINGS:
 * - Before: ~5000 tokens (naive full context)
 * - After: ~214 tokens (semantic search, top 3)
 * - Savings: 96% (4786 tokens saved per request)
 */

export {
  example1_basicIntegration,
  example2_withConfigToggle,
  example3_withTimeout,
  example4_incrementalRollout,
};
