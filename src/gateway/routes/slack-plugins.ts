/**
 * Slack + Plugin fallback routes — Express Router middleware.
 *
 * Uses Node.js IncomingMessage/ServerResponse directly (Express req/res extend them),
 * so legacy plugin handlers and Slack webhook handlers work unchanged.
 */

import { Router, type NextFunction, type Request, type Response } from "express";
import type { createSubsystemLogger } from "../../logging/subsystem.js";
import type { PluginRegistry } from "../../plugins/registry.js";
import { handleSlackHttpRequest } from "../../slack/http/index.js";

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

export function slackPluginRouter(params: {
  pluginRegistry: PluginRegistry;
  logPlugins: SubsystemLogger;
}): Router {
  const { pluginRegistry, logPlugins } = params;
  const router = Router();

  router.use(async (req: Request, res: Response, next: NextFunction) => {
    // Try Slack webhook handlers first
    const slackHandled = await handleSlackHttpRequest(req, res);
    if (slackHandled) {
      return;
    }

    // Try plugin HTTP routes and handlers
    const routes = pluginRegistry.httpRoutes ?? [];
    const handlers = pluginRegistry.httpHandlers ?? [];
    if (routes.length === 0 && handlers.length === 0) {
      return next();
    }

    // Exact path match routes
    if (routes.length > 0) {
      const route = routes.find((entry) => entry.path === req.path);
      if (route) {
        try {
          await route.handler(req, res);
          return;
        } catch (err) {
          logPlugins.warn(
            `plugin http route failed (${route.pluginId ?? "unknown"}): ${String(err)}`,
          );
          if (!res.headersSent) {
            res.status(500).type("text/plain").send("Internal Server Error");
          }
          return;
        }
      }
    }

    // Handler chain (each returns boolean)
    for (const entry of handlers) {
      try {
        const handled = await entry.handler(req, res);
        if (handled) {
          return;
        }
      } catch (err) {
        logPlugins.warn(`plugin http handler failed (${entry.pluginId}): ${String(err)}`);
        if (!res.headersSent) {
          res.status(500).type("text/plain").send("Internal Server Error");
        }
        return;
      }
    }

    // No handler matched — pass through
    next();
  });

  return router;
}
