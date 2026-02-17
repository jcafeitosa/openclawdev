import { askAgent } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { getAgentInfo, formatProgress, createError } from "../utils";

export const handleAsk: CommandHandler = async (ctx, args) => {
  if (args.length < 2) {
    throw createError(
      "INVALID_ARGS",
      "Agent ID and question required",
      "Usage: /ask <agent-id> <question>",
    );
  }

  const agentId = args[0];
  const question = args.slice(1).join(" ");

  const agent = getAgentInfo(agentId);
  if (!agent) {
    throw createError("AGENT_NOT_FOUND", `Agent not found: ${agentId}`);
  }

  await ctx.reply(formatProgress(`Asking ${agent.name || agentId}...`));

  try {
    const result = await askAgent(agentId, question, { timeoutSeconds: 120 });
    await ctx.replyWithMarkdown(`🤖 *${agent.name || agentId}*\n\n${result.response}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError("INTERNAL", `Failed to query agent: ${message}`);
  }
};
