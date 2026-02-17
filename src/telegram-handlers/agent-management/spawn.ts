/**
 * /spawn command handler
 * Spawn a subagent with a task
 */

import { spawnAgent } from "../api/openclaw";
import type { CommandHandler } from "../types";
import {
  getAgentInfo,
  formatSuccess,
  formatProgress,
  createError,
  validateAgentId,
} from "../utils";

export const handleSpawn: CommandHandler = async (ctx, args) => {
  if (args.length < 2) {
    throw createError(
      "INVALID_ARGS",
      "Agent ID and task required",
      "Usage: /spawn <agent-id> <task description>",
    );
  }

  const agentId = args[0];
  const task = args.slice(1).join(" ");

  if (!validateAgentId(agentId)) {
    throw createError("INVALID_ARGS", "Invalid agent ID format");
  }

  const agent = getAgentInfo(agentId);

  if (!agent) {
    throw createError("AGENT_NOT_FOUND", `Agent not found: ${agentId}`);
  }

  if (task.length > 500) {
    throw createError("INVALID_ARGS", "Task too long (max 500 characters)");
  }

  await ctx.reply(formatProgress(`Spawning ${agent.name || agentId}...`, "Initializing"));

  try {
    const result = await spawnAgent(agentId, task);

    await ctx.replyWithMarkdown(
      formatSuccess(`Spawned ${agent.name || agentId}`) +
        `\n\nSession: \`${result.sessionKey}\`` +
        `\nTask: ${task}` +
        `\n\nUse /progress ${result.sessionKey} to check status`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError("INTERNAL", `Failed to spawn agent: ${message}`);
  }
};
