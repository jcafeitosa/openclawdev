/**
 * Shared utilities for Telegram handlers
 */

import fs from "fs";
import path from "path";
import type { CommandError, TelegramContext, RawAgentConfig, AgentInfo } from "./types";

const CONFIG_PATH = path.join(process.env.HOME!, ".openclaw/openclaw.json");

/**
 * Load OpenClaw config
 */
export function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

/**
 * Check if user is admin
 */
export function isAdmin(ctx: TelegramContext): boolean {
  const config = loadConfig();
  const adminUsers = config.channels?.telegram?.commands?.adminUsers || [];
  return adminUsers.includes(String(ctx.userId));
}

/**
 * Format success response
 */
export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format error response
 */
export function formatError(message: string, suggestion?: string): string {
  let response = `❌ ${message}`;
  if (suggestion) {
    response += `\n\n💡 Suggestion: ${suggestion}`;
  }
  return response;
}

/**
 * Format progress response
 */
export function formatProgress(message: string, status?: string, eta?: string): string {
  let response = `⏳ ${message}`;
  if (status) {
    response += `\nStatus: ${status}`;
  }
  if (eta) {
    response += `\nETA: ${eta}`;
  }
  return response;
}

/**
 * Create command error
 */
export function createError(
  code: CommandError["code"],
  message: string,
  details?: string,
): CommandError {
  const error = new Error(message) as CommandError;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Handle command error
 */
export async function handleError(ctx: TelegramContext, error: unknown) {
  if (isCommandError(error)) {
    switch (error.code) {
      case "UNAUTHORIZED":
        await ctx.reply(formatError("Unauthorized", "This command requires admin permissions"));
        break;
      case "INVALID_ARGS":
        await ctx.reply(formatError("Invalid arguments", error.details || "Check command usage"));
        break;
      case "AGENT_NOT_FOUND":
        await ctx.reply(formatError("Agent not found", "Use /agents to see available agents"));
        break;
      case "RATE_LIMITED":
        await ctx.reply(formatError("Rate limited", "Please wait a moment before trying again"));
        break;
      default:
        await ctx.reply(formatError("Internal error", "Something went wrong"));
    }
  } else {
    console.error("Unhandled error:", error);
    await ctx.reply(formatError("Unknown error", "Please try again"));
  }
}

/**
 * Type guard for CommandError
 */
function isCommandError(error: unknown): error is CommandError {
  return error instanceof Error && "code" in error;
}

/**
 * Get agent info from config
 */
export function getAgentInfo(agentId: string): AgentInfo | null {
  const config = loadConfig();
  const agents = (config.agents?.list || []) as RawAgentConfig[];
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) {
    return null;
  }

  return {
    id: agent.id,
    name: agent.identity?.name,
    role: agent.role || agent.identity?.role,
    expertise: agent.identity?.expertise || [],
    canSpawn: Boolean(agent.subagents?.allowAgents?.length),
    model: agent.model?.primary,
    tools: agent.tools,
  };
}

/**
 * Get all agents from config
 */
export function getAllAgents(): AgentInfo[] {
  const config = loadConfig();
  const agents = (config.agents?.list || []) as RawAgentConfig[];
  return agents.map((a) => ({
    id: a.id,
    name: a.identity?.name,
    role: a.role || a.identity?.role,
    canSpawn: Boolean(a.subagents?.allowAgents?.length),
    model: a.model?.primary,
    tools: a.tools,
  }));
}

/**
 * Filter agents by role
 */
export function filterAgentsByRole(role: string): AgentInfo[] {
  return getAllAgents().filter((a) => a.role === role);
}

/**
 * Search agents by skill/keyword
 */
export function searchAgents(query: string): AgentInfo[] {
  const lowerQuery = query.toLowerCase();
  return getAllAgents().filter(
    (a) => a.id.toLowerCase().includes(lowerQuery) || a.name?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Format agent info for display
 */
export function formatAgentInfo(agent: AgentInfo, verbose = false): string {
  let info = `**${agent.name || agent.id}** (\`${agent.id}\`)`;

  if (verbose) {
    if (agent.role) {
      info += `\nRole: ${agent.role}`;
    }
    if (agent.model) {
      info += `\nModel: ${agent.model.split("/")[1]}`;
    }
    if (agent.tools) {
      info += `\nTools: ${agent.tools}`;
    }
    if (agent.canSpawn) {
      info += `\n✅ Can spawn subagents`;
    }
  }

  return info;
}

/**
 * Format agent list for display
 */
export function formatAgentList(agents: AgentInfo[], groupByRole = false): string {
  if (agents.length === 0) {
    return "No agents found";
  }

  if (groupByRole) {
    const grouped = agents.reduce(
      (acc, agent) => {
        const role = agent.role || "unknown";
        if (!acc[role]) {
          acc[role] = [];
        }
        acc[role].push(agent);
        return acc;
      },
      {} as Record<string, AgentInfo[]>,
    );

    let result = "";
    for (const [role, roleAgents] of Object.entries(grouped)) {
      result += `\n**${role.toUpperCase()}** (${roleAgents.length}):\n`;
      result += roleAgents.map((a) => `  • ${a.name || a.id} (\`${a.id}\`)`).join("\n");
      result += "\n";
    }
    return result;
  }

  return agents.map((a) => `• ${a.name || a.id} (\`${a.id}\`)`).join("\n");
}

/**
 * Truncate text if too long
 */
export function truncate(text: string, maxLength = 4000): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Parse command args
 */
export function parseArgs(text: string): string[] {
  // Remove command (first word)
  const parts = text.trim().split(/\s+/);
  return parts.slice(1);
}

/**
 * Validate agent ID
 */
export function validateAgentId(agentId: string): boolean {
  return /^[a-z0-9-]+$/.test(agentId);
}
