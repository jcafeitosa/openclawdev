/**
 * Twitter API routes — Elysia plugin.
 *
 * GET /api/twitter/dashboard
 * GET /api/twitter/relationships?limit=N
 */

import { Elysia } from "elysia";
import { getTwitterDashboardData, getTwitterRelationships } from "../twitter-api.js";

export function twitterRoutes() {
  return new Elysia({ name: "twitter-routes", prefix: "/api/twitter" })
    .get("/dashboard", async ({ set }) => {
      try {
        const data = await getTwitterDashboardData();
        set.headers["cache-control"] = "public, max-age=900";
        return data;
      } catch {
        set.status = 500;
        return { error: "Failed to fetch Twitter data" };
      }
    })
    .get("/relationships", async ({ query, set }) => {
      try {
        const limit = Number.parseInt(String(query.limit || "50"));
        const data = await getTwitterRelationships(limit);
        set.headers["cache-control"] = "public, max-age=1800";
        return data;
      } catch {
        set.status = 500;
        return { error: "Failed to fetch Twitter relationships" };
      }
    });
}
