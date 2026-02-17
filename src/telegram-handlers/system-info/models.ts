import type { CommandHandler, RawAgentConfig } from "../types";
import { loadConfig } from "../utils";

export const handleModels: CommandHandler = async (ctx, _args) => {
  const config = loadConfig();
  const agents = (config.agents?.list || []) as RawAgentConfig[];

  const opus = agents.filter((a) => a.model?.primary?.includes("opus"));
  const sonnet = agents.filter((a) => a.model?.primary?.includes("sonnet"));
  const haiku = agents.filter((a) => a.model?.primary?.includes("haiku"));

  await ctx.replyWithMarkdown(
    `**🤖 Model Distribution**\n\nOpus: ${opus.length}\nSonnet: ${sonnet.length}\nHaiku: ${haiku.length}`,
  );
};
