/**
 * Gateway service singleton for Astro islands.
 *
 * Wraps the existing GatewayBrowserClient and exposes nanostores
 * so every island can subscribe to connection state reactively.
 */

import { atom } from "nanostores";
import { $connected } from "../stores/app.ts";
import { $hello, $gatewayUrl } from "../stores/gateway.ts";
import {
  GatewayBrowserClient,
  type GatewayBrowserClientOptions,
  type GatewayEventFrame,
  type GatewayHelloOk,
} from "../ui/gateway.ts";
import { loadSettings, type UiSettings } from "../ui/storage.ts";

// Event bus for gateway events (islands can subscribe)
export const $gatewayEvent = atom<GatewayEventFrame | null>(null);
export const $gatewayError = atom<string | null>(null);

let client: GatewayBrowserClient | null = null;
let autoConnected = false;

// Ready gate: resolves when the gateway handshake (hello) completes.
// Islands can await this before sending RPC requests.
let readyResolve: (() => void) | null = null;
let readyReject: ((err: Error) => void) | null = null;
let readyPromise: Promise<void> | null = null;
let readyTimer: ReturnType<typeof setTimeout> | null = null;

/** Max time (ms) to wait for the gateway handshake before rejecting. */
const READY_TIMEOUT_MS = 30_000;

function resetReadyGate() {
  // Clean up previous timer
  if (readyTimer !== null) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }
  readyPromise = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  // Timeout: reject the ready gate if handshake takes too long (Issue #4)
  readyTimer = setTimeout(() => {
    readyReject?.(new Error(`Gateway handshake timed out after ${READY_TIMEOUT_MS}ms`));
    readyReject = null;
    readyResolve = null;
  }, READY_TIMEOUT_MS);
}

function resolveReadyGate() {
  if (readyTimer !== null) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }
  readyResolve?.();
  readyResolve = null;
  readyReject = null;
}

function resolveWsUrl(settings: UiSettings): string {
  if (settings.gatewayUrl.trim()) {
    return settings.gatewayUrl.trim();
  }
  // In Astro dev mode the page is served by Vite (e.g. :5173/:5174) while
  // the gateway WebSocket runs on its own port. Point there directly.
  if (import.meta.env.DEV) {
    return "ws://127.0.0.1:18789";
  }
  const proto = globalThis.location?.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${globalThis.location?.host ?? "localhost:18789"}`;
}

function createClient(url: string, token?: string, password?: string): GatewayBrowserClient {
  const opts: GatewayBrowserClientOptions = {
    url,
    token: token || undefined,
    password: password || undefined,
    clientName: "openclaw-control-ui",
    platform: "browser",
    mode: "ui",
    onHello(hello: GatewayHelloOk) {
      $hello.set(hello);
      $connected.set(true);
      $gatewayError.set(null);
      resolveReadyGate();
    },
    onEvent(evt: GatewayEventFrame) {
      $gatewayEvent.set(evt);
    },
    onClose(info: { code: number; reason: string }) {
      $connected.set(false);
      if (info.code !== 1000) {
        $gatewayError.set(info.reason || `Connection closed (code ${info.code})`);
      }
    },
  };
  return new GatewayBrowserClient(opts);
}

/** Ensure we have an active connection. Auto-connects on first call. */
function ensureConnected(): void {
  if (client?.connected) {
    return;
  }
  if (!autoConnected) {
    autoConnected = true;
    gateway.connect();
  }
}

export const gateway = {
  /** Connect to the gateway WebSocket. */
  connect(url?: string, token?: string, password?: string): void {
    if (client) {
      client.stop();
      client = null;
    }
    $connected.set(false);
    $hello.set(null);
    resetReadyGate();

    const settings = loadSettings();
    const wsUrl = url ?? resolveWsUrl(settings);
    const wsToken = token ?? settings.token;
    const wsPassword = password ?? "";

    $gatewayUrl.set(wsUrl);

    client = createClient(wsUrl, wsToken, wsPassword);
    client.start();
  },

  /** Disconnect from the gateway. */
  disconnect(): void {
    if (client) {
      client.stop();
      client = null;
    }
    $connected.set(false);
    $hello.set(null);
  },

  /**
   * Make an RPC call to the gateway.
   * Auto-connects if not yet connected and waits for the handshake to complete.
   */
  async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    ensureConnected();
    if (!client) {
      throw new Error("Gateway client not initialized");
    }
    // Wait for the gateway handshake to complete before sending RPC requests.
    // This is critical for Astro MPA where each page navigation creates a new
    // WebSocket connection and islands may call RPC before the connect handshake finishes.
    if (readyPromise && !$connected.get()) {
      await readyPromise;
    }
    const result = await client.request(method, params);
    return result as T;
  },

  /** Whether the gateway WebSocket is currently open. */
  get connected(): boolean {
    return client?.connected ?? false;
  },

  /** The raw GatewayBrowserClient instance (for advanced use). */
  get client(): GatewayBrowserClient | null {
    return client;
  },
};
