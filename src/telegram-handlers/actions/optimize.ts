import { askAgent } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { formatProgress, createError, truncate } from "../utils";

export const handleOptimize: CommandHandler = async (ctx, args) => {
  const target = args.join(" ");

  if (!target) {
    throw createError("INVALID_ARGS", "Target required", "Usage: /optimize <target>");
  }

  await ctx.reply(formatProgress(`Optimizing ${target}...`));

  try {
    const result = await askAgent("optimizer", `Please optimize the following: ${target}`);
    await ctx.reply(`⚡ Optimization completed\n\n${truncate(result.response)}`);
  } catch (error) {
    throw createError(
      "AGENT_NOT_FOUND",
      "Failed to reach optimizer agent",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
