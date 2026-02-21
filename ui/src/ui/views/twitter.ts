/**
 * Twitter dashboard view — follows the Control UI design system.
 *
 * Uses Lit tagged templates, design-system CSS classes, SVG icons,
 * and ECharts force-directed graph for the relationships tab.
 */

// @ts-expect-error - echarts doesn't have proper ESM types
import * as echarts from "echarts";
import { html, nothing, type TemplateResult } from "lit";
import type { TwitterData } from "../controllers/twitter.ts";
import type { TwitterRelationships, TwitterUser } from "../controllers/twitter.ts";
import { icons } from "../icons.ts";
import { renderEmptyState, renderSpinner } from "../render-utils.ts";

/* ═══════════════════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════════════════ */

export type TwitterViewProps = {
  loading: boolean;
  error: string | null;
  data: TwitterData | null;
  relationships: TwitterRelationships | null;
  relationshipsLoading: boolean;
  activeTab: "dashboard" | "relationships";
  onRefresh: () => void;
  onTabChange: (tab: "dashboard" | "relationships") => void;
  onLoadRelationships: () => void;
};

export function renderTwitter(props: TwitterViewProps): TemplateResult {
  const {
    loading,
    error,
    data,
    relationships,
    relationshipsLoading,
    activeTab,
    onRefresh,
    onTabChange,
    onLoadRelationships,
  } = props;

  const tabs: { id: "dashboard" | "relationships"; label: string; icon: TemplateResult }[] = [
    { id: "dashboard", label: "Dashboard", icon: icons.barChart },
    { id: "relationships", label: "Relationships", icon: icons.globe },
  ];

  return html`
    <div class="page-header">
      <div class="page-header__title">Twitter Analytics</div>
      <div class="page-header__sub">Monitor account performance, engagement, and network.</div>
    </div>
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title" style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 20px; height: 20px; color: var(--accent);">${icons.twitter}</span>
            Twitter Analytics
          </div>
          <div class="card-sub">Monitor account performance, engagement, and network.</div>
        </div>
        <button class="btn btn--sm" ?disabled=${loading || relationshipsLoading} @click=${onRefresh}>
          ${loading || relationshipsLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-top: 16px; margin-bottom: 16px;">
        ${tabs.map(
          (tab) => html`
            <button
              class="tab ${activeTab === tab.id ? "tab--active" : ""}"
              @click=${() => onTabChange(tab.id)}
            >
              <span style="width: 14px; height: 14px; display: inline-flex;">${tab.icon}</span>
              ${tab.label}
            </button>
          `,
        )}
      </div>

      ${error ? html`<div class="callout danger" style="margin-top: 12px;">${error}</div>` : nothing}

      <!-- Dashboard tab -->
      ${activeTab === "dashboard" ? renderDashboardTab(data, loading) : nothing}

      <!-- Relationships tab -->
      ${
        activeTab === "relationships"
          ? renderRelationshipsTab(relationships, relationshipsLoading, onLoadRelationships)
          : nothing
      }
    </section>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   Dashboard tab
   ═══════════════════════════════════════════════════════════════ */

function renderDashboardTab(data: TwitterData | null, loading: boolean): TemplateResult {
  if (loading) {
    return html`<div style="margin-top: 16px;">${renderSpinner("Loading Twitter data...")}</div>`;
  }

  if (!data) {
    return html`
      <div style="margin-top: 16px;">
        ${renderEmptyState({
          icon: icons.twitter,
          title: "No Twitter Data",
          subtitle: "Could not load Twitter analytics. Verify the x CLI is configured.",
        })}
      </div>
    `;
  }

  const { profile, engagement, tweets, alerts } = data;

  return html`
    <!-- Alerts -->
    ${
      alerts.length > 0
        ? html`
          <div style="display: grid; gap: 8px; margin-bottom: 16px;">
            ${alerts.map((alert) => {
              const cls =
                alert.type === "error" ? "danger" : alert.type === "warning" ? "danger" : "";
              return html`
                <div class="callout ${cls}">
                  <span style="font-weight: 600; text-transform: uppercase; font-size: 11px;">
                    ${alert.type}:
                  </span>
                  ${alert.message}
                </div>
              `;
            })}
          </div>
        `
        : nothing
    }

    <!-- Profile stats -->
    <div class="stat-grid" style="margin-bottom: 20px;">
      <div class="stat">
        <div class="stat-label">Followers</div>
        <div class="stat-value">${formatNumber(profile.followers)}</div>
        ${
          profile.followers_growth_24h !== 0
            ? html`<div class="muted" style="font-size: 11px;">
              <span style="color: ${profile.followers_growth_24h > 0 ? "var(--ok)" : "var(--danger)"};">
                ${profile.followers_growth_24h > 0 ? "+" : ""}${profile.followers_growth_24h}
              </span>
              (24h)
            </div>`
            : nothing
        }
      </div>
      <div class="stat">
        <div class="stat-label">Following</div>
        <div class="stat-value">${formatNumber(profile.following)}</div>
        <div class="muted" style="font-size: 11px;">Ratio: ${profile.ff_ratio}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Tweets</div>
        <div class="stat-value">${formatNumber(profile.tweet_count)}</div>
        <div class="muted" style="font-size: 11px;">${profile.tweets_last_7d} last 7d</div>
      </div>
      <div class="stat">
        <div class="stat-label">Engagement Rate</div>
        <div class="stat-value">${engagement.rate_avg_7d.toFixed(2)}%</div>
        <div class="muted" style="font-size: 11px;">Avg last 7d</div>
      </div>
      <div class="stat">
        <div class="stat-label">Reach Rate</div>
        <div class="stat-value">${engagement.reach_rate.toFixed(2)}%</div>
        <div class="muted" style="font-size: 11px;">Impressions / Followers</div>
      </div>
    </div>

    <!-- Recent tweets -->
    <div style="font-size: 0.85em; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
      Recent Tweets
    </div>
    ${
      tweets.length > 0
        ? html`
          <div class="list">
            ${tweets.slice(0, 8).map(
              (tweet) => html`
                <div class="list-item" style="grid-template-columns: minmax(0,1fr) auto;">
                  <div class="list-main">
                    <div class="list-title" style="font-size: 13px; white-space: pre-line;">${tweet.text}</div>
                    <div class="list-sub" style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 12px; height: 12px; color: var(--danger);">${icons.activity}</span>
                        ${formatNumber(tweet.likes)}
                      </span>
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 12px; height: 12px; color: var(--ok);">${icons.radio}</span>
                        ${formatNumber(tweet.retweets)}
                      </span>
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 12px; height: 12px; color: var(--info);">${icons.messageSquare}</span>
                        ${formatNumber(tweet.replies)}
                      </span>
                      ${
                        tweet.impressions > 0
                          ? html`<span style="display: inline-flex; align-items: center; gap: 4px;">
                            <span style="width: 12px; height: 12px; color: var(--muted);">${icons.eye}</span>
                            ${formatNumber(tweet.impressions)}
                          </span>`
                          : nothing
                      }
                      <span class="chip" style="font-size: 10px; padding: 2px 8px;">${tweet.engagement_rate}%</span>
                    </div>
                  </div>
                  <div class="list-meta" style="text-align: right; min-width: 80px;">
                    <div style="font-size: 11px; color: var(--muted);">${formatDate(tweet.created_at)}</div>
                  </div>
                </div>
              `,
            )}
          </div>
        `
        : html`
            <div class="muted">No recent tweets found.</div>
          `
    }

    <!-- Last updated -->
    ${
      data.lastUpdated
        ? html`<div class="muted" style="margin-top: 12px; font-size: 11px;">
          Last updated: ${new Date(data.lastUpdated).toLocaleString()}
        </div>`
        : nothing
    }
  `;
}

/* ═══════════════════════════════════════════════════════════════
   Relationships tab — ECharts force-directed graph
   ═══════════════════════════════════════════════════════════════ */

function renderRelationshipsTab(
  data: TwitterRelationships | null,
  loading: boolean,
  onLoad: () => void,
): TemplateResult {
  if (loading) {
    return html`<div style="margin-top: 16px;">${renderSpinner("Loading relationships...")}</div>`;
  }

  if (!data) {
    return html`
      <div style="margin-top: 16px;">
        ${renderEmptyState({
          icon: icons.globe,
          title: "No Relationship Data",
          subtitle: "Click the button below to load your Twitter network graph.",
        })}
        <div style="text-align: center; margin-top: 12px;">
          <button class="btn primary" @click=${onLoad}>Load Relationships</button>
        </div>
      </div>
    `;
  }

  const { current_user, following, followers_sample } = data;

  // Summary stats
  const mutualCount = following.filter((u) => u.isMutual).length;

  return html`
    <div class="stat-grid" style="margin-bottom: 16px;">
      <div class="stat">
        <div class="stat-label">Following</div>
        <div class="stat-value">${following.length}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Followers (sample)</div>
        <div class="stat-value">${followers_sample.length}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Mutual</div>
        <div class="stat-value ok">${mutualCount}</div>
      </div>
    </div>

    <div
      id="twitter-relationships-chart"
      style="min-height: 450px; height: calc(100vh - 380px); border: 1px solid var(--border); border-radius: var(--radius-md); margin-top: 8px;"
    ></div>

    ${scheduleRelationshipsChart(current_user, following, followers_sample)}

    <!-- Legend -->
    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; padding: 12px 16px; border-radius: 8px; background: rgba(0,0,0,0.03); font-size: 11px; color: var(--muted);">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#6366f1;border:2px solid #fff;box-shadow:0 0 6px #6366f1;"></span>
        <span>You</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;"></span>
        <span>Mutual</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;"></span>
        <span>Following</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#71717a;"></span>
        <span>Follower only</span>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   ECharts force graph for relationships
   ═══════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let relChartInstance: echarts.ECharts | null = null;
let relResizeObserver: ResizeObserver | null = null;

function cleanupRelChart() {
  if (relResizeObserver) {
    relResizeObserver.disconnect();
    relResizeObserver = null;
  }
  relChartInstance = null;
}

function scheduleRelationshipsChart(
  currentUser: { id: string; username: string },
  following: TwitterUser[],
  followersSample: TwitterUser[],
): typeof nothing {
  requestAnimationFrame(() => {
    const container = document.getElementById("twitter-relationships-chart");
    if (!container) {
      return;
    }

    const existing = echarts.getInstanceByDom(container);
    if (existing) {
      existing.dispose();
    }
    cleanupRelChart();

    const chartWidth = container.clientWidth || 800;
    const chartHeight = container.clientHeight || 450;

    relChartInstance = echarts.init(container, undefined, {
      renderer: "canvas",
      width: chartWidth,
      height: chartHeight,
    });

    // Build graph data
    type GNode = {
      id: string;
      name: string;
      symbolSize: number;
      category: number;
      itemStyle: Record<string, unknown>;
      label?: Record<string, unknown>;
      _username?: string;
      _followers?: number;
      _description?: string;
    };
    type GLink = {
      source: string;
      target: string;
      lineStyle?: Record<string, unknown>;
    };

    const nodes: GNode[] = [];
    const links: GLink[] = [];
    const nodeIds = new Set<string>();
    const followersSet = new Set(followersSample.map((u) => u.id));

    // Central node: current user
    nodes.push({
      id: currentUser.id,
      name: `@${currentUser.username}`,
      symbolSize: 28,
      category: 0,
      itemStyle: {
        color: "#6366f1",
        borderColor: "#fff",
        borderWidth: 2,
        shadowBlur: 12,
        shadowColor: "#6366f1",
      },
      label: { show: true, fontSize: 12, fontWeight: "bold" },
    });
    nodeIds.add(currentUser.id);

    // Following nodes
    for (const user of following) {
      if (nodeIds.has(user.id)) {
        continue;
      }
      nodeIds.add(user.id);

      const isMutual = user.isMutual || followersSet.has(user.id);
      const size = Math.max(6, Math.min(18, 6 + Math.log2((user.followers || 1) + 1) * 1.5));

      nodes.push({
        id: user.id,
        name: `@${user.username}`,
        symbolSize: size,
        category: isMutual ? 1 : 2,
        itemStyle: {
          color: isMutual ? "#22c55e" : "#3b82f6",
          borderColor: isMutual ? "#16a34a" : "#2563eb",
          borderWidth: 1,
        },
        _username: user.username,
        _followers: user.followers,
        _description: user.description,
      });

      // Edge: me → following
      links.push({
        source: currentUser.id,
        target: user.id,
        lineStyle: {
          color: isMutual ? "rgba(34, 197, 94, 0.4)" : "rgba(59, 130, 246, 0.25)",
          width: isMutual ? 1.5 : 1,
          curveness: 0.2,
        },
      });
    }

    // Follower-only nodes (not in following list)
    for (const user of followersSample) {
      if (nodeIds.has(user.id)) {
        continue;
      }
      nodeIds.add(user.id);

      const size = Math.max(5, Math.min(14, 5 + Math.log2((user.followers || 1) + 1) * 1.2));

      nodes.push({
        id: user.id,
        name: `@${user.username}`,
        symbolSize: size,
        category: 3,
        itemStyle: {
          color: "#71717a",
          borderColor: "#52525b",
          borderWidth: 1,
        },
        _username: user.username,
        _followers: user.followers,
        _description: user.description,
      });

      links.push({
        source: user.id,
        target: currentUser.id,
        lineStyle: {
          color: "rgba(113, 113, 122, 0.2)",
          width: 0.8,
          curveness: 0.2,
        },
      });
    }

    const categories = [
      { name: "You", itemStyle: { color: "#6366f1" } },
      { name: "Mutual", itemStyle: { color: "#22c55e" } },
      { name: "Following", itemStyle: { color: "#3b82f6" } },
      { name: "Follower", itemStyle: { color: "#71717a" } },
    ];

    const nodeCount = nodes.length;
    const repulsion = nodeCount <= 10 ? 100 : nodeCount <= 30 ? 200 : nodeCount <= 60 ? 350 : 500;
    const edgeLen = nodeCount <= 10 ? 60 : nodeCount <= 30 ? 100 : nodeCount <= 60 ? 150 : 200;

    const option = {
      tooltip: {
        trigger: "item" as const,
        triggerOn: "mousemove" as const,
        formatter: (params: { data?: GNode; dataType?: string }) => {
          if (params.dataType === "edge") {
            return "";
          }
          const d = params.data;
          if (!d) {
            return "";
          }

          const followerLine =
            d._followers !== undefined
              ? `<div style="margin-top:4px;font-size:11px;color:#aaa;">Followers: ${formatNumber(d._followers)}</div>`
              : "";
          const descLine = d._description
            ? `<div style="margin-top:4px;font-size:11px;color:#ccc;max-width:250px;">${d._description.slice(0, 120)}</div>`
            : "";
          const catLabel = categories[d.category]?.name ?? "";

          return `<div style="max-width:300px;">
            <strong>${d.name}</strong>
            <span style="display:inline-block;padding:1px 6px;margin-left:6px;border-radius:3px;font-size:10px;background:${categories[d.category]?.itemStyle.color ?? "#6b7280"};color:#fff;">${catLabel}</span>
            ${descLine}${followerLine}
          </div>`;
        },
      },
      legend: { show: false },
      series: [
        {
          type: "graph",
          layout: "force",
          data: nodes,
          links,
          categories,
          roam: true,
          draggable: true,
          label: {
            show: true,
            position: "right" as const,
            formatter: "{b}",
            fontSize: 10,
          },
          labelLayout: { hideOverlap: true },
          center: ["50%", "50%"],
          force: {
            repulsion,
            gravity: 0.15,
            edgeLength: edgeLen,
            friction: 0.85,
          },
          lineStyle: { color: "source", curveness: 0.3 },
          scaleLimit: { min: 0.3, max: 2.5 },
        },
      ],
    };

    relChartInstance.setOption(option);

    relResizeObserver = new ResizeObserver(() => relChartInstance?.resize());
    relResizeObserver.observe(container);
  });

  return nothing;
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}h ago`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
