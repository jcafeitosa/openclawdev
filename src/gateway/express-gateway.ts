/**
 * Express Gateway — Pure Express HTTP server for the OpenClaw gateway.
 *
 * Replaces elysia-gateway.ts. Each route group is an Express Router.
 * No bridge layer needed — Express uses Node.js IncomingMessage/ServerResponse natively.
 */

import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { CanvasHostHandler } from "../canvas-host/server.js";
import { loadConfig } from "../config/config.js";
import type { createSubsystemLogger } from "../logging/subsystem.js";
import type { PluginRegistry } from "../plugins/registry.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { authorizeGatewayConnect } from "./auth.js";
import type { ControlUiRootState } from "./control-ui-shared.js";
import type { HookMessageChannel, HooksConfigResolved } from "./hooks.js";
import { getBearerToken, getHeader } from "./http-utils.js";
import { resolveGatewayClientIp } from "./net.js";
import { buildAllowedOrigins, checkRequestOrigin } from "./origin-guard.js";
import { a2uiRouter } from "./routes/a2ui.js";
import { controlUiRouter } from "./routes/control-ui.js";
import { hooksRouter } from "./routes/hooks.js";
import { modelsRouter } from "./routes/models.js";
import { openAiRouter } from "./routes/openai-compat.js";
import { openResponsesRouter } from "./routes/openresponses.js";
import { slackPluginRouter } from "./routes/slack-plugins.js";
import { toolsInvokeRouter } from "./routes/tools-invoke.js";
import { twitterRouter } from "./routes/twitter.js";
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

export interface GatewayExpressOptions {
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

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfMiddleware(port: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const configSnapshot = loadConfig();
    const trustedProxies = configSnapshot.gateway?.trustedProxies ?? [];
    const resolvedPort = configSnapshot.gateway?.port ?? port;

    const clientIp = resolveGatewayClientIp({
      remoteAddr: req.socket?.remoteAddress,
      forwardedFor: getHeader(req, "x-forwarded-for"),
      realIp: getHeader(req, "x-real-ip"),
      trustedProxies,
    });

    const bearer = getBearerToken(req);
    const originResult = checkRequestOrigin({
      method: req.method,
      origin: getHeader(req, "origin"),
      referer: getHeader(req, "referer"),
      clientIp,
      hasBearerToken: !!bearer,
      config: {
        allowLoopback: true,
        allowBearerBypass: true,
        allowedOrigins: buildAllowedOrigins(resolvedPort),
      },
    });

    if (!originResult.allowed) {
      res.status(403).json({ error: "origin_rejected", reason: originResult.reason });
      return;
    }

    next();
  };
}

/**
 * Create the main Express gateway app with all routes.
 */
export function createGatewayExpressApp(opts: GatewayExpressOptions): Express {
  const app = express();

  // Body parsing — required before CSRF + routes
  app.use(express.json({ limit: "50mb" }));

  // CSRF origin guard for state-changing requests
  app.use(csrfMiddleware(opts.port));

  // Control UI SPA serving (top priority to avoid wildcard conflicts)
  if (opts.controlUiEnabled) {
    app.use(
      controlUiRouter({
        basePath: opts.controlUiBasePath,
        root: opts.controlUiRoot,
      }),
    );
  }

  // Hooks webhook routes
  app.use(
    hooksRouter({
      getHooksConfig: opts.getHooksConfig,
      logHooks: opts.logHooks,
      dispatchers: opts.hookDispatchers,
    }),
  );

  // Models + Twitter REST routes
  app.use("/api/models", modelsRouter());
  app.use("/api/twitter", twitterRouter());

  // Tools invoke (auth-protected)
  app.use(toolsInvokeRouter({ auth: opts.resolvedAuth }));

  // Auth guard for /api/channels/* plugin routes
  app.use("/api/channels", async (req: Request, res: Response, next: NextFunction) => {
    const cfg = loadConfig();
    const token = getBearerToken(req);
    const authResult = await authorizeGatewayConnect({
      auth: opts.resolvedAuth,
      connectAuth: token ? { token, password: token } : null,
      req,
      trustedProxies: cfg.gateway?.trustedProxies,
    });
    if (!authResult.ok) {
      if (authResult.rateLimited) {
        res.status(429).json({ error: { message: "Too many requests", type: "rate_limited" } });
      } else {
        res.status(401).json({ error: { message: "Unauthorized", type: "unauthorized" } });
      }
      return;
    }
    next();
  });

  // Slack + plugin fallback (legacy handler interop)
  app.use(
    slackPluginRouter({
      pluginRegistry: opts.pluginRegistry,
      logPlugins: opts.logPlugins,
    }),
  );

  // Conditionally enable OpenResponses
  if (opts.openResponsesEnabled) {
    app.use(
      openResponsesRouter({
        auth: opts.resolvedAuth,
        config: opts.openResponsesConfig,
      }),
    );
  }

  // Conditionally enable OpenAI chat completions
  if (opts.openAiChatCompletionsEnabled) {
    app.use(openAiRouter({ auth: opts.resolvedAuth }));
  }

  // Canvas host / A2UI static serving
  if (opts.canvasHost) {
    app.use(a2uiRouter());
    app.use(canvasHostMiddleware({ canvasHost: opts.canvasHost }));
  }

  return app;
}

function canvasHostMiddleware(params: { canvasHost: CanvasHostHandler }) {
  const { canvasHost } = params;
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/__openclaw__/canvas/")) {
      return next();
    }
    try {
      const handled = await canvasHost.handleHttpRequest(req, res);
      if (!handled) {
        res.status(404).send("Not Found");
      }
    } catch {
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    }
  };
}

/**
 * Listen the Express app on a specific host:port.
 * Returns a Node.js HTTP/HTTPS server.
 */
export async function listenGatewayExpress(
  app: Express,
  params: { port: number; hostname: string; tlsOptions?: import("node:tls").TlsOptions },
): Promise<HttpServer> {
  const httpServer = params.tlsOptions
    ? createHttpsServer(params.tlsOptions, app)
    : createHttpServer(app);

  await listenGatewayHttpServer({
    httpServer,
    bindHost: params.hostname,
    port: params.port,
  });

  return httpServer;
}
