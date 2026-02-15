import { beforeEach, describe, expect, it, vi } from "vitest";

const { callGateway } = vi.hoisted(() => ({
  callGateway: vi.fn(),
}));

vi.mock("../gateway/call.js", () => ({ callGateway }));

import "./test-helpers/fast-core-tools.js";
import { createOpenClawTools } from "./openclaw-tools.js";

// Smallest valid 1x1 black JPEG (sharp can parse this).
const TINY_JPEG_BASE64 =
  "/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJ+AD//Z";

describe("nodes camera_snap", () => {
  beforeEach(() => {
    callGateway.mockReset();
  });

  it("maps jpg payloads to image/jpeg", async () => {
    callGateway.mockImplementation(async ({ method }) => {
      if (method === "node.list") {
        return { nodes: [{ nodeId: "mac-1" }] };
      }
      if (method === "node.invoke") {
        return {
          payload: {
            format: "jpg",
            base64: TINY_JPEG_BASE64,
            width: 1,
            height: 1,
          },
        };
      }
      throw new Error(`unexpected method: ${String(method)}`);
    });

    const tool = createOpenClawTools().find((candidate) => candidate.name === "nodes");
    if (!tool) {
      throw new Error("missing nodes tool");
    }

    const result = await tool.execute("call1", {
      action: "camera_snap",
      node: "mac-1",
      facing: "front",
    });

    const images = (result.content ?? []).filter((block) => block.type === "image");
    expect(images).toHaveLength(1);
    expect(images[0]?.mimeType).toBe("image/jpeg");
  });

  it("passes deviceId when provided", async () => {
    callGateway.mockImplementation(async ({ method, params }) => {
      if (method === "node.list") {
        return { nodes: [{ nodeId: "mac-1" }] };
      }
      if (method === "node.invoke") {
        expect(params).toMatchObject({
          command: "camera.snap",
          params: { deviceId: "cam-123" },
        });
        return {
          payload: {
            format: "jpg",
            base64: TINY_JPEG_BASE64,
            width: 1,
            height: 1,
          },
        };
      }
      throw new Error(`unexpected method: ${String(method)}`);
    });

    const tool = createOpenClawTools().find((candidate) => candidate.name === "nodes");
    if (!tool) {
      throw new Error("missing nodes tool");
    }

    await tool.execute("call1", {
      action: "camera_snap",
      node: "mac-1",
      facing: "front",
      deviceId: "cam-123",
    });
  });
});

describe("nodes run", () => {
  beforeEach(() => {
    callGateway.mockReset();
  });

  it("passes invoke and command timeouts", async () => {
    callGateway.mockImplementation(async ({ method, params }) => {
      if (method === "node.list") {
        return { nodes: [{ nodeId: "mac-1", commands: ["system.run"] }] };
      }
      if (method === "node.invoke") {
        expect(params).toMatchObject({
          nodeId: "mac-1",
          command: "system.run",
          timeoutMs: 45_000,
          params: {
            command: ["echo", "hi"],
            cwd: "/tmp",
            env: { FOO: "bar" },
            timeoutMs: 12_000,
          },
        });
        return {
          payload: { stdout: "", stderr: "", exitCode: 0, success: true },
        };
      }
      throw new Error(`unexpected method: ${String(method)}`);
    });

    const tool = createOpenClawTools().find((candidate) => candidate.name === "nodes");
    if (!tool) {
      throw new Error("missing nodes tool");
    }

    await tool.execute("call1", {
      action: "run",
      node: "mac-1",
      command: ["echo", "hi"],
      cwd: "/tmp",
      env: ["FOO=bar"],
      commandTimeoutMs: 12_000,
      invokeTimeoutMs: 45_000,
    });
  });
});
