import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../../config/paths.js";
import type { DiscoveredModel } from "./types.js";

const FILENAME = "discovered-models.json";

export type DiscoveredCatalog = {
  version: number;
  updatedAt: number;
  models: DiscoveredModel[];
};

function getCatalogPath(): string {
  return path.join(resolveStateDir(), FILENAME);
}

export async function loadDiscoveredCatalog(): Promise<DiscoveredCatalog | null> {
  try {
    const raw = await fs.readFile(getCatalogPath(), "utf-8");
    return JSON.parse(raw) as DiscoveredCatalog;
  } catch {
    return null;
  }
}

export async function saveDiscoveredCatalog(models: DiscoveredModel[]): Promise<void> {
  const payload: DiscoveredCatalog = {
    version: 1,
    updatedAt: Date.now(),
    models,
  };
  await fs.writeFile(getCatalogPath(), JSON.stringify(payload, null, 2), "utf-8");
}

/**
 * Merge discovered models into a unified list, removing duplicates based on provider+id.
 */
export function mergeDiscoveredModels(
  existing: DiscoveredModel[],
  incoming: DiscoveredModel[],
): DiscoveredModel[] {
  const map = new Map<string, DiscoveredModel>();
  for (const m of existing) {
    map.set(`${m.provider}:${m.id}`, m);
  }
  for (const m of incoming) {
    map.set(`${m.provider}:${m.id}`, m);
  }
  return Array.from(map.values());
}
