import type { CommandHandler, RawAgentConfig } from "../types";
import { loadConfig } from "../utils";

export const handleTools: CommandHandler = async (ctx, _args) => {
  const config = loadConfig();
  const agents = (config.agents?.list || []) as RawAgentConfig[];

  const full = agents.filter((a) => a.tools === "full");
  const coding = agents.filter((a) => a.tools === "coding");
  const messaging = agents.filter((a) => a.tools === "messaging");
  const minimal = agents.filter((a) => a.tools === "minimal");

  await ctx.replyWithMarkdown(
    `**🔧 Tools Distribution**\n\nFull: ${full.length}\nCoding: ${coding.length}\nMessaging: ${messaging.length}\nMinimal: ${minimal.length}`,
  );
};
