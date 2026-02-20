/**
 * Providers Island - Interactive provider health & model management for Astro.
 * Wraps the existing renderProviders view with gateway service calls.
 */

import { StoreController } from "@nanostores/lit";
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway, $gatewayEvent } from "../../services/gateway.ts";
import { $connected } from "../../stores/app.ts";
import type { AuthProviderEntry, OAuthFlowState } from "../controllers/auth.ts";
import type {
  FreeModelEntry,
  FreeModelsSummary,
  ModelCostTier,
  ProviderHealthEntry,
  ProviderModelEntry,
  ProviderSubscription,
} from "../controllers/providers-health.ts";
import { renderProviders, type ProvidersProps } from "../views/providers.ts";

@customElement("providers-island")
export class ProvidersIsland extends LitElement {
  private connectedCtrl = new StoreController(this, $connected);

  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private entries: ProviderHealthEntry[] = [];
  @state() private updatedAt: number | null = null;
  @state() private showAll = false;
  @state() private expandedId: string | null = null;
  @state() private instanceCount = 0;
  @state() private sessionCount: number | null = null;
  @state() private agentRunning = false;
  @state() private modelAllowlist: Set<string> = new Set();
  @state() private primaryModel: string | null = null;
  @state() private modelFallbacks: string[] = [];
  @state() private modelsSaving = false;
  @state() private configHash: string | null = null;
  @state() private modelsCostFilter: "all" | "high" | "medium" | "low" | "free" = "all";
  @state() private authConfigProvider: string | null = null;
  @state() private authConfigSaving = false;
  @state() private authProvidersList: AuthProviderEntry[] | null = null;
  @state() private oauthFlow: OAuthFlowState | null = null;
  @state() private selectedProfiles: Set<string> = new Set();
  @state() private removingProfiles = false;
  @state() private removingProvider: string | null = null;
  @state() private checkingProvider: string | null = null;
  @state() private healthCheckResult: {
    providerId: string;
    healthy: boolean;
    status: string;
  } | null = null;
  @state() private rankedProviders: string[] = [];
  @state() private freeModels: FreeModelEntry[] = [];
  @state() private freeModelsSummary: FreeModelsSummary | null = null;
  @state() private probingFreeModels = false;
  @state() private activeBillingProviders: Set<string> = new Set();
  @state() private providerSubscriptions: Record<string, ProviderSubscription> = {};

  private oauthPollTimer: ReturnType<typeof setInterval> | null = null;
  private eventUnsub: (() => void) | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();
    this.eventUnsub = $gatewayEvent.subscribe((evt) => {
      if (!evt || evt.event !== "models-updated") {
        return;
      }
      void this.loadData();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopOAuthPolling();
    this.eventUnsub?.();
    this.eventUnsub = null;
  }

  private stopOAuthPolling(): void {
    if (this.oauthPollTimer !== null) {
      clearInterval(this.oauthPollTimer);
      this.oauthPollTimer = null;
    }
  }

  private resolveModelCostTier(modelId: string, isFree?: boolean): ModelCostTier {
    if (isFree) {
      return "free";
    }
    const lower = modelId.toLowerCase();
    if (lower.endsWith(":free")) {
      return "free";
    }
    const patterns: Array<{ pattern: string; tier: ModelCostTier }> = [
      { pattern: "claude-opus", tier: "expensive" },
      { pattern: "claude-3-opus", tier: "expensive" },
      { pattern: "o1-preview", tier: "expensive" },
      { pattern: "claude-sonnet", tier: "moderate" },
      { pattern: "claude-3-5-sonnet", tier: "moderate" },
      { pattern: "gpt-4o-2024", tier: "moderate" },
      { pattern: "gpt-4-turbo", tier: "moderate" },
      { pattern: "gpt-4", tier: "moderate" },
      { pattern: "o1-mini", tier: "moderate" },
      { pattern: "gemini-1.5-pro", tier: "moderate" },
      { pattern: "gemini-2.5-pro", tier: "moderate" },
      { pattern: "mistral-large", tier: "moderate" },
      { pattern: "claude-3-5-haiku", tier: "cheap" },
      { pattern: "claude-3-haiku", tier: "cheap" },
      { pattern: "gpt-4o-mini", tier: "cheap" },
      { pattern: "gemini-2.0-flash", tier: "cheap" },
      { pattern: "gemini-1.5-flash", tier: "cheap" },
      { pattern: "llama", tier: "cheap" },
      { pattern: "mixtral", tier: "cheap" },
    ];
    for (const { pattern, tier } of patterns) {
      if (lower.startsWith(pattern) || lower.includes(pattern)) {
        return tier;
      }
    }
    return "moderate";
  }

  private async loadData() {
    this.loading = true;
    this.error = null;
    try {
      const [healthResult, presenceResult, sessionsResult, modelsResult, configResult] =
        await Promise.all([
          gateway.call<{ providers: Array<Record<string, unknown>>; updatedAt?: number }>(
            "providers.health",
          ),
          gateway.call<unknown[]>("system-presence", {}).catch(() => [] as unknown[]),
          gateway.call<{ sessions: unknown[] }>("sessions.list").catch(() => ({ sessions: [] })),
          gateway
            .call<{
              models?: Array<{
                id: string;
                name?: string;
                provider?: string;
                contextWindow?: number;
                reasoning?: boolean;
                input?: string[];
                isFree?: boolean;
              }>;
              freeModels?: Array<{
                id: string;
                name?: string;
                provider: string;
                contextWindow?: number;
                reasoning?: boolean;
                isFree?: boolean;
                tags?: string[];
                probeStatus?: string;
                probeLatencyMs?: number;
                lastProbed?: number;
                probeError?: string;
                pricing?: { input: number; output: number };
                capabilities?: Record<string, unknown>;
                discoveredFree?: boolean;
              }>;
              freeModelsSummary?: FreeModelsSummary;
            }>("models.list", {})
            .catch(() => ({ models: [], freeModels: [], freeModelsSummary: null })),
          gateway
            .call<{ config?: Record<string, unknown>; hash?: string }>("config.get", {})
            .catch(() => null),
        ]);

      // Group models by provider
      const modelsByProvider = new Map<string, ProviderModelEntry[]>();
      for (const m of modelsResult.models ?? []) {
        const provider = String(m.provider ?? "").toLowerCase();
        if (!provider) {
          continue;
        }
        const key = `${provider}/${m.id}`;
        const list = modelsByProvider.get(provider) ?? [];
        list.push({
          id: m.id,
          name: m.name ?? m.id,
          key,
          contextWindow: m.contextWindow,
          reasoning: m.reasoning,
          input: m.input,
          costTier: this.resolveModelCostTier(m.id, m.isFree),
          isFree: m.isFree,
        });
        modelsByProvider.set(provider, list);
      }

      // Store free models from ALL providers with probe data
      this.freeModels = (modelsResult.freeModels ?? []).map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        provider: m.provider,
        contextWindow: m.contextWindow,
        reasoning: m.reasoning,
        isFree: m.isFree,
        tags: m.tags,
        probeStatus: m.probeStatus as FreeModelEntry["probeStatus"],
        probeLatencyMs: m.probeLatencyMs,
        lastProbed: m.lastProbed,
        probeError: m.probeError,
        pricing: m.pricing,
        capabilities: m.capabilities as FreeModelEntry["capabilities"],
        discoveredFree: m.discoveredFree,
      }));
      this.freeModelsSummary = modelsResult.freeModelsSummary ?? null;
      this.activeBillingProviders = new Set(
        modelsResult.freeModelsSummary?.activeBillingProviders ?? [],
      );
      this.providerSubscriptions = modelsResult.freeModelsSummary?.providerSubscriptions ?? {};

      // Extract model config from config response
      const config = configResult?.config;
      const agentsDefaults = (config?.agents as { defaults?: Record<string, unknown> } | undefined)
        ?.defaults;
      this.configHash = configResult?.hash ?? null;
      const allowlistRecord = (agentsDefaults?.models ?? {}) as Record<string, unknown>;
      this.modelAllowlist = new Set(Object.keys(allowlistRecord));
      const primaryRaw = agentsDefaults?.model;
      this.primaryModel =
        typeof primaryRaw === "string"
          ? primaryRaw
          : ((primaryRaw as { primary?: string } | undefined)?.primary ?? null);
      const modelConfig = primaryRaw as { fallbacks?: string[] } | undefined;
      this.modelFallbacks = Array.isArray(modelConfig?.fallbacks) ? modelConfig.fallbacks : [];

      // Merge models into provider entries
      const rawProviders = healthResult.providers ?? [];
      this.entries = rawProviders.map((raw) => ({
        ...raw,
        models: modelsByProvider.get(((raw as { id?: string })["id"] ?? "").toLowerCase()) ?? [],
      })) as ProviderHealthEntry[];

      this.updatedAt = healthResult.updatedAt ?? Date.now();
      this.instanceCount = Array.isArray(presenceResult) ? presenceResult.length : 0;
      this.sessionCount = sessionsResult.sessions.length;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  private async saveModels() {
    if (!this.configHash) {
      return;
    }
    this.modelsSaving = true;
    try {
      const models: Record<string, object> = {};
      for (const key of this.modelAllowlist) {
        models[key] = {};
      }

      // Auto-select cheapest model as primary if none set
      let primaryModel = this.primaryModel;
      if (!primaryModel && this.modelAllowlist.size > 0) {
        const tierPriority: Record<string, number> = {
          free: 0,
          cheap: 1,
          moderate: 2,
          expensive: 3,
        };
        const candidates = this.entries
          .filter((e) => e.detected)
          .flatMap((e) => e.models.filter((m) => this.modelAllowlist.has(m.key)))
          .toSorted((a, b) => (tierPriority[a.costTier] ?? 2) - (tierPriority[b.costTier] ?? 2));
        if (candidates.length > 0) {
          primaryModel = candidates[0].key;
          this.primaryModel = primaryModel;
        }
      }

      const fallbacks = primaryModel
        ? [...this.modelAllowlist].filter((k) => k !== primaryModel)
        : [];

      const patch: Record<string, unknown> = {
        agents: {
          defaults: {
            models: Object.keys(models).length > 0 ? models : null,
            ...(primaryModel ? { model: { primary: primaryModel, fallbacks } } : {}),
          },
        },
      };

      await gateway.call("config.patch", {
        raw: JSON.stringify(patch),
        baseHash: this.configHash,
        note: "Model selection updated from Providers UI",
        skipRestart: true,
      });

      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.modelsSaving = false;
    }
  }

  private toggleModel(key: string) {
    const next = new Set(this.modelAllowlist);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.modelAllowlist = next;
  }

  private selectAllModels(modelKeys: string[], select: boolean) {
    const next = new Set(this.modelAllowlist);
    for (const key of modelKeys) {
      if (select) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    this.modelAllowlist = next;
  }

  private setPrimary(key: string) {
    this.primaryModel = key;
  }

  private async saveCredential(
    provider: string,
    credential: string,
    credentialType: "api_key" | "token",
  ) {
    this.authConfigSaving = true;
    try {
      await gateway.call("auth.setKey", { provider, credential, credentialType });
      this.authConfigProvider = null;
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.authConfigSaving = false;
    }
  }

  private async startOAuth(provider: string) {
    this.stopOAuthPolling();
    try {
      const res = await gateway.call<{
        flowId: string;
        authUrl?: string;
        needsCode?: boolean;
        codePromptMessage?: string;
        hasCallbackServer?: boolean;
      }>("auth.startOAuth", { provider });
      this.oauthFlow = {
        flowId: res.flowId,
        provider,
        status: "waiting",
        authUrl: res.authUrl,
        needsCode: res.needsCode,
        codePromptMessage: res.codePromptMessage,
        hasCallbackServer: res.hasCallbackServer,
      };
      if (res.authUrl) {
        window.open(res.authUrl, "_blank");
      }
      // Poll for needsCode state, progress, and flow completion
      this.oauthPollTimer = setInterval(async () => {
        if (!this.oauthFlow) {
          this.stopOAuthPolling();
          return;
        }
        try {
          const check = await gateway.call<{
            status?: string;
            error?: string;
            needsCode?: boolean;
            codePromptMessage?: string;
            hasCallbackServer?: boolean;
            progressMessage?: string;
          }>("auth.checkOAuth", { flowId: this.oauthFlow.flowId });
          if (check.status === "success") {
            this.stopOAuthPolling();
            this.oauthFlow = null;
            await this.loadData();
          } else if (check.status === "error") {
            this.stopOAuthPolling();
            this.oauthFlow = {
              ...this.oauthFlow,
              status: "error",
              error: check.error ?? "OAuth flow failed",
            };
          } else {
            // Update needsCode, progress, etc. from backend
            let changed = false;
            if (check.needsCode && !this.oauthFlow.needsCode) {
              this.oauthFlow = {
                ...this.oauthFlow,
                needsCode: true,
                codePromptMessage: check.codePromptMessage,
              };
              changed = true;
            }
            if (check.progressMessage && check.progressMessage !== this.oauthFlow.progressMessage) {
              this.oauthFlow = {
                ...this.oauthFlow,
                progressMessage: check.progressMessage,
              };
              changed = true;
            }
            // Avoid unnecessary state update if nothing changed
            void changed;
          }
        } catch {
          // Polling error, keep trying
        }
      }, 2000);
    } catch (err) {
      this.oauthFlow = {
        flowId: "",
        provider,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async submitOAuthCode(code: string) {
    if (!this.oauthFlow) {
      return;
    }
    try {
      await gateway.call("auth.submitOAuthCode", {
        flowId: this.oauthFlow.flowId,
        code,
      });
      // Don't set "success" prematurely — the token exchange is still in progress.
      // Clear needsCode so the UI shows "exchanging tokens..." while polling
      // picks up the real success/error from the backend.
      this.oauthFlow = {
        ...this.oauthFlow,
        needsCode: false,
        codePromptMessage: undefined,
        codeSubmitted: true,
      };
    } catch (err) {
      this.oauthFlow = {
        ...this.oauthFlow,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async removeCredential(provider: string) {
    this.removingProvider = provider;
    try {
      await gateway.call("auth.removeCredential", { provider });
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.removingProvider = null;
    }
  }

  private async removeSelectedProfiles() {
    if (this.selectedProfiles.size === 0) {
      return;
    }
    this.removingProfiles = true;
    try {
      await gateway.call("auth.removeProfiles", {
        profileIds: [...this.selectedProfiles],
      });
      this.selectedProfiles = new Set();
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.removingProfiles = false;
    }
  }

  private async checkProviderHealth(providerId: string) {
    this.checkingProvider = providerId;
    this.healthCheckResult = null;
    try {
      const result = await gateway.call<{ healthy: boolean; status: string }>(
        "providers.health.check",
        { providerId },
      );
      this.healthCheckResult = { providerId, healthy: result.healthy, status: result.status };
    } catch (err) {
      this.healthCheckResult = {
        providerId,
        healthy: false,
        status: err instanceof Error ? err.message : String(err),
      };
    } finally {
      this.checkingProvider = null;
    }
  }

  private async triggerFreeModelsProbe() {
    this.probingFreeModels = true;
    try {
      await gateway.call("freeModels.probe");
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.probingFreeModels = false;
    }
  }

  private async toggleBillingProvider(providerId: string) {
    const next = new Set(this.activeBillingProviders);
    if (next.has(providerId)) {
      next.delete(providerId);
    } else {
      next.add(providerId);
    }
    this.activeBillingProviders = next;
    try {
      await gateway.call("freeModels.setBilling", {
        providerIds: [...next],
      });
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  private async loadRankedProviders() {
    try {
      const result = await gateway.call<{ ranked?: string[] }>("providers.health.ranked");
      this.rankedProviders = result.ranked ?? [];
    } catch {
      // Ranked providers may not be available
    }
  }

  render(): TemplateResult {
    // Compute fallbacks reactively from current allowlist state
    // so the display updates immediately when checkboxes change
    const computedFallbacks = this.primaryModel
      ? [...this.modelAllowlist].filter((k) => k !== this.primaryModel)
      : [...this.modelAllowlist];

    const props: ProvidersProps = {
      loading: this.loading,
      error: this.error,
      entries: this.entries,
      updatedAt: this.updatedAt,
      showAll: this.showAll,
      expandedId: this.expandedId,
      instanceCount: this.instanceCount,
      sessionCount: this.sessionCount,
      agentRunning: this.agentRunning,
      modelAllowlist: this.modelAllowlist,
      primaryModel: this.primaryModel,
      modelFallbacks: computedFallbacks,
      modelsSaving: this.modelsSaving,
      modelsCostFilter: this.modelsCostFilter,
      authConfigProvider: this.authConfigProvider,
      authConfigSaving: this.authConfigSaving,
      authProvidersList: this.authProvidersList,
      oauthFlow: this.oauthFlow,
      removingProvider: this.removingProvider,
      checkingProvider: this.checkingProvider,
      healthCheckResult: this.healthCheckResult,
      rankedProviders: this.rankedProviders,
      onRefresh: () => void this.loadData(),
      onToggleShowAll: () => {
        this.showAll = !this.showAll;
      },
      onToggleExpand: (id: string) => {
        this.expandedId = this.expandedId === id ? null : id;
      },
      onToggleModel: (key: string) => this.toggleModel(key),
      onSetPrimary: (key: string) => this.setPrimary(key),
      onSaveModels: () => void this.saveModels(),
      onCostFilterChange: (filter) => {
        this.modelsCostFilter = filter;
      },
      onConfigureProvider: (id: string | null) => {
        this.authConfigProvider = id;
      },
      onSaveCredential: (provider, credential, credentialType) =>
        void this.saveCredential(provider, credential, credentialType),
      onStartOAuth: (provider) => void this.startOAuth(provider),
      onCancelOAuth: () => {
        this.stopOAuthPolling();
        this.oauthFlow = null;
      },
      onSubmitOAuthCode: (code) => void this.submitOAuthCode(code),
      onRemoveCredential: (provider) => void this.removeCredential(provider),
      selectedProfiles: this.selectedProfiles,
      removingProfiles: this.removingProfiles,
      onToggleProfileSelection: (profileId: string) => {
        const next = new Set(this.selectedProfiles);
        if (next.has(profileId)) {
          next.delete(profileId);
        } else {
          next.add(profileId);
        }
        this.selectedProfiles = next;
      },
      onRemoveSelectedProfiles: () => void this.removeSelectedProfiles(),
      onSelectAllModels: (modelKeys: string[], select: boolean) =>
        this.selectAllModels(modelKeys, select),
      freeModels: this.freeModels,
      freeModelsSummary: this.freeModelsSummary,
      providerSubscriptions: this.providerSubscriptions,
      probingFreeModels: this.probingFreeModels,
      activeBillingProviders: this.activeBillingProviders,
      onProbeFreeModels: () => void this.triggerFreeModelsProbe(),
      onToggleBilling: (providerId: string) => void this.toggleBillingProvider(providerId),
      onCheckHealth: (providerId) => void this.checkProviderHealth(providerId),
      onLoadRanked: () => void this.loadRankedProviders(),
    };

    return html`${renderProviders(props)}`;
  }
}
