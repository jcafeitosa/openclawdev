import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Mock Bun.spawnSync since ports.ts uses it instead of Node's execFileSync
const bunSpawnSyncMock = vi.fn();

vi.stubGlobal("Bun", {
  spawnSync: bunSpawnSyncMock,
});

import {
  forceFreePort,
  forceFreePortAndWait,
  listPortListeners,
  type PortProcess,
  parseLsofOutput,
} from "./ports.js";

describe("gateway --force helpers", () => {
  let originalKill: typeof process.kill;

  beforeEach(() => {
    vi.clearAllMocks();
    originalKill = process.kill.bind(process);
  });

  afterEach(() => {
    process.kill = originalKill;
  });

  it("parses lsof output into pid/command pairs", () => {
    const sample = ["p123", "cnode", "p456", "cpython", ""].join("\n");
    const parsed = parseLsofOutput(sample);
    expect(parsed).toEqual<PortProcess[]>([
      { pid: 123, command: "node" },
      { pid: 456, command: "python" },
    ]);
  });

  it("returns empty list when lsof finds nothing", () => {
    (bunSpawnSyncMock as unknown as Mock).mockReturnValue({
      exitCode: 1,
      success: false,
      stdout: null,
      stderr: null,
    });
    expect(listPortListeners(18789)).toEqual([]);
  });

  it("throws when lsof missing", () => {
    (bunSpawnSyncMock as unknown as Mock).mockImplementation(() => {
      const err = new Error("not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    });
    expect(() => listPortListeners(18789)).toThrow(/lsof not found/);
  });

  it("kills each listener and returns metadata", () => {
    (bunSpawnSyncMock as unknown as Mock).mockReturnValue({
      exitCode: 0,
      success: true,
      stdout: Buffer.from(["p42", "cnode", "p99", "cssh", ""].join("\n")),
      stderr: null,
    });
    const killMock = vi.fn();
    process.kill = killMock;

    const killed = forceFreePort(18789);

    expect(bunSpawnSyncMock).toHaveBeenCalled();
    expect(killMock).toHaveBeenCalledTimes(2);
    expect(killMock).toHaveBeenCalledWith(42, "SIGTERM");
    expect(killMock).toHaveBeenCalledWith(99, "SIGTERM");
    expect(killed).toEqual<PortProcess[]>([
      { pid: 42, command: "node" },
      { pid: 99, command: "ssh" },
    ]);
  });

  it("retries until the port is free", async () => {
    vi.useFakeTimers();
    let call = 0;
    (bunSpawnSyncMock as unknown as Mock).mockImplementation(() => {
      call += 1;
      // 1st call: initial listeners to kill; 2nd call: still listed; 3rd call: gone.
      if (call === 1) {
        return {
          exitCode: 0,
          success: true,
          stdout: Buffer.from(["p42", "cnode", ""].join("\n")),
          stderr: null,
        };
      }
      if (call === 2) {
        return {
          exitCode: 0,
          success: true,
          stdout: Buffer.from(["p42", "cnode", ""].join("\n")),
          stderr: null,
        };
      }
      return { exitCode: 1, success: false, stdout: null, stderr: null };
    });

    const killMock = vi.fn();
    process.kill = killMock;

    const promise = forceFreePortAndWait(18789, {
      timeoutMs: 500,
      intervalMs: 100,
      sigtermTimeoutMs: 400,
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(killMock).toHaveBeenCalledWith(42, "SIGTERM");
    expect(res.killed).toEqual<PortProcess[]>([{ pid: 42, command: "node" }]);
    expect(res.escalatedToSigkill).toBe(false);
    expect(res.waitedMs).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("escalates to SIGKILL if SIGTERM doesn't free the port", async () => {
    vi.useFakeTimers();
    let call = 0;
    (bunSpawnSyncMock as unknown as Mock).mockImplementation(() => {
      call += 1;
      // 1st call: initial kill list; then keep showing until after SIGKILL.
      if (call <= 6) {
        return {
          exitCode: 0,
          success: true,
          stdout: Buffer.from(["p42", "cnode", ""].join("\n")),
          stderr: null,
        };
      }
      return { exitCode: 1, success: false, stdout: null, stderr: null };
    });

    const killMock = vi.fn();
    process.kill = killMock;

    const promise = forceFreePortAndWait(18789, {
      timeoutMs: 800,
      intervalMs: 100,
      sigtermTimeoutMs: 300,
    });

    await vi.runAllTimersAsync();
    const res = await promise;

    expect(killMock).toHaveBeenCalledWith(42, "SIGTERM");
    expect(killMock).toHaveBeenCalledWith(42, "SIGKILL");
    expect(res.escalatedToSigkill).toBe(true);

    vi.useRealTimers();
  });
});
