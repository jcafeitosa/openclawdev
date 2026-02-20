import { StoreController } from "@nanostores/lit";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway, $gatewayEvent } from "../../services/gateway.ts";
import { $connected } from "../../stores/app.ts";
import { $hello } from "../../stores/gateway.ts";
import type { SystemInfoResult } from "../controllers/system-info.ts";
import { loadSettings, saveSettings, type UiSettings } from "../storage.ts";
import type { PresenceEntry, CronStatus } from "../types.ts";
import { renderOverview, type OverviewProps } from "../views/overview.ts";

@customElement("overview-island")
export class OverviewIsland extends LitElement {
  private connectedCtrl = new StoreController(this, $connected);
  private helloCtrl = new StoreController(this, $hello);

  @state() private settings: UiSettings = loadSettings();
  @state() private password = "";
  @state() private lastError: string | null = null;
  @state() private presenceCount = 0;
  @state() private sessionsCount: number | null = null;
  @state() private cronEnabled: boolean | null = null;
  @state() private cronNext: number | null = null;
  @state() private lastChannelsRefresh: number | null = null;
  @state() private systemInfo: SystemInfoResult | null = null;
  @state() private activeChannels = 0;
  @state() private totalChannels = 0;
  @state() private healthyProviders = 0;
  @state() private totalProviders = 0;
  @state() private securityStatus: string | null = null;
  @state() private totalTokens: number | null = null;
  @state() private totalCost: number | null = null;
  @state() private freeModelsCount = 0;
  @state() private freeModelsVerified = 0;
  @state() private freeModelsDiscovered = 0;

  private eventUnsub: (() => void) | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();
    this.eventUnsub = $gatewayEvent.subscribe((evt) => {
      if (!evt || evt.event !== "health") {
        return;
      }
      void this.loadData();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.eventUnsub?.();
    this.eventUnsub = null;
  }

  private async loadData() {
    try {
      const [
        presenceResult,
        sessionsResult,
        cronResult,
        systemResult,
        channelsResult,
        providersResult,
        securityResult,
        usageResult,
        modelsResult,
      ] = await Promise.all([
        gateway.call<PresenceEntry[]>("system-presence", {}).catch(() => [] as PresenceEntry[]),
        gateway.call<{ sessions: unknown[] }>("sessions.list").catch(() => ({ sessions: [] })),
        gateway.call<CronStatus>("cron.status").catch(() => ({
          enabled: false,
          jobs: 0,
          nextWakeAtMs: null,
        })),
        gateway.call<SystemInfoResult>("system.info").catch(() => null),
        gateway
          .call<{ channels?: Record<string, { configured?: boolean }> }>("channels.status")
          .catch(() => ({ channels: {} })),
        gateway
          .call<{ providers?: Array<{ healthStatus?: string }> }>("providers.health")
          .catch(() => ({ providers: [] })),
        gateway.call<{ status?: string }>("security.summary").catch(() => ({ status: null })),
        gateway
          .call<{ totals?: { totalTokens?: number; totalCost?: number } }>("usage.status")
          .catch(() => ({ totals: null })),
        gateway
          .call<{
            freeModels?: Array<{ id: string; discoveredFree?: boolean }>;
            freeModelsSummary?: { verifiedCount?: number; discoveredFreeCount?: number };
          }>("models.list", {})
          .catch(() => ({ freeModels: [], freeModelsSummary: null })),
      ]);

      this.presenceCount = Array.isArray(presenceResult) ? presenceResult.length : 0;
      this.sessionsCount = sessionsResult.sessions.length;
      this.cronEnabled = cronResult.enabled;
      this.cronNext = cronResult.nextWakeAtMs ?? null;
      this.systemInfo = systemResult;

      const channels = channelsResult.channels ?? {};
      const channelEntries: Array<{ configured?: boolean }> = Object.values(channels);
      this.totalChannels = channelEntries.length;
      this.activeChannels = channelEntries.filter((c) => c.configured).length;

      const providers = providersResult.providers ?? [];
      this.totalProviders = providers.length;
      this.healthyProviders = providers.filter((p) => p.healthStatus === "healthy").length;

      this.securityStatus = securityResult.status ?? null;
      this.totalTokens = usageResult.totals?.totalTokens ?? null;
      this.totalCost = usageResult.totals?.totalCost ?? null;
      this.freeModelsCount = modelsResult.freeModels?.length ?? 0;
      this.freeModelsVerified = modelsResult.freeModelsSummary?.verifiedCount ?? 0;
      this.freeModelsDiscovered = (modelsResult.freeModels ?? []).filter(
        (m: Record<string, unknown>) => m.discoveredFree === true,
      ).length;

      this.lastError = null;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  private handleSettingsChange(next: UiSettings) {
    this.settings = next;
    saveSettings(next);
  }

  private handlePasswordChange(next: string) {
    this.password = next;
  }

  private handleSessionKeyChange(next: string) {
    this.handleSettingsChange({ ...this.settings, sessionKey: next });
  }

  private async handleConnect() {
    try {
      // Reconnect the WebSocket with current settings (URL, token, password)
      const url = this.settings.gatewayUrl.trim() || undefined;
      const token = this.settings.token.trim() || undefined;
      const password = this.password.trim() || undefined;
      gateway.connect(url, token, password);
      // Wait briefly for the handshake, then reload dashboard data
      await gateway.call("hello");
      await this.loadData();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  private async handleRefresh() {
    await this.loadData();
  }

  render() {
    const props: OverviewProps = {
      connected: this.connectedCtrl.value,
      hello: this.helloCtrl.value,
      settings: this.settings,
      password: this.password,
      lastError: this.lastError,
      presenceCount: this.presenceCount,
      sessionsCount: this.sessionsCount,
      cronEnabled: this.cronEnabled,
      cronNext: this.cronNext,
      lastChannelsRefresh: this.lastChannelsRefresh,
      systemInfo: this.systemInfo,
      activeChannels: this.activeChannels,
      totalChannels: this.totalChannels,
      healthyProviders: this.healthyProviders,
      totalProviders: this.totalProviders,
      securityStatus: this.securityStatus,
      totalTokens: this.totalTokens,
      totalCost: this.totalCost,
      freeModelsCount: this.freeModelsCount,
      freeModelsVerified: this.freeModelsVerified,
      freeModelsDiscovered: this.freeModelsDiscovered,
      onSettingsChange: (next) => this.handleSettingsChange(next),
      onPasswordChange: (next) => this.handlePasswordChange(next),
      onSessionKeyChange: (next) => this.handleSessionKeyChange(next),
      onConnect: () => void this.handleConnect(),
      onRefresh: () => void this.handleRefresh(),
      onNewSession: () => {
        const basePath =
          ((globalThis as Record<string, unknown>).__OPENCLAW_CONTROL_UI_BASE_PATH__ as string) ??
          "";
        window.location.href = `${basePath}/chat?new=1`;
      },
      onViewLogs: () => {
        const basePath =
          ((globalThis as Record<string, unknown>).__OPENCLAW_CONTROL_UI_BASE_PATH__ as string) ??
          "";
        window.location.href = `${basePath}/logs`;
      },
      onViewDocs: () => {
        window.open("https://docs.openclaw.ai", "_blank");
      },
    };

    return html`${renderOverview(props)}`;
  }
}
