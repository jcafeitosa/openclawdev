import { listPlans } from "../../agents/plan-mode.js";
import type { CommandHandler } from "./commands-types.js";

export const handlePlanCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }

  const match = params.command.commandBodyNormalized.match(/^\/plan(?:\s+(\w+))?(?:\s|$)/i);
  if (!match) {
    return null;
  }

  const subcommand = (match[1] || "list").toLowerCase();

  if (subcommand === "list" || subcommand === "plan") {
    const plans = listPlans(params.sessionKey);

    if (plans.length === 0) {
      return {
        shouldContinue: false,
        reply: {
          text: "No active plans for this session.",
        },
      };
    }

    const plansList = plans
      .map((p) => `[${p.status}] ${p.planId}: ${p.task} (${p.steps.length} steps)`)
      .join("\n");

    return {
      shouldContinue: false,
      reply: {
        text: plansList,
      },
    };
  }

  return {
    shouldContinue: false,
    reply: {
      text: "Usage: /plan [list]  — Use the plan tool for create/review/execute operations.",
    },
  };
};
