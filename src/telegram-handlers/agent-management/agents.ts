/**
 * /agents command handler
 * List all agents or filter by role
 */

import type { CommandHandler } from "../types";
import { getAllAgents, filterAgentsByRole, formatAgentList } from "../utils";

export const handleAgents: CommandHandler = async (ctx, args) => {
  const role = args[0]; // optional filter by role

  let agents = getAllAgents();
  let title = "All Agents";

  if (role) {
    agents = filterAgentsByRole(role);
    title = `${role.charAt(0).toUpperCase() + role.slice(1)}s`;
  }

  if (agents.length === 0) {
    await ctx.reply(`No agents found${role ? ` with role: ${role}` : ""}`);
    return;
  }

  const response = `**${title}** (${agents.length})\n\n${formatAgentList(agents, !role)}`;

  await ctx.replyWithMarkdown(response);
};
