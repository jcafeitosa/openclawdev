import fs from "node:fs";
import path from "node:path";
import { resolveConfigDir } from "../utils.js";

/**
 * Load environment variables for OpenClaw.
 *
 * Bun automatically loads `.env` from the process CWD at startup, so for the
 * local CWD file this is effectively a no-op in production (vars already set).
 * In test environments (Node.js forks via Vitest), Bun's auto-load doesn't run,
 * so we explicitly load the CWD file here too.
 *
 * Both files use `override: false` semantics — variables already present in
 * the environment are never overwritten. CWD file takes priority over global.
 */
export function loadDotEnv(_opts?: { quiet?: boolean }) {
  // Load CWD .env first (Bun auto-loads this in production; explicit here for tests).
  const cwdEnvPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(cwdEnvPath)) {
    loadEnvFile(cwdEnvPath);
  }

  // Load the optional global fallback (~/.openclaw/.env or $OPENCLAW_STATE_DIR/.env).
  const globalEnvPath = path.join(resolveConfigDir(process.env), ".env");
  if (fs.existsSync(globalEnvPath)) {
    loadEnvFile(globalEnvPath);
  }
}

function loadEnvFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip blank lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Only set if not already present (override: false)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
