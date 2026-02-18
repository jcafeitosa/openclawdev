/**
 * Twitter RPC handlers for the Control UI dashboard.
 *
 * Delegates to the existing twitter-api functions which use the `x` CLI wrapper.
 */

import { ErrorCodes, errorShape } from "../protocol/index.js";
import { getTwitterDashboardData, getTwitterRelationships } from "../twitter-api.js";
import { formatForLog } from "../ws-log.js";
import type { GatewayRequestHandlers } from "./types.js";

export const twitterHandlers: GatewayRequestHandlers = {
  /**
   * twitter.data — UI expects a TwitterData shape with profile, engagement,
   * tweets, alerts, and lastUpdated.
   */
  "twitter.data": async ({ respond }) => {
    try {
      const result = await getTwitterDashboardData();
      if (!result.success || !result.data) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.UNAVAILABLE,
            (result as { error?: string }).error ?? "Failed to fetch Twitter data",
          ),
        );
        return;
      }

      // Map alerts to include severity field expected by UI
      const data = result.data;
      const alerts = (data.alerts ?? []).map((alert: { type: string; message: string }) => ({
        type: alert.type as "info" | "warning" | "error",
        severity: alert.type === "error" ? "high" : alert.type === "warning" ? "medium" : "low",
        message: alert.message,
      }));

      respond(
        true,
        {
          profile: data.profile,
          engagement: data.engagement,
          tweets: data.tweets,
          alerts,
          lastUpdated: data.lastUpdated,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * twitter.relationships — UI expects TwitterRelationships shape with
   * current_user, following, and followers_sample.
   */
  "twitter.relationships": async ({ params, respond }) => {
    try {
      const limit = typeof params.limit === "number" ? params.limit : 50;
      const result = await getTwitterRelationships(limit);
      if (!result.success || !result.data) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.UNAVAILABLE,
            (result as { error?: string }).error ?? "Failed to fetch Twitter relationships",
          ),
        );
        return;
      }
      respond(true, result.data, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
};
