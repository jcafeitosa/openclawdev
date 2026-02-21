/**
 * Security monitoring view for the dashboard.
 *
 * Displays security events, alerts, blocked threats, and audit reports.
 */

import { html, nothing } from "lit";
import {
  type SecurityEvent,
  type SecurityEventCategory,
  type SecurityEventSeverity,
  type SecurityEventStats,
  type SecuritySummary,
  type SecurityAuditReport,
  severityColor,
  formatSecurityTime,
} from "../controllers/security.ts";
import { icons } from "../icons.ts";
import { renderSpinner } from "../render-utils.ts";

export type SecurityProps = {
  loading: boolean;
  error: string | null;
  summary: SecuritySummary | null;
  stats: SecurityEventStats | null;
  events: SecurityEvent[];
  alerts: SecurityEvent[];
  blocked: SecurityEvent[];
  audit: SecurityAuditReport | null;
  auditLoading: boolean;
  filterCategory: SecurityEventCategory | "all";
  filterSeverity: SecurityEventSeverity | "all";
  filterTimeRange: "1h" | "24h" | "7d" | "30d" | "all";
  activeTab: "summary" | "events" | "alerts" | "blocked" | "audit";
  eventsPage: number;
  eventsPerPage: number;
  onRefresh: () => void;
  onTabChange: (tab: "summary" | "events" | "alerts" | "blocked" | "audit") => void;
  onFilterCategoryChange: (category: SecurityEventCategory | "all") => void;
  onFilterSeverityChange: (severity: SecurityEventSeverity | "all") => void;
  onFilterTimeRangeChange: (range: "1h" | "24h" | "7d" | "30d" | "all") => void;
  onRunAudit: (deep: boolean) => void;
  onPageChange: (page: number) => void;
};

const CATEGORIES: Array<SecurityEventCategory | "all"> = [
  "all",
  "authentication",
  "authorization",
  "access_control",
  "command_execution",
  "network",
  "file_system",
  "configuration",
  "session",
  "rate_limit",
  "injection",
  "anomaly",
  "audit",
];

const SEVERITIES: Array<SecurityEventSeverity | "all"> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const TIME_RANGES: Array<{ value: "1h" | "24h" | "7d" | "30d" | "all"; label: string }> = [
  { value: "1h", label: "Last hour" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function severityBadgeClass(severity: SecurityEventSeverity): string {
  switch (severity) {
    case "critical":
      return "badge-danger";
    case "high":
      return "badge-warn";
    case "medium":
      return "badge-info";
    case "low":
      return "badge-muted";
    case "info":
      return "badge-muted";
    default:
      return "badge-muted";
  }
}

function severityBadge(severity: SecurityEventSeverity) {
  return html`
    <span class="badge ${severityBadgeClass(severity)}">
      ${severity}
    </span>
  `;
}

function statusIcon(status: "healthy" | "warning" | "critical") {
  switch (status) {
    case "healthy":
      return html`<span style="color: var(--ok);">${icons.shieldCheck}</span>`;
    case "warning":
      return html`<span style="color: var(--warn);">${icons.shieldAlert}</span>`;
    case "critical":
      return html`<span style="color: var(--danger);">${icons.shieldAlert}</span>`;
  }
}

function renderSecurityTabs(props: SecurityProps) {
  const tabs: Array<{
    id: "summary" | "events" | "alerts" | "blocked" | "audit";
    label: string;
    count?: number;
  }> = [
    { id: "summary", label: "Summary" },
    { id: "events", label: "Events" },
    { id: "alerts", label: "Alerts", count: props.alerts.length },
    { id: "blocked", label: "Blocked", count: props.blocked.length },
    { id: "audit", label: "Audit" },
  ];

  return html`
    <div class="dash-tabs" style="margin-bottom: 16px;">
      ${tabs.map(
        (tab) => html`
          <button
            class="dash-tab ${props.activeTab === tab.id ? "active" : ""}"
            @click=${() => props.onTabChange(tab.id)}
          >
            ${tab.label}
            ${
              tab.count !== undefined && tab.count > 0
                ? html`<span class="badge badge-danger" style="margin-left: 6px;">${tab.count}</span>`
                : nothing
            }
          </button>
        `,
      )}
    </div>
  `;
}

function renderSummaryTab(props: SecurityProps) {
  const summary = props.summary;
  const stats = props.stats;

  if (props.loading && !summary) {
    return renderSpinner("Loading security summary...");
  }

  const statusText =
    summary?.status === "critical"
      ? "Critical"
      : summary?.status === "warning"
        ? "Warning"
        : "Healthy";
  return html`
    <!-- Status Overview -->
    <div class="bento-grid-3" style="margin-bottom: 20px;">
      <div class="kpi-card">
        <div class="kpi-label">Security Status</div>
        <div class="kpi-value" style="display: flex; align-items: center; gap: 8px;">
          ${summary ? statusIcon(summary.status) : nothing}
          <span class="badge ${summary?.status === "critical" ? "badge-danger" : summary?.status === "warning" ? "badge-warn" : "badge-ok"}">${statusText}</span>
        </div>
        <div class="kpi-sub">${summary?.period ?? "24h"} overview</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Events</div>
        <div class="kpi-value">${summary?.totalEvents ?? 0}</div>
        <div class="kpi-sub">
          <span class="badge badge-danger">${summary?.criticalCount ?? 0} critical</span>
          <span class="badge badge-warn">${summary?.highCount ?? 0} high</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Blocked Threats</div>
        <div class="kpi-value" style="color: var(--ok);">${summary?.blockedCount ?? 0}</div>
        <div class="kpi-sub">Attacks prevented</div>
      </div>
    </div>

    <!-- Category Breakdown -->
    ${
      stats && Object.keys(stats.byCategory).length > 0
        ? html`
          <section class="card" style="margin-bottom: 20px;">
            <div class="card-title">Events by Category</div>
            <div class="card-sub">Distribution of security events across categories.</div>
            <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 16px;">
              ${Object.entries(stats.byCategory).map(
                ([category, count]) => html`
                  <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
                    <div style="font-size: 11px; text-transform: uppercase; opacity: 0.7; margin-bottom: 4px;">
                      ${category.replace("_", " ")}
                    </div>
                    <div style="font-size: 20px; font-weight: 600;">${count}</div>
                  </div>
                `,
              )}
            </div>
          </section>
        `
        : nothing
    }

    <!-- Severity Breakdown -->
    ${
      stats && Object.keys(stats.bySeverity).length > 0
        ? html`
          <section class="card" style="margin-bottom: 20px;">
            <div class="card-title">Events by Severity</div>
            <div class="card-sub">Distribution across severity levels.</div>
            <div style="display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap;">
              ${(["critical", "high", "medium", "low", "info"] as const).map((sev) => {
                const count = stats.bySeverity[sev] ?? 0;
                return html`
                  <div style="padding: 12px 20px; background: ${severityColor(sev)}15; border: 1px solid ${severityColor(sev)}30; border-radius: 8px; min-width: 100px;">
                    <div style="font-size: 11px; text-transform: uppercase; color: ${severityColor(sev)};">
                      ${sev}
                    </div>
                    <div style="font-size: 24px; font-weight: 600; color: ${severityColor(sev)};">${count}</div>
                  </div>
                `;
              })}
            </div>
          </section>
        `
        : nothing
    }

    <!-- Recent Alerts -->
    ${
      summary?.recentAlerts && summary.recentAlerts.length > 0
        ? html`
          <section class="card" style="margin-bottom: 20px;">
            <div class="card-title">Recent Alerts</div>
            <div class="card-sub">Latest high-priority security events.</div>
            <div class="list" style="margin-top: 12px;">
              ${summary.recentAlerts.slice(0, 5).map((event) => renderEventItem(event))}
            </div>
          </section>
        `
        : nothing
    }

    <!-- Recent Blocked -->
    ${
      summary?.recentBlocked && summary.recentBlocked.length > 0
        ? html`
          <section class="card">
            <div class="card-title">Recently Blocked</div>
            <div class="card-sub">Threats that were prevented.</div>
            <div class="list" style="margin-top: 12px;">
              ${summary.recentBlocked.slice(0, 5).map((event) => renderEventItem(event))}
            </div>
          </section>
        `
        : nothing
    }
  `;
}

function renderEventItem(event: SecurityEvent) {
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title" style="display: flex; align-items: center; gap: 8px;">
          ${severityBadge(event.severity)}
          <span style="font-family: monospace; font-size: 12px; opacity: 0.7;">${event.category}</span>
          ${
            event.blocked
              ? html`
                  <span class="badge badge-ok">BLOCKED</span>
                `
              : nothing
          }
        </div>
        <div class="list-sub" style="margin-top: 4px;">${event.description}</div>
        <div class="list-sub" style="font-size: 11px; opacity: 0.6; margin-top: 4px;">
          ${event.action}
          ${event.source ? html` · Source: ${event.source}` : nothing}
          ${event.ipAddress ? html` · IP: ${event.ipAddress}` : nothing}
          ${event.userId ? html` · User: ${event.userId}` : nothing}
        </div>
      </div>
      <div class="list-meta" style="text-align: right; min-width: 100px;">
        <div style="font-size: 12px;">${formatSecurityTime(event.timestamp)}</div>
        ${
          event.sessionKey
            ? html`<div class="muted" style="font-size: 10px; font-family: monospace;">${event.sessionKey.slice(0, 12)}...</div>`
            : nothing
        }
      </div>
    </div>
  `;
}

function renderFilters(props: SecurityProps) {
  return html`
    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label class="label" style="font-size: 11px;">Time Range</label>
        <select
          class="input"
          style="min-width: 140px;"
          .value=${props.filterTimeRange}
          @change=${(e: Event) =>
            props.onFilterTimeRangeChange(
              (e.target as HTMLSelectElement).value as "1h" | "24h" | "7d" | "30d" | "all",
            )}
        >
          ${TIME_RANGES.map(
            (range) => html`
              <option value=${range.value} ?selected=${props.filterTimeRange === range.value}>
                ${range.label}
              </option>
            `,
          )}
        </select>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label class="label" style="font-size: 11px;">Category</label>
        <select
          class="input"
          style="min-width: 160px;"
          .value=${props.filterCategory}
          @change=${(e: Event) =>
            props.onFilterCategoryChange(
              (e.target as HTMLSelectElement).value as SecurityEventCategory | "all",
            )}
        >
          ${CATEGORIES.map(
            (cat) => html`
              <option value=${cat} ?selected=${props.filterCategory === cat}>
                ${cat === "all" ? "All Categories" : cat.replace("_", " ")}
              </option>
            `,
          )}
        </select>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label class="label" style="font-size: 11px;">Severity</label>
        <select
          class="input"
          style="min-width: 120px;"
          .value=${props.filterSeverity}
          @change=${(e: Event) =>
            props.onFilterSeverityChange(
              (e.target as HTMLSelectElement).value as SecurityEventSeverity | "all",
            )}
        >
          ${SEVERITIES.map(
            (sev) => html`
              <option value=${sev} ?selected=${props.filterSeverity === sev}>
                ${sev === "all" ? "All Severities" : sev}
              </option>
            `,
          )}
        </select>
      </div>
    </div>
  `;
}

function renderEventsTab(props: SecurityProps) {
  if (props.loading && props.events.length === 0) {
    return renderSpinner("Loading security events...");
  }

  return html`
    ${renderFilters(props)}

    ${
      props.events.length === 0
        ? html`
            <div class="callout" style="text-align: center; padding: 40px">
              <div style="font-size: 14px; margin-bottom: 8px">No security events found</div>
              <div class="muted">Try adjusting your filters or check back later.</div>
            </div>
          `
        : html`
          <div class="list">
            ${props.events.map((event) => renderEventItem(event))}
          </div>
          ${
            props.events.length >= props.eventsPerPage
              ? html`
                <div style="display: flex; justify-content: center; gap: 12px; margin-top: 16px;">
                  <button
                    class="btn btn-secondary"
                    ?disabled=${props.eventsPage === 0}
                    @click=${() => props.onPageChange(props.eventsPage - 1)}
                  >
                    Previous
                  </button>
                  <span class="muted" style="padding: 8px 16px;">Page ${props.eventsPage + 1}</span>
                  <button
                    class="btn btn-secondary"
                    ?disabled=${props.events.length < props.eventsPerPage}
                    @click=${() => props.onPageChange(props.eventsPage + 1)}
                  >
                    Next
                  </button>
                </div>
              `
              : nothing
          }
        `
    }
  `;
}

function renderAlertsTab(props: SecurityProps) {
  if (props.loading && props.alerts.length === 0) {
    return renderSpinner("Loading security alerts...");
  }

  if (props.alerts.length === 0) {
    return html`
      <div class="callout" style="text-align: center; padding: 40px;">
        <div style="width: 48px; height: 48px; margin: 0 auto 16px; color: var(--ok);">${icons.shieldCheck}</div>
        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px; color: var(--ok);">No Active Alerts</div>
        <div class="muted">All systems are operating normally.</div>
      </div>
    `;
  }

  return html`
    <div class="list">
      ${props.alerts.map((event) => renderEventItem(event))}
    </div>
  `;
}

function renderBlockedTab(props: SecurityProps) {
  if (props.loading && props.blocked.length === 0) {
    return renderSpinner("Loading blocked events...");
  }

  if (props.blocked.length === 0) {
    return html`
      <div class="callout" style="text-align: center; padding: 40px;">
        <div style="width: 48px; height: 48px; margin: 0 auto 16px; color: var(--ok);">${icons.shield}</div>
        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No Blocked Events</div>
        <div class="muted">No threats have been blocked recently.</div>
      </div>
    `;
  }

  return html`
    <div class="list">
      ${props.blocked.map((event) => renderEventItem(event))}
    </div>
  `;
}

function renderAuditTab(props: SecurityProps) {
  const audit = props.audit;

  return html`
    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
      <button
        class="btn"
        ?disabled=${props.auditLoading}
        @click=${() => props.onRunAudit(false)}
      >
        ${props.auditLoading ? "Running..." : "Run Quick Audit"}
      </button>
      <button
        class="btn btn-secondary"
        ?disabled=${props.auditLoading}
        @click=${() => props.onRunAudit(true)}
      >
        ${props.auditLoading ? "Running..." : "Run Deep Audit"}
      </button>
    </div>

    ${
      props.auditLoading && !audit
        ? renderSpinner("Running security audit...")
        : audit
          ? html`
            <!-- Audit Summary -->
            <div class="bento-grid-3" style="margin-bottom: 20px;">
              <div class="kpi-card">
                <div class="kpi-label">Audit Status</div>
                <div class="kpi-value" style="display: flex; align-items: center; gap: 8px;">
                  ${statusIcon(audit.status)}
                  <span class="badge ${audit.status === "critical" ? "badge-danger" : audit.status === "warning" ? "badge-warn" : "badge-ok"}">
                    ${audit.status === "critical" ? "Critical" : audit.status === "warning" ? "Warning" : "Healthy"}
                  </span>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Total Findings</div>
                <div class="kpi-value">${audit.totalFindings}</div>
                <div class="kpi-sub">
                  <span class="badge badge-danger">${audit.criticalCount} critical</span>
                  <span class="badge badge-warn">${audit.warningCount} warnings</span>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Issues</div>
                <div class="kpi-value">${audit.criticalCount + audit.warningCount}</div>
                <div class="kpi-sub">Require attention</div>
              </div>
            </div>

            <!-- Findings List -->
            ${
              audit.findings.length > 0
                ? html`
                  <section class="card">
                    <div class="card-title">Audit Findings</div>
                    <div class="card-sub">Issues identified during the security audit.</div>
                    <div class="list" style="margin-top: 12px;">
                      ${audit.findings.map(
                        (finding) => html`
                          <div class="list-item">
                            <div class="list-main">
                              <div class="list-title" style="display: flex; align-items: center; gap: 8px;">
                                <span class="badge ${finding.severity === "critical" ? "badge-danger" : finding.severity === "warn" ? "badge-warn" : "badge-muted"}">
                                  ${finding.severity}
                                </span>
                                ${finding.title}
                              </div>
                              <div class="list-sub" style="margin-top: 4px;">${finding.detail}</div>
                              ${
                                finding.remediation
                                  ? html`
                                    <div class="list-sub" style="margin-top: 8px; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px; font-size: 12px;">
                                      <strong>Remediation:</strong> ${finding.remediation}
                                    </div>
                                  `
                                  : nothing
                              }
                            </div>
                            <div class="list-meta" style="min-width: 80px;">
                              <span class="muted" style="font-family: monospace; font-size: 11px;">${finding.checkId}</span>
                            </div>
                          </div>
                        `,
                      )}
                    </div>
                  </section>
                `
                : html`
                  <div class="callout" style="text-align: center; padding: 40px; background: var(--ok)10; border: 1px solid var(--ok)30;">
                    <div style="width: 48px; height: 48px; margin: 0 auto 16px; color: var(--ok);">${icons.shieldCheck}</div>
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px; color: var(--ok);">All Clear</div>
                    <div class="muted">No security issues were found during the audit.</div>
                  </div>
                `
            }
          `
          : html`
            <div class="callout" style="text-align: center; padding: 40px;">
              <div style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">${icons.shield}</div>
              <div style="font-size: 14px; margin-bottom: 8px;">No audit has been run yet</div>
              <div class="muted">Click "Run Quick Audit" or "Run Deep Audit" to analyze your system configuration.</div>
            </div>
          `
    }
  `;
}

export function renderSecurity(props: SecurityProps) {
  return html`
    <div class="page-header">
      <div class="page-header__title">Security Monitoring</div>
      <div class="page-header__sub">Monitor security events, alerts, and threats in real-time.</div>
    </div>

    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title">Security</div>
          <div class="card-sub">Events, alerts, and audit reports.</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      ${props.error ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>` : nothing}

      ${renderSecurityTabs(props)}

      <div class="dash-tab-panel">
        ${props.activeTab === "summary" ? renderSummaryTab(props) : nothing}
        ${props.activeTab === "events" ? renderEventsTab(props) : nothing}
        ${props.activeTab === "alerts" ? renderAlertsTab(props) : nothing}
        ${props.activeTab === "blocked" ? renderBlockedTab(props) : nothing}
        ${props.activeTab === "audit" ? renderAuditTab(props) : nothing}
      </div>
    </section>
  `;
}
