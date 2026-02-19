const KEY = "openclaw.control.settings.v1";

import type { ThemeMode } from "./theme.ts";

export type UiSettings = {
  gatewayUrl: string;
  token: string;
  sessionKey: string;
  lastActiveSessionKey: string;
  theme: ThemeMode;
  chatFocusMode: boolean;
  chatShowThinking: boolean;
  splitRatio: number; // Sidebar split ratio (0.4 to 0.7, default 0.6)
  navCollapsed: boolean; // Collapsible sidebar state
  navGroupsCollapsed: Record<string, boolean>; // Which nav groups are collapsed
};

/**
 * Extract token from URL hash fragment (e.g. `#token=abc123`).
 * The `openclaw dashboard` CLI command embeds the gateway token in the
 * URL fragment so it never leaks via query params or Referer headers.
 * When found, the token is persisted to localStorage and the hash is
 * cleared from the address bar to keep URLs clean.
 */
function extractHashToken(): string | null {
  if (typeof globalThis.location === "undefined") {
    return null;
  }

  // Priority 1: Query param (?token=...)
  // This is how the gateway server redirects authenticated clients.
  const search = new URLSearchParams(globalThis.location.search);
  const searchToken = search.get("token");
  if (searchToken) {
    // Clear the token from the URL bar
    search.delete("token");
    const searchStr = search.toString();
    const newUrl =
      globalThis.location.pathname + (searchStr ? `?${searchStr}` : "") + globalThis.location.hash;
    if (typeof globalThis.history !== "undefined") {
      globalThis.history.replaceState(null, "", newUrl);
    }
    return searchToken;
  }

  // Priority 2: Hash fragment (#token=...)
  // Used by CLI dashboard command to avoid server logs.
  const hash = globalThis.location.hash;
  if (!hash) {
    return null;
  }
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("token");
  if (!token) {
    return null;
  }
  // Clear the hash so the token doesn't linger in the address bar
  if (typeof globalThis.history !== "undefined") {
    globalThis.history.replaceState(
      null,
      "",
      globalThis.location.pathname + globalThis.location.search, // Preserve query params
    );
  }
  return token;
}

export function loadSettings(): UiSettings {
  const defaultUrl = (() => {
    if (typeof globalThis.location === "undefined") {
      return "ws://localhost:18789";
    }
    // In Astro dev mode the page is served by Vite (e.g. :5173/:5174) while
    // the gateway WebSocket runs on its own port. Point there directly.
    if (import.meta.env.DEV) {
      return "ws://127.0.0.1:18789";
    }
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}`;
  })();

  const defaults: UiSettings = {
    gatewayUrl: defaultUrl,
    token: "",
    sessionKey: "main",
    lastActiveSessionKey: "main",
    theme: "system",
    chatFocusMode: false,
    chatShowThinking: true,
    splitRatio: 0.6,
    navCollapsed: false,
    navGroupsCollapsed: {},
  };

  // Check for a token embedded in the URL hash (from `openclaw dashboard`)
  const hashToken = extractHashToken();

  try {
    if (typeof globalThis.localStorage === "undefined") {
      if (hashToken) {
        return { ...defaults, token: hashToken };
      }
      return defaults;
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const settings = hashToken ? { ...defaults, token: hashToken } : defaults;
      if (hashToken) {
        saveSettings(settings);
      }
      return settings;
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    const token = hashToken || (typeof parsed.token === "string" ? parsed.token : defaults.token);
    const result: UiSettings = {
      gatewayUrl:
        typeof parsed.gatewayUrl === "string" && parsed.gatewayUrl.trim()
          ? parsed.gatewayUrl.trim()
          : defaults.gatewayUrl,
      token,
      sessionKey:
        typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()
          ? parsed.sessionKey.trim()
          : defaults.sessionKey,
      lastActiveSessionKey:
        typeof parsed.lastActiveSessionKey === "string" && parsed.lastActiveSessionKey.trim()
          ? parsed.lastActiveSessionKey.trim()
          : (typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()) ||
            defaults.lastActiveSessionKey,
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
          ? parsed.theme
          : defaults.theme,
      chatFocusMode:
        typeof parsed.chatFocusMode === "boolean" ? parsed.chatFocusMode : defaults.chatFocusMode,
      chatShowThinking:
        typeof parsed.chatShowThinking === "boolean"
          ? parsed.chatShowThinking
          : defaults.chatShowThinking,
      splitRatio:
        typeof parsed.splitRatio === "number" &&
        parsed.splitRatio >= 0.4 &&
        parsed.splitRatio <= 0.7
          ? parsed.splitRatio
          : defaults.splitRatio,
      navCollapsed:
        typeof parsed.navCollapsed === "boolean" ? parsed.navCollapsed : defaults.navCollapsed,
      navGroupsCollapsed:
        typeof parsed.navGroupsCollapsed === "object" && parsed.navGroupsCollapsed !== null
          ? parsed.navGroupsCollapsed
          : defaults.navGroupsCollapsed,
    };
    // Persist the hash token so subsequent page loads use it
    if (hashToken) {
      saveSettings(result);
    }
    return result;
  } catch {
    if (hashToken) {
      const settings = { ...defaults, token: hashToken };
      saveSettings(settings);
      return settings;
    }
    return defaults;
  }
}

export function saveSettings(next: UiSettings) {
  if (typeof globalThis.localStorage === "undefined") {
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(next));
}

// Per-session workspace directory cache.
// Survives page reloads so the project label renders immediately
// without waiting for the async sessions.list RPC.
const WORKSPACES_KEY = "openclaw.session.workspaces";

export function saveSessionWorkspace(sessionKey: string, dir: string | null) {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (dir) {
      map[sessionKey] = dir;
    } else {
      delete map[sessionKey];
    }
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(map));
  } catch {
    // Best-effort; localStorage may be full or unavailable.
  }
}

export function loadSessionWorkspace(sessionKey: string): string | null {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) {
      return null;
    }
    const map = JSON.parse(raw) as Record<string, unknown>;
    const val = map[sessionKey];
    return typeof val === "string" ? val : null;
  } catch {
    return null;
  }
}
