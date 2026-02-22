/**
 * Twitter API routes — Express Router.
 *
 * GET /api/twitter/dashboard
 * GET /api/twitter/relationships?limit=N
 * Mounted at /api/twitter in express-gateway.ts.
 */

import { Router } from "express";
import { getTwitterDashboardData, getTwitterRelationships } from "../twitter-api.js";

export function twitterRouter(): Router {
  const router = Router();

  router.get("/dashboard", async (_req, res) => {
    try {
      const data = await getTwitterDashboardData();
      res.setHeader("Cache-Control", "public, max-age=900");
      res.json(data);
    } catch (error) {
      const err = error as { message?: string };
      res.status(500).json({
        error: "Failed to fetch Twitter data",
        message: err.message ?? String(error),
      });
    }
  });

  router.get("/relationships", async (req, res) => {
    try {
      const limit = Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : "50");
      const data = await getTwitterRelationships(limit);
      res.setHeader("Cache-Control", "public, max-age=1800");
      res.json(data);
    } catch (error) {
      const err = error as { message?: string };
      res.status(500).json({
        error: "Failed to fetch Twitter relationships",
        message: err.message ?? String(error),
      });
    }
  });

  return router;
}
