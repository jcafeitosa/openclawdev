import { getDetectedProviderIds } from "../../commands/providers/detection.js";
import { PROVIDER_REGISTRY } from "../../commands/providers/registry.js";
import { loadConfig } from "../../config/config.js";
import { resolveApiKeyForProvider } from "../model-auth.js";
import {
  loadDiscoveredCatalog,
  mergeDiscoveredModels,
  saveDiscoveredCatalog,
} from "./dynamic-catalog.js";
import {
  AnthropicScanner,
  BedrockScanner,
  CerebrasScanner,
  DeepSeekScanner,
  GoogleScanner,
  GroqScanner,
  HuggingfaceScanner,
  KimiCodingScanner,
  MinimaxScanner,
  MistralScanner,
  MoonshotScanner,
  OllamaScanner,
  OpenAIScanner,
  OpenCodeScanner,
  OpenRouterScanner,
  QwenScanner,
  SambanovaScanner,
  SyntheticScanner,
  TogetherScanner,
  VeniceScanner,
  XiaomiScanner,
  XAIScanner,
  ZaiScanner,
} from "./scanners.js";
import type { DiscoveredModel, ModelScanner } from "./types.js";

const SPECIALIZED_SCANNERS: ModelScanner[] = [
  OpenAIScanner,
  AnthropicScanner,
  GoogleScanner,
  OpenRouterScanner,
  GroqScanner,
  SambanovaScanner,
  CerebrasScanner,
  TogetherScanner,
  XAIScanner,
  MistralScanner,
  DeepSeekScanner,
  VeniceScanner,
  MinimaxScanner,
  MoonshotScanner,
  QwenScanner,
  ZaiScanner,
  XiaomiScanner,
  OpenCodeScanner,
  KimiCodingScanner,
  SyntheticScanner,
  OllamaScanner,
  HuggingfaceScanner,
  BedrockScanner,
];

/**
 * Creates a generic OpenAI-compatible scanner for a provider.
 */
function createGenericScanner(providerId: string, baseUrl: string): ModelScanner {
  return {
    providerId,
    async scan(apiKey: string): Promise<DiscoveredModel[]> {
      try {
        const url = baseUrl.endsWith("/models") ? baseUrl : `${baseUrl.replace(/\/+$/, "")}/models`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          return [];
        }
        const data = (await res.json()) as { data: Array<{ id: string }> };
        if (!Array.isArray(data.data)) {
          return [];
        }
        return data.data.map((m) => ({
          id: m.id,
          provider: providerId,
          canonicalId: m.id,
        }));
      } catch {
        return [];
      }
    },
  };
}

async function getApiKeyForScanner(scanner: ModelScanner): Promise<string | undefined> {
  try {
    const resolved = await resolveApiKeyForProvider({
      provider: scanner.providerId,
    });
    return resolved.apiKey;
  } catch {
    // Fallback to Env Vars (common convention)
    const envKey = `${scanner.providerId.toUpperCase()}_API_KEY`;
    return process.env[envKey];
  }
}

export async function runModelDiscovery(): Promise<DiscoveredModel[]> {
  const cfg = loadConfig();
  const detectedIds = getDetectedProviderIds(cfg);
  const activeScanners = new Map<string, ModelScanner>();

  // 1. Add specialized scanners for detected providers
  for (const scanner of SPECIALIZED_SCANNERS) {
    if (detectedIds.includes(scanner.providerId)) {
      activeScanners.set(scanner.providerId, scanner);
    }
  }

  // 2. Add generic scanners for detected providers that don't have a specialized one
  for (const id of detectedIds) {
    if (activeScanners.has(id)) {
      continue;
    }

    const def = PROVIDER_REGISTRY.find((p) => p.id === id);
    const baseUrl = cfg.models?.providers?.[id]?.baseUrl || def?.defaultBaseUrl;

    if (baseUrl) {
      activeScanners.set(id, createGenericScanner(id, baseUrl));
    }
  }

  let allDiscovered: DiscoveredModel[] = [];

  for (const scanner of activeScanners.values()) {
    const apiKey = await getApiKeyForScanner(scanner);
    if (!apiKey && !scanner.providerId.includes("ollama")) {
      continue;
    }

    try {
      const models = await scanner.scan(apiKey || "");
      allDiscovered = [...allDiscovered, ...models];
    } catch {
      // Ignore scan failures
    }
  }

  const existing = (await loadDiscoveredCatalog())?.models ?? [];
  const merged = mergeDiscoveredModels(existing, allDiscovered);

  await saveDiscoveredCatalog(merged);
  return merged;
}
