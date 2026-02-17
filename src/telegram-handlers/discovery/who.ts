import type { CommandHandler } from "../types";
import { searchAgents, formatAgentList, createError } from "../utils";

export const handleWho: CommandHandler = async (ctx, args) => {
  const domain = args.join(" ");

  if (!domain) {
    throw createError("INVALID_ARGS", "Domain required", "Usage: /who <domain>");
  }

  const results = searchAgents(domain);

  await ctx.replyWithMarkdown(
    `**Who handles ${domain}:**\n\n${formatAgentList(results) || "No specific agent found"}`,
  );
};
