import { getBudgetStatus, PROVIDER_BASE_PRIORITY } from "../../agents/model-budget-manager.js";
import { loadConfig } from "../../config/config.js";
import {
  getAllFreeModelHealth,
  getActiveBillingProviders,
  hasRecentProbe,
  loadFreeModelHealth,
  probeFreeModels,
  setActiveBillingProviders,
  type FreeModelHealthEntry,
} from "../free-model-health.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateModelsListParams,
} from "../protocol/index.js";
import { loadAllCatalogFreeModels } from "../server-model-catalog.js";
import type { GatewayRequestHandlers } from "./types.js";

export const modelsHandlers: GatewayRequestHandlers = {
  "models.list": async ({ params, respond, context }) => {
    if (!validateModelsListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid models.list params: ${formatValidationErrors(validateModelsListParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const [models, freeModelsRaw, healthEntries, healthStore] = await Promise.all([
        context.loadGatewayModelCatalog(),
        loadAllCatalogFreeModels(),
        getAllFreeModelHealth(),
        loadFreeModelHealth(),
      ]);

      // Build a lookup of health data keyed by provider/modelId
      const healthMap = new Map<string, FreeModelHealthEntry>();
      for (const entry of healthEntries) {
        healthMap.set(`${entry.provider}/${entry.modelId}`, entry);
      }

      // Enrich free models with health/probe data
      const freeModels = freeModelsRaw.map((m) => {
        const health = healthMap.get(`${m.provider}/${m.id}`);
        return {
          ...m,
          probeStatus: health?.status ?? "unknown",
          probeLatencyMs: health?.latencyMs,
          lastProbed: health?.lastProbed,
          probeError: health?.errorReason,
          pricing: health?.pricing,
          discoveredFree: health?.discoveredFree,
        };
      });

      // Collect discovered-free models that are NOT in the tagged-free list
      const freeModelKeys = new Set(freeModelsRaw.map((m) => `${m.provider}/${m.id}`));
      const discoveredFreeModels: Array<Record<string, unknown>> = [];
      for (const entry of healthEntries) {
        const key = `${entry.provider}/${entry.modelId}`;
        if (entry.discoveredFree && !freeModelKeys.has(key)) {
          discoveredFreeModels.push({
            id: entry.modelId,
            name: entry.name,
            provider: entry.provider,
            contextWindow: entry.contextWindow,
            reasoning: entry.reasoning,
            isFree: true,
            tags: entry.tags,
            probeStatus: entry.status,
            probeLatencyMs: entry.latencyMs,
            lastProbed: entry.lastProbed,
            probeError: entry.errorReason,
            pricing: entry.pricing,
            discoveredFree: true,
          });
        }
      }

      respond(
        true,
        {
          models,
          freeModels: [...freeModels, ...discoveredFreeModels],
          freeModelsSummary: healthStore
            ? {
                totalModels: healthStore.totalModels,
                verifiedCount: healthStore.verifiedCount,
                failedCount: healthStore.failedCount,
                noCredentialsCount: healthStore.noCredentialsCount,
                discoveredFreeCount: healthStore.discoveredFreeCount,
                lastFullProbe: healthStore.lastFullProbe,
                activeBillingProviders: healthStore.activeBillingProviders ?? [],
                providerSubscriptions: healthStore.providerSubscriptions ?? undefined,
              }
            : null,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * Trigger a manual probe of all models (free + discovery).
   * Returns the full health store when complete.
   */
  "freeModels.probe": async ({ respond }) => {
    try {
      const cfg = loadConfig();
      const store = await probeFreeModels(cfg);
      respond(true, store, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * Get current free model health status without running a new probe.
   */
  "freeModels.health": async ({ respond }) => {
    try {
      const store = await loadFreeModelHealth();
      const recent = await hasRecentProbe();
      respond(
        true,
        {
          health: store,
          hasRecentProbe: recent,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * Set or update the active billing providers list.
   * Accepts { providerIds: string[] }.
   */
  "freeModels.setBilling": async ({ params, respond }) => {
    try {
      const p = params as { providerIds?: string[] } | undefined;
      const providerIds = Array.isArray(p?.providerIds) ? p.providerIds : [];
      await setActiveBillingProviders(providerIds);
      respond(true, { activeBillingProviders: providerIds }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * Get the current active billing providers list.
   */
  "freeModels.getBilling": async ({ respond }) => {
    try {
      const providers = await getActiveBillingProviders();
      respond(true, { activeBillingProviders: providers }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * Get the current provider budget status and priority scores.
   * Shows 7-day rolling usage per provider and dynamic priority adjustments.
   */
  "models.budget.status": ({ respond }) => {
    try {
      const entries = getBudgetStatus();
      respond(
        true,
        {
          providers: entries,
          priorityOrder: Object.entries(PROVIDER_BASE_PRIORITY)
            .toSorted((a, b) => a[1] - b[1])
            .map(([category, score]) => ({ category, baseScore: score })),
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
