import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { describe, expect, test, vi } from "vitest";
import type { ResolvedGatewayAuth } from "./auth.js";
import { withTempConfig } from "./test-temp-config.js";

// Mock auth so we can control results per-request via headers
vi.mock("./auth.js", () => ({
  authorizeGatewayConnect: vi.fn(),
  isLocalDirectRequest: vi.fn(() => false),
}));

vi.mock("../../slack/http/index.js", () => ({
  handleSlackHttpRequest: async () => false,
}));

vi.mock("../slack/http/index.js", () => ({
  handleSlackHttpRequest: async () => false,
}));

import { authorizeGatewayConnect } from "./auth.js";

async function makeRequest(
  port: number,
  params: { path: string; authorization?: string; method?: string },
): Promise<{ status: number; body: string }> {
  const headers: Record<string, string> = {};
  if (params.authorization) {
    headers["authorization"] = params.authorization;
  }
  const res = await fetch(`http://127.0.0.1:${port}${params.path}`, {
    method: params.method ?? "GET",
    headers,
  });
  const body = await res.text();
  return { status: res.status, body };
}

describe("gateway plugin HTTP auth boundary", () => {
  test("requires gateway auth for /api/channels/* plugin routes and allows authenticated pass-through", async () => {
    const resolvedAuth: ResolvedGatewayAuth = {
      mode: "token",
      token: "test-token",
      password: undefined,
      allowTailscale: false,
    };

    const handlePluginRequest = vi.fn(
      async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        if (pathname === "/api/channels/nostr/default/profile") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: true, route: "channel" }));
          return true;
        }
        if (pathname === "/plugin/public") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: true, route: "public" }));
          return true;
        }
        return false;
      },
    );

    // Build a minimal Express app directly to avoid needing all gateway deps
    const app = express();
    app.use(express.json({ limit: "50mb" }));

    // Auth guard for /api/channels/* — mirrors behavior in createGatewayExpressApp
    app.use("/api/channels", async (req, res, next) => {
      // oxlint-disable-next-line typescript/no-explicit-any
      const authResult = await (authorizeGatewayConnect as any)({
        auth: resolvedAuth,
        connectAuth: null,
        req,
        trustedProxies: [],
      });
      if (!authResult.ok) {
        res.status(401).json({ error: { message: "Unauthorized", type: "unauthorized" } });
        return;
      }
      next();
    });

    // Plugin handler chain
    app.use(async (req, res, next) => {
      const handled = await handlePluginRequest(req, res);
      if (!handled) {
        next();
      }
    });

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;

    await withTempConfig({
      cfg: { gateway: { trustedProxies: [] } },
      prefix: "openclaw-plugin-http-auth-test-",
      run: async () => {
        // Unauthenticated request to /api/channels/* → 401
        vi.mocked(authorizeGatewayConnect).mockResolvedValue({ ok: false, reason: "unauthorized" });
        const unauthenticated = await makeRequest(port, {
          path: "/api/channels/nostr/default/profile",
        });
        expect(unauthenticated.status).toBe(401);
        expect(unauthenticated.body).toContain("Unauthorized");
        expect(handlePluginRequest).not.toHaveBeenCalled();

        // Authenticated request to /api/channels/* → 200 via plugin handler
        vi.mocked(authorizeGatewayConnect).mockResolvedValue({ ok: true });
        const authenticated = await makeRequest(port, {
          path: "/api/channels/nostr/default/profile",
          authorization: "Bearer test-token",
        });
        expect(authenticated.status).toBe(200);
        expect(authenticated.body).toContain('"route":"channel"');

        // Unauthenticated request to a non-channels path → 200 (not auth-gated)
        const unauthenticatedPublic = await makeRequest(port, { path: "/plugin/public" });
        expect(unauthenticatedPublic.status).toBe(200);
        expect(unauthenticatedPublic.body).toContain('"route":"public"');

        expect(handlePluginRequest).toHaveBeenCalledTimes(2);
      },
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
