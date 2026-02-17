import { getSessions } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { truncate } from "../utils";

export const handleSessions: CommandHandler = async (ctx, _args) => {
  try {
    const sessions = await getSessions({ activeMinutes: 60, limit: 20 });

    if (sessions.length === 0) {
      await ctx.reply("📊 Active Sessions\n\nNo active sessions");
      return;
    }

    let response = `📊 Active Sessions (${sessions.length})\n\n`;
    sessions.forEach((session, index) => {
      response += `${index + 1}. Key: \`${session.sessionKey}\`\n`;
      response += `   Agent: ${session.agentId}\n`;
      response += `   Status: ${session.status}\n`;
      response += `   Started: ${new Date(session.startedAt).toLocaleString()}\n\n`;
    });

    await ctx.reply(truncate(response));
  } catch (error) {
    await ctx.reply(
      `📊 Error retrieving sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
