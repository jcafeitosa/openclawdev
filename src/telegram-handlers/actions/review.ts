import { askAgent } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { formatProgress, createError, truncate } from "../utils";

export const handleReview: CommandHandler = async (ctx, args) => {
  const description = args.join(" ");

  if (!description) {
    throw createError("INVALID_ARGS", "Description required", "Usage: /review <description>");
  }

  await ctx.reply(formatProgress("Requesting code review..."));

  try {
    const result = await askAgent("reviewer", `Please review the following: ${description}`);
    await ctx.reply(`👀 Review completed\n\n${truncate(result.response)}`);
  } catch (error) {
    throw createError(
      "AGENT_NOT_FOUND",
      "Failed to reach reviewer agent",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
