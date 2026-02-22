/**
 * CLI command to migrate auth credentials from JSON files to encrypted PostgreSQL.
 *
 * Usage:
 *   openclaw auth migrate [--dry-run] [--cleanup]
 */

import { parseEncryptionKey } from "../agents/auth-profiles/crypto.js";

export interface AuthMigrateOptions {
  dryRun?: boolean;
  cleanup?: boolean;
}

export async function runAuthMigrate(options: AuthMigrateOptions = {}): Promise<void> {
  const { dryRun = false, cleanup = false } = options;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenClaw Auth Migration: JSON Files → Encrypted PostgreSQL  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Check prerequisites
  const encryptionKey = parseEncryptionKey(process.env.AUTH_ENCRYPTION_KEY);
  if (!encryptionKey) {
    console.error("❌ AUTH_ENCRYPTION_KEY not set or invalid.\n");
    console.log("To generate a key:");
    console.log("  openssl rand -hex 32\n");
    console.log("Then set in your .env:");
    console.log("  AUTH_ENCRYPTION_KEY=<64 hex chars>\n");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set.\n");
    console.log("Set in your .env:");
    console.log("  DATABASE_URL=postgres://user:password@localhost:5432/openclaw\n");
    process.exit(1);
  }

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  try {
    const { isDatabaseConnected } = await import("../infra/database/client.js");
    const connected = await isDatabaseConnected();

    if (!connected) {
      console.error("❌ Cannot connect to database.\n");
      console.log("Check your DATABASE_URL and ensure PostgreSQL is running.\n");
      process.exit(1);
    }

    // Import and run the migration
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { DbAuthStoreBackend } = await import("../agents/auth-profiles/backend-db.js");
    const { AUTH_STORE_VERSION } = await import("../agents/auth-profiles/constants.js");
    const { resolveStateDir } = await import("../config/paths.js");

    const OPENCLAW_DIR = resolveStateDir();
    const AGENTS_DIR = path.join(OPENCLAW_DIR, "agents");
    const AUTH_FILE_NAME = "auth-profiles.json";

    // Find all auth files
    const authFiles: string[] = [];

    // Main auth file
    const mainAuthPath = path.join(OPENCLAW_DIR, "identity", AUTH_FILE_NAME);
    if (fs.existsSync(mainAuthPath)) {
      authFiles.push(mainAuthPath);
    }

    // Agent auth files
    if (fs.existsSync(AGENTS_DIR)) {
      const agents = fs.readdirSync(AGENTS_DIR);
      for (const agent of agents) {
        const agentAuthPath = path.join(AGENTS_DIR, agent, "agent", AUTH_FILE_NAME);
        if (fs.existsSync(agentAuthPath)) {
          authFiles.push(agentAuthPath);
        }
      }
    }

    if (authFiles.length === 0) {
      console.log("No auth-profiles.json files found. Nothing to migrate.\n");
      return;
    }

    console.log(`Found ${authFiles.length} auth file(s) to migrate:\n`);
    for (const file of authFiles) {
      console.log(`  - ${file}`);
    }
    console.log();

    // Load and merge all stores
    type AuthProfileStore = import("../agents/auth-profiles/types.js").AuthProfileStore;
    type AuthProfileCredential = import("../agents/auth-profiles/types.js").AuthProfileCredential;

    const stores: AuthProfileStore[] = [];
    let totalProfiles = 0;

    for (const file of authFiles) {
      try {
        const content = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(content);

        const profiles: Record<string, AuthProfileCredential> = {};
        const source = parsed.profiles || parsed;

        for (const [key, value] of Object.entries(source)) {
          if (value && typeof value === "object" && "type" in value) {
            profiles[key] = value as AuthProfileCredential;
            totalProfiles++;
          }
        }

        stores.push({
          version: AUTH_STORE_VERSION,
          profiles,
          usageStats: parsed.usageStats,
          order: parsed.order,
          lastGood: parsed.lastGood,
        });
      } catch (err) {
        console.error(`  ⚠️ Error loading ${file}:`, err);
      }
    }

    // Merge stores
    const merged: AuthProfileStore = {
      version: AUTH_STORE_VERSION,
      profiles: {},
      usageStats: {},
      order: {},
      lastGood: {},
    };

    for (const store of stores) {
      for (const [profileId, credential] of Object.entries(store.profiles)) {
        const existing = merged.profiles[profileId];
        if (!existing) {
          merged.profiles[profileId] = credential;
        } else if (credential.type === "oauth" && existing.type === "oauth") {
          if ((credential.expires ?? 0) > (existing.expires ?? 0)) {
            merged.profiles[profileId] = credential;
          }
        }
      }

      if (store.usageStats) {
        merged.usageStats = { ...merged.usageStats, ...store.usageStats };
      }
      if (store.order) {
        merged.order = { ...merged.order, ...store.order };
      }
      if (store.lastGood) {
        merged.lastGood = { ...merged.lastGood, ...store.lastGood };
      }
    }

    const profileCount = Object.keys(merged.profiles).length;
    console.log(`Merged ${totalProfiles} profiles into ${profileCount} unique profiles.\n`);

    // Show profiles
    console.log("Profiles to migrate:");
    for (const [profileId, credential] of Object.entries(merged.profiles)) {
      console.log(`  - ${profileId} (${credential.provider}, ${credential.type})`);
    }
    console.log();

    if (dryRun) {
      console.log("DRY RUN - No changes made.\n");
      return;
    }

    // Perform migration
    console.log("Migrating to PostgreSQL...\n");
    const backend = new DbAuthStoreBackend(encryptionKey);
    await backend.saveAsync(merged);
    console.log(`✅ Successfully migrated ${profileCount} profiles.\n`);

    // Verify
    console.log("Verifying migration...\n");
    const loaded = await backend.loadAsync();
    const loadedCount = Object.keys(loaded.profiles).length;

    if (loadedCount !== profileCount) {
      console.error(`❌ Verification failed: expected ${profileCount}, got ${loadedCount}`);
      process.exit(1);
    }

    console.log(`✅ Verification passed: ${loadedCount} profiles readable.\n`);

    // Cleanup
    if (cleanup) {
      console.log("Cleaning up JSON files...\n");
      for (const file of authFiles) {
        try {
          const backupPath = `${file}.migrated.bak`;
          fs.copyFileSync(file, backupPath);
          fs.unlinkSync(file);
          console.log(`  ✅ Removed ${file}`);
        } catch (err) {
          console.error(`  ❌ Failed to remove ${file}:`, err);
        }
      }
      console.log();
    }

    console.log("✅ Migration complete!\n");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}
