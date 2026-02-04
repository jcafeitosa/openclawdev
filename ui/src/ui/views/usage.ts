import { html, nothing } from "lit";
import { renderSpinner, renderEmptyState } from "../app-render.helpers.ts";
import { icons } from "../icons.ts";

export type UsageProps = {
  loading: boolean;
  error: string | null;
  status: unknown;
  cost: unknown;
  period: "24h" | "7d" | "30d" | "all";
  onPeriodChange: (period: "24h" | "7d" | "30d" | "all") => void;
  onRefresh: () => void;
};

type UsageStatusData = {
  totalTokensIn?: number;
  totalTokensOut?: number;
  totalCost?: number;
  activeProviders?: number;
  providers?: Array<{
    name: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    models?: Array<{ name: string; tokensIn: number; tokensOut: number; cost: number }>;
  }>;
};

const PERIOD_OPTIONS: Array<{ value: "24h" | "7d" | "30d" | "all"; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return String(n);
}

function formatCost(n: number): string {
  if (n === 0) {
    return "$0.00";
  }
  if (n < 0.01) {
    return `$${n.toFixed(4)}`;
  }
  return `$${n.toFixed(2)}`;
}

export function renderUsage(props: UsageProps) {
  const data = props.status as UsageStatusData | null;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title">Usage &amp; Cost</div>
          <div class="card-sub">Token usage and estimated costs across providers.</div>
        </div>
        <div class="row" style="gap: 8px;">
          <div class="usage-period-select">
            ${PERIOD_OPTIONS.map(
              (opt) => html`
                <button
                  class="chip"
                  style="cursor: pointer; ${props.period === opt.value ? "background: var(--text-strong); color: var(--bg); border-color: var(--text-strong);" : ""}"
                  @click=${() => props.onPeriodChange(opt.value)}
                >
                  ${opt.label}
                </button>
              `,
            )}
          </div>
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      ${props.error ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>` : nothing}

      ${
        props.loading && !data
          ? renderSpinner("Loading usage data...")
          : !data
            ? renderEmptyState({
                icon: icons.barChart,
                title: "No usage data",
                subtitle: "Usage data will appear as providers are used.",
              })
            : renderUsageData(data)
      }
    </section>
  `;
}

function renderUsageData(data: UsageStatusData) {
  const totalIn = data.totalTokensIn ?? 0;
  const totalOut = data.totalTokensOut ?? 0;
  const totalCost = data.totalCost ?? 0;
  const activeProviders = data.activeProviders ?? 0;
  const providers = data.providers ?? [];
  const grandTotal = totalIn + totalOut;

  return html`
    <div class="usage-summary" style="margin-top: 16px;">
      <div class="card stat-card">
        <div class="stat-label">Tokens In</div>
        <div class="stat-value">${formatTokenCount(totalIn)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Tokens Out</div>
        <div class="stat-value">${formatTokenCount(totalOut)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Estimated Cost</div>
        <div class="stat-value">${formatCost(totalCost)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Active Providers</div>
        <div class="stat-value">${activeProviders}</div>
      </div>
    </div>

    ${
      providers.length > 0
        ? html`
          <div style="margin-top: 16px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">
              Per-Provider Breakdown
            </div>
            <div class="usage-table">
              <div class="usage-table__row usage-table__head">
                <span>Provider</span>
                <span>Tokens In</span>
                <span>Tokens Out</span>
                <span>Cost</span>
              </div>
              ${providers.map(
                (p) => html`
                <div class="usage-table__row">
                  <span style="font-weight: 500;">${p.name}</span>
                  <span class="mono">${formatTokenCount(p.tokensIn)}</span>
                  <span class="mono">${formatTokenCount(p.tokensOut)}</span>
                  <span class="mono">${formatCost(p.cost)}</span>
                </div>
                ${
                  grandTotal > 0
                    ? html`
                  <div style="padding: 0 12px 8px;">
                    <div class="usage-bar">
                      <div
                        class="usage-bar__fill"
                        style="width: ${(((p.tokensIn + p.tokensOut) / grandTotal) * 100).toFixed(1)}%; background: var(--accent);"
                      ></div>
                    </div>
                  </div>
                `
                    : nothing
                }
              `,
              )}
            </div>
          </div>
        `
        : nothing
    }
  `;
}
