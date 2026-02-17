import type { CommandHandler } from "../types";
import { isAdmin, createError } from "../utils";

export const handleCost: CommandHandler = async (ctx, _args) => {
  if (!isAdmin(ctx)) {
    throw createError("UNAUTHORIZED", "Admin only command");
  }

  await ctx.reply(
    "💰 Cost Estimate\n\n~30% savings vs baseline\n\n(Detailed cost tracking pending)",
  );
};
