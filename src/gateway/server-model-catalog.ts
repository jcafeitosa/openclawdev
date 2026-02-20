import { filterModelsByOperationalHealth } from "../agents/model-availability.js";
import {
  getCapabilityTags,
  getModelCapabilitiesFromCatalog,
} from "../agents/model-capabilities.js";
import {
  loadAvailableModels,
  loadModelCatalog,
  type ModelCatalogEntry,
  resetModelCatalogCacheForTest,
} from "../agents/model-catalog.js";
import { loadConfig } from "../config/config.js";
import { loadFreeModelHealth } from "./free-model-health.js";

export type GatewayModelChoice = ModelCatalogEntry & {
  capabilities?: ReturnType<typeof getModelCapabilitiesFromCatalog>;
  tags?: string[];
};

// Test-only escape hatch: model catalog is cached at module scope for the
// process lifetime, which is fine for the real gateway daemon, but makes
// isolated unit tests harder. Keep this intentionally obscure.
export function __resetModelCatalogCacheForTest() {
  resetModelCatalogCacheForTest();
}

/**
 * Check whether a model is free (zero API cost).
 * Uses isFree flag, tags, or well-known patterns.
 */
function isFreeModel(m: ModelCatalogEntry): boolean {
  if (m.isFree === true) {
    return true;
  }
  if (m.tags?.includes("free-tier") || m.tags?.includes("emergency-free")) {
    return true;
  }
  if (m.id.toLowerCase().endsWith(":free")) {
    return true;
  }
  return false;
}

/**
 * Load free models from the FULL catalog (all providers, not just detected).
 * Returns models that are definitively free to use.
 */
export async function loadAllCatalogFreeModels(): Promise<GatewayModelChoice[]> {
  const catalog = await loadModelCatalog();
  const freeEntries = catalog.filter(isFreeModel);
  return freeEntries.map((m) => ({
    ...m,
    capabilities: getModelCapabilitiesFromCatalog(m),
    tags: getCapabilityTags(m),
  }));
}

export async function loadGatewayModelCatalog(): Promise<GatewayModelChoice[]> {
  const cfg = loadConfig();
  // Use loadAvailableModels to filter by detected providers only.
  // This ensures users only see models they can actually use.
  const models = await loadAvailableModels({ config: cfg });
  const healthyModels = filterModelsByOperationalHealth({
    models,
    cfg,
  });

  // Filter free models whose probe confirmed a broken status.
  // Statuses that confirm failure: auth, billing, failed, timeout, rate_limit, unexpected_response.
  // Statuses that are kept: ok, no_credentials, unresolvable, unknown, and models without probe data.
  const BROKEN_STATUSES = new Set([
    "auth",
    "billing",
    "failed",
    "timeout",
    "rate_limit",
    "unexpected_response",
  ]);
  const healthStore = await loadFreeModelHealth();
  const brokenFreeKeys = new Set<string>();
  if (healthStore) {
    for (const [key, entry] of Object.entries(healthStore.entries)) {
      if (BROKEN_STATUSES.has(entry.status)) {
        brokenFreeKeys.add(key);
      }
    }
  }

  const filteredModels = healthyModels.filter((m) => {
    if (!isFreeModel(m)) {
      return true;
    }
    return !brokenFreeKeys.has(`${m.provider}/${m.id}`);
  });

  return filteredModels.map((m) => ({
    ...m,
    capabilities: getModelCapabilitiesFromCatalog(m),
    tags: getCapabilityTags(m),
  }));
}
