import { afterEach, beforeEach, vi } from "vitest";
import { __setModelCatalogImportForTest, resetModelCatalogCacheForTest } from "./model-catalog.js";

export type PiSdkModule = typeof import("./pi-model-discovery.js");

vi.mock("./models-config.js", () => ({
  ensureOpenClawModelsJson: vi.fn().mockResolvedValue({ agentDir: "/tmp", wrote: false }),
}));

vi.mock("./agent-paths.js", () => ({
  resolveOpenClawAgentDir: () => "/tmp/openclaw",
}));

vi.mock("./pi-auth-json.js", () => ({
  ensurePiAuthJsonFromAuthProfiles: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./supplemental-models.js", () => ({
  discoverSupplementalModels: vi.fn().mockResolvedValue([]),
}));

vi.mock("./discovery/dynamic-catalog.js", () => ({
  loadDiscoveredCatalog: vi.fn().mockResolvedValue(null),
}));

export function installModelCatalogTestHooks() {
  beforeEach(() => {
    resetModelCatalogCacheForTest();
  });

  afterEach(() => {
    __setModelCatalogImportForTest();
    resetModelCatalogCacheForTest();
    vi.restoreAllMocks();
  });
}

export function mockCatalogImportFailThenRecover() {
  let call = 0;
  __setModelCatalogImportForTest(async () => {
    call += 1;
    if (call === 1) {
      throw new Error("boom");
    }
    return {
      AuthStorage: class {
        static create() {
          return {};
        }
      },
      ModelRegistry: class {
        getAll() {
          return [{ id: "gpt-4.1", name: "GPT-4.1", provider: "openai" }];
        }
      },
    } as unknown as PiSdkModule;
  });
  return () => call;
}
