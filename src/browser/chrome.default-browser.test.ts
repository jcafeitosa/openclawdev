import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveBrowserExecutableForPlatform } from "./chrome.executables.js";

vi.mock("node:fs", () => {
  const existsSync = vi.fn();
  const readFileSync = vi.fn();
  return {
    existsSync,
    readFileSync,
    default: { existsSync, readFileSync },
  };
});
import * as fs from "node:fs";

function makeFakeSyncProc(stdout: string): ReturnType<typeof Bun.spawnSync> {
  return {
    stdout: Buffer.from(stdout),
    stderr: Buffer.from(""),
    exitCode: 0,
    success: true,
    signalCode: null,
  } as unknown as ReturnType<typeof Bun.spawnSync>;
}

let bunSpawnSyncSpy: ReturnType<typeof vi.spyOn>;

describe("browser default executable detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bunSpawnSyncSpy = vi.spyOn(Bun, "spawnSync").mockReturnValue(makeFakeSyncProc(""));
  });

  afterEach(() => {
    bunSpawnSyncSpy.mockRestore();
  });

  it("prefers default Chromium browser on macOS", () => {
    bunSpawnSyncSpy.mockImplementation((argv: unknown) => {
      const [cmd, ...args] = argv as string[];
      const argsStr = args.join(" ");
      if (cmd === "/usr/bin/plutil" && argsStr.includes("LSHandlers")) {
        return makeFakeSyncProc(
          JSON.stringify([{ LSHandlerURLScheme: "http", LSHandlerRoleAll: "com.google.Chrome" }]),
        );
      }
      if (cmd === "/usr/bin/osascript" && argsStr.includes("path to application id")) {
        return makeFakeSyncProc("/Applications/Google Chrome.app");
      }
      if (cmd === "/usr/bin/defaults") {
        return makeFakeSyncProc("Google Chrome");
      }
      return makeFakeSyncProc("");
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const value = String(p);
      if (value.includes("com.apple.launchservices.secure.plist")) {
        return true;
      }
      return value.includes("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    });

    const exe = resolveBrowserExecutableForPlatform(
      {} as Parameters<typeof resolveBrowserExecutableForPlatform>[0],
      "darwin",
    );

    expect(exe?.path).toContain("Google Chrome.app/Contents/MacOS/Google Chrome");
    expect(exe?.kind).toBe("chrome");
  });

  it("falls back when default browser is non-Chromium on macOS", () => {
    bunSpawnSyncSpy.mockImplementation((argv: unknown) => {
      const [cmd, ...args] = argv as string[];
      const argsStr = args.join(" ");
      if (cmd === "/usr/bin/plutil" && argsStr.includes("LSHandlers")) {
        return makeFakeSyncProc(
          JSON.stringify([{ LSHandlerURLScheme: "http", LSHandlerRoleAll: "com.apple.Safari" }]),
        );
      }
      return makeFakeSyncProc("");
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const value = String(p);
      if (value.includes("com.apple.launchservices.secure.plist")) {
        return true;
      }
      return value.includes("Google Chrome.app/Contents/MacOS/Google Chrome");
    });

    const exe = resolveBrowserExecutableForPlatform(
      {} as Parameters<typeof resolveBrowserExecutableForPlatform>[0],
      "darwin",
    );

    expect(exe?.path).toContain("Google Chrome.app/Contents/MacOS/Google Chrome");
  });
});
