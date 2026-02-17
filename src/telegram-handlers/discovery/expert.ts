import type { CommandHandler } from "../types";
import { searchAgents, formatAgentList, createError } from "../utils";

export const handleExpert: CommandHandler = async (ctx, args) => {
  const topic = args.join(" ");

  if (!topic) {
    throw createError("INVALID_ARGS", "Topic required", "Usage: /expert <topic>");
  }

  const results = searchAgents(topic);

  await ctx.replyWithMarkdown(
    `**Expert on ${topic}:**\n\n${formatAgentList(results) || "No expert found"}`,
  );
};
