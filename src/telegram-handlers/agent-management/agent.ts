/**
 * /agent command handler
 * Show detailed info for specific agent
 */

import type { CommandHandler } from "../types";
import { getAgentInfo, formatAgentInfo, createError, validateAgentId } from "../utils";

export const handleAgent: CommandHandler = async (ctx, args) => {
  const agentId = args[0];

  if (!agentId) {
    throw createError("INVALID_ARGS", "Agent ID required", "Usage: /agent <agent-id>");
  }

  if (!validateAgentId(agentId)) {
    throw createError("INVALID_ARGS", "Invalid agent ID format");
  }

  const agent = getAgentInfo(agentId);

  if (!agent) {
    throw createError("AGENT_NOT_FOUND", `Agent not found: ${agentId}`);
  }

  const response = formatAgentInfo(agent, true);

  await ctx.replyWithMarkdown(response);
};
