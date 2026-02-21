/**
 * Free Model Health Check System
 *
 * Probes free models with a PING/PONG message to verify they are actually
 * working.  Results are persisted in `~/.openclaw/state/free-model-health.json`
 * so the gateway can filter out non-functional models from the catalog.
 *
 * Scheduled to run once at gateway startup (after a short delay) and then
 * every 24 hours.  Can also be triggered manually via `freeModels.probe`.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { resolveOpenClawAgentDir } from "../agents/agent-paths.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import {
  ensureAuthProfileStore,
  listProfilesForProvider,
  resolveAuthProfileOrder,
} from "../agents/auth-profiles.js";
import { describeFailoverError } from "../agents/failover-error.js";
import { getCustomProviderApiKey, resolveEnvApiKey } from "../agents/model-auth.js";
import {
  getCapabilityTags,
  getModelCapabilitiesFromCatalog,
} from "../agents/model-capabilities.js";
import { loadModelCatalog, type ModelCatalogEntry } from "../agents/model-catalog.js";
import { resolveModel } from "../agents/pi-embedded-runner/model.js";
import { runEmbeddedPiAgent } from "../agents/pi-embedded.js";
import { resolveDefaultAgentWorkspaceDir } from "../agents/workspace.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveStateDir } from "../config/paths.js";
import {
  resolveSessionTranscriptPath,
  resolveSessionTranscriptsDirForAgent,
} from "../config/sessions/paths.js";
import { getChildLogger } from "../logging.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROBE_PROMPT = "Ping, if you are working, respond with PONG only";
const HEALTH_FILENAME = "free-model-health.json";

const PROBE_TIMEOUT_MS = 15_000;
const PROBE_MAX_TOKENS = 10;
const PROBE_CONCURRENCY = 4;
/** Delay between probes to the same provider (avoid rate-limiting). */
const PROBE_PROVIDER_DELAY_MS = 600;
/** Entries older than this are considered stale. */
const HEALTH_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h
/** Delay before the first automatic probe after gateway startup. */
export const PROBE_INITIAL_DELAY_MS = 30_000;
/** Interval between automatic background probes. */
export const PROBE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 h

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FreeModelProbeStatus =
  | "ok"
  | "failed"
  | "timeout"
  | "rate_limit"
  | "auth"
  | "billing"
  | "unexpected_response"
  | "no_credentials"
  | "unresolvable"
  | "unknown";

export type FreeModelHealthEntry = {
  modelId: string;
  provider: string;
  name: string;
  displayName?: string;

  // Probe results
  status: FreeModelProbeStatus;
  lastProbed: number;
  latencyMs?: number;
  errorReason?: string;

  // Model metadata (from catalog / discovery)
  contextWindow?: number;
  maxOutput?: number;
  reasoning?: boolean;
  isFree: true;
  tags?: string[];
  pricing?: { input: number; output: number };
  capabilities?: {
    coding: boolean;
    reasoning: boolean;
    vision: boolean;
    general: boolean;
    fast: boolean;
    creative: boolean;
    performanceTier: string;
    costTier: string;
    primary?: string;
  };
  releaseDate?: string;
  /**
   * True when this model was NOT tagged as free in the catalog but responded
   * to PONG on a provider without active billing — i.e. secretly free.
   */
  discoveredFree?: boolean;
};

export type FreeModelHealthStore = {
  version: 1;
  updatedAt: number;
  lastFullProbe: number;
  totalModels: number;
  verifiedCount: number;
  failedCount: number;
  noCredentialsCount: number;
  unresolvableCount: number;
  discoveredFreeCount: number;
  entries: Record<string, FreeModelHealthEntry>;
  /** Provider IDs that the user marked as having active billing (skip from discovery). */
  activeBillingProviders: string[];
  /** Inferred subscription tier per provider (derived from probe results). */
  providerSubscriptions?: Record<string, ProviderSubscription>;
};

export type ProviderSubscriptionTier = "free" | "paid" | "unknown";

export type ProviderSubscription = {
  tier: ProviderSubscriptionTier;
  detectedAt: number;
  method: "probe-inference" | "manual";
  confidence: "high" | "low";
};

export type FreeModelProbeProgress = {
  completed: number;
  total: number;
  label?: string;
};

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = getChildLogger({ module: "free-model-health" });

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function getHealthPath(): string {
  return path.join(resolveStateDir(), HEALTH_FILENAME);
}

export async function loadFreeModelHealth(): Promise<FreeModelHealthStore | null> {
  try {
    const raw = await fs.readFile(getHealthPath(), "utf-8");
    return JSON.parse(raw) as FreeModelHealthStore;
  } catch {
    return null;
  }
}

async function saveFreeModelHealth(store: FreeModelHealthStore): Promise<void> {
  const dir = resolveStateDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getHealthPath(), JSON.stringify(store, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Free model detection (same logic as server-model-catalog.ts)
// ---------------------------------------------------------------------------

function isFreeModel(m: ModelCatalogEntry): boolean {
  if (m.isFree === true) {
    return true;
  }
  if (m.tags?.includes("free-tier") || m.tags?.includes("emergency-free")) {
    return true;
  }
  if (m.id.toLowerCase().endsWith(":free")) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Build rich metadata for a catalog entry
// ---------------------------------------------------------------------------

function buildEntryMetadata(
  m: ModelCatalogEntry,
): Omit<FreeModelHealthEntry, "status" | "lastProbed" | "latencyMs" | "errorReason"> {
  const caps = getModelCapabilitiesFromCatalog(m);
  const tags = getCapabilityTags(m);
  return {
    modelId: m.id,
    provider: m.provider,
    name: m.name,
    displayName: m.displayName,
    contextWindow: m.contextWindow,
    maxOutput: (m as Record<string, unknown>).maxOutput as number | undefined,
    reasoning: m.reasoning,
    isFree: true as const,
    tags,
    pricing: (m as Record<string, unknown>).pricing as
      | { input: number; output: number }
      | undefined,
    capabilities: caps,
    releaseDate: m.releaseDate,
  };
}

// ---------------------------------------------------------------------------
// Status mapping from failover error reason
// ---------------------------------------------------------------------------

function toProbeStatus(reason?: string | null): FreeModelProbeStatus {
  if (!reason) {
    return "unknown";
  }
  if (reason === "auth") {
    return "auth";
  }
  if (reason === "rate_limit") {
    return "rate_limit";
  }
  if (reason === "billing") {
    return "billing";
  }
  if (reason === "timeout") {
    return "timeout";
  }
  if (reason === "format") {
    return "failed";
  }
  return "failed";
}

// ---------------------------------------------------------------------------
// Single model probe
// ---------------------------------------------------------------------------

async function probeOneModel(params: {
  cfg: OpenClawConfig;
  agentId: string;
  agentDir: string;
  workspaceDir: string;
  sessionDir: string;
  model: ModelCatalogEntry;
  profileId?: string;
}): Promise<{ status: FreeModelProbeStatus; latencyMs: number; error?: string }> {
  const { cfg, agentId, agentDir, workspaceDir, sessionDir, model, profileId } = params;
  const sessionId = `fmprobe-${model.provider}-${crypto.randomUUID().slice(0, 8)}`;
  const sessionFile = resolveSessionTranscriptPath(sessionId, agentId);
  await fs.mkdir(sessionDir, { recursive: true });

  let collectedText = "";
  const start = Date.now();

  try {
    await runEmbeddedPiAgent({
      sessionId,
      sessionFile,
      agentId,
      workspaceDir,
      agentDir,
      config: cfg,
      prompt: PROBE_PROMPT,
      provider: model.provider,
      model: model.id,
      authProfileId: profileId,
      authProfileIdSource: profileId ? "user" : undefined,
      timeoutMs: PROBE_TIMEOUT_MS,
      runId: `fmprobe-${crypto.randomUUID().slice(0, 8)}`,
      lane: `free-model-probe:${model.provider}`,
      thinkLevel: "off",
      reasoningLevel: "off",
      verboseLevel: "off",
      streamParams: { maxTokens: PROBE_MAX_TOKENS },
      onPartialReply: (payload: { text?: string }) => {
        if (payload.text) {
          collectedText += payload.text;
        }
      },
    });

    const latencyMs = Date.now() - start;
    const isPong = collectedText.toUpperCase().includes("PONG");

    if (!isPong) {
      return {
        status: "unexpected_response",
        latencyMs,
        error: `No PONG (got: "${collectedText.trim().slice(0, 80)}")`,
      };
    }

    return { status: "ok", latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const described = describeFailoverError(err);
    return {
      status: toProbeStatus(described.reason),
      latencyMs,
      error: described.message?.slice(0, 200),
    };
  } finally {
    // Clean up probe session file to avoid accumulation
    void fs.unlink(sessionFile).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Full probe runner
// ---------------------------------------------------------------------------

/** Flag to prevent concurrent probe runs. */
let probeRunning = false;

/**
 * Get the user-configured list of provider IDs with active billing.
 * Loaded from the persisted health store (set via `freeModels.setBilling`).
 */
export async function getActiveBillingProviders(): Promise<string[]> {
  const store = await loadFreeModelHealth();
  return store?.activeBillingProviders ?? [];
}

/**
 * Save the active billing providers list.
 */
export async function setActiveBillingProviders(providerIds: string[]): Promise<void> {
  const store = (await loadFreeModelHealth()) ?? emptyStore();
  store.activeBillingProviders = providerIds;
  store.updatedAt = Date.now();
  await saveFreeModelHealth(store);
}

export async function probeFreeModels(
  cfg: OpenClawConfig,
  opts?: {
    onProgress?: (progress: FreeModelProbeProgress) => void;
  },
): Promise<FreeModelHealthStore> {
  if (probeRunning) {
    log.info("free-model probe already running, skipping");
    const existing = await loadFreeModelHealth();
    if (existing) {
      return existing;
    }
    return emptyStore();
  }

  probeRunning = true;
  try {
    return await runProbeInternal(cfg, opts);
  } finally {
    probeRunning = false;
  }
}

async function runProbeInternal(
  cfg: OpenClawConfig,
  opts?: {
    onProgress?: (progress: FreeModelProbeProgress) => void;
  },
): Promise<FreeModelHealthStore> {
  const catalog = await loadModelCatalog({ config: cfg });

  // Load the user's billing-active provider list
  const activeBillingSet = new Set((await getActiveBillingProviders()).map((p) => p.toLowerCase()));

  // Decide which models to probe:
  // - Providers WITH active billing → only tagged-free models (health check)
  // - Providers WITHOUT active billing → ALL models (free discovery)
  const modelsToProbe: Array<ModelCatalogEntry & { isTaggedFree: boolean }> = [];
  for (const m of catalog) {
    const providerLower = m.provider.toLowerCase();
    const taggedFree = isFreeModel(m);

    if (activeBillingSet.has(providerLower)) {
      // Provider has billing: only probe tagged-free models
      if (taggedFree) {
        modelsToProbe.push({ ...m, isTaggedFree: true });
      }
    } else {
      // Provider without billing: probe ALL models to discover free ones
      modelsToProbe.push({ ...m, isTaggedFree: taggedFree });
    }
  }

  if (modelsToProbe.length === 0) {
    log.info("no models to probe");
    const store = emptyStore();
    store.activeBillingProviders = [...activeBillingSet];
    await saveFreeModelHealth(store);
    return store;
  }

  const taggedFreeCount = modelsToProbe.filter((m) => m.isTaggedFree).length;
  const discoveryCount = modelsToProbe.length - taggedFreeCount;
  log.info(
    `probing ${modelsToProbe.length} models (${taggedFreeCount} tagged-free, ${discoveryCount} discovery candidates)`,
  );

  // Group by provider
  const byProvider = new Map<string, Array<ModelCatalogEntry & { isTaggedFree: boolean }>>();
  for (const m of modelsToProbe) {
    const list = byProvider.get(m.provider) ?? [];
    list.push(m);
    byProvider.set(m.provider, list);
  }

  // Determine credentials per provider
  const authStore = ensureAuthProfileStore();
  type ProviderCreds = { profileId?: string; hasCredentials: boolean };
  const providerCreds = new Map<string, ProviderCreds>();

  for (const provider of byProvider.keys()) {
    const profileIds = listProfilesForProvider(authStore, provider);
    const orderedProfiles = resolveAuthProfileOrder({
      cfg,
      store: authStore,
      provider,
    });
    const activeProfile = orderedProfiles[0] ?? profileIds[0];
    const envKey = resolveEnvApiKey(provider);
    const customKey = getCustomProviderApiKey(cfg, provider);

    providerCreds.set(provider, {
      profileId: activeProfile,
      hasCredentials: Boolean(activeProfile) || Boolean(envKey) || Boolean(customKey),
    });
  }

  // Resolve agent paths (shared across all probes)
  const agentId = resolveDefaultAgentId(cfg);
  const agentDir = resolveOpenClawAgentDir();
  const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId) ?? resolveDefaultAgentWorkspaceDir();
  const sessionDir = resolveSessionTranscriptsDirForAgent(agentId);
  await fs.mkdir(workspaceDir, { recursive: true });

  // Build probe work items, pre-filtering models that cannot be resolved
  // by the pi-ai runner (supplemental/discovery-only models).
  // This prevents hundreds of "Unknown model" errors in the logs.
  type ProbeWork = {
    model: ModelCatalogEntry & { isTaggedFree: boolean };
    profileId?: string;
    hasCredentials: boolean;
  };
  const work: ProbeWork[] = [];

  // Execute probes with concurrency control
  const entries: Record<string, FreeModelHealthEntry> = {};
  let unresolvableCount = 0;

  for (const [provider, models] of byProvider) {
    const creds = providerCreds.get(provider);
    for (const model of models) {
      // Pre-check: verify the model can be resolved by the embedded runner.
      // Models from supplemental discovery or dynamic catalog may exist in
      // loadModelCatalog() but not in the pi-ai ModelRegistry, causing
      // "Unknown model" errors when probed.
      const { model: resolved } = resolveModel(model.provider, model.id, agentDir, cfg);
      if (!resolved) {
        const key = `${model.provider}/${model.id}`;
        entries[key] = {
          ...buildEntryMetadata(model),
          status: "unresolvable",
          lastProbed: Date.now(),
          errorReason: "Model not resolvable by runner (catalog-only)",
        };
        unresolvableCount += 1;
        continue;
      }

      work.push({
        model,
        profileId: creds?.profileId,
        hasCredentials: creds?.hasCredentials ?? false,
      });
    }
  }

  if (unresolvableCount > 0) {
    log.info(`skipped ${unresolvableCount} unresolvable models (catalog-only)`);
  }
  let completed = 0;
  const total = work.length;
  let cursor = 0;

  // Track last probe time per provider for rate-limit safety
  const lastProbeByProvider = new Map<string, number>();

  const worker = async () => {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= work.length) {
        return;
      }

      const item = work[idx];
      const key = `${item.model.provider}/${item.model.id}`;
      const meta = buildEntryMetadata(item.model);

      opts?.onProgress?.({
        completed,
        total,
        label: `Probing ${item.model.provider}/${item.model.id}`,
      });

      if (!item.hasCredentials) {
        entries[key] = {
          ...meta,
          status: "no_credentials",
          lastProbed: Date.now(),
        };
        completed += 1;
        continue;
      }

      // Per-provider delay to avoid rate-limiting
      const lastProbe = lastProbeByProvider.get(item.model.provider) ?? 0;
      const elapsed = Date.now() - lastProbe;
      if (elapsed < PROBE_PROVIDER_DELAY_MS) {
        await new Promise((resolve) => setTimeout(resolve, PROBE_PROVIDER_DELAY_MS - elapsed));
      }

      lastProbeByProvider.set(item.model.provider, Date.now());

      const result = await probeOneModel({
        cfg,
        agentId,
        agentDir,
        workspaceDir,
        sessionDir,
        model: item.model,
        profileId: item.profileId,
      });

      // If the model was NOT tagged as free but responded OK → discovered free
      const isDiscoveredFree = !item.model.isTaggedFree && result.status === "ok";

      entries[key] = {
        ...meta,
        status: result.status,
        lastProbed: Date.now(),
        latencyMs: result.latencyMs,
        errorReason: result.error,
        ...(isDiscoveredFree ? { discoveredFree: true } : {}),
      };

      completed += 1;

      const statusIcon = result.status === "ok" ? "OK" : result.status;
      const discoveryTag = isDiscoveredFree ? " [DISCOVERED FREE]" : "";
      log.info(
        `[${completed}/${total}] ${item.model.provider}/${item.model.id}: ${statusIcon}${discoveryTag}` +
          (result.latencyMs ? ` (${result.latencyMs}ms)` : ""),
      );
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PROBE_CONCURRENCY, work.length) }, () => worker()),
  );

  opts?.onProgress?.({ completed: total, total });

  // Build final store with summary stats
  const allEntries = Object.values(entries);
  const discoveredFreeCount = allEntries.filter((e) => e.discoveredFree === true).length;

  // Derive subscription tiers from probe results
  const providerSubscriptions = deriveProviderSubscriptions(entries, catalog);

  // Auto-update activeBillingProviders: add providers detected as paid
  // (never remove — user's manual toggles are preserved)
  const updatedBillingSet = new Set(activeBillingSet);
  for (const [provider, sub] of Object.entries(providerSubscriptions)) {
    if (sub.tier === "paid" && sub.confidence === "high") {
      updatedBillingSet.add(provider);
    }
  }

  const store: FreeModelHealthStore = {
    version: 1,
    updatedAt: Date.now(),
    lastFullProbe: Date.now(),
    totalModels: allEntries.length,
    verifiedCount: allEntries.filter((e) => e.status === "ok").length,
    failedCount: allEntries.filter(
      (e) =>
        e.status !== "ok" &&
        e.status !== "no_credentials" &&
        e.status !== "unresolvable" &&
        e.status !== "unknown",
    ).length,
    noCredentialsCount: allEntries.filter((e) => e.status === "no_credentials").length,
    unresolvableCount: allEntries.filter((e) => e.status === "unresolvable").length,
    discoveredFreeCount,
    activeBillingProviders: [...updatedBillingSet],
    providerSubscriptions,
    entries,
  };

  await saveFreeModelHealth(store);

  log.info(
    `probe complete: ${store.verifiedCount} verified, ${store.failedCount} failed, ${store.noCredentialsCount} no-creds, ${store.unresolvableCount} unresolvable, ${discoveredFreeCount} discovered-free (${total} total)`,
  );

  return store;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Return only the free models that have been verified as working (status=ok)
 * within the last `HEALTH_MAX_AGE_MS`.
 */
export async function getVerifiedFreeModels(): Promise<FreeModelHealthEntry[]> {
  const store = await loadFreeModelHealth();
  if (!store) {
    return [];
  }

  const now = Date.now();
  return Object.values(store.entries).filter(
    (e) => e.status === "ok" && now - e.lastProbed < HEALTH_MAX_AGE_MS,
  );
}

/**
 * Check if a specific free model has been verified recently.
 */
export async function isFreeModelVerified(provider: string, modelId: string): Promise<boolean> {
  const store = await loadFreeModelHealth();
  if (!store) {
    return false;
  }

  const key = `${provider}/${modelId}`;
  const entry = store.entries[key];
  if (!entry) {
    return false;
  }

  return entry.status === "ok" && Date.now() - entry.lastProbed < HEALTH_MAX_AGE_MS;
}

/**
 * Return ALL free model health entries (including failed/no-creds).
 * Used by the frontend to show full status.
 */
export async function getAllFreeModelHealth(): Promise<FreeModelHealthEntry[]> {
  const store = await loadFreeModelHealth();
  if (!store) {
    return [];
  }
  return Object.values(store.entries);
}

/**
 * Whether we have a recent (< 24h) full probe result.
 */
export async function hasRecentProbe(): Promise<boolean> {
  const store = await loadFreeModelHealth();
  if (!store) {
    return false;
  }
  return Date.now() - store.lastFullProbe < HEALTH_MAX_AGE_MS;
}

// ---------------------------------------------------------------------------
// Subscription tier inference from probe results
// ---------------------------------------------------------------------------

/**
 * Derive provider subscription tier from probe results.
 *
 * For each provider, look at non-free model probe results:
 * - If ANY non-free model returned `ok` → provider has **paid** billing
 * - If ALL non-free models returned `billing` → provider is on **free tier**
 * - Mixed/missing signals → `unknown` with low confidence
 */
export function deriveProviderSubscriptions(
  entries: Record<string, FreeModelHealthEntry>,
  catalog: ModelCatalogEntry[],
): Record<string, ProviderSubscription> {
  // Build a set of models that are tagged as free in the catalog
  const freeModelIds = new Set<string>();
  for (const m of catalog) {
    if (isFreeModel(m)) {
      freeModelIds.add(`${m.provider}/${m.id}`);
    }
  }

  // Group non-free probe results by provider
  const byProvider = new Map<
    string,
    { okCount: number; billingCount: number; otherCount: number }
  >();

  for (const [key, entry] of Object.entries(entries)) {
    // Skip free models — they don't tell us about billing
    if (freeModelIds.has(key) || entry.discoveredFree) {
      continue;
    }
    // Skip no-credentials — can't infer anything
    if (entry.status === "no_credentials") {
      continue;
    }

    const provider = entry.provider.toLowerCase();
    const counts = byProvider.get(provider) ?? {
      okCount: 0,
      billingCount: 0,
      otherCount: 0,
    };

    if (entry.status === "ok") {
      counts.okCount += 1;
    } else if (entry.status === "billing") {
      counts.billingCount += 1;
    } else {
      counts.otherCount += 1;
    }

    byProvider.set(provider, counts);
  }

  const now = Date.now();
  const subscriptions: Record<string, ProviderSubscription> = {};

  for (const [provider, counts] of byProvider) {
    if (counts.okCount > 0) {
      // At least one non-free model works → paid billing
      subscriptions[provider] = {
        tier: "paid",
        detectedAt: now,
        method: "probe-inference",
        confidence: "high",
      };
    } else if (counts.billingCount > 0 && counts.otherCount === 0) {
      // All non-free models returned billing error → free tier
      subscriptions[provider] = {
        tier: "free",
        detectedAt: now,
        method: "probe-inference",
        confidence: "high",
      };
    } else if (counts.billingCount > 0) {
      // Mixed signals — some billing, some other errors
      subscriptions[provider] = {
        tier: "free",
        detectedAt: now,
        method: "probe-inference",
        confidence: "low",
      };
    }
    // If only "other" errors and no billing/ok signals → skip (unknown)
  }

  return subscriptions;
}

/**
 * Get the persisted provider subscriptions from the health store.
 */
export async function getProviderSubscriptions(): Promise<Record<string, ProviderSubscription>> {
  const store = await loadFreeModelHealth();
  return store?.providerSubscriptions ?? {};
}

// ---------------------------------------------------------------------------
// Background probe scheduler
// ---------------------------------------------------------------------------

let probeTimer: ReturnType<typeof setInterval> | null = null;
let initialTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start the background probe scheduler.
 * Called once during gateway startup.
 */
export function startFreeModelProbeScheduler(cfg: OpenClawConfig): void {
  // Initial probe after a short delay (don't slow gateway startup)
  initialTimer = setTimeout(() => {
    void probeFreeModels(cfg).catch((err) => {
      log.warn(`initial free-model probe failed: ${String(err)}`);
    });
  }, PROBE_INITIAL_DELAY_MS);

  // Periodic probe every 24h
  probeTimer = setInterval(() => {
    // Reload config in case it changed
    void import("../config/config.js").then(({ loadConfig }) => {
      const latestCfg = loadConfig();
      void probeFreeModels(latestCfg).catch((err) => {
        log.warn(`periodic free-model probe failed: ${String(err)}`);
      });
    });
  }, PROBE_INTERVAL_MS);
}

/**
 * Stop the background probe scheduler (for clean shutdown / tests).
 */
export function stopFreeModelProbeScheduler(): void {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyStore(): FreeModelHealthStore {
  return {
    version: 1,
    updatedAt: Date.now(),
    lastFullProbe: Date.now(),
    totalModels: 0,
    verifiedCount: 0,
    failedCount: 0,
    noCredentialsCount: 0,
    unresolvableCount: 0,
    discoveredFreeCount: 0,
    entries: {},
    activeBillingProviders: [],
  };
}
