/**
 * Hooks webhook routes — Express Router middleware.
 *
 * POST /<basePath>/* — Webhook hook endpoints (wake, agent, custom mappings).
 * The basePath is dynamic (from hooks config), so we use a catch-all middleware
 * that checks if the path matches before handling.
 */

import { Router, type NextFunction, type Request, type Response } from "express";
import type { createSubsystemLogger } from "../../logging/subsystem.js";
import type { HookDispatchers } from "../express-gateway.js";
import { applyHookMappings } from "../hooks-mapping.js";
import {
  type HooksConfigResolved,
  normalizeAgentPayload,
  normalizeHookHeaders,
  normalizeWakePayload,
  resolveHookChannel,
  resolveHookDeliver,
  getHookChannelError,
} from "../hooks.js";
import { getBearerToken, getHeader } from "../http-utils.js";

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

function extractHookTokenFromRequest(req: Request): {
  token: string | undefined;
  fromQuery: boolean;
} {
  // Check Authorization: Bearer <token>
  const bearer = getBearerToken(req);
  if (bearer) {
    return { token: bearer, fromQuery: false };
  }

  // Check X-OpenClaw-Token header
  const headerToken = getHeader(req, "x-openclaw-token")?.trim();
  if (headerToken) {
    return { token: headerToken, fromQuery: false };
  }

  // Check query parameter (deprecated)
  const queryToken = (typeof req.query.token === "string" ? req.query.token : "").trim();
  if (queryToken) {
    return { token: queryToken, fromQuery: true };
  }

  return { token: undefined, fromQuery: false };
}

export function hooksRouter(params: {
  getHooksConfig: () => HooksConfigResolved | null;
  logHooks: SubsystemLogger;
  dispatchers: HookDispatchers;
}) {
  const { getHooksConfig, logHooks, dispatchers } = params;
  const router = Router();

  // Catch-all middleware that checks if request path matches hooks basePath
  router.use(async (req: Request, res: Response, next: NextFunction) => {
    const hooksConfig = getHooksConfig();
    if (!hooksConfig) {
      return next();
    }

    const pathname = req.path;
    const basePath = hooksConfig.basePath;
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
      return next();
    }

    // Extract and verify token
    const { token, fromQuery } = extractHookTokenFromRequest(req);
    if (!token || token !== hooksConfig.token) {
      res.status(401).type("text/plain").send("Unauthorized");
      return;
    }
    if (fromQuery) {
      logHooks.warn(
        "Hook token provided via query parameter is deprecated for security reasons. " +
          "Tokens in URLs appear in logs, browser history, and referrer headers. " +
          "Use Authorization: Bearer <token> or X-OpenClaw-Token header instead.",
      );
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).type("text/plain").send("Method Not Allowed");
      return;
    }

    const subPath = pathname.slice(basePath.length).replace(/^\/+/, "");
    if (!subPath) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }

    // Body is already parsed by express.json()
    const payload =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};

    // Build normalized headers from the Node IncomingMessage
    const headers = normalizeHookHeaders(req);

    // Build URL for hook mappings (including query string)
    const url = new URL(
      req.originalUrl ?? req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`,
    );

    if (subPath === "wake") {
      const normalized = normalizeWakePayload(payload);
      if (!normalized.ok) {
        res.status(400).json({ ok: false, error: normalized.error });
        return;
      }
      dispatchers.dispatchWakeHook(normalized.value);
      res.json({ ok: true, mode: normalized.value.mode });
      return;
    }

    if (subPath === "agent") {
      const normalized = normalizeAgentPayload(payload);
      if (!normalized.ok) {
        res.status(400).json({ ok: false, error: normalized.error });
        return;
      }
      const runId = dispatchers.dispatchAgentHook(normalized.value);
      res.status(202).json({ ok: true, runId });
      return;
    }

    // Custom hook mappings
    if (hooksConfig.mappings.length > 0) {
      try {
        const mapped = await applyHookMappings(hooksConfig.mappings, {
          payload,
          headers,
          url,
          path: subPath,
        });
        if (mapped) {
          if (!mapped.ok) {
            res.status(400).json({ ok: false, error: mapped.error });
            return;
          }
          if (mapped.action === null) {
            res.status(204).end();
            return;
          }
          if (mapped.action.kind === "wake") {
            dispatchers.dispatchWakeHook({
              text: mapped.action.text,
              mode: mapped.action.mode,
            });
            res.json({ ok: true, mode: mapped.action.mode });
            return;
          }
          const channel = resolveHookChannel(mapped.action.channel);
          if (!channel) {
            res.status(400).json({ ok: false, error: getHookChannelError() });
            return;
          }
          const sessionKey =
            typeof mapped.action.sessionKey === "string" ? mapped.action.sessionKey : "";
          const runId = dispatchers.dispatchAgentHook({
            message: mapped.action.message,
            name: mapped.action.name ?? "Hook",
            wakeMode: mapped.action.wakeMode,
            sessionKey,
            deliver: resolveHookDeliver(mapped.action.deliver),
            channel,
            to: mapped.action.to,
            model: mapped.action.model,
            thinking: mapped.action.thinking,
            timeoutSeconds: mapped.action.timeoutSeconds,
            allowUnsafeExternalContent: mapped.action.allowUnsafeExternalContent,
          });
          res.status(202).json({ ok: true, runId });
          return;
        }
      } catch (err) {
        logHooks.warn(`hook mapping failed: ${String(err)}`);
        res.status(500).json({ ok: false, error: "hook mapping failed" });
        return;
      }
    }

    res.status(404).type("text/plain").send("Not Found");
  });

  return router;
}
