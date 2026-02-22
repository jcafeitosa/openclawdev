/**
 * Control UI SPA + Avatar routes — Express Router middleware.
 *
 * Two concerns:
 *   1. Avatar serving:  GET {basePath}/avatar/{agentId}  (+ ?meta=1 for JSON metadata)
 *   2. SPA serving:     GET {basePath}/*  with static file serving and index.html SPA fallback
 */

import fs from "node:fs";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { Router, type NextFunction, type Request, type Response } from "express";
import { resolveAgentAvatar } from "../../agents/identity-avatar.js";
import { loadConfig } from "../../config/config.js";
import { resolveControlUiRootSync } from "../../infra/control-ui-assets.js";
import { DEFAULT_ASSISTANT_IDENTITY, resolveAssistantIdentity } from "../assistant-identity.js";
import { isLocalDirectRequest } from "../auth.js";
import type { ControlUiRootState } from "../control-ui-shared.js";
import {
  buildControlUiAvatarUrl,
  CONTROL_UI_AVATAR_PREFIX,
  normalizeControlUiBasePath,
  resolveAssistantAvatarUrl,
} from "../control-ui-shared.js";

// ============================================================================
// Helpers
// ============================================================================

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
    case ".map":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    default:
      return "application/octet-stream";
  }
}

function isValidAgentId(agentId: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(agentId);
}

function isSafeRelativePath(relPath: string): boolean {
  if (!relPath) {
    return false;
  }
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith("../") || normalized === "..") {
    return false;
  }
  if (normalized.includes("\0")) {
    return false;
  }
  return true;
}

/** Inject runtime config into the SPA index.html before </head>. */
function injectControlUiConfig(
  html: string,
  opts: { basePath: string; assistantName?: string; assistantAvatar?: string },
): string {
  const { basePath, assistantName, assistantAvatar } = opts;
  const script =
    `<script>` +
    `window.__OPENCLAW_CONTROL_UI_BASE_PATH__=${JSON.stringify(basePath)};` +
    `window.__OPENCLAW_ASSISTANT_NAME__=${JSON.stringify(
      assistantName ?? DEFAULT_ASSISTANT_IDENTITY.name,
    )};` +
    `window.__OPENCLAW_ASSISTANT_AVATAR__=${JSON.stringify(
      assistantAvatar ?? DEFAULT_ASSISTANT_IDENTITY.avatar,
    )};` +
    `</script>`;
  // Avoid double-injection
  if (html.includes("__OPENCLAW_ASSISTANT_NAME__")) {
    return html;
  }
  const headClose = html.indexOf("</head>");
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${script}${html.slice(headClose)}`;
  }
  return `${script}${html}`;
}

const NO_CACHE = "no-cache";
const ROOT_PREFIX = "/";

// ============================================================================
// Avatar Handler
// ============================================================================

function handleAvatarRoute(
  req: IncomingMessage,
  res: Response,
  pathname: string,
  basePath: string,
): boolean {
  const pathWithBase = basePath
    ? `${basePath}${CONTROL_UI_AVATAR_PREFIX}/`
    : `${CONTROL_UI_AVATAR_PREFIX}/`;

  if (!pathname.startsWith(pathWithBase)) {
    return false;
  }

  const agentIdParts = pathname.slice(pathWithBase.length).split("/").filter(Boolean);
  const agentId = agentIdParts[0] ?? "";
  if (agentIdParts.length !== 1 || !agentId || !isValidAgentId(agentId)) {
    res.status(404).type("text/plain").send("Not Found");
    return true;
  }

  let cfg;
  try {
    cfg = loadConfig();
  } catch {
    res.status(404).type("text/plain").send("Not Found");
    return true;
  }

  const resolved = resolveAgentAvatar(cfg, agentId);
  const url = new URL(
    (req as Request).originalUrl ?? req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );

  // ?meta=1 returns JSON metadata about the avatar
  if (url.searchParams.get("meta") === "1") {
    const avatarUrl =
      resolved.kind === "local"
        ? buildControlUiAvatarUrl(basePath, agentId)
        : resolved.kind === "remote" || resolved.kind === "data"
          ? resolved.url
          : null;
    res.status(200).setHeader("Cache-Control", NO_CACHE).json({ avatarUrl });
    return true;
  }

  // Serve the avatar file directly (local only)
  if (resolved.kind !== "local") {
    res.status(404).type("text/plain").send("Not Found");
    return true;
  }

  if (req.method === "HEAD") {
    res
      .status(200)
      .setHeader("Content-Type", contentTypeForExt(path.extname(resolved.filePath).toLowerCase()))
      .setHeader("Cache-Control", NO_CACHE)
      .end();
    return true;
  }

  serveStaticFile(res, resolved.filePath);
  return true;
}

// ============================================================================
// Token Redirect (localhost convenience)
// ============================================================================

function maybeRedirectToTokenizedUi(
  req: IncomingMessage,
  res: Response,
  pathname: string,
  basePath: string,
): boolean {
  let cfg;
  try {
    cfg = loadConfig();
  } catch {
    return false;
  }

  const token = cfg.gateway?.auth?.token?.trim();
  if (!token) {
    return false;
  }

  const url = new URL(
    (req as Request).originalUrl ?? req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );

  // Already has a token query param
  if (url.searchParams.get("token")?.trim()) {
    return false;
  }

  const trustedProxies = cfg.gateway?.trustedProxies ?? [];
  const isLocal = isLocalDirectRequest(req, trustedProxies);
  if (!isLocal) {
    return false;
  }

  // Only rewrite Control UI navigations, not static assets or avatar endpoints
  if (basePath) {
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
      return false;
    }
  }
  if (pathname.includes("/assets/")) {
    return false;
  }
  if (pathname.startsWith(`${basePath}${CONTROL_UI_AVATAR_PREFIX}/`)) {
    return false;
  }
  if (!basePath && pathname.startsWith(`${CONTROL_UI_AVATAR_PREFIX}/`)) {
    return false;
  }
  if (path.extname(pathname)) {
    return false;
  }

  url.searchParams.set("token", token);
  if (basePath && url.pathname === basePath) {
    url.pathname = `${basePath}/`;
  }

  res.status(302).setHeader("Location", `${url.pathname}${url.search}`).end();
  return true;
}

// ============================================================================
// SPA Serving
// ============================================================================

function serveSpaRequest(
  req: IncomingMessage,
  res: Response,
  pathname: string,
  basePath: string,
  root: string,
): void {
  // Strip basePath prefix from the URL path to get the SPA-relative path
  const uiPath =
    basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;

  // Resolve the relative file path within the asset root
  const rel = (() => {
    if (uiPath === ROOT_PREFIX) {
      return "";
    }
    const assetsIndex = uiPath.indexOf("/assets/");
    if (assetsIndex >= 0) {
      return uiPath.slice(assetsIndex + 1);
    }
    return uiPath.slice(1);
  })();

  const requested = rel && !rel.endsWith("/") ? rel : `${rel}index.html`;
  const fileRel = requested || "index.html";

  // Directory traversal guard
  if (!isSafeRelativePath(fileRel)) {
    res.status(404).type("text/plain").send("Not Found");
    return;
  }

  const filePath = path.join(root, fileRel);
  if (!filePath.startsWith(root)) {
    res.status(404).type("text/plain").send("Not Found");
    return;
  }

  // Serve exact file if it exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    if (path.basename(filePath) === "index.html") {
      serveIndexHtml(req, res, filePath, basePath);
      return;
    }
    if (req.method === "HEAD") {
      res
        .status(200)
        .setHeader("Content-Type", contentTypeForExt(path.extname(filePath).toLowerCase()))
        .setHeader("Cache-Control", NO_CACHE)
        .end();
      return;
    }
    serveStaticFile(res, filePath);
    return;
  }

  // MPA directory route: /chat → /chat/index.html (Astro generates subdirectories)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const dirIndexPath = path.join(filePath, "index.html");
    if (fs.existsSync(dirIndexPath) && fs.statSync(dirIndexPath).isFile()) {
      serveIndexHtml(req, res, dirIndexPath, basePath);
      return;
    }
  }

  // SPA fallback: serve index.html for unknown paths (client-side router)
  const indexPath = path.join(root, "index.html");
  if (fs.existsSync(indexPath)) {
    serveIndexHtml(req, res, indexPath, basePath);
    return;
  }

  res.status(404).type("text/plain").send("Not Found");
}

// ============================================================================
// File Serving Helpers
// ============================================================================

function serveStaticFile(res: Response, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  res
    .status(200)
    .setHeader("Content-Type", contentTypeForExt(ext))
    .setHeader("Cache-Control", NO_CACHE)
    .send(buffer);
}

function serveIndexHtml(
  req: IncomingMessage,
  res: Response,
  indexPath: string,
  basePath: string,
): void {
  let cfg;
  try {
    cfg = loadConfig();
  } catch {
    cfg = undefined;
  }

  const identity = cfg ? resolveAssistantIdentity({ cfg }) : DEFAULT_ASSISTANT_IDENTITY;

  const resolvedAgentId =
    typeof (identity as { agentId?: string }).agentId === "string"
      ? (identity as { agentId?: string }).agentId
      : undefined;

  const avatarValue =
    resolveAssistantAvatarUrl({
      avatar: identity.avatar,
      agentId: resolvedAgentId,
      basePath,
    }) ?? identity.avatar;

  const raw = fs.readFileSync(indexPath, "utf8");
  const html = injectControlUiConfig(raw, {
    basePath,
    assistantName: identity.name,
    assistantAvatar: avatarValue,
  });

  if (req.method === "HEAD") {
    res
      .status(200)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .setHeader("Cache-Control", NO_CACHE)
      .end();
    return;
  }

  res
    .status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", NO_CACHE)
    .send(html);
}

// ============================================================================
// Plugin
// ============================================================================

export function controlUiRouter(params: { basePath: string; root?: ControlUiRootState }) {
  const basePath = normalizeControlUiBasePath(params.basePath);
  const rootState = params.root;
  const router = Router();

  router.use(async (req: Request, res: Response, next: NextFunction) => {
    const pathname = req.path;

    // Only handle GET / HEAD
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    // ----------------------------------------------------------------
    // Avatar route: {basePath}/avatar/{agentId}
    // ----------------------------------------------------------------
    if (handleAvatarRoute(req, res, pathname, basePath)) {
      return;
    }

    // ----------------------------------------------------------------
    // Token redirect for localhost (auto-append ?token= for convenience)
    // ----------------------------------------------------------------
    if (maybeRedirectToTokenizedUi(req, res, pathname, basePath)) {
      return;
    }

    // ----------------------------------------------------------------
    // Base path guard: if basePath is set, reject paths that don't match
    // ----------------------------------------------------------------
    if (!basePath) {
      // When basePath is empty, reject /ui or /ui/* to avoid ambiguity
      if (pathname === "/ui" || pathname.startsWith("/ui/")) {
        return next();
      }
    }

    if (basePath) {
      // Redirect /basePath -> /basePath/
      if (pathname === basePath) {
        const url = new URL(
          req.originalUrl ?? req.url ?? "/",
          `http://${req.headers.host ?? "localhost"}`,
        );
        res.status(302).setHeader("Location", `${basePath}/${url.search}`).end();
        return;
      }
      if (!pathname.startsWith(`${basePath}/`)) {
        return next(); // Not our route — pass through
      }
    }

    // ----------------------------------------------------------------
    // Root state checks (missing/invalid assets)
    // ----------------------------------------------------------------
    if (rootState?.kind === "invalid") {
      res
        .status(503)
        .type("text/plain")
        .send(
          `Control UI assets not found at ${rootState.path}. Build them with \`pnpm ui:build\` (auto-installs UI deps), or update gateway.controlUi.root.`,
        );
      return;
    }
    if (rootState?.kind === "missing") {
      res
        .status(503)
        .type("text/plain")
        .send(
          "Control UI assets not found. Build them with `pnpm ui:build` (auto-installs UI deps), or run `pnpm ui:dev` during development.",
        );
      return;
    }

    // Resolve the asset root directory
    const root =
      rootState?.kind === "resolved"
        ? rootState.path
        : resolveControlUiRootSync({
            moduleUrl: import.meta.url,
            argv1: process.argv[1],
            cwd: process.cwd(),
          });
    if (!root) {
      res
        .status(503)
        .type("text/plain")
        .send(
          "Control UI assets not found. Build them with `pnpm ui:build` (auto-installs UI deps), or run `pnpm ui:dev` during development.",
        );
      return;
    }

    // ----------------------------------------------------------------
    // Static file serving + SPA fallback
    // ----------------------------------------------------------------
    serveSpaRequest(req, res, pathname, basePath, root);
  });

  return router;
}
