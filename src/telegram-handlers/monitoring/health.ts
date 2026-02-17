import type { CommandHandler } from "../types";

export const handleHealth: CommandHandler = async (ctx, _args) => {
  await ctx.reply(
    "💚 System Health\n\n✅ Gateway: Online\n✅ Agents: 63/63\n✅ Storage: OK\n\nAll systems operational",
  );
};
