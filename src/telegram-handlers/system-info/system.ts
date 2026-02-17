/**
 * /system command handler
 * System overview (agents, models, tools)
 */

import type { CommandHandler, SystemInfo, RawAgentConfig } from "../types";
import { loadConfig } from "../utils";

export const handleSystem: CommandHandler = async (ctx, _args) => {
  const config = loadConfig();
  const agents = (config.agents?.list || []) as RawAgentConfig[];

  // Calculate stats
  const stats: SystemInfo = {
    totalAgents: agents.length,
    orchestrators: agents.filter((a) => a.role === "orchestrator").length,
    leads: agents.filter((a) => a.role === "lead").length,
    specialists: agents.filter((a) => a.role === "specialist").length,
    canSpawn: agents.filter((a) => a.subagents?.allowAgents && a.subagents.allowAgents.length > 0)
      .length,
    models: {
      opus: agents.filter((a) => a.model?.primary?.includes("opus")).length,
      sonnet: agents.filter((a) => a.model?.primary?.includes("sonnet")).length,
      haiku: agents.filter((a) => a.model?.primary?.includes("haiku")).length,
      defaults: agents.filter((a) => !a.model?.primary).length,
    },
    tools: {
      full: agents.filter((a) => a.tools === "full").length,
      coding: agents.filter((a) => a.tools === "coding").length,
      messaging: agents.filter((a) => a.tools === "messaging").length,
      minimal: agents.filter((a) => a.tools === "minimal").length,
      defaults: agents.filter((a) => !a.tools).length,
    },
  };

  const response = `
**🤖 OpenClaw System Overview**

**Agents:** ${stats.totalAgents}
  • Orchestrators: ${stats.orchestrators}
  • Leads: ${stats.leads}
  • Specialists: ${stats.specialists}
  • Can spawn: ${stats.canSpawn} (${Math.round((stats.canSpawn / stats.totalAgents) * 100)}%)

**Models:**
  • Opus: ${stats.models.opus}
  • Sonnet: ${stats.models.sonnet}
  • Haiku: ${stats.models.haiku}
  • Defaults: ${stats.models.defaults}

**Tools:**
  • Full: ${stats.tools.full}
  • Coding: ${stats.tools.coding}
  • Messaging: ${stats.tools.messaging}
  • Minimal: ${stats.tools.minimal}
  • Defaults: ${stats.tools.defaults}

Use /agents to see agent list
Use /models or /tools for details
`.trim();

  await ctx.replyWithMarkdown(response);
};
