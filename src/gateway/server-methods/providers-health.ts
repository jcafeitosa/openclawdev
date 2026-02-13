/**
 * Gateway handlers for provider health endpoints.
 */

import type { GatewayRequestHandlers } from "./types.js";
import {
  getAllProviderHealth,
  getProviderHealth,
  getProvidersByHealth,
  isProviderHealthy,
} from "../../providers/core/health.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const providersHealthHandlers: GatewayRequestHandlers = {
  /**
   * Get health metrics for all providers or a specific provider.
   */
  "providers.health": async ({ params, respond }) => {
    try {
      const typedParams = params as { providerId?: string };

      if (typedParams.providerId) {
        // Get health for specific provider
        const health = getProviderHealth(typedParams.providerId as any);
        respond(true, { provider: health }, undefined);
      } else {
        // Get health for all providers
        const allHealth = getAllProviderHealth();
        const providers = Array.from(allHealth.values());

        // Calculate summary stats
        const summary = {
          total: providers.length,
          active: providers.filter((p) => p.status === "active").length,
          degraded: providers.filter((p) => p.status === "degraded").length,
          cooldown: providers.filter((p) => p.status === "cooldown").length,
          offline: providers.filter((p) => p.status === "offline").length,
          avgSuccessRate:
            providers.length > 0
              ? providers.reduce((acc, p) => acc + p.successRate, 0) / providers.length
              : 1.0,
        };

        respond(true, { providers, summary }, undefined);
      }
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * Check if a provider is healthy.
   */
  "providers.health.check": async ({ params, respond }) => {
    try {
      const typedParams = params as { providerId: string };
      if (!typedParams.providerId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "providerId is required"));
        return;
      }

      const healthy = isProviderHealthy(typedParams.providerId as any);
      const health = getProviderHealth(typedParams.providerId as any);

      respond(true, { healthy, status: health.status, provider: health }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * Get providers sorted by health (healthiest first).
   */
  "providers.health.ranked": async ({ params, respond }) => {
    try {
      const typedParams = params as { providerIds?: string[] };
      const allHealth = getAllProviderHealth();
      const providerIds = typedParams.providerIds ?? Array.from(allHealth.keys());

      const ranked = getProvidersByHealth(providerIds as any[]);
      const providers = ranked.map((id) => getProviderHealth(id as any));

      respond(true, { providers, ranked }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
