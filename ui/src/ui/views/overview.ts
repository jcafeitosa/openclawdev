import { html, nothing } from "lit";
import type { SystemInfoResult } from "../controllers/system-info.ts";
import { formatRelativeTimestamp, formatDurationHuman } from "../format.ts";
import type { GatewayHelloOk } from "../gateway.ts";
import { formatNextRun } from "../presenter.ts";
import type { UiSettings } from "../storage.ts";

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
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
};

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
          <div style="margin-top: 6px">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target="_blank"
              rel="noreferrer"
              title="Control UI auth docs (opens in new tab)"
              >Docs: Control UI auth</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        Auth failed. Update the token or password in Control UI settings, then click Connect.
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target="_blank"
            rel="noreferrer"
            title="Control UI auth docs (opens in new tab)"
            >Docs: Control UI auth</a
          >
        </div>
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
        <div style="margin-top: 6px">
          If you must stay on HTTP, set
          <span class="mono">gateway.controlUi.allowInsecureAuth: true</span> (token-only).
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target="_blank"
            rel="noreferrer"
            title="Tailscale Serve docs (opens in new tab)"
            >Docs: Tailscale Serve</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target="_blank"
            rel="noreferrer"
            title="Insecure HTTP docs (opens in new tab)"
            >Docs: Insecure HTTP</a
          >
        </div>
      </div>
    `;
  })();

  return html`
    ${
      props.connected
        ? html`
            <div
              class="welcome-banner"
              style="
                background: linear-gradient(135deg, var(--accent-subtle) 0%, transparent 100%);
                border-left: 4px solid var(--accent);
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
              "
            >
              <div style="display: flex; align-items: center; gap: 12px">
                <svg
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                  style="width: 24px; height: 24px; color: var(--accent); flex-shrink: 0"
                >
                  <path d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div style="font-weight: 600">Gateway Connected</div>
                  <div class="muted" style="font-size: 0.9em">
                    Your gateway is healthy and ready to handle requests.
                  </div>
                </div>
              </div>
            </div>
          `
        : html`
            <div
              class="welcome-banner"
              style="
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%);
                border-left: 4px solid #ef4444;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
              "
            >
              <div style="display: flex; align-items: center; gap: 12px">
                <svg
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                  style="width: 24px; height: 24px; color: #ef4444; flex-shrink: 0"
                >
                  <path d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div style="font-weight: 600">Gateway Disconnected</div>
                  <div class="muted" style="font-size: 0.9em">
                    Configure your gateway connection below to get started.
                  </div>
                </div>
              </div>
            </div>
          `
    }

    <section class="grid grid-cols-2">
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
    </section>

    ${
      props.systemInfo
        ? html`
            <section class="card" style="margin-top: 18px;">
              <div class="card-title">System Info</div>
              <div class="card-sub">Gateway runtime infrastructure and configuration.</div>

              <div style="margin-top: 16px;">
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 0.85em; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Build & Identity</div>
                  <div class="stat-grid">
                    <div class="stat">
                      <div class="stat-label">Version</div>
                      <div class="stat-value">${props.systemInfo.version}</div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Host</div>
                      <div class="stat-value">${props.systemInfo.host}</div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">PID</div>
                      <div class="stat-value mono">${props.systemInfo.pid}</div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Model</div>
                      <div class="stat-value mono" style="font-size: 0.85em;">${props.systemInfo.model}</div>
                    </div>
                  </div>
                </div>

                <div style="margin-bottom: 20px;">
                  <div style="font-size: 0.85em; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Infrastructure</div>
                  <div class="stat-grid">
                    <div class="stat">
                      <div class="stat-label">Storage</div>
                      <div class="stat-value ${props.systemInfo.storage.backend === "postgresql" ? "ok" : props.systemInfo.storage.backend === "sqlite" ? "warn" : ""}">
                        ${props.systemInfo.storage.backend}
                      </div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Cache</div>
                      <div class="stat-value ${props.systemInfo.cache.backend === "redis" ? "ok" : ""}">
                        ${props.systemInfo.cache.backend}${props.systemInfo.cache.host ? html` <span class="muted" style="font-size: 0.85em;">(${props.systemInfo.cache.host}:${props.systemInfo.cache.port})</span>` : nothing}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style="font-size: 0.85em; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Runtime</div>
                  <div class="stat-grid">
                    <div class="stat">
                      <div class="stat-label">Platform</div>
                      <div class="stat-value mono" style="font-size: 0.85em;">
                        ${props.systemInfo.platform}/${props.systemInfo.arch}
                      </div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Node Version</div>
                      <div class="stat-value mono" style="font-size: 0.85em;">
                        ${props.systemInfo.nodeVersion}
                      </div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Process Uptime</div>
                      <div class="stat-value">
                        ${props.systemInfo.uptime != null ? formatDurationHuman(props.systemInfo.uptime * 1000) : "n/a"}
                      </div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Memory (RSS)</div>
                      <div class="stat-value mono" style="font-size: 0.85em;">
                        ${props.systemInfo.memoryUsage != null ? `${(props.systemInfo.memoryUsage / 1024 / 1024).toFixed(0)} MB` : "n/a"}
                      </div>
                    </div>
                    <div class="stat">
                      <div class="stat-label">Browser Profiles</div>
                      <div class="stat-value">
                        ${props.systemInfo.browserProfiles != null ? html`${props.systemInfo.browserProfiles} profile${props.systemInfo.browserProfiles !== 1 ? "s" : ""}` : "Disabled"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              ${
                props.systemInfo.logFile
                  ? html`
                      <div class="muted" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 0.85em;">
                        Log: <span class="mono">${props.systemInfo.logFile}</span>
                      </div>
                    `
                  : nothing
              }
            </section>
          `
        : nothing
    }

    <section class="grid grid-cols-3" style="margin-top: 18px;">
      <div class="card stat-card" style="border-left: 3px solid var(--accent);">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 20px; height: 20px; color: var(--accent); flex-shrink: 0;">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div class="stat-label">Instances</div>
        </div>
        <div class="stat-value" style="color: var(--accent);">${props.presenceCount}</div>
        <div class="muted" style="font-size: 0.85em;">Presence beacons in the last 5 minutes.</div>
      </div>
      <div class="card stat-card" style="border-left: 3px solid #8b5cf6;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 20px; height: 20px; color: #8b5cf6; flex-shrink: 0;">
            <path d="M12 8c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 2c-2.21 0-4 1.79-4 4v2h8v-2c0-2.21-1.79-4-4-4zm6 6v-2c0-1.657-1.343-3-3-3h-.5M7.5 11c-1.657 0-3 1.343-3 3v2h1.5v-2c0-1.657 1.343-3 3-3H7.5z" />
            <path d="M21 20H3v2h18v-2z" />
          </svg>
          <div class="stat-label">Sessions</div>
        </div>
        <div class="stat-value" style="color: #8b5cf6;">${props.sessionsCount ?? "n/a"}</div>
        <div class="muted" style="font-size: 0.85em;">Recent session keys tracked by the gateway.</div>
      </div>
      <div class="card stat-card" style="border-left: 3px solid #06b6d4;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 20px; height: 20px; color: #06b6d4; flex-shrink: 0;">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div class="stat-label">Cron</div>
        </div>
        <div class="stat-value" style="color: #06b6d4;">
          ${props.cronEnabled == null ? "n/a" : props.cronEnabled ? "Enabled" : "Disabled"}
        </div>
        <div class="muted" style="font-size: 0.85em;">Next wake ${formatNextRun(props.cronNext)}</div>
      </div>
    </section>

    ${
      props.connected
        ? html`
            <section class="grid grid-cols-4" style="margin-top: 18px;">
              <div class="card stat-card" style="border-left: 3px solid #22c55e;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 20px; height: 20px; color: #22c55e; flex-shrink: 0;">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <div class="stat-label">Channels</div>
                </div>
                <div class="stat-value" style="color: #22c55e;">${props.activeChannels}/${props.totalChannels}</div>
                <div class="muted" style="font-size: 0.85em;">Active / total configured channels.</div>
              </div>
              <div class="card stat-card" style="border-left: 3px solid #f59e0b;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 20px; height: 20px; color: #f59e0b; flex-shrink: 0;">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <div class="stat-label">Providers</div>
                </div>
                <div class="stat-value" style="color: ${props.healthyProviders === props.totalProviders ? "#22c55e" : props.healthyProviders > 0 ? "#f59e0b" : "var(--danger)"};">
                  ${props.healthyProviders}/${props.totalProviders}
                </div>
                <div class="muted" style="font-size: 0.85em;">Healthy / total AI providers.</div>
              </div>
              <div class="card stat-card" style="border-left: 3px solid ${props.securityStatus === "critical" ? "var(--danger)" : props.securityStatus === "warning" ? "#f59e0b" : "#22c55e"};">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 20px; height: 20px; color: ${props.securityStatus === "critical" ? "var(--danger)" : props.securityStatus === "warning" ? "#f59e0b" : "#22c55e"}; flex-shrink: 0;">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div class="stat-label">Security</div>
                </div>
                <div class="stat-value" style="color: ${props.securityStatus === "critical" ? "var(--danger)" : props.securityStatus === "warning" ? "#f59e0b" : "#22c55e"};">
                  ${props.securityStatus === "critical" ? "Critical" : props.securityStatus === "warning" ? "Warning" : "Healthy"}
                </div>
                <div class="muted" style="font-size: 0.85em;">Current security posture.</div>
              </div>
              <div class="card stat-card" style="border-left: 3px solid #a855f7;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 20px; height: 20px; color: #a855f7; flex-shrink: 0;">
                    <path d="M12 20V10M18 20V4M6 20v-4" />
                  </svg>
                  <div class="stat-label">Usage</div>
                </div>
                <div class="stat-value" style="color: #a855f7;">
                  ${props.totalTokens != null ? (props.totalTokens > 1_000_000 ? `${(props.totalTokens / 1_000_000).toFixed(1)}M` : props.totalTokens > 1_000 ? `${(props.totalTokens / 1_000).toFixed(1)}K` : String(props.totalTokens)) : "n/a"}
                </div>
                <div class="muted" style="font-size: 0.85em;">
                  ${props.totalCost != null ? `$${props.totalCost.toFixed(2)} total cost` : "Total tokens consumed."}
                </div>
              </div>
            </section>
          `
        : nothing
    }

    ${
      props.connected
        ? html`
            <section style="margin-top: 18px">
              <div
                style="
                  font-size: 0.85em;
                  font-weight: 600;
                  color: var(--text-secondary);
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 12px;
                "
              >
                Quick Actions
              </div>
              <div class="grid grid-cols-2" style="gap: 12px">
                <button
                  class="btn"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: var(--accent-subtle);
                    color: var(--accent);
                    border: 1px solid var(--accent);
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                  "
                >
                  <svg
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="2"
                    style="width: 18px; height: 18px"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New Session
                </button>
                <button
                  class="btn"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: var(--accent-subtle);
                    color: var(--accent);
                    border: 1px solid var(--accent);
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                  "
                >
                  <svg
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="2"
                    style="width: 18px; height: 18px"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Check Status
                </button>
                <button
                  class="btn"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: var(--accent-subtle);
                    color: var(--accent);
                    border: 1px solid var(--accent);
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                  "
                >
                  <svg
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="2"
                    style="width: 18px; height: 18px"
                  >
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Logs
                </button>
                <button
                  class="btn"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: var(--accent-subtle);
                    color: var(--accent);
                    border: 1px solid var(--accent);
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                  "
                >
                  <svg
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="2"
                    style="width: 18px; height: 18px"
                  >
                    <path
                      d="M10.5 1.5H21a2 2 0 012 2v19a2 2 0 01-2 2H3a2 2 0 01-2-2V3.5a2 2 0 012-2h7M6 5h12M6 9h12m-7 8v-5m0 5v5m0-5h-2m2 0h2"
                    />
                  </svg>
                  Documentation
                </button>
              </div>
            </section>
          `
        : nothing
    }

    <section style="margin-top: 18px;">
      <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 8px;">Notes & Tips</div>
      <div class="muted" style="margin-bottom: 14px;">Quick reminders for remote control setups.</div>
      <div class="grid grid-cols-3" style="gap: 14px;">
        <div style="border: 1px solid var(--border); border-left: 3px solid #f59e0b; border-radius: 8px; padding: 16px; background: rgba(245, 158, 11, 0.02);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px; color: #f59e0b; flex-shrink: 0;">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div class="note-title" style="color: #f59e0b; font-weight: 600;">Tailscale Serve</div>
          </div>
          <div class="muted" style="font-size: 0.9em;">
            Prefer serve mode to keep the gateway on loopback with tailnet auth.
          </div>
        </div>
        <div style="border: 1px solid var(--border); border-left: 3px solid #10b981; border-radius: 8px; padding: 16px; background: rgba(16, 185, 129, 0.02);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px; color: #10b981; flex-shrink: 0;">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="note-title" style="color: #10b981; font-weight: 600;">Session Hygiene</div>
          </div>
          <div class="muted" style="font-size: 0.9em;">Use /new or sessions.patch to reset context between runs.</div>
        </div>
        <div style="border: 1px solid var(--border); border-left: 3px solid #06b6d4; border-radius: 8px; padding: 16px; background: rgba(6, 182, 212, 0.02);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" style="width: 18px; height: 18px; color: #06b6d4; flex-shrink: 0;">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div class="note-title" style="color: #06b6d4; font-weight: 600;">Cron Reminders</div>
          </div>
          <div class="muted" style="font-size: 0.9em;">Use isolated sessions for recurring or scheduled runs.</div>
        </div>
      </div>
    </section>
  `;
}
