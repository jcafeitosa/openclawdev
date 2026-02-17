import type { CommandHandler } from "../types";
import { getAgentInfo, createError } from "../utils";

export const handleStatus: CommandHandler = async (ctx, args) => {
  const agentId = args[0];

  if (!agentId) {
    // Show general system status
    await ctx.reply("📊 System Status\n\nAll systems operational\nUse /health for details");
    return;
  }

  const agent = getAgentInfo(agentId);
  if (!agent) {
    throw createError("AGENT_NOT_FOUND", `Agent not found: ${agentId}`);
  }

  await ctx.replyWithMarkdown(
    `**Status: ${agent.name || agentId}**\n\n✅ Online\nModel: ${agent.model || "default"}\nTools: ${agent.tools || "default"}`,
  );
};
