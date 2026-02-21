import { html, nothing } from "lit";
import type { SystemInfoResult } from "../controllers/system-info.ts";
import { formatRelativeTimestamp, formatDurationHuman } from "../format.ts";
import type { GatewayHelloOk } from "../gateway.ts";
import { formatNextRun } from "../presenter.ts";
import type { UiSettings } from "../storage.ts";

export type GlobalMetricsSummary = {
  global?: {
    requests?: { started: number; success: number; error: number; successRate: number };
    tokens?: { input: number; output: number; total: number };
    cost?: { estimated: number };
  };
  topProviders?: Array<{ provider: string; tokens: number; cost: number; requests: number }>;
  topModels?: Array<{ model: string; provider: string; requests: number; cost: number }>;
  snapshotAt?: number;
};

export type ModelMetricsEntry = {
  requests: {
    started: number;
    success: number;
    error: number;
    successRate: number;
    errorRate: number;
  };
  latency: { p50: number; p95: number; p99: number };
  tokens: { input: number; output: number; total: number };
  cost: { estimated: number };
};

export type ProvidersMetrics = {
  providers?: Record<
    string,
    {
      models?: Record<string, ModelMetricsEntry>;
      totals?: {
        tokens?: { total: number };
        cost?: { estimated: number };
        requests?: { started: number };
      };
    }
  >;
  global?: {
    requests?: { started: number; success: number; successRate: number };
    tokens?: { total: number };
    cost?: { estimated: number };
  };
  snapshotAt?: number;
};

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  systemInfo: SystemInfoResult | null;
  activeChannels: number;
  totalChannels: number;
  healthyProviders: number;
  totalProviders: number;
  securityStatus: string | null;
  totalTokens: number | null;
  totalCost: number | null;
  freeModelsCount: number;
  freeModelsVerified: number;
  freeModelsDiscovered: number;
  metricsSummary: GlobalMetricsSummary | null;
  modelsMetrics: ProvidersMetrics | null;
  activeTab: "system" | "models" | "activity";
  onTabChange: (tab: "system" | "models" | "activity") => void;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
  onNewSession: () => void;
  onViewLogs: () => void;
  onViewDocs: () => void;
};

function fmtTokens(n: number | null | undefined): string {
  if (n == null) {
    return "n/a";
  }
  if (n > 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n > 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(n);
}

function fmtCost(n: number | null | undefined): string {
  if (n == null) {
    return "n/a";
  }
  return `$${n.toFixed(4)}`;
}

function fmtLatency(ms: number): string {
  if (ms <= 0) {
    return "—";
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}

function fmtPct(ratio: number | null | undefined): string {
  if (ratio == null) {
    return "n/a";
  }
  return `${(ratio * 100).toFixed(1)}%`;
}

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | {
        uptimeMs?: number;
        policy?: { tickIntervalMs?: number };
        authMode?: "none" | "token" | "password" | "trusted-proxy";
      }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationHuman(snapshot.uptimeMs) : "n/a";
  const tick = snapshot?.policy?.tickIntervalMs ? `${snapshot.policy.tickIntervalMs}ms` : "n/a";
  const authMode = snapshot?.authMode;
  const isTrustedProxy = authMode === "trusted-proxy";

  const authHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) {
      return null;
    }
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px">
          This gateway requires auth. Add a token or password, then click Connect.
          <div style="margin-top: 6px">
            <span class="mono">openclaw dashboard --no-open</span> → open the Control UI<br />
            <span class="mono">openclaw doctor --generate-gateway-token</span> → set token
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        Auth failed. Update the token or password in Control UI settings, then click Connect.
      </div>
    `;
  })();

  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        This page is HTTP, so the browser blocks device identity. Use HTTPS (Tailscale Serve) or open
        <span class="mono">http://127.0.0.1:18789</span> on the gateway host.
      </div>
    `;
  })();

  // Build model rows from modelsMetrics
  type ModelRow = {
    model: string;
    provider: string;
    requests: number;
    successPct: string;
    p50: string;
    p95: string;
    p99: string;
    tokens: string;
    cost: string;
  };

  const modelRows: ModelRow[] = [];
  if (props.modelsMetrics?.providers) {
    for (const [providerName, providerData] of Object.entries(props.modelsMetrics.providers)) {
      if (providerData.models) {
        for (const [modelId, modelData] of Object.entries(providerData.models)) {
          modelRows.push({
            model: modelId,
            provider: providerName,
            requests: modelData.requests?.started ?? 0,
            successPct: fmtPct(modelData.requests?.successRate),
            p50: fmtLatency(modelData.latency?.p50 ?? 0),
            p95: fmtLatency(modelData.latency?.p95 ?? 0),
            p99: fmtLatency(modelData.latency?.p99 ?? 0),
            tokens: fmtTokens(modelData.tokens?.total),
            cost: fmtCost(modelData.cost?.estimated),
          });
        }
      }
    }
  }
  modelRows.sort((a, b) => b.requests - a.requests);

  // Metrics data for charts (serialized to data attributes for JS pickup)
  const globalSuccessRate = props.modelsMetrics?.global?.requests?.successRate ?? null;
  const tokensByProvider = props.modelsMetrics?.providers
    ? Object.entries(props.modelsMetrics.providers).map(([name, p]) => ({
        name,
        value: p.totals?.tokens?.total ?? 0,
      }))
    : [];
  const topModelsBar = modelRows.slice(0, 8).map((r) => ({
    model: r.model.length > 22 ? r.model.slice(0, 20) + "…" : r.model,
    requests: r.requests,
  }));

  // Encode chart data as JSON in data attributes
  const chartDataEncoded = JSON.stringify({
    successRate: globalSuccessRate,
    tokensByProvider,
    topModels: topModelsBar,
  });

  return html`
    <!-- Status Banner -->
    <div class="${props.connected ? "status-banner status-banner--ok" : "status-banner status-banner--danger"}">
      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"
        style="width: 20px; height: 20px; flex-shrink: 0; color: ${props.connected ? "var(--ok)" : "var(--danger)"}">
        ${
          props.connected
            ? html`
                <path d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              `
            : html`
                <path d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              `
        }
      </svg>
      <div>
        <div style="font-weight: 600; font-size: 0.9rem;">
          ${props.connected ? "Gateway Connected" : "Gateway Disconnected"}
        </div>
        <div class="muted" style="font-size: 0.82rem;">
          ${
            props.connected
              ? "Your gateway is healthy and ready to handle requests."
              : "Configure your gateway connection below to get started."
          }
        </div>
      </div>
    </div>

    <!-- Bento KPI Grid (6 cols) -->
    <div class="bento-grid-6" style="margin-bottom: 24px;">
      <!-- Instances -->
      <div class="kpi-card">
        <div class="kpi-accent-bar" style="background: var(--accent);"></div>
        <div class="kpi-label">Instances</div>
        <div class="kpi-value" style="color: var(--accent);">${props.presenceCount}</div>
        <div class="kpi-sub">Active presence beacons</div>
      </div>
      <!-- Sessions -->
      <div class="kpi-card">
        <div class="kpi-accent-bar" style="background: #8b5cf6;"></div>
        <div class="kpi-label">Sessions</div>
        <div class="kpi-value" style="color: #8b5cf6;">${props.sessionsCount ?? "—"}</div>
        <div class="kpi-sub">Tracked session keys</div>
      </div>
      <!-- Providers -->
      <div class="kpi-card">
        <div class="kpi-accent-bar" style="background: ${props.healthyProviders === props.totalProviders && props.totalProviders > 0 ? "var(--ok)" : props.healthyProviders > 0 ? "var(--warn)" : "var(--danger)"};"></div>
        <div class="kpi-label">Providers</div>
        <div class="kpi-value" style="color: ${props.healthyProviders === props.totalProviders && props.totalProviders > 0 ? "var(--ok)" : props.healthyProviders > 0 ? "var(--warn)" : "var(--danger)"};">${props.healthyProviders}/${props.totalProviders}</div>
        <div class="kpi-sub">Healthy AI providers</div>
      </div>
      <!-- Channels -->
      <div class="kpi-card">
        <div class="kpi-accent-bar" style="background: #22c55e;"></div>
        <div class="kpi-label">Channels</div>
        <div class="kpi-value" style="color: #22c55e;">${props.activeChannels}/${props.totalChannels}</div>
        <div class="kpi-sub">Active / total channels</div>
      </div>
      <!-- Tokens -->
      <div class="kpi-card">
        <div class="kpi-accent-bar" style="background: #a855f7;"></div>
        <div class="kpi-label">Tokens</div>
        <div class="kpi-value" style="color: #a855f7;">
          ${
            props.metricsSummary?.global?.tokens?.total != null
              ? fmtTokens(props.metricsSummary.global.tokens.total)
              : fmtTokens(props.totalTokens)
          }
        </div>
        <div class="kpi-sub">Total consumed</div>
      </div>
      <!-- Cost -->
      <div class="kpi-card">
        <div class="kpi-accent-bar" style="background: #06b6d4;"></div>
        <div class="kpi-label">Est. Cost</div>
        <div class="kpi-value" style="color: #06b6d4;">
          ${
            props.metricsSummary?.global?.cost?.estimated != null
              ? fmtCost(props.metricsSummary.global.cost.estimated)
              : fmtCost(props.totalCost)
          }
        </div>
        <div class="kpi-sub">Since last reset</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="dash-tabs">
      <button
        class="dash-tab ${props.activeTab === "system" ? "active" : ""}"
        @click=${() => props.onTabChange("system")}
        aria-label="System tab"
      >System</button>
      <button
        class="dash-tab ${props.activeTab === "models" ? "active" : ""}"
        @click=${() => props.onTabChange("models")}
        aria-label="Models tab"
      >Models</button>
      <button
        class="dash-tab ${props.activeTab === "activity" ? "active" : ""}"
        @click=${() => props.onTabChange("activity")}
        aria-label="Activity tab"
      >Activity</button>
    </div>

    <!-- Tab: System -->
    <div class="dash-tab-panel" style="display: ${props.activeTab === "system" ? "block" : "none"}">
      <div class="grid grid-cols-2" style="gap: 16px;">
        <!-- Gateway Access -->
        <div class="card">
          <div class="card-title">Gateway Access</div>
          <div class="card-sub">Where the dashboard connects and how it authenticates.</div>
          <div class="form-grid" style="margin-top: 16px;">
            <label class="field">
              <span>WebSocket URL</span>
              <input
                .value=${props.settings.gatewayUrl}
                @input=${(e: Event) => {
                  const v = (e.target as HTMLInputElement).value;
                  props.onSettingsChange({ ...props.settings, gatewayUrl: v });
                }}
                placeholder="ws://100.x.y.z:18789"
              />
            </label>
            ${
              isTrustedProxy
                ? ""
                : html`
                <label class="field">
                  <span>Gateway Token</span>
                  <input
                    .value=${props.settings.token}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      props.onSettingsChange({ ...props.settings, token: v });
                    }}
                    placeholder="OPENCLAW_GATEWAY_TOKEN"
                  />
                </label>
                <label class="field">
                  <span>Password (not stored)</span>
                  <input
                    type="password"
                    .value=${props.password}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      props.onPasswordChange(v);
                    }}
                    placeholder="system or shared password"
                  />
                </label>
              `
            }
            <label class="field">
              <span>Default Session Key</span>
              <input
                .value=${props.settings.sessionKey}
                @input=${(e: Event) => {
                  const v = (e.target as HTMLInputElement).value;
                  props.onSessionKeyChange(v);
                }}
              />
            </label>
          </div>
          <div class="row" style="margin-top: 14px;">
            <button class="btn" @click=${() => props.onConnect()}>Connect</button>
            <button class="btn" @click=${() => props.onRefresh()}>Refresh</button>
            <span class="muted">${isTrustedProxy ? "Authenticated via trusted proxy." : "Click Connect to apply connection changes."}</span>
          </div>
        </div>

        <!-- Snapshot -->
        <div class="card">
          <div class="card-title">Snapshot</div>
          <div class="card-sub">Latest gateway handshake information.</div>
          <div class="stat-grid" style="margin-top: 16px;">
            <div class="stat">
              <div class="stat-label">Status</div>
              <div class="stat-value ${props.connected ? "ok" : "warn"}">
                ${props.connected ? "Connected" : "Disconnected"}
              </div>
            </div>
            <div class="stat">
              <div class="stat-label">Uptime</div>
              <div class="stat-value">${uptime}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Tick Interval</div>
              <div class="stat-value">${tick}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Last Channels Refresh</div>
              <div class="stat-value">
                ${props.lastChannelsRefresh ? formatRelativeTimestamp(props.lastChannelsRefresh) : "n/a"}
              </div>
            </div>
          </div>
          ${
            props.lastError
              ? html`<div class="callout danger" style="margin-top: 14px;">
                <div>${props.lastError}</div>
                ${authHint ?? ""}
                ${insecureContextHint ?? ""}
              </div>`
              : html`
                  <div class="callout" style="margin-top: 14px">
                    Use Channels to link WhatsApp, Telegram, Discord, Signal, or iMessage.
                  </div>
                `
          }
        </div>
      </div>

      <!-- System Info (when connected) -->
      ${
        props.systemInfo
          ? html`
            <div class="card" style="margin-top: 16px;">
              <div class="card-title">System Info</div>
              <div class="card-sub">Gateway runtime infrastructure and configuration.</div>
              <div style="margin-top: 16px;">
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 0.73rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Build & Identity</div>
                  <div class="stat-grid">
                    <div class="stat"><div class="stat-label">Version</div><div class="stat-value">${props.systemInfo.version}</div></div>
                    <div class="stat"><div class="stat-label">Host</div><div class="stat-value">${props.systemInfo.host}</div></div>
                    <div class="stat"><div class="stat-label">PID</div><div class="stat-value mono">${props.systemInfo.pid}</div></div>
                    <div class="stat"><div class="stat-label">Model</div><div class="stat-value mono" style="font-size: 0.85em;">${props.systemInfo.model}</div></div>
                  </div>
                </div>
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 0.73rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Infrastructure</div>
                  <div class="stat-grid">
                    <div class="stat">
                      <div class="stat-label">Storage</div>
                      <div class="stat-value ${props.systemInfo.storage.backend === "postgresql" ? "ok" : props.systemInfo.storage.backend === "sqlite" ? "warn" : ""}">${props.systemInfo.storage.backend}</div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Cache</div>
                      <div class="stat-value ${props.systemInfo.cache.backend === "redis" ? "ok" : ""}">${props.systemInfo.cache.backend}${props.systemInfo.cache.host ? html` <span class="muted" style="font-size: 0.85em;">(${props.systemInfo.cache.host}:${props.systemInfo.cache.port})</span>` : nothing}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.73rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Runtime</div>
                  <div class="stat-grid">
                    <div class="stat"><div class="stat-label">Platform</div><div class="stat-value mono" style="font-size: 0.85em;">${props.systemInfo.platform}/${props.systemInfo.arch}</div></div>
                    <div class="stat"><div class="stat-label">Node Version</div><div class="stat-value mono" style="font-size: 0.85em;">${props.systemInfo.nodeVersion}</div></div>
                    <div class="stat"><div class="stat-label">Process Uptime</div><div class="stat-value">${props.systemInfo.uptime != null ? formatDurationHuman(props.systemInfo.uptime * 1000) : "n/a"}</div></div>
                    <div class="stat"><div class="stat-label">Memory (RSS)</div><div class="stat-value mono" style="font-size: 0.85em;">${props.systemInfo.memoryUsage != null ? `${(props.systemInfo.memoryUsage / 1024 / 1024).toFixed(0)} MB` : "n/a"}</div></div>
                  </div>
                </div>
              </div>
              ${
                props.systemInfo.logFile
                  ? html`<div class="muted" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 0.85em;">Log: <span class="mono">${props.systemInfo.logFile}</span></div>`
                  : nothing
              }
            </div>
          `
          : nothing
      }

      <!-- Notes & Tips -->
      <div style="margin-top: 20px;">
        <div class="page-header__title" style="font-size: 1rem; margin-bottom: 4px;">Notes & Tips</div>
        <div class="muted" style="font-size: 0.85rem; margin-bottom: 14px;">Quick reminders for remote control setups.</div>
        <div class="grid grid-cols-3" style="gap: 14px;">
          <div style="border: 1px solid var(--border); border-left: 3px solid #f59e0b; border-radius: 8px; padding: 16px; background: rgba(245, 158, 11, 0.02);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px; color: #f59e0b; flex-shrink: 0;"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <div class="note-title" style="color: #f59e0b;">Tailscale Serve</div>
            </div>
            <div class="muted" style="font-size: 0.9em;">Prefer serve mode to keep the gateway on loopback with tailnet auth.</div>
          </div>
          <div style="border: 1px solid var(--border); border-left: 3px solid #10b981; border-radius: 8px; padding: 16px; background: rgba(16, 185, 129, 0.02);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px; color: #10b981; flex-shrink: 0;"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div class="note-title" style="color: #10b981;">Session Hygiene</div>
            </div>
            <div class="muted" style="font-size: 0.9em;">Use /new or sessions.patch to reset context between runs.</div>
          </div>
          <div style="border: 1px solid var(--border); border-left: 3px solid #06b6d4; border-radius: 8px; padding: 16px; background: rgba(6, 182, 212, 0.02);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px; color: #06b6d4; flex-shrink: 0;"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <div class="note-title" style="color: #06b6d4;">Cron Reminders</div>
            </div>
            <div class="muted" style="font-size: 0.9em;">Next wake ${formatNextRun(props.cronNext)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Models -->
    <div class="dash-tab-panel" style="display: ${props.activeTab === "models" ? "block" : "none"}">
      ${
        modelRows.length > 0
          ? html`
          <!-- Bar chart: top models by requests -->
          <div class="card" style="margin-bottom: 16px;">
            <div class="card-title">Top Models by Requests</div>
            <div class="card-sub" style="margin-bottom: 12px;">Request volume breakdown across all providers.</div>
            <div class="chart-container" id="overview-bar-chart" data-chart-data=${chartDataEncoded}></div>
          </div>

          <!-- Models data table -->
          <div class="card">
            <div class="card-title">Model Performance</div>
            <div class="card-sub" style="margin-bottom: 12px;">Latency, tokens, and cost per model since last reset.</div>
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Provider</th>
                    <th>Requests</th>
                    <th>Success%</th>
                    <th>p50</th>
                    <th>p95</th>
                    <th>p99</th>
                    <th>Tokens</th>
                    <th>Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${modelRows.map(
                    (r) => html`
                      <tr>
                        <td class="mono">${r.model}</td>
                        <td><span class="badge badge-muted">${r.provider}</span></td>
                        <td class="num">${r.requests}</td>
                        <td class="num">
                          <span class="badge ${r.successPct === "n/a" ? "badge-muted" : Number(r.successPct.replace("%", "")) >= 95 ? "badge-ok" : Number(r.successPct.replace("%", "")) >= 80 ? "badge-warn" : "badge-danger"}">${r.successPct}</span>
                        </td>
                        <td class="num">${r.p50}</td>
                        <td class="num">${r.p95}</td>
                        <td class="num">${r.p99}</td>
                        <td class="num">${r.tokens}</td>
                        <td class="num">${r.cost}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            </div>
          </div>
        `
          : html`
              <div class="card">
                <div class="card-title">Model Performance</div>
                <div class="card-sub">
                  No model metrics available yet. Metrics accumulate as agents make API calls.
                </div>
                <div class="callout" style="margin-top: 14px">
                  Metrics are tracked in memory and reset on gateway restart. Connect to a gateway and run some
                  tasks to see data here.
                </div>
              </div>
            `
      }
    </div>

    <!-- Tab: Activity -->
    <div class="dash-tab-panel" style="display: ${props.activeTab === "activity" ? "block" : "none"}">
      <div class="grid grid-cols-2" style="gap: 16px; margin-bottom: 16px;">
        <!-- Success Rate Gauge -->
        <div class="card">
          <div class="card-title">Success Rate</div>
          <div class="card-sub">Overall request success ratio since last reset.</div>
          <div class="chart-container" id="overview-gauge-chart" data-chart-data=${chartDataEncoded}></div>
          ${
            props.modelsMetrics?.global?.requests
              ? html`
              <div style="display: flex; gap: 20px; margin-top: 8px; font-size: 0.82rem; color: var(--muted);">
                <span>Total: <strong style="color: var(--text);">${props.modelsMetrics.global.requests.started ?? 0}</strong></span>
                <span style="color: var(--ok);">Success: <strong>${props.modelsMetrics.global.requests.success ?? 0}</strong></span>
              </div>
            `
              : nothing
          }
        </div>

        <!-- Tokens by Provider Pie -->
        <div class="card">
          <div class="card-title">Token Distribution</div>
          <div class="card-sub">Token usage breakdown across providers.</div>
          <div class="chart-container" id="overview-pie-chart" data-chart-data=${chartDataEncoded}></div>
        </div>
      </div>

      <!-- Quick Actions -->
      ${
        props.connected
          ? html`
          <div class="card">
            <div class="card-title">Quick Actions</div>
            <div class="grid grid-cols-2" style="gap: 10px; margin-top: 14px;">
              <button class="btn" @click=${() => props.onNewSession()} style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: var(--accent-subtle); color: var(--accent); border: 1px solid rgba(99,102,241,0.3); border-radius: 6px; cursor: pointer; font-weight: 500;">
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px;"><path d="M12 5v14M5 12h14" /></svg>
                New Session
              </button>
              <button class="btn" @click=${() => props.onRefresh()} style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: var(--accent-subtle); color: var(--accent); border: 1px solid rgba(99,102,241,0.3); border-radius: 6px; cursor: pointer; font-weight: 500;">
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px;"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>
                Check Status
              </button>
              <button class="btn" @click=${() => props.onViewLogs()} style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: var(--accent-subtle); color: var(--accent); border: 1px solid rgba(99,102,241,0.3); border-radius: 6px; cursor: pointer; font-weight: 500;">
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px;"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                View Logs
              </button>
              <button class="btn" @click=${() => props.onViewDocs()} style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: var(--accent-subtle); color: var(--accent); border: 1px solid rgba(99,102,241,0.3); border-radius: 6px; cursor: pointer; font-weight: 500;">
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px;"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Documentation
              </button>
            </div>
          </div>
        `
          : nothing
      }
    </div>

    <!-- ECharts Initialization Script -->
    <overview-charts-init
      style="display: none"
      data-tab=${props.activeTab}
      data-chart-data=${chartDataEncoded}
    ></overview-charts-init>
  `;
}
