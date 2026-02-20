import { loadAuthProfileStore, clearAuthProfileCooldown } from "../../agents/auth-profiles.js";
import type { RuntimeEnv } from "../../runtime.js";
import { formatMs } from "./shared.js";

export async function modelsCooldownsCommand(
  opts: { json?: boolean; clear?: string },
  runtime: RuntimeEnv,
) {
  const store = loadAuthProfileStore();

  if (opts.clear) {
    const profileId = opts.clear;
    if (!store.profiles[profileId]) {
      throw new Error(`Auth profile "${profileId}" not found.`);
    }
    await clearAuthProfileCooldown({ store, profileId });
    runtime.log(`Cooldown cleared for profile "${profileId}".`);
    return;
  }

  const usageStats = store.usageStats ?? {};
  const entries = Object.entries(usageStats).filter(([, stats]) => {
    const now = Date.now();
    return (
      (stats.cooldownUntil && stats.cooldownUntil > now) ||
      (stats.disabledUntil && stats.disabledUntil > now)
    );
  });

  if (opts.json) {
    const result = entries.map(([id, stats]) => ({
      profileId: id,
      provider: store.profiles[id]?.provider,
      ...stats,
      remainingMs: Math.max(0, (stats.cooldownUntil ?? stats.disabledUntil ?? 0) - Date.now()),
    }));
    runtime.log(JSON.stringify(result, null, 2));
    return;
  }

  if (entries.length === 0) {
    runtime.log("No profiles are currently in cooldown.");
    return;
  }

  runtime.log(`Active cooldowns (${entries.length}):
`);
  for (const [id, stats] of entries) {
    const now = Date.now();
    const until = stats.cooldownUntil ?? stats.disabledUntil ?? 0;
    const remaining = until - now;
    const type = stats.disabledUntil ? "DISABLED" : "COOLDOWN";
    const provider = store.profiles[id]?.provider ?? "unknown";

    runtime.log(`${id} (${provider})`);
    runtime.log(`  Type: ${type}`);
    runtime.log(`  Remaining: ${formatMs(remaining)}`);
    if (stats.disabledReason) {
      runtime.log(`  Reason: ${stats.disabledReason}`);
    }
    if (stats.errorCount) {
      runtime.log(`  Error count: ${stats.errorCount}`);
    }
    if (stats.failureCounts) {
      const counts = Object.entries(stats.failureCounts)
        .map(([reason, count]) => `${reason}:${count}`)
        .join(", ");
      runtime.log(`  Failure history: ${counts}`);
    }
    runtime.log("");
  }
}
