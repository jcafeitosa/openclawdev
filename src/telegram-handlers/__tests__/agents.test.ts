/**
 * Tests for /agents command handler.
 *
 * Instead of mocking `loadConfig` and friends, we write a real
 * `openclaw.json` config file into the isolated temp HOME that
 * Vitest's setupFiles already provide (via `withIsolatedTestHome`).
 */

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, it, expect, vi } from "vitest";
import { handleAgents } from "../agent-management/agents";
import type { TelegramContext } from "../types";

// Build a realistic config with 5 agents (enough to test grouping/filtering).
const AGENT_COUNT = 5;
const roles = ["orchestrator", "lead", "specialist", "specialist", "worker"];

function buildConfig() {
  const agents = Array.from({ length: AGENT_COUNT }, (_, i) => ({
    id: `agent-${i + 1}`,
    identity: { name: `Agent ${i + 1}`, role: roles[i], expertise: [] },
    role: roles[i],
    model: { primary: "anthropic/claude-opus-4" },
    tools: "full",
    subagents: { allowAgents: [] },
  }));
  return { agents: { list: agents } };
}

// Write the config file into the temp HOME before any tests run.
beforeAll(() => {
  const home = process.env.HOME;
  if (!home) {
    throw new Error("HOME not set — test environment misconfigured");
  }
  const configDir = path.join(home, ".openclaw");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, "openclaw.json"), JSON.stringify(buildConfig()));
});

function createMockContext(): TelegramContext {
  return {
    chatId: 123,
    userId: 456,
    username: "testuser",
    messageId: 789,
    text: "/agents",
    reply: vi.fn(),
    replyWithMarkdown: vi.fn(),
    replyWithHTML: vi.fn(),
  };
}

describe("/agents handler", () => {
  it("should list all agents when no filter provided", async () => {
    const ctx = createMockContext();

    await handleAgents(ctx, []);

    expect(ctx.replyWithMarkdown).toHaveBeenCalled();
    const response = (ctx.replyWithMarkdown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(response).toContain("All Agents");
    expect(response).toContain(`(${AGENT_COUNT})`);
  });

  it("should filter by role when provided", async () => {
    const ctx = createMockContext();

    await handleAgents(ctx, ["specialist"]);

    expect(ctx.replyWithMarkdown).toHaveBeenCalled();
    const response = (ctx.replyWithMarkdown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(response).toContain("Specialists");
  });

  it("should show message when no agents match filter", async () => {
    const ctx = createMockContext();

    await handleAgents(ctx, ["nonexistent"]);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("No agents found"));
  });
});
