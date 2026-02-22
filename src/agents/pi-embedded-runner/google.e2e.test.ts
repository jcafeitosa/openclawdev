import type { AgentTool } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import { sanitizeToolsForGoogle } from "./google.js";

describe("sanitizeToolsForGoogle", () => {
  const makeTool = () =>
    ({
      name: "test",
      description: "test",
      parameters: {
        type: "object",
        additionalProperties: false,
        patternProperties: { "^x-": { type: "string" } },
        properties: {
          foo: {
            type: "string",
            format: "uuid",
          },
        },
      },
      execute: async () => ({ ok: true, content: [] }),
    }) as unknown as AgentTool;

  it("strips unsupported schema keywords when modelApi is a Google API", () => {
    const [sanitized] = sanitizeToolsForGoogle({
      tools: [makeTool()],
      provider: "google-gemini-cli",
    });

    const params = sanitized.parameters as {
      additionalProperties?: unknown;
      patternProperties?: unknown;
      properties?: Record<string, { format?: unknown }>;
    };

    expect(params.additionalProperties).toBeUndefined();
    expect(params.patternProperties).toBeUndefined();
    expect(params.properties?.foo?.format).toBeUndefined();
  });

  it("strips unsupported keywords when provider is 'google' and modelApi is set", () => {
    const [sanitized] = sanitizeToolsForGoogle({
      tools: [makeTool()],
      provider: "google",
      modelApi: "google-generative-ai",
    });

    const params = sanitized.parameters as {
      additionalProperties?: unknown;
      patternProperties?: unknown;
      properties?: Record<string, { format?: unknown }>;
    };

    expect(params.additionalProperties).toBeUndefined();
    expect(params.patternProperties).toBeUndefined();
    expect(params.properties?.foo?.format).toBeUndefined();
  });

  it("does not clean when provider is non-Google and no modelApi", () => {
    const [sanitized] = sanitizeToolsForGoogle({
      tools: [makeTool()],
      provider: "anthropic",
    });

    const params = sanitized.parameters as {
      additionalProperties?: unknown;
      patternProperties?: unknown;
    };

    expect(params.additionalProperties).toBe(false);
    expect(params.patternProperties).toBeDefined();
  });
});
