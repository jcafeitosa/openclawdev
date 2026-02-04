import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_AGENT_MAX_CONCURRENT, DEFAULT_SUBAGENT_MAX_CONCURRENT } from "./agent-limits.js";
import {
  applyMessageDefaults,
  applySessionDefaults,
  applyAgentDefaults,
  applyLoggingDefaults,
  applyCompactionDefaults,
  resetSessionDefaultsWarningForTests,
} from "./defaults.js";

describe("applyMessageDefaults", () => {
  it("returns cfg unchanged if ackReactionScope is already set", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { messages: { ackReactionScope: "all" } } as any;
    const result = applyMessageDefaults(cfg);
    expect(result).toBe(cfg);
  });

  it('sets ackReactionScope to "group-mentions" when messages is undefined', () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = {} as any;
    const result = applyMessageDefaults(cfg);
    expect(result.messages?.ackReactionScope).toBe("group-mentions");
  });

  it('sets ackReactionScope to "group-mentions" when messages exists but lacks ackReactionScope', () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { messages: { someProp: true } } as any;
    const result = applyMessageDefaults(cfg);
    expect(result.messages?.ackReactionScope).toBe("group-mentions");
    // preserves existing props
    expect(result.messages?.someProp).toBe(true);
  });
});

describe("applySessionDefaults", () => {
  beforeEach(() => {
    resetSessionDefaultsWarningForTests();
  });

  it("returns cfg unchanged when session is undefined", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = {} as any;
    const result = applySessionDefaults(cfg);
    expect(result).toBe(cfg);
  });

  it("returns cfg unchanged when session.mainKey is undefined", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { session: {} } as any;
    const result = applySessionDefaults(cfg);
    expect(result).toBe(cfg);
  });

  it('always sets mainKey to "main"', () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { session: { mainKey: "custom" } } as any;
    const result = applySessionDefaults(cfg);
    expect(result.session?.mainKey).toBe("main");
  });

  it('warns when mainKey is set to something other than "main" (first time only)', () => {
    const warn = vi.fn();
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { session: { mainKey: "custom" } } as any;

    applySessionDefaults(cfg, { warn });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith('session.mainKey is ignored; main session is always "main".');

    // second call should not warn again (module-level state)
    applySessionDefaults(cfg, { warn });
    expect(warn).toHaveBeenCalledOnce();
  });

  it('does not warn for mainKey "main"', () => {
    const warn = vi.fn();
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { session: { mainKey: "main" } } as any;
    applySessionDefaults(cfg, { warn });
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for empty mainKey", () => {
    const warn = vi.fn();
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { session: { mainKey: "" } } as any;
    applySessionDefaults(cfg, { warn });
    expect(warn).not.toHaveBeenCalled();
  });

  it("resetSessionDefaultsWarningForTests resets the warn state", () => {
    const warn = vi.fn();
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { session: { mainKey: "custom" } } as any;

    applySessionDefaults(cfg, { warn });
    expect(warn).toHaveBeenCalledOnce();

    resetSessionDefaultsWarningForTests();

    applySessionDefaults(cfg, { warn });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("applyAgentDefaults", () => {
  it("sets defaults even when agents.defaults is undefined", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = {} as any;
    const result = applyAgentDefaults(cfg);
    expect(result.agents?.defaults?.maxConcurrent).toBe(DEFAULT_AGENT_MAX_CONCURRENT);
    expect(result.agents?.defaults?.subagents?.maxConcurrent).toBe(DEFAULT_SUBAGENT_MAX_CONCURRENT);
  });

  it("sets maxConcurrent defaults when not present", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { agents: { defaults: {} } } as any;
    const result = applyAgentDefaults(cfg);
    expect(result.agents?.defaults?.maxConcurrent).toBe(DEFAULT_AGENT_MAX_CONCURRENT);
    expect(result.agents?.defaults?.subagents?.maxConcurrent).toBe(DEFAULT_SUBAGENT_MAX_CONCURRENT);
  });

  it("preserves existing maxConcurrent values", () => {
    const cfg = {
      agents: {
        defaults: {
          maxConcurrent: 10,
          subagents: { maxConcurrent: 20 },
        },
      },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;
    const result = applyAgentDefaults(cfg);
    expect(result).toBe(cfg);
    expect(result.agents?.defaults?.maxConcurrent).toBe(10);
    expect(result.agents?.defaults?.subagents?.maxConcurrent).toBe(20);
  });

  it("sets subagents.maxConcurrent default when not present", () => {
    const cfg = {
      agents: {
        defaults: {
          maxConcurrent: 6,
          subagents: {},
        },
      },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;
    const result = applyAgentDefaults(cfg);
    expect(result.agents?.defaults?.maxConcurrent).toBe(6);
    expect(result.agents?.defaults?.subagents?.maxConcurrent).toBe(DEFAULT_SUBAGENT_MAX_CONCURRENT);
  });
});

describe("applyLoggingDefaults", () => {
  it("returns cfg unchanged when logging is undefined", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = {} as any;
    const result = applyLoggingDefaults(cfg);
    expect(result).toBe(cfg);
  });

  it("returns cfg unchanged when redactSensitive is already set", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { logging: { redactSensitive: "all" } } as any;
    const result = applyLoggingDefaults(cfg);
    expect(result).toBe(cfg);
  });

  it('sets redactSensitive to "tools" when logging exists but redactSensitive is missing', () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { logging: {} } as any;
    const result = applyLoggingDefaults(cfg);
    expect(result.logging?.redactSensitive).toBe("tools");
  });
});

describe("applyCompactionDefaults", () => {
  it("returns cfg unchanged when agents.defaults is undefined", () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = {} as any;
    const result = applyCompactionDefaults(cfg);
    expect(result).toBe(cfg);
  });

  it("returns cfg unchanged when compaction.mode is already set", () => {
    const cfg = {
      agents: {
        defaults: {
          compaction: { mode: "manual" },
        },
      },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any;
    const result = applyCompactionDefaults(cfg);
    expect(result).toBe(cfg);
  });

  it('sets compaction mode to "safeguard" when not present', () => {
    // oxlint-disable-next-line typescript/no-explicit-any
    const cfg = { agents: { defaults: {} } } as any;
    const result = applyCompactionDefaults(cfg);
    expect(result.agents?.defaults?.compaction?.mode).toBe("safeguard");
  });
});
