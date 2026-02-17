import { askAgent } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { formatProgress, createError, truncate } from "../utils";

export const handleAudit: CommandHandler = async (ctx, args) => {
  const target = args.join(" ") || "system";

  await ctx.reply(formatProgress(`Running security audit on ${target}...`));

  try {
    const result = await askAgent("auditor", `Please run a security audit on: ${target}`);
    await ctx.reply(`🔒 Audit completed\n\n${truncate(result.response)}`);
  } catch (error) {
    throw createError(
      "AGENT_NOT_FOUND",
      "Failed to reach auditor agent",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
