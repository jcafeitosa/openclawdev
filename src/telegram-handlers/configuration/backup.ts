import { createBackup } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { isAdmin, createError, formatSuccess } from "../utils";

export const handleBackup: CommandHandler = async (ctx, _args) => {
  if (!isAdmin(ctx)) {
    throw createError("UNAUTHORIZED", "Admin only command");
  }

  try {
    const result = await createBackup();
    await ctx.reply(formatSuccess(`Backup created successfully\n\nPath: ${result.path}`));
  } catch (error) {
    throw createError(
      "AGENT_NOT_FOUND",
      "Failed to create backup",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
