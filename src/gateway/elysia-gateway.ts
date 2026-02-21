/**
 * Elysia Gateway — Pure Elysia HTTP server for the OpenClaw gateway.
 *
 * Replaces the old handler-chain pattern in server-http.ts with typed Elysia routes.
 * Each route group is composed as an Elysia plugin.
 */

import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { Readable } from "node:stream";
import { Elysia, type Context } from "elysia";
import type { CanvasHostHandler } from "../canvas-host/server.js";
import type { createSubsystemLogger } from "../logging/subsystem.js";
import type { PluginRegistry } from "../plugins/registry.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import type { ControlUiRootState } from "./control-ui-shared.js";
import { csrfGuard } from "./elysia-csrf.js";
import type { HookMessageChannel, HooksConfigResolved } from "./hooks.js";
import { a2uiRoutes } from "./routes/a2ui.js";
import { controlUiRoutes } from "./routes/control-ui.js";
import { hooksRoutes } from "./routes/hooks.js";
import { modelsRoutes } from "./routes/models.js";
import { openAiRoutes } from "./routes/openai-compat.js";
import { openResponsesRoutes } from "./routes/openresponses.js";
import { slackPluginFallback } from "./routes/slack-plugins.js";
import { toolsInvokeRoutes } from "./routes/tools-invoke.js";
import { twitterRoutes } from "./routes/twitter.js";
import { listenGatewayHttpServer } from "./server/http-listen.js";

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

export type HookDispatchers = {
  dispatchWakeHook: (value: { text: string; mode: "now" | "next-heartbeat" }) => void;
  dispatchAgentHook: (value: {
    message: string;
    name: string;
    wakeMode: "now" | "next-heartbeat";
    sessionKey: string;
    deliver: boolean;
    channel: HookMessageChannel;
    to?: string;
    model?: string;
    thinking?: string;
    timeoutSeconds?: number;
    allowUnsafeExternalContent?: boolean;
  }) => string;
};

export interface GatewayElysiaOptions {
  port: number;
  canvasHost: CanvasHostHandler | null;
  controlUiEnabled: boolean;
  controlUiBasePath: string;
  controlUiRoot?: ControlUiRootState;
  openAiChatCompletionsEnabled: boolean;
  openResponsesEnabled: boolean;
  openResponsesConfig?: import("../config/types.gateway.js").GatewayHttpResponsesConfig;
  resolvedAuth: ResolvedGatewayAuth;
  getHooksConfig: () => HooksConfigResolved | null;
  hookDispatchers: HookDispatchers;
  pluginRegistry: PluginRegistry;
  logHooks: SubsystemLogger;
  logPlugins: SubsystemLogger;
  tlsOptions?: import("node:tls").TlsOptions;
}

/**
 * Create the main Elysia gateway app with all routes.
 *
 * Returns the Elysia app instance. Call `.listen()` for the primary bind host,
 * or use `getNodeHandler()` for additional bind hosts via Node http.createServer.
 */
export function createGatewayElysiaApp(opts: GatewayElysiaOptions) {
  const app = new Elysia()
    // CSRF origin guard for state-changing requests
    .use(csrfGuard({ port: opts.port }))
    // Security response headers (all routes)
    .onBeforeHandle(({ set }) => {
      set.headers["x-frame-options"] = "DENY";
      set.headers["x-content-type-options"] = "nosniff";
      set.headers["referrer-policy"] = "strict-origin-when-cross-origin";
      set.headers["x-xss-protection"] = "0";
      set.headers["permissions-policy"] = "geolocation=(), microphone=(), camera=()";
    });

  // Control UI SPA serving (top priority to avoid wildcard conflicts)
  if (opts.controlUiEnabled) {
    app.use(
      controlUiRoutes({
        basePath: opts.controlUiBasePath,
        root: opts.controlUiRoot,
      }),
    );
  }

  // Route groups
  app
    .use(
      hooksRoutes({
        getHooksConfig: opts.getHooksConfig,
        logHooks: opts.logHooks,
        dispatchers: opts.hookDispatchers,
      }),
    )
    .use(modelsRoutes())
    .use(twitterRoutes());

  // Auth-protected routes
  app.use(
    toolsInvokeRoutes({
      auth: opts.resolvedAuth,
    }),
  );

  // Slack + plugin fallback (legacy handler interop)
  app.use(
    slackPluginFallback({
      pluginRegistry: opts.pluginRegistry,
      logPlugins: opts.logPlugins,
    }),
  );

  // Conditionally enable OpenResponses
  if (opts.openResponsesEnabled) {
    app.use(
      openResponsesRoutes({
        auth: opts.resolvedAuth,
        config: opts.openResponsesConfig,
      }),
    );
  }

  // Conditionally enable OpenAI chat completions
  if (opts.openAiChatCompletionsEnabled) {
    app.use(
      openAiRoutes({
        auth: opts.resolvedAuth,
      }),
    );
  }

  // Canvas host / A2UI static serving
  if (opts.canvasHost) {
    app.use(a2uiRoutes());
    // Canvas host HTTP handled via srvx interop (has complex WS + static serving)
    app.use(canvasHostFallback({ canvasHost: opts.canvasHost }));
  }

  return app;
}

/**
 * Canvas host fallback — delegates to the existing canvas host handler
 * via srvx Node interop for complex HTTP + WebSocket handling.
 */
function canvasHostFallback(params: { canvasHost: CanvasHostHandler }) {
  const { canvasHost } = params;
  return new Elysia({ name: "canvas-host-fallback" }).all(
    "/__openclaw__/canvas/*",
    async ({ request }: Context) => {
      const { getNodeRequest, getNodeResponse } = await import("./elysia-node-compat.js");
      const req = getNodeRequest(request);
      const res = getNodeResponse(request);
      if (req && res) {
        const handled = await canvasHost.handleHttpRequest(req, res);
        if (handled) {
          // Response already written to Node ServerResponse.
          // srvx checks headersSent and skips its own response writing.
          return;
        }
      }
      return new Response("Not Found", { status: 404 });
    },
  );
}

// ---------------------------------------------------------------------------
// Node HTTP ↔ Elysia Fetch bridge
// ---------------------------------------------------------------------------
// Bun supports `node:http` natively. We create a real Node HTTP server and
// bridge each request to Elysia's compiled fetch handler. This avoids the
// @elysiajs/node adapter which, under Bun, resolves crossws/server to its
// Bun adapter (via conditional exports) and produces a BunServer instead of
// the expected Node HttpServer.
//
// The Request object carries `.runtime.node.{req, res}` so that the existing
// elysia-node-compat helpers (getNodeRequest, getNodeResponse) keep working.
// ---------------------------------------------------------------------------

/** Minimal Request subclass carrying Node.js req/res refs for compat */
class NodeBridgeRequest extends Request {
  declare runtime: { name: "node"; node: { req: IncomingMessage; res: ServerResponse } };

  constructor(
    url: string | URL,
    init: RequestInit & { duplex?: string },
    nodeReq: IncomingMessage,
    nodeRes: ServerResponse,
  ) {
    super(url, init);
    Object.defineProperty(this, "runtime", {
      value: { name: "node" as const, node: { req: nodeReq, res: nodeRes } },
      writable: false,
      enumerable: false,
    });
  }
}

function toHeaders(nodeReq: IncomingMessage): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        h.append(key, v);
      }
    } else {
      h.set(key, value);
    }
  }
  return h;
}

function createNodeFetchBridge(
  fetchHandler: (req: Request) => Response | Promise<Response>,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (nodeReq: IncomingMessage, nodeRes: ServerResponse) => {
    const host = nodeReq.headers.host ?? "localhost";
    const url = `http://${host}${nodeReq.url ?? "/"}`;
    const headers = toHeaders(nodeReq);
    const hasBody = nodeReq.method !== "GET" && nodeReq.method !== "HEAD";

    const request = new NodeBridgeRequest(
      url,
      {
        method: nodeReq.method ?? "GET",
        headers,
        body: hasBody ? (Readable.toWeb(nodeReq) as unknown as ReadableStream) : null,
        duplex: hasBody ? "half" : undefined,
      },
      nodeReq,
      nodeRes,
    );

    void (async () => {
      try {
        const response = await fetchHandler(request);

        // Canvas host / slack handlers may write directly to nodeRes
        if (nodeRes.headersSent) {
          return;
        }

        nodeRes.statusCode = response.status;
        response.headers.forEach((value, key) => {
          nodeRes.setHeader(key, value);
        });

        if (response.body) {
          for await (const chunk of response.body) {
            if (nodeRes.destroyed) {
              break;
            }
            nodeRes.write(chunk);
          }
        }
        nodeRes.end();
      } catch {
        if (!nodeRes.headersSent) {
          nodeRes.statusCode = 500;
          nodeRes.end("Internal Server Error");
        }
      }
    })();
  };
}

/**
 * Listen the Elysia app on a specific host:port.
 * Returns a Node.js HTTP server bridged to Elysia's fetch handler.
 *
 * Creates a real `node:http` server (supported natively by Bun) so that the
 * existing `ws` WebSocketServer and upgrade handlers keep working. Each HTTP
 * request is forwarded to Elysia's compiled fetch handler.
 */
export async function listenGatewayElysia(
  app: ReturnType<typeof createGatewayElysiaApp>,
  params: { port: number; hostname: string; tlsOptions?: import("node:tls").TlsOptions },
): Promise<HttpServer> {
  const bridge = createNodeFetchBridge(app.fetch);

  const httpServer = params.tlsOptions
    ? createHttpsServer(params.tlsOptions, bridge)
    : createHttpServer(bridge);

  await listenGatewayHttpServer({
    httpServer,
    bindHost: params.hostname,
    port: params.port,
  });

  return httpServer;
}
