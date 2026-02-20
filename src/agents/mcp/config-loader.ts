/**
 * MCP multi-layer configuration loader.
 *
 * Loads MCP configuration from multiple sources and merges them:
 *   1. Global: ~/.openclaw/mcp.json (base layer)
 *   2. Local: .mcp.json or mcp.json in cwd (override layer)
 *
 * Local config takes precedence over global for same-named servers.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getChildLogger } from "../../logging.js";
import { type McpConfig, McpConfigSchema } from "./types.js";

const CONFIG_FILENAMES = [".mcp.json", "mcp.json"] as const;

const EMPTY_CONFIG: McpConfig = { servers: {} };

/**
 * Load and merge MCP configuration from global + local sources.
 */
export async function loadMergedMcpConfig(cwd: string = process.cwd()): Promise<McpConfig> {
  const homeConfigPath = path.join(os.homedir(), ".openclaw", "mcp.json");
  const localConfigPath = await findLocalConfig(cwd);

  let config: McpConfig = { ...EMPTY_CONFIG, servers: {} };

  const globalConfig = await readConfigSafe(homeConfigPath);
  if (globalConfig) {
    config = mergeConfigs(config, globalConfig);
  }

  if (localConfigPath) {
    const localConfig = await readConfigSafe(localConfigPath);
    if (localConfig) {
      config = mergeConfigs(config, localConfig);
    }
  }

  return config;
}

async function findLocalConfig(cwd: string): Promise<string | null> {
  for (const filename of CONFIG_FILENAMES) {
    const filePath = path.join(cwd, filename);
    if (await fileExists(filePath)) {
      return filePath;
    }
  }
  return null;
}

async function readConfigSafe(filePath: string): Promise<McpConfig | null> {
  if (!(await fileExists(filePath))) {
    return null;
  }
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const json: unknown = JSON.parse(content);
    return McpConfigSchema.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    getChildLogger({ module: "mcp-config" }).warn(
      `Failed to load MCP config from ${filePath}: ${message}`,
    );
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function mergeConfigs(base: McpConfig, override: McpConfig): McpConfig {
  return {
    servers: { ...base.servers, ...override.servers },
  };
}
