import type { CommandHandler } from "../types";
import { searchAgents, formatAgentList, createError } from "../utils";

export const handleFind: CommandHandler = async (ctx, args) => {
  const query = args.join(" ");

  if (!query) {
    throw createError("INVALID_ARGS", "Search query required", "Usage: /find <skill>");
  }

  const results = searchAgents(query);

  if (results.length === 0) {
    await ctx.reply(`No agents found matching: ${query}`);
    return;
  }

  await ctx.replyWithMarkdown(
    `**Found ${results.length} agent(s):**\n\n${formatAgentList(results)}`,
  );
};
