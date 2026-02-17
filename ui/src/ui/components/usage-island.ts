/**
 * Usage Island - Interactive usage analytics for Astro.
 * Wraps the renderUsage view with full gateway service calls.
 */

import { StoreController } from "@nanostores/lit";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { SessionsUsageResult, CostUsageSummary, SessionUsageTimeSeries } from "../types.ts";
import { gateway } from "../../services/gateway.ts";
import { $connected } from "../../stores/app.ts";
import {
  renderUsage,
  type UsageColumnId,
  type SessionLogEntry,
  type SessionLogRole,
} from "../views/usage.ts";

function defaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  return { startDate: start, endDate: end };
}

@customElement("usage-island")
export class UsageIsland extends LitElement {
  private connectedCtrl = new StoreController(this, $connected);

  // Data state
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private usageResult: SessionsUsageResult | null = null;
  @state() private costSummary: CostUsageSummary | null = null;
  @state() private startDate = defaultDateRange().startDate;
  @state() private endDate = defaultDateRange().endDate;

  // Selection state
  @state() private selectedSessions: string[] = [];
  @state() private selectedDays: string[] = [];
  @state() private selectedHours: number[] = [];
  @state() private recentSessions: string[] = [];

  // Chart modes
  @state() private chartMode: "tokens" | "cost" = "tokens";
  @state() private dailyChartMode: "total" | "by-type" = "total";
  @state() private timeSeriesMode: "cumulative" | "per-turn" = "cumulative";
  @state() private timeSeriesBreakdownMode: "total" | "by-type" = "total";

  // Time series / logs
  @state() private timeSeries: { points: SessionUsageTimeSeries["points"] } | null = null;
  @state() private timeSeriesLoading = false;
  @state() private sessionLogs: SessionLogEntry[] | null = null;
  @state() private sessionLogsLoading = false;
  @state() private sessionLogsExpanded = false;

  // Log filters
  @state() private logFilterRoles: SessionLogRole[] = [];
  @state() private logFilterTools: string[] = [];
  @state() private logFilterHasTools = false;
  @state() private logFilterQuery = "";

  // Query / sort
  @state() private query = "";
  @state() private queryDraft = "";
  @state() private sessionSort: "tokens" | "cost" | "recent" | "messages" | "errors" = "tokens";
  @state() private sessionSortDir: "asc" | "desc" = "desc";
  @state() private sessionsTab: "all" | "recent" = "all";

  // Display
  @state() private visibleColumns: UsageColumnId[] = [
    "channel",
    "agent",
    "provider",
    "model",
    "messages",
    "tools",
    "errors",
    "duration",
  ];
  @state() private timeZone: "local" | "utc" = "local";
  @state() private contextExpanded = false;
  @state() private headerPinned = false;

  private queryDebounceTimer: number | null = null;
  private dateDebounceTimer: number | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.queryDebounceTimer) {
      clearTimeout(this.queryDebounceTimer);
      this.queryDebounceTimer = null;
    }
    if (this.dateDebounceTimer) {
      clearTimeout(this.dateDebounceTimer);
      this.dateDebounceTimer = null;
    }
  }

  private async loadData() {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.error = null;
    try {
      const [sessionsRes, costRes] = await Promise.all([
        gateway.call<SessionsUsageResult>("sessions.usage", {
          startDate: this.startDate,
          endDate: this.endDate,
          limit: 1000,
          includeContextWeight: true,
        }),
        gateway.call<CostUsageSummary>("usage.cost", {
          startDate: this.startDate,
          endDate: this.endDate,
        }),
      ]);
      if (sessionsRes) {
        this.usageResult = sessionsRes;
      }
      if (costRes) {
        this.costSummary = costRes;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  private async loadTimeSeries(sessionKey: string) {
    if (this.timeSeriesLoading) {
      return;
    }
    this.timeSeriesLoading = true;
    this.timeSeries = null;
    try {
      const res = await gateway.call<SessionUsageTimeSeries>("sessions.usage.timeseries", {
        key: sessionKey,
      });
      if (res) {
        this.timeSeries = res;
      }
    } catch {
      this.timeSeries = null;
    } finally {
      this.timeSeriesLoading = false;
    }
  }

  private async loadLogs(sessionKey: string) {
    if (this.sessionLogsLoading) {
      return;
    }
    this.sessionLogsLoading = true;
    this.sessionLogs = null;
    try {
      const res = await gateway.call<{ logs: SessionLogEntry[] }>("sessions.usage.logs", {
        key: sessionKey,
        limit: 500,
      });
      if (res?.logs) {
        this.sessionLogs = res.logs;
      }
    } catch {
      this.sessionLogs = null;
    } finally {
      this.sessionLogsLoading = false;
    }
  }

  private debouncedLoadData() {
    if (this.dateDebounceTimer) {
      clearTimeout(this.dateDebounceTimer);
    }
    this.dateDebounceTimer = window.setTimeout(() => void this.loadData(), 400);
  }

  render() {
    return html`${renderUsage({
      loading: this.loading,
      error: this.error,
      startDate: this.startDate,
      endDate: this.endDate,
      sessions: this.usageResult?.sessions ?? [],
      sessionsLimitReached: (this.usageResult?.sessions?.length ?? 0) >= 1000,
      totals: this.usageResult?.totals ?? null,
      aggregates: this.usageResult?.aggregates ?? null,
      costDaily: this.costSummary?.daily ?? [],
      selectedSessions: this.selectedSessions,
      selectedDays: this.selectedDays,
      selectedHours: this.selectedHours,
      chartMode: this.chartMode,
      dailyChartMode: this.dailyChartMode,
      timeSeriesMode: this.timeSeriesMode,
      timeSeriesBreakdownMode: this.timeSeriesBreakdownMode,
      timeSeries: this.timeSeries,
      timeSeriesLoading: this.timeSeriesLoading,
      sessionLogs: this.sessionLogs,
      sessionLogsLoading: this.sessionLogsLoading,
      sessionLogsExpanded: this.sessionLogsExpanded,
      logFilterRoles: this.logFilterRoles,
      logFilterTools: this.logFilterTools,
      logFilterHasTools: this.logFilterHasTools,
      logFilterQuery: this.logFilterQuery,
      query: this.query,
      queryDraft: this.queryDraft,
      sessionSort: this.sessionSort,
      sessionSortDir: this.sessionSortDir,
      recentSessions: this.recentSessions,
      sessionsTab: this.sessionsTab,
      visibleColumns: this.visibleColumns,
      timeZone: this.timeZone,
      contextExpanded: this.contextExpanded,
      headerPinned: this.headerPinned,
      onStartDateChange: (date) => {
        this.startDate = date;
        this.selectedDays = [];
        this.selectedHours = [];
        this.selectedSessions = [];
        this.debouncedLoadData();
      },
      onEndDateChange: (date) => {
        this.endDate = date;
        this.selectedDays = [];
        this.selectedHours = [];
        this.selectedSessions = [];
        this.debouncedLoadData();
      },
      onRefresh: () => void this.loadData(),
      onTimeZoneChange: (zone) => {
        this.timeZone = zone;
      },
      onToggleContextExpanded: () => {
        this.contextExpanded = !this.contextExpanded;
      },
      onToggleHeaderPinned: () => {
        this.headerPinned = !this.headerPinned;
      },
      onToggleSessionLogsExpanded: () => {
        this.sessionLogsExpanded = !this.sessionLogsExpanded;
      },
      onLogFilterRolesChange: (next) => {
        this.logFilterRoles = next;
      },
      onLogFilterToolsChange: (next) => {
        this.logFilterTools = next;
      },
      onLogFilterHasToolsChange: (next) => {
        this.logFilterHasTools = next;
      },
      onLogFilterQueryChange: (next) => {
        this.logFilterQuery = next;
      },
      onLogFilterClear: () => {
        this.logFilterRoles = [];
        this.logFilterTools = [];
        this.logFilterHasTools = false;
        this.logFilterQuery = "";
      },
      onSelectSession: (key, shiftKey) => {
        this.timeSeries = null;
        this.sessionLogs = null;
        this.recentSessions = [key, ...this.recentSessions.filter((e) => e !== key)].slice(0, 8);

        if (shiftKey && this.selectedSessions.length > 0) {
          const isTokenMode = this.chartMode === "tokens";
          const sortedSessions = [...(this.usageResult?.sessions ?? [])].toSorted((a, b) => {
            const valA = isTokenMode ? (a.usage?.totalTokens ?? 0) : (a.usage?.totalCost ?? 0);
            const valB = isTokenMode ? (b.usage?.totalTokens ?? 0) : (b.usage?.totalCost ?? 0);
            return valB - valA;
          });
          const allKeys = sortedSessions.map((s) => s.key);
          const lastSelected = this.selectedSessions[this.selectedSessions.length - 1];
          const lastIdx = allKeys.indexOf(lastSelected);
          const thisIdx = allKeys.indexOf(key);
          if (lastIdx !== -1 && thisIdx !== -1) {
            const [start, end] = lastIdx < thisIdx ? [lastIdx, thisIdx] : [thisIdx, lastIdx];
            const range = allKeys.slice(start, end + 1);
            this.selectedSessions = [...new Set([...this.selectedSessions, ...range])];
          }
        } else {
          if (this.selectedSessions.length === 1 && this.selectedSessions[0] === key) {
            this.selectedSessions = [];
          } else {
            this.selectedSessions = [key];
          }
        }

        if (this.selectedSessions.length === 1) {
          void this.loadTimeSeries(this.selectedSessions[0]);
          void this.loadLogs(this.selectedSessions[0]);
        }
      },
      onChartModeChange: (mode) => {
        this.chartMode = mode;
      },
      onDailyChartModeChange: (mode) => {
        this.dailyChartMode = mode;
      },
      onTimeSeriesModeChange: (mode) => {
        this.timeSeriesMode = mode;
      },
      onTimeSeriesBreakdownChange: (mode) => {
        this.timeSeriesBreakdownMode = mode;
      },
      onSelectDay: (day, shiftKey) => {
        if (shiftKey && this.selectedDays.length > 0) {
          const allDays = (this.costSummary?.daily ?? []).map((d) => d.date);
          const lastSelected = this.selectedDays[this.selectedDays.length - 1];
          const lastIdx = allDays.indexOf(lastSelected);
          const thisIdx = allDays.indexOf(day);
          if (lastIdx !== -1 && thisIdx !== -1) {
            const [start, end] = lastIdx < thisIdx ? [lastIdx, thisIdx] : [thisIdx, lastIdx];
            const range = allDays.slice(start, end + 1);
            this.selectedDays = [...new Set([...this.selectedDays, ...range])];
          }
        } else {
          if (this.selectedDays.includes(day)) {
            this.selectedDays = this.selectedDays.filter((d) => d !== day);
          } else {
            this.selectedDays = [day];
          }
        }
      },
      onSelectHour: (hour, shiftKey) => {
        if (shiftKey && this.selectedHours.length > 0) {
          const allHours = Array.from({ length: 24 }, (_, i) => i);
          const lastSelected = this.selectedHours[this.selectedHours.length - 1];
          const lastIdx = allHours.indexOf(lastSelected);
          const thisIdx = allHours.indexOf(hour);
          if (lastIdx !== -1 && thisIdx !== -1) {
            const [start, end] = lastIdx < thisIdx ? [lastIdx, thisIdx] : [thisIdx, lastIdx];
            const range = allHours.slice(start, end + 1);
            this.selectedHours = [...new Set([...this.selectedHours, ...range])];
          }
        } else {
          if (this.selectedHours.includes(hour)) {
            this.selectedHours = this.selectedHours.filter((h) => h !== hour);
          } else {
            this.selectedHours = [...this.selectedHours, hour];
          }
        }
      },
      onClearDays: () => {
        this.selectedDays = [];
      },
      onClearHours: () => {
        this.selectedHours = [];
      },
      onClearSessions: () => {
        this.selectedSessions = [];
        this.timeSeries = null;
        this.sessionLogs = null;
      },
      onClearFilters: () => {
        this.selectedDays = [];
        this.selectedHours = [];
        this.selectedSessions = [];
        this.timeSeries = null;
        this.sessionLogs = null;
      },
      onQueryDraftChange: (q) => {
        this.queryDraft = q;
        if (this.queryDebounceTimer) {
          clearTimeout(this.queryDebounceTimer);
        }
        this.queryDebounceTimer = window.setTimeout(() => {
          this.query = this.queryDraft;
          this.queryDebounceTimer = null;
        }, 250);
      },
      onApplyQuery: () => {
        if (this.queryDebounceTimer) {
          clearTimeout(this.queryDebounceTimer);
          this.queryDebounceTimer = null;
        }
        this.query = this.queryDraft;
      },
      onClearQuery: () => {
        if (this.queryDebounceTimer) {
          clearTimeout(this.queryDebounceTimer);
          this.queryDebounceTimer = null;
        }
        this.queryDraft = "";
        this.query = "";
      },
      onSessionSortChange: (sort) => {
        this.sessionSort = sort;
      },
      onSessionSortDirChange: (dir) => {
        this.sessionSortDir = dir;
      },
      onSessionsTabChange: (tab) => {
        this.sessionsTab = tab;
      },
      onToggleColumn: (column) => {
        if (this.visibleColumns.includes(column)) {
          this.visibleColumns = this.visibleColumns.filter((e) => e !== column);
        } else {
          this.visibleColumns = [...this.visibleColumns, column];
        }
      },
    })}`;
  }
}
