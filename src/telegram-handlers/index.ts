/**
 * Telegram Command Handlers Registry
 * Main entry point for all command handlers
 */

import { handleAudit } from "./actions/audit";
import { handleOptimize } from "./actions/optimize";
// Actions
import { handleResearch } from "./actions/research";
import { handleReview } from "./actions/review";
import { handleAgent } from "./agent-management/agent";
// Agent Management
import { handleAgents } from "./agent-management/agents";
import { handleAsk } from "./agent-management/ask";
import { handleSpawn } from "./agent-management/spawn";
import { handleStatus } from "./agent-management/status";
import { handleBackup } from "./configuration/backup";
// Configuration
import { handleConfig } from "./configuration/config";
import { handleRestart } from "./configuration/restart";
import { handleExpert } from "./discovery/expert";
// Discovery
import { handleFind } from "./discovery/find";
import { handleWho } from "./discovery/who";
import { handleDocs } from "./help/docs";
import { handleExamples } from "./help/examples";
// Help
import { handleHelp } from "./help/help";
import { handleHealth } from "./monitoring/health";
import { handleLogs } from "./monitoring/logs";
import { handleProgress } from "./monitoring/progress";
// Monitoring
import { handleSessions } from "./monitoring/sessions";
import { handleCapabilities } from "./system-info/capabilities";
import { handleCost } from "./system-info/cost";
import { handleModels } from "./system-info/models";
// System Info
import { handleSystem } from "./system-info/system";
import { handleTools } from "./system-info/tools";
import type { HandlerRegistry } from "./types";
import { handleError } from "./utils";

/**
 * Registry of all command handlers
 */
export const handlersRegistry: HandlerRegistry = {
  // Agent Management
  "/agents": handleAgents,
  "/agent": handleAgent,
  "/spawn": handleSpawn,
  "/status": handleStatus,
  "/ask": handleAsk,

  // System Info
  "/system": handleSystem,
  "/capabilities": handleCapabilities,
  "/models": handleModels,
  "/tools": handleTools,
  "/cost": handleCost,

  // Discovery
  "/find": handleFind,
  "/who": handleWho,
  "/expert": handleExpert,

  // Actions
  "/research": handleResearch,
  "/review": handleReview,
  "/audit": handleAudit,
  "/optimize": handleOptimize,

  // Monitoring
  "/sessions": handleSessions,
  "/progress": handleProgress,
  "/logs": handleLogs,
  "/health": handleHealth,

  // Configuration
  "/config": handleConfig,
  "/backup": handleBackup,
  "/restart": handleRestart,

  // Help
  "/help": handleHelp,
  "/docs": handleDocs,
  "/examples": handleExamples,
};

/**
 * Execute command handler with error handling
 */
export async function executeCommand(
  command: string,
  ctx: import("./types").TelegramContext,
  args: string[],
) {
  const handler = handlersRegistry[command];

  if (!handler) {
    await ctx.reply(`❌ Unknown command: ${command}\nUse /help to see available commands`);
    return;
  }

  try {
    await handler(ctx, args);
  } catch (error) {
    await handleError(ctx, error);
  }
}

export * from "./types";
export { handleError } from "./utils";
