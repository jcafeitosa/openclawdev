import { restartGateway } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { isAdmin, createError, formatSuccess } from "../utils";

export const handleRestart: CommandHandler = async (ctx, args) => {
  if (!isAdmin(ctx)) {
    throw createError("UNAUTHORIZED", "Admin only command");
  }

  const reason = args.join(" ") || "Manual restart";

  try {
    const result = await restartGateway(reason);
    if (result.success) {
      await ctx.reply(
        formatSuccess(`Gateway restart initiated\nReason: ${reason}\n\nSystem is restarting...`),
      );
    } else {
      throw new Error("Gateway restart failed");
    }
  } catch (error) {
    throw createError(
      "AGENT_NOT_FOUND",
      "Failed to restart gateway",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
