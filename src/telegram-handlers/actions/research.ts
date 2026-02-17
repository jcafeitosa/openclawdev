import { askAgent } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { formatProgress, createError, truncate } from "../utils";

export const handleResearch: CommandHandler = async (ctx, args) => {
  const topic = args.join(" ");

  if (!topic) {
    throw createError("INVALID_ARGS", "Topic required", "Usage: /research <topic>");
  }

  await ctx.reply(formatProgress("Delegating to deep-research agent..."));

  try {
    const result = await askAgent("researcher", `Please research the following topic: ${topic}`);
    await ctx.reply(`🔬 Research completed\n\n${truncate(result.response)}`);
  } catch (error) {
    throw createError(
      "AGENT_NOT_FOUND",
      "Failed to reach researcher agent",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
