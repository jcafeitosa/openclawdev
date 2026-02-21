import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { __setModelCatalogImportForTest, loadModelCatalog } from "./model-catalog.js";
import {
  installModelCatalogTestHooks,
  mockCatalogImportFailThenRecover,
  type PiSdkModule,
} from "./model-catalog.test-harness.js";

describe("loadModelCatalog", () => {
  installModelCatalogTestHooks();

  it("retries after import failure without poisoning the cache", async () => {
    // Suppress the structured logger warning (which uses silent console in Vitest)
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const getCallCount = mockCatalogImportFailThenRecover();

    const cfg = {} as OpenClawConfig;
    const first = await loadModelCatalog({ config: cfg });
    expect(first).toEqual([]);

    const second = await loadModelCatalog({ config: cfg });
    expect(second).toEqual([{ id: "gpt-4.1", name: "GPT-4.1", provider: "openai" }]);
    // Verify the mock was called twice: once (fail) and once (recover)
    expect(getCallCount()).toBe(2);
    // Note: The structured logger uses a silent console in Vitest, so we don't
    // assert on console.warn calls — we just verify the retry behavior via call count.
  });

  it("returns partial results on discovery errors", async () => {
    // Suppress any console output during this test
    vi.spyOn(console, "warn").mockImplementation(() => {});

    __setModelCatalogImportForTest(
      async () =>
        ({
          AuthStorage: class {
            static create() {
              return {};
            }
          },
          ModelRegistry: class {
            getAll() {
              return [
                { id: "gpt-4.1", name: "GPT-4.1", provider: "openai" },
                {
                  get id() {
                    throw new Error("boom");
                  },
                  provider: "openai",
                  name: "bad",
                },
              ];
            }
          },
        }) as unknown as PiSdkModule,
    );

    // When processing throws mid-loop, partial results already accumulated should be returned
    const result = await loadModelCatalog({ config: {} as OpenClawConfig });
    expect(result).toEqual([{ id: "gpt-4.1", name: "GPT-4.1", provider: "openai" }]);
    // The structured logger silences console output in Vitest, so we verify behavior
    // by checking that the partial results are returned rather than checking warn calls.
  });

  it("adds openai-codex/gpt-5.3-codex-spark when base gpt-5.3-codex exists", async () => {
    __setModelCatalogImportForTest(
      async () =>
        ({
          AuthStorage: class {
            static create() {
              return {};
            }
          },
          ModelRegistry: class {
            getAll() {
              return [
                {
                  id: "gpt-5.3-codex",
                  provider: "openai-codex",
                  name: "GPT-5.3 Codex",
                  reasoning: true,
                  contextWindow: 200000,
                  input: ["text"],
                },
                {
                  id: "gpt-5.2-codex",
                  provider: "openai-codex",
                  name: "GPT-5.2 Codex",
                },
              ];
            }
          },
        }) as unknown as PiSdkModule,
    );

    const result = await loadModelCatalog({ config: {} as OpenClawConfig });
    expect(result).toContainEqual(
      expect.objectContaining({
        provider: "openai-codex",
        id: "gpt-5.3-codex-spark",
      }),
    );
    const spark = result.find((entry) => entry.id === "gpt-5.3-codex-spark");
    expect(spark?.name).toBe("gpt-5.3-codex-spark");
    expect(spark?.reasoning).toBe(true);
  });
});
