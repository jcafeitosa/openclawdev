import type { CommandHandler, RawAgentConfig } from "../types";
import { loadConfig } from "../utils";

export const handleCapabilities: CommandHandler = async (ctx, _args) => {
  const config = loadConfig();
  const agents = (config.agents?.list || []) as RawAgentConfig[];

  const canSpawn = agents.filter(
    (a) => a.subagents?.allowAgents && a.subagents.allowAgents.length > 0,
  );

  await ctx.replyWithMarkdown(
    `**🎯 System Capabilities**\n\nSpawn capable: ${canSpawn.length}/${agents.length}\n\nUse /agents to see list`,
  );
};
