/**
 * Memory Context Hook
 *
 * Injects agent memory context before LLM calls
 * Hook into agent execution to provide relevant memories
 */

import { createSubsystemLogger } from "../../logging/subsystem.js";
import { buildFormattedContext } from "../../services/agent-memory/context-builder.js";

const log = createSubsystemLogger("agent-memory/hook");

export interface MemoryContextHookOptions {
  agentId: string;
  currentMessage: string;
  maxTokens?: number;
  enabled?: boolean;
}

/**
 * Build memory context for agent execution
 * Returns formatted context string to append to system prompt
 */
export async function buildMemoryContext(options: MemoryContextHookOptions): Promise<string> {
  // Early exit if disabled
  if (options.enabled === false) {
    return "";
  }

  try {
    const context = await buildFormattedContext({
      agentId: options.agentId,
      currentMessage: options.currentMessage,
      maxTokens: options.maxTokens || 1500,
    });

    log.trace(`[${options.agentId}] Built memory context (${context.length} chars)`);
    return context;
  } catch (error) {
    // Non-blocking: if memory context fails, continue without it
    log.warn(`[${options.agentId}] Failed to build memory context:`, { error: String(error) });
    return "";
  }
}

/**
 * Check if agent should use memory system
 *
 * Criteria:
 * - Agent workspace exists
 * - Not in ephemeral session
 * - Not a sub-agent spawn (optional)
 */
export function shouldUseMemoryContext(params: {
  agentId: string;
  sessionKey?: string;
  isSubagent?: boolean;
}): boolean {
  // Skip for anonymous/ephemeral agents
  if (!params.agentId || params.agentId === "anonymous") {
    return false;
  }

  // Skip for temporary sub-agents (optional, can be changed)
  // if (params.isSubagent) {
  //   return false;
  // }

  // Default: use memory
  return true;
}

/**
 * Integration point: Call this before building system prompt
 *
 * Example usage in agent-runner:
 * ```typescript
 * const memoryContext = await buildMemoryContext({
 *   agentId: resolvedAgentId,
 *   currentMessage: userMessage,
 *   maxTokens: 1500
 * });
 *
 * systemPrompt += '\n\n' + memoryContext;
 * ```
 */
export function createMemoryContextHook() {
  return {
    buildContext: buildMemoryContext,
    shouldUse: shouldUseMemoryContext,
  };
}
