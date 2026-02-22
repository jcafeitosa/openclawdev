import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_GATEWAY_TOKEN = "test-gateway-token-1234567890";

let cfg: Record<string, unknown> = {};

// Perf: keep this suite pure unit. Mock heavyweight config/session modules.
vi.mock("../config/config.js", () => ({
  loadConfig: () => cfg,
}));

vi.mock("../config/sessions.js", () => ({
  resolveMainSessionKey: (params?: {
    session?: { scope?: string; mainKey?: string };
    agents?: { list?: Array<{ id?: string; default?: boolean }> };
  }) => {
    if (params?.session?.scope === "global") {
      return "global";
    }
    const agents = params?.agents?.list ?? [];
    const rawDefault = agents.find((agent) => agent?.default)?.id ?? agents[0]?.id ?? "main";
    const agentId =
      String(rawDefault ?? "main")
        .trim()
        .toLowerCase() || "main";
    const mainKeyRaw = String(params?.session?.mainKey ?? "main")
      .trim()
      .toLowerCase();
    const mainKey = mainKeyRaw || "main";
    return `agent:${agentId}:${mainKey}`;
  },
}));

vi.mock("./auth.js", () => ({
  authorizeGatewayConnect: async () => ({ ok: true }),
}));

vi.mock("../logger.js", () => ({
  logWarn: () => {},
}));

vi.mock("../plugins/config-state.js", () => ({
  isTestDefaultMemorySlotDisabled: () => false,
}));

vi.mock("../plugins/tools.js", () => ({
  getPluginToolMeta: () => undefined,
}));

// Perf: the real tool factory instantiates many tools per request; for these HTTP
// routing/policy tests we only need a small set of tool names.
vi.mock("../agents/openclaw-tools.js", () => {
  const toolInputError = (message: string) => {
    const err = new Error(message);
    err.name = "ToolInputError";
    return err;
  };

  const tools = [
    {
      name: "session_status",
      schema: {},
      execute: async () => ({ status: "ok" }),
    },
    {
      name: "agents_list",
      schema: {},
      execute: async () => ({ agents: [] }),
    },
    {
      name: "sessions_spawn",
      schema: {},
      execute: async () => ({ sessionKey: "test" }),
    },
    {
      name: "sessions_send",
      schema: {},
      execute: async () => ({ ok: true }),
    },
    {
      name: "gateway",
      schema: {},
      execute: async (_toolCallId: string, args: unknown) => {
        const a = args as { action?: string };
        if (!a?.action) {
          throw toolInputError("action is required");
        }
        return { ok: true };
      },
    },
    {
      name: "tools_invoke_test",
      schema: {},
      execute: async (_toolCallId: string, args: unknown) => {
        const mode = (args as { mode?: unknown })?.mode;
        if (mode === "input") {
          throw toolInputError("mode invalid");
        }
        if (mode === "crash") {
          throw new Error("boom");
        }
        return { ok: true };
      },
    },
  ];

  return {
    createOpenClawTools: () => tools,
  };
});

import { toolsInvokeRouter } from "./routes/tools-invoke.js";

let sharedPort = 0;
let sharedServer: ReturnType<typeof createServer> | undefined;

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(
    toolsInvokeRouter({
      auth: { mode: "token", token: TEST_GATEWAY_TOKEN, allowTailscale: false },
    }),
  );
  sharedServer = createServer(app);

  await new Promise<void>((resolve, reject) => {
    sharedServer?.once("error", reject);
    sharedServer?.listen(0, "127.0.0.1", () => {
      const address = sharedServer?.address() as AddressInfo | null;
      sharedPort = address?.port ?? 0;
      resolve();
    });
  });
});

afterAll(async () => {
  const server = sharedServer;
  if (!server) {
    return;
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  sharedServer = undefined;
});

beforeEach(() => {
  delete process.env.OPENCLAW_GATEWAY_TOKEN;
  delete process.env.OPENCLAW_GATEWAY_PASSWORD;
  cfg = {};
});

const resolveGatewayToken = (): string => TEST_GATEWAY_TOKEN;

const allowAgentsListForMain = () => {
  cfg = {
    ...cfg,
    agents: {
      list: [
        {
          id: "main",
          default: true,
          tools: {
            allow: ["agents_list"],
          },
        },
      ],
    },
  };
};

const invokeAgentsList = async (params: {
  port: number;
  headers?: Record<string, string>;
  sessionKey?: string;
}) => {
  const body: Record<string, unknown> = { tool: "agents_list", action: "json", args: {} };
  if (params.sessionKey) {
    body.sessionKey = params.sessionKey;
  }
  return await fetch(`http://127.0.0.1:${params.port}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json", ...params.headers },
    body: JSON.stringify(body),
  });
};

const invokeTool = async (params: {
  port: number;
  tool: string;
  args?: Record<string, unknown>;
  action?: string;
  headers?: Record<string, string>;
  sessionKey?: string;
}) => {
  const body: Record<string, unknown> = {
    tool: params.tool,
    args: params.args ?? {},
  };
  if (params.action) {
    body.action = params.action;
  }
  if (params.sessionKey) {
    body.sessionKey = params.sessionKey;
  }
  return await fetch(`http://127.0.0.1:${params.port}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json", ...params.headers },
    body: JSON.stringify(body),
  });
};

describe("POST /tools/invoke", () => {
  it("invokes a tool and returns {ok:true,result}", async () => {
    allowAgentsListForMain();
    const token = resolveGatewayToken();

    const res = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty("result");
  });

  it("supports tools.alsoAllow in profile and implicit modes", async () => {
    cfg = {
      ...cfg,
      agents: { list: [{ id: "main", default: true }] },
      tools: { profile: "minimal", alsoAllow: ["agents_list"] },
    };

    const token = resolveGatewayToken();

    const resProfile = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(resProfile.status).toBe(200);
    const profileBody = await resProfile.json();
    expect(profileBody.ok).toBe(true);

    cfg = {
      ...cfg,
      tools: { alsoAllow: ["agents_list"] },
    };

    const resImplicit = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(resImplicit.status).toBe(200);
    const implicitBody = await resImplicit.json();
    expect(implicitBody.ok).toBe(true);
  });

  it("returns 404 when denylisted or blocked by tools.profile", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [
          {
            id: "main",
            default: true,
            tools: {
              deny: ["agents_list"],
            },
          },
        ],
      },
    };
    const token = resolveGatewayToken();

    const denyRes = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(denyRes.status).toBe(404);

    allowAgentsListForMain();
    cfg = {
      ...cfg,
      tools: { profile: "minimal" },
    };

    const profileRes = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(profileRes.status).toBe(404);
  });

  it("denies sessions_spawn via HTTP even when agent policy allows", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [
          {
            id: "main",
            default: true,
            tools: { allow: ["sessions_spawn"] },
          },
        ],
      },
    };

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "sessions_spawn",
      args: { task: "test" },
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.type).toBe("not_found");
  });

  it("denies sessions_send via HTTP gateway", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [{ id: "main", default: true, tools: { allow: ["sessions_send"] } }],
      },
    };

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "sessions_send",
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(404);
  });

  it("denies gateway tool via HTTP", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [{ id: "main", default: true, tools: { allow: ["gateway"] } }],
      },
    };

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "gateway",
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(404);
  });

  it("allows gateway tool via HTTP when explicitly enabled in gateway.tools.allow", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [{ id: "main", default: true, tools: { allow: ["gateway"] } }],
      },
      gateway: { tools: { allow: ["gateway"] } },
    };

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "gateway",
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    // Ensure we didn't hit the HTTP deny list (404). Invalid args should map to 400.
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error?.type).toBe("tool_error");
  });

  it("treats gateway.tools.deny as higher priority than gateway.tools.allow", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [{ id: "main", default: true, tools: { allow: ["gateway"] } }],
      },
      gateway: { tools: { allow: ["gateway"], deny: ["gateway"] } },
    };

    const token = resolveGatewayToken();

    const res = await invokeTool({
      port: sharedPort,
      tool: "gateway",
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });

    expect(res.status).toBe(404);
  });

  it("uses the configured main session key when sessionKey is missing or main", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [
          {
            id: "main",
            tools: {
              deny: ["agents_list"],
            },
          },
          {
            id: "ops",
            default: true,
            tools: {
              allow: ["agents_list"],
            },
          },
        ],
      },
      session: { mainKey: "primary" },
    };

    const token = resolveGatewayToken();

    const resDefault = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resDefault.status).toBe(200);

    const resMain = await invokeAgentsList({
      port: sharedPort,
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(resMain.status).toBe(200);
  });

  it("maps tool input errors to 400 and unexpected execution errors to 500", async () => {
    cfg = {
      ...cfg,
      agents: {
        list: [{ id: "main", default: true, tools: { allow: ["tools_invoke_test"] } }],
      },
    };

    const token = resolveGatewayToken();

    const inputRes = await invokeTool({
      port: sharedPort,
      tool: "tools_invoke_test",
      args: { mode: "input" },
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(inputRes.status).toBe(400);
    const inputBody = await inputRes.json();
    expect(inputBody.ok).toBe(false);
    expect(inputBody.error?.type).toBe("tool_error");
    expect(inputBody.error?.message).toBe("mode invalid");

    const crashRes = await invokeTool({
      port: sharedPort,
      tool: "tools_invoke_test",
      args: { mode: "crash" },
      headers: { authorization: `Bearer ${token}` },
      sessionKey: "main",
    });
    expect(crashRes.status).toBe(500);
    const crashBody = await crashRes.json();
    expect(crashBody.ok).toBe(false);
    expect(crashBody.error?.type).toBe("tool_error");
    expect(crashBody.error?.message).toBe("tool execution failed");
  });
});
