import { afterEach, describe, expect, it, vi } from "vitest";
import { captureFullEnv } from "../test-utils/env.js";
import { restartGatewayProcessWithFreshPid } from "./process-respawn.js";

const originalArgv = [...process.argv];
const originalExecArgv = [...process.execArgv];
const envSnapshot = captureFullEnv();

afterEach(() => {
  envSnapshot.restore();
  process.argv = [...originalArgv];
  process.execArgv = [...originalExecArgv];
});

function clearSupervisorHints() {
  delete process.env.LAUNCH_JOB_LABEL;
  delete process.env.LAUNCH_JOB_NAME;
  delete process.env.INVOCATION_ID;
  delete process.env.SYSTEMD_EXEC_PID;
  delete process.env.JOURNAL_STREAM;
}

describe("restartGatewayProcessWithFreshPid", () => {
  it("returns disabled when OPENCLAW_NO_RESPAWN is set", () => {
    process.env.OPENCLAW_NO_RESPAWN = "1";
    const spawnMock = vi.fn();
    const result = restartGatewayProcessWithFreshPid({ spawnImpl: spawnMock });
    expect(result.mode).toBe("disabled");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised when launchd/systemd hints are present", () => {
    process.env.LAUNCH_JOB_LABEL = "ai.openclaw.gateway";
    const spawnMock = vi.fn();
    const result = restartGatewayProcessWithFreshPid({ spawnImpl: spawnMock });
    expect(result.mode).toBe("supervised");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("spawns detached child with current exec argv", () => {
    delete process.env.OPENCLAW_NO_RESPAWN;
    clearSupervisorHints();
    process.execArgv = ["--import", "tsx"];
    process.argv = ["/usr/local/bin/node", "/repo/dist/index.js", "gateway", "run"];
    const unrefMock = vi.fn();
    const spawnMock = vi.fn().mockReturnValue({ pid: 4242, unref: unrefMock });

    const result = restartGatewayProcessWithFreshPid({ spawnImpl: spawnMock });

    expect(result).toEqual({ mode: "spawned", pid: 4242 });
    expect(spawnMock).toHaveBeenCalledWith(
      [process.execPath, "--import", "tsx", "/repo/dist/index.js", "gateway", "run"],
      expect.objectContaining({ detached: true }),
    );
    expect(unrefMock).toHaveBeenCalled();
  });

  it("returns failed when spawn throws", () => {
    delete process.env.OPENCLAW_NO_RESPAWN;
    clearSupervisorHints();

    const spawnMock = vi.fn().mockImplementation(() => {
      throw new Error("spawn failed");
    });
    const result = restartGatewayProcessWithFreshPid({ spawnImpl: spawnMock });
    expect(result.mode).toBe("failed");
    expect(result.detail).toContain("spawn failed");
  });
});
