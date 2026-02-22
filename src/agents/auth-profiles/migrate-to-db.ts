#!/usr/bin/env tsx
/**
 * Migration script: auth-profiles.json files → PostgreSQL (encrypted)
 *
 * Usage:
 *   AUTH_ENCRYPTION_KEY=<key> DATABASE_URL=<url> tsx migrate-to-db.ts [--dry-run] [--cleanup]
 *
 * Options:
 *   --dry-run   Show what would be migrated without making changes
 *   --cleanup   Remove JSON files after successful migration
 *
 * Prerequisites:
 *   1. PostgreSQL running with schema applied (drizzle-kit push)
 *   2. AUTH_ENCRYPTION_KEY set (32 bytes hex or base64)
 *   3. DATABASE_URL set
 */

import fs from "node:fs";
import path from "node:path";
import { DbAuthStoreBackend } from "./backend-db.js";
import { AUTH_STORE_VERSION } from "./constants.js";
import { parseEncryptionKey } from "./crypto.js";
import type { AuthProfileCredential, AuthProfileStore } from "./types.js";

// Configuration
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME!, ".openclaw");
const AGENTS_DIR = path.join(OPENCLAW_DIR, "agents");
const AUTH_FILE_NAME = "auth-profiles.json";

interface MigrationResult {
  totalAgents: number;
  totalProfiles: number;
  migratedProfiles: number;
  skippedProfiles: number;
  errors: string[];
  cleanedFiles: string[];
}

function findAuthFiles(): string[] {
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

  return authFiles;
}

function loadAuthFile(filePath: string): AuthProfileStore | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);

    // Handle versioned format
    if (parsed.version && parsed.profiles) {
      return parsed as AuthProfileStore;
    }

    // Handle legacy format (flat object)
    const profiles: Record<string, AuthProfileCredential> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === "object" && "type" in value) {
        profiles[key] = value as AuthProfileCredential;
      }
    }

    return {
      version: AUTH_STORE_VERSION,
      profiles,
      usageStats: parsed.usageStats,
      order: parsed.order,
      lastGood: parsed.lastGood,
    };
  } catch (err) {
    console.error(`Error loading ${filePath}:`, err);
    return null;
  }
}

function mergeStores(stores: AuthProfileStore[]): AuthProfileStore {
  const merged: AuthProfileStore = {
    version: AUTH_STORE_VERSION,
    profiles: {},
    usageStats: {},
    order: {},
    lastGood: {},
  };

  for (const store of stores) {
    // Merge profiles (last wins, but prefer newer expires for OAuth)
    for (const [profileId, credential] of Object.entries(store.profiles)) {
      const existing = merged.profiles[profileId];
      if (!existing) {
        merged.profiles[profileId] = credential;
      } else if (credential.type === "oauth" && existing.type === "oauth") {
        // Keep the one with later expiry
        if ((credential.expires ?? 0) > (existing.expires ?? 0)) {
          merged.profiles[profileId] = credential;
        }
      } else {
        // For API keys/tokens, keep existing (first wins to preserve main agent's keys)
      }
    }

    // Merge usage stats (keep most recent lastUsed)
    if (store.usageStats) {
      for (const [profileId, stats] of Object.entries(store.usageStats)) {
        const existing = merged.usageStats![profileId];
        if (!existing || (stats.lastUsed ?? 0) > (existing.lastUsed ?? 0)) {
          merged.usageStats![profileId] = stats;
        }
      }
    }

    // Merge order (last wins)
    if (store.order) {
      merged.order = { ...merged.order, ...store.order };
    }

    // Merge lastGood (last wins)
    if (store.lastGood) {
      merged.lastGood = { ...merged.lastGood, ...store.lastGood };
    }
  }

  // Clean up empty objects
  if (Object.keys(merged.usageStats!).length === 0) {
    delete merged.usageStats;
  }
  if (Object.keys(merged.order!).length === 0) {
    delete merged.order;
  }
  if (Object.keys(merged.lastGood!).length === 0) {
    delete merged.lastGood;
  }

  return merged;
}

async function migrate(options: { dryRun: boolean; cleanup: boolean }): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalAgents: 0,
    totalProfiles: 0,
    migratedProfiles: 0,
    skippedProfiles: 0,
    errors: [],
    cleanedFiles: [],
  };

  // Check prerequisites
  const encryptionKey = parseEncryptionKey(process.env.AUTH_ENCRYPTION_KEY);
  if (!encryptionKey) {
    result.errors.push(
      "AUTH_ENCRYPTION_KEY not set or invalid. Must be 32 bytes (64 hex chars or 44 base64 chars).",
    );
    return result;
  }

  if (!process.env.DATABASE_URL) {
    result.errors.push("DATABASE_URL not set.");
    return result;
  }

  // Find all auth files
  const authFiles = findAuthFiles();
  result.totalAgents = authFiles.length;

  if (authFiles.length === 0) {
    console.log("No auth-profiles.json files found. Nothing to migrate.");
    return result;
  }

  console.log(`Found ${authFiles.length} auth file(s) to migrate:\n`);
  for (const file of authFiles) {
    console.log(`  - ${file}`);
  }
  console.log();

  // Load all stores
  const stores: AuthProfileStore[] = [];
  for (const file of authFiles) {
    const store = loadAuthFile(file);
    if (store) {
      stores.push(store);
      result.totalProfiles += Object.keys(store.profiles).length;
    }
  }

  // Merge into single store
  const mergedStore = mergeStores(stores);
  const profileCount = Object.keys(mergedStore.profiles).length;

  console.log(`\nMerged ${result.totalProfiles} profiles into ${profileCount} unique profiles.\n`);

  // Show what will be migrated
  console.log("Profiles to migrate:");
  for (const [profileId, credential] of Object.entries(mergedStore.profiles)) {
    const type = credential.type;
    const provider = credential.provider;
    const email = "email" in credential ? credential.email : undefined;
    const expires =
      "expires" in credential && credential.expires
        ? new Date(credential.expires).toISOString()
        : "N/A";

    console.log(`  - ${profileId}`);
    console.log(`      Provider: ${provider}, Type: ${type}`);
    if (email) {
      console.log(`      Email: ${email}`);
    }
    if (type === "oauth") {
      console.log(`      Expires: ${expires}`);
    }
  }
  console.log();

  if (options.dryRun) {
    console.log("DRY RUN - No changes made.\n");
    console.log("To perform actual migration, run without --dry-run flag.");
    result.migratedProfiles = profileCount;
    return result;
  }

  // Perform migration
  console.log("Migrating to PostgreSQL...\n");

  try {
    const backend = new DbAuthStoreBackend(encryptionKey);
    await backend.saveAsync(mergedStore);
    result.migratedProfiles = profileCount;
    console.log(`✅ Successfully migrated ${profileCount} profiles to encrypted PostgreSQL.\n`);
  } catch (err) {
    result.errors.push(`Migration failed: ${String(err)}`);
    console.error("❌ Migration failed:", err);
    return result;
  }

  // Verify migration
  console.log("Verifying migration...\n");
  try {
    const backend = new DbAuthStoreBackend(encryptionKey);
    const loaded = await backend.loadAsync();
    const loadedCount = Object.keys(loaded.profiles).length;

    if (loadedCount !== profileCount) {
      result.errors.push(
        `Verification failed: expected ${profileCount} profiles, got ${loadedCount}`,
      );
      console.error(`❌ Verification failed: profile count mismatch`);
      return result;
    }

    // Verify each profile can be decrypted
    for (const [profileId, original] of Object.entries(mergedStore.profiles)) {
      const loaded_profile = loaded.profiles[profileId];
      if (!loaded_profile) {
        result.errors.push(`Verification failed: profile ${profileId} not found after migration`);
        continue;
      }
      if (loaded_profile.provider !== original.provider) {
        result.errors.push(`Verification failed: profile ${profileId} provider mismatch`);
      }
    }

    console.log(`✅ Verification passed: ${loadedCount} profiles readable and decryptable.\n`);
  } catch (err) {
    result.errors.push(`Verification failed: ${String(err)}`);
    console.error("❌ Verification failed:", err);
    return result;
  }

  // Cleanup (optional)
  if (options.cleanup && result.errors.length === 0) {
    console.log("Cleaning up JSON files...\n");
    for (const file of authFiles) {
      try {
        const backupPath = `${file}.migrated.bak`;
        fs.copyFileSync(file, backupPath);
        fs.unlinkSync(file);
        result.cleanedFiles.push(file);
        console.log(`  ✅ Removed ${file} (backup: ${backupPath})`);
      } catch (err) {
        console.error(`  ❌ Failed to remove ${file}:`, err);
      }
    }
    console.log();
  }

  return result;
}

// Main
async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const cleanup = args.has("--cleanup");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenClaw Auth Migration: JSON Files → Encrypted PostgreSQL  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  const result = await migrate({ dryRun, cleanup });

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("MIGRATION SUMMARY");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`  Auth files found:     ${result.totalAgents}`);
  console.log(`  Total profiles:       ${result.totalProfiles}`);
  console.log(`  Migrated profiles:    ${result.migratedProfiles}`);
  console.log(`  Skipped profiles:     ${result.skippedProfiles}`);
  console.log(`  Cleaned files:        ${result.cleanedFiles.length}`);
  console.log(`  Errors:               ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log("\nERRORS:");
    for (const error of result.errors) {
      console.log(`  ❌ ${error}`);
    }
    process.exit(1);
  }

  console.log("\n✅ Migration complete!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
