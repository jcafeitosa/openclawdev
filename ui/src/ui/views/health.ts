import { html, nothing } from "lit";
import { renderSpinner } from "../app-render.helpers.ts";

export type HealthProps = {
  loading: boolean;
  error: string | null;
  data: unknown;
  channels: Array<{ id: string; status: string }>;
  connected: boolean;
  debugHealth: unknown;
  onRefresh: () => void;
};

type HealthData = {
  uptime?: number;
  memoryUsedMb?: number;
  memoryTotalMb?: number;
  eventThroughput?: number;
  activeConnections?: number;
  errorCount?: number;
  errorTrend?: "up" | "down" | "stable";
  wsConnections?: number;
  rpcCallsPerMin?: number;
  messageThroughput?: number;
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

function channelStatusColor(status: string): string {
  switch (status) {
    case "connected":
    case "healthy":
    case "ok":
      return "var(--ok)";
    case "degraded":
    case "warning":
      return "var(--warn)";
    case "disconnected":
    case "error":
    case "down":
      return "var(--danger)";
    default:
      return "var(--muted)";
  }
}

export function renderHealth(props: HealthProps) {
  const data = props.data as HealthData | null;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title">System Health</div>
          <div class="card-sub">Real-time gateway metrics and channel status.</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      ${props.error ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>` : nothing}

      ${
        props.loading && !data
          ? renderSpinner("Loading health data...")
          : html`
            <div class="health-grid" style="margin-top: 16px;">
              <div class="card stat-card">
                <div class="stat-label">Status</div>
                <div class="stat-value ${props.connected ? "ok" : ""}">
                  ${props.connected ? "Online" : "Offline"}
                </div>
              </div>
              <div class="card stat-card">
                <div class="stat-label">Uptime</div>
                <div class="stat-value">${data?.uptime ? formatUptime(data.uptime) : "n/a"}</div>
              </div>
              <div class="card stat-card">
                <div class="stat-label">Memory</div>
                <div class="stat-value">
                  ${data?.memoryUsedMb ? `${data.memoryUsedMb.toFixed(0)}MB` : "n/a"}
                </div>
                ${data?.memoryTotalMb ? html`<div class="muted">${data.memoryTotalMb.toFixed(0)}MB total</div>` : nothing}
              </div>
              <div class="card stat-card">
                <div class="stat-label">Connections</div>
                <div class="stat-value">${data?.activeConnections ?? data?.wsConnections ?? "n/a"}</div>
              </div>
              <div class="card stat-card">
                <div class="stat-label">Error Count</div>
                <div class="stat-value ${(data?.errorCount ?? 0) > 0 ? "warn" : ""}">
                  ${data?.errorCount ?? 0}
                </div>
                ${
                  data?.errorTrend
                    ? html`<div class="muted">${data.errorTrend === "up" ? "Increasing" : data.errorTrend === "down" ? "Decreasing" : "Stable"}</div>`
                    : nothing
                }
              </div>
              <div class="card stat-card">
                <div class="stat-label">RPC/min</div>
                <div class="stat-value">${data?.rpcCallsPerMin ?? "n/a"}</div>
              </div>
            </div>
          `
      }
    </section>

    ${
      props.channels.length > 0
        ? html`
          <section class="card" style="margin-top: 18px;">
            <div class="card-title">Channel Health</div>
            <div class="card-sub">Status of all connected channels.</div>
            <div class="health-channel-matrix">
              ${props.channels.map(
                (ch) => html`
                  <div class="health-channel-cell">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${channelStatusColor(ch.status)}; flex-shrink: 0;"></div>
                    <span>${ch.id}</span>
                  </div>
                `,
              )}
            </div>
          </section>
        `
        : nothing
    }
  `;
}
