import { getSessions } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { truncate } from "../utils";

export const handleLogs: CommandHandler = async (ctx, args) => {
  const agentId = args[0];

  try {
    const sessions = await getSessions({ activeMinutes: 30, limit: 10 });

    if (sessions.length === 0) {
      await ctx.reply(
        `📜 Recent logs${agentId ? ` for ${agentId}` : ""}\n\nNo recent sessions found`,
      );
      return;
    }

    let response = `📜 Recent logs${agentId ? ` for ${agentId}` : ""}\n\n`;
    const filtered = agentId ? sessions.filter((s) => s.agentId === agentId) : sessions;

    if (filtered.length === 0) {
      response += `No logs found for agent: ${agentId}`;
    } else {
      filtered.forEach((session, index) => {
        response += `${index + 1}. Agent: ${session.agentId}\n`;
        response += `   Status: ${session.status}\n`;
        response += `   Started: ${session.startedAt}\n\n`;
      });
    }

    await ctx.reply(truncate(response));
  } catch (error) {
    await ctx.reply(
      `📜 Error retrieving logs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
