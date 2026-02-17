#!/usr/bin/env bun
/**
 * Memory Consolidation Stub
 *
 * Simplified version that just checks system health
 * Use until we have enough data for real consolidation
 */

import { getDatabase } from "../../infra/database/client.js";

const mode = process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] || "daily";

console.log(`[consolidate-stub] Running ${mode} health check...`);

try {
  const db = getDatabase();

  // Check agent_memory table exists and get count
  const [stats] = await db<Array<{ total: string }>>`
    SELECT COUNT(*) as total FROM agent_memory
  `;

  const total = parseInt(stats?.total || "0");

  console.log(`[consolidate-stub] Found ${total} memories in database`);

  if (total === 0) {
    console.log(
      `[consolidate-stub] No memories to consolidate yet - this is normal for new installations`,
    );
  } else {
    console.log(`[consolidate-stub] System healthy, ${total} memories tracked`);
  }

  console.log(`[consolidate-stub] ✅ ${mode} check completed`);
  process.exit(0);
} catch (error) {
  console.error(`[consolidate-stub] ❌ Error:`, error);
  process.exit(1);
}
