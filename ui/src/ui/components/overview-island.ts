import { StoreController } from "@nanostores/lit";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway, $gatewayEvent } from "../../services/gateway.ts";
import { $connected } from "../../stores/app.ts";
import { $hello } from "../../stores/gateway.ts";
import type { SystemInfoResult } from "../controllers/system-info.ts";
import { loadSettings, saveSettings, type UiSettings } from "../storage.ts";
import type { PresenceEntry, CronStatus } from "../types.ts";
import {
  renderOverview,
  type OverviewProps,
  type GlobalMetricsSummary,
  type ProvidersMetrics,
} from "../views/overview.ts";

// ECharts tree-shaken imports (loaded lazily)
type EChartsInstance = {
  setOption: (option: unknown, notMerge?: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

type EChartsModule = {
  init: (dom: HTMLElement, theme?: string | null, opts?: { renderer?: string }) => EChartsInstance;
  use: (components: unknown[]) => void;
};

type EChartsSubModule = Record<string, unknown>;

async function loadECharts(): Promise<EChartsModule> {
  const [charts, components, renderers, echarts] = await Promise.all([
    import("echarts/charts") as Promise<EChartsSubModule>,
    import("echarts/components") as Promise<EChartsSubModule>,
    import("echarts/renderers") as Promise<EChartsSubModule>,
    import("echarts/core"),
  ]);
  const { BarChart, GaugeChart, PieChart } = charts;
  const { GridComponent, TooltipComponent, LegendComponent, TitleComponent } = components;
  const { CanvasRenderer } = renderers;
  (echarts as unknown as EChartsModule).use([
    BarChart,
    GaugeChart,
    PieChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    CanvasRenderer,
  ]);
  return echarts as unknown as EChartsModule;
}

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
  @state() private metricsSummary: GlobalMetricsSummary | null = null;
  @state() private modelsMetrics: ProvidersMetrics | null = null;
  @state() private activeTab: "system" | "models" | "activity" = "system";

  private eventUnsub: (() => void) | null = null;
  private chartBar: EChartsInstance | null = null;
  private chartGauge: EChartsInstance | null = null;
  private chartPie: EChartsInstance | null = null;
  private resizeObservers: ResizeObserver[] = [];
  private echartsModule: EChartsModule | null = null;

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
    this.disposeCharts();
  }

  private disposeCharts() {
    this.chartBar?.dispose();
    this.chartGauge?.dispose();
    this.chartPie?.dispose();
    this.chartBar = null;
    this.chartGauge = null;
    this.chartPie = null;
    for (const ro of this.resizeObservers) {
      ro.disconnect();
    }
    this.resizeObservers = [];
  }

  private getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private async initOrUpdateCharts() {
    if (!this.echartsModule) {
      try {
        this.echartsModule = await loadECharts();
      } catch {
        // ECharts not available, skip charts
        return;
      }
    }

    const metrics = this.modelsMetrics;

    // Bar chart: top models by requests (Tab: Models)
    const barEl = this.querySelector<HTMLElement>("#overview-bar-chart");
    if (barEl && this.activeTab === "models") {
      if (!this.chartBar) {
        this.chartBar = this.echartsModule.init(barEl);
        const ro = new ResizeObserver(() => this.chartBar?.resize());
        ro.observe(barEl);
        this.resizeObservers.push(ro);
      }
      const models: Array<{ model: string; requests: number }> = [];
      if (metrics?.providers) {
        for (const providerData of Object.values(metrics.providers)) {
          if (providerData.models) {
            for (const [modelId, modelData] of Object.entries(providerData.models)) {
              models.push({ model: modelId, requests: modelData.requests?.started ?? 0 });
            }
          }
        }
      }
      models.sort((a, b) => b.requests - a.requests);
      const top = models.slice(0, 8);
      const textColor = this.getCssVar("--text");
      const mutedColor = this.getCssVar("--muted");
      const accentColor = this.getCssVar("--accent");
      const borderColor = this.getCssVar("--border");
      this.chartBar.setOption(
        {
          backgroundColor: "transparent",
          grid: { left: "2%", right: "4%", bottom: "3%", containLabel: true },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: this.getCssVar("--card-solid"),
            borderColor,
            textStyle: { color: textColor },
          },
          xAxis: {
            type: "value",
            axisLine: { show: false },
            splitLine: { lineStyle: { color: borderColor } },
            axisLabel: { color: mutedColor },
          },
          yAxis: {
            type: "category",
            data: top.map((m) => (m.model.length > 20 ? m.model.slice(0, 18) + "…" : m.model)),
            axisLabel: { color: textColor, fontSize: 11 },
            axisLine: { show: false },
            axisTick: { show: false },
          },
          series: [
            {
              type: "bar",
              data: top.map((m) => m.requests),
              itemStyle: { color: accentColor, borderRadius: [0, 4, 4, 0] },
              barMaxWidth: 24,
            },
          ],
        },
        true,
      );
    }

    // Gauge: success rate (Tab: Activity)
    const gaugeEl = this.querySelector<HTMLElement>("#overview-gauge-chart");
    if (gaugeEl && this.activeTab === "activity") {
      if (!this.chartGauge) {
        this.chartGauge = this.echartsModule.init(gaugeEl);
        const ro = new ResizeObserver(() => this.chartGauge?.resize());
        ro.observe(gaugeEl);
        this.resizeObservers.push(ro);
      }
      const rate = (metrics?.global?.requests?.successRate ?? 0) * 100;
      const textColor = this.getCssVar("--text");
      const mutedColor = this.getCssVar("--muted");
      this.chartGauge.setOption(
        {
          backgroundColor: "transparent",
          series: [
            {
              type: "gauge",
              startAngle: 210,
              endAngle: -30,
              min: 0,
              max: 100,
              radius: "80%",
              pointer: { show: false },
              progress: { show: true, width: 14, itemStyle: { color: this.getCssVar("--ok") } },
              axisLine: { lineStyle: { width: 14, color: [[1, this.getCssVar("--bg-muted")]] } },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              detail: {
                valueAnimation: true,
                formatter: "{value}%",
                color: textColor,
                fontSize: 24,
                fontWeight: 700,
                offsetCenter: [0, "15%"],
              },
              title: { offsetCenter: [0, "40%"], color: mutedColor, fontSize: 12 },
              data: [{ value: rate.toFixed(1), name: "Success Rate" }],
            },
          ],
        },
        true,
      );
    }

    // Pie: tokens by provider (Tab: Activity)
    const pieEl = this.querySelector<HTMLElement>("#overview-pie-chart");
    if (pieEl && this.activeTab === "activity") {
      if (!this.chartPie) {
        this.chartPie = this.echartsModule.init(pieEl);
        const ro = new ResizeObserver(() => this.chartPie?.resize());
        ro.observe(pieEl);
        this.resizeObservers.push(ro);
      }
      const pieData: Array<{ name: string; value: number }> = [];
      if (metrics?.providers) {
        for (const [name, providerData] of Object.entries(metrics.providers)) {
          const total = providerData.totals?.tokens?.total ?? 0;
          if (total > 0) {
            pieData.push({ name, value: total });
          }
        }
      }
      const textColor = this.getCssVar("--text");
      const mutedColor = this.getCssVar("--muted");
      const borderColor = this.getCssVar("--border");
      this.chartPie.setOption(
        {
          backgroundColor: "transparent",
          tooltip: {
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
            backgroundColor: this.getCssVar("--card-solid"),
            borderColor,
            textStyle: { color: textColor },
          },
          legend: {
            orient: "vertical",
            right: "5%",
            top: "center",
            textStyle: { color: mutedColor, fontSize: 11 },
          },
          series: [
            {
              type: "pie",
              radius: ["45%", "70%"],
              center: ["40%", "50%"],
              avoidLabelOverlap: false,
              itemStyle: { borderRadius: 4, borderColor: this.getCssVar("--bg"), borderWidth: 2 },
              label: { show: false },
              emphasis: {
                label: { show: true, fontSize: 12, fontWeight: "bold", color: textColor },
              },
              data: pieData.length > 0 ? pieData : [{ name: "No data", value: 1 }],
            },
          ],
        },
        true,
      );
    }
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
        metricsSum,
        modelsMetrics,
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
        fetch("/api/models/metrics/summary")
          .then((r) => (r.ok ? (r.json() as Promise<GlobalMetricsSummary>) : null))
          .catch(() => null),
        fetch("/api/models/metrics")
          .then((r) => (r.ok ? (r.json() as Promise<ProvidersMetrics>) : null))
          .catch(() => null),
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
      this.metricsSummary = metricsSum;
      this.modelsMetrics = modelsMetrics;

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
      const url = this.settings.gatewayUrl.trim() || undefined;
      const token = this.settings.token.trim() || undefined;
      const password = this.password.trim() || undefined;
      gateway.connect(url, token, password);
      await gateway.call("hello");
      await this.loadData();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  private async handleRefresh() {
    await this.loadData();
  }

  protected updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);
    if (changedProps.has("activeTab") || changedProps.has("modelsMetrics")) {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => void this.initOrUpdateCharts());
    }
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
      metricsSummary: this.metricsSummary,
      modelsMetrics: this.modelsMetrics,
      activeTab: this.activeTab,
      onTabChange: (tab) => {
        this.activeTab = tab;
      },
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
