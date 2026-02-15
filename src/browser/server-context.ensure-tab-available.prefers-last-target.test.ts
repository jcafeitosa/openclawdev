import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserServerState } from "./server-context.js";

const chromeMocks = vi.hoisted(() => ({
  isChromeCdpReady: vi.fn(async () => true),
  isChromeReachable: vi.fn(async () => true),
  launchOpenClawChrome: vi.fn(async () => {
    throw new Error("unexpected launch");
  }),
  stopOpenClawChrome: vi.fn(async () => {}),
}));

vi.mock("./chrome.js", () => chromeMocks);

vi.mock("./chrome-paths.js", () => ({
  resolveOpenClawUserDataDir: vi.fn(() => "/tmp/openclaw"),
}));

vi.mock("./extension-relay.js", () => ({
  ensureChromeExtensionRelayServer: vi.fn(async () => {}),
  stopChromeExtensionRelayServer: vi.fn(async () => {}),
  getChromeExtensionRelayAuthHeaders: vi.fn(() => ({})),
}));

describe("browser server-context ensureTabAvailable", () => {
  beforeEach(() => {
    vi.resetModules();
    chromeMocks.isChromeCdpReady.mockClear();
    chromeMocks.isChromeReachable.mockClear();
  });

  function makeState(): BrowserServerState {
    return {
      // oxlint-disable-next-line typescript/no-explicit-any
      server: null as any,
      port: 0,
      resolved: {
        enabled: true,
        controlPort: 18791,
        cdpProtocol: "http",
        cdpHost: "127.0.0.1",
        cdpIsLoopback: true,
        color: "#FF4500",
        headless: true,
        noSandbox: false,
        attachOnly: false,
        defaultProfile: "chrome",
        profiles: {
          chrome: {
            driver: "extension",
            cdpUrl: "http://127.0.0.1:18792",
            cdpPort: 18792,
            color: "#00AA00",
          },
          openclaw: { cdpPort: 18800, color: "#FF4500" },
        },
      },
      profiles: new Map(),
    };
  }

  it("sticks to the last selected target when targetId is omitted", async () => {
    const fetchMock = vi.fn();
    const responses = [
      [
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
      ],
      [
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
      ],
      [
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
      ],
      [
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
      ],
    ];

    fetchMock.mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      const next = responses.shift();
      if (!next) {
        throw new Error("no more responses");
      }
      return { ok: true, json: async () => next } as unknown as Response;
    });

    global.fetch = fetchMock;

    const { createBrowserRouteContext } = await import("./server-context.js");
    const state = makeState();
    const ctx = createBrowserRouteContext({ getState: () => state });
    const chrome = ctx.forProfile("chrome");
    const first = await chrome.ensureTabAvailable();
    expect(first.targetId).toBe("A");
    const second = await chrome.ensureTabAvailable();
    expect(second.targetId).toBe("A");
  });

  it("falls back to the only attached tab when an invalid targetId is provided (extension)", async () => {
    const fetchMock = vi.fn();
    const responses = [
      [{ id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" }],
      [{ id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" }],
    ];

    fetchMock.mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      const next = responses.shift();
      if (!next) {
        throw new Error("no more responses");
      }
      return { ok: true, json: async () => next } as unknown as Response;
    });

    global.fetch = fetchMock;

    const { createBrowserRouteContext } = await import("./server-context.js");
    const state = makeState();
    const ctx = createBrowserRouteContext({ getState: () => state });
    const chrome = ctx.forProfile("chrome");
    const chosen = await chrome.ensureTabAvailable("NOT_A_TAB");
    expect(chosen.targetId).toBe("A");
  });

  it("returns a descriptive message when no extension tabs are attached", async () => {
    const fetchMock = vi.fn();
    const responses: unknown[][] = [[]];
    fetchMock.mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      const next = responses.shift();
      if (!next) {
        throw new Error("no more responses");
      }
      return { ok: true, json: async () => next } as unknown as Response;
    });

    global.fetch = fetchMock;

    const { createBrowserRouteContext } = await import("./server-context.js");
    const state = makeState();
    const ctx = createBrowserRouteContext({ getState: () => state });
    const chrome = ctx.forProfile("chrome");
    await expect(chrome.ensureTabAvailable()).rejects.toThrow(/no attached Chrome tabs/i);
  });
});
