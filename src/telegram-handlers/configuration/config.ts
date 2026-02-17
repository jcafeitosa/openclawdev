import { getSystemStatus } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { isAdmin, createError } from "../utils";

export const handleConfig: CommandHandler = async (ctx, _args) => {
  if (!isAdmin(ctx)) {
    throw createError("UNAUTHORIZED", "Admin only command");
  }

  try {
    const status = await getSystemStatus();

    const response =
      `⚙️ Configuration & System Status\n\n` +
      `Gateway: ${status.gateway}\n` +
      `Health: ${status.health}\n` +
      `Active Agents: ${status.agents}\n` +
      `Active Sessions: ${status.sessions}`;

    await ctx.reply(response);
  } catch (error) {
    throw createError(
      "AGENT_NOT_FOUND",
      "Failed to retrieve system configuration",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
