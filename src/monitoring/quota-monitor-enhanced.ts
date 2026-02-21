/**
 * Enhanced Provider Quota Monitor v2
 * Real-time tracking with per-model granularity and intelligent fallback
 *
 * Features:
 * - Per-model quota tracking (not just provider-level)
 * - Automatic fallback when model quota exhausted
 * - Predictive exhaustion alerts (before hitting limit)
 * - Cost tracking per model
 * - Historical quota usage patterns
 */

interface ModelQuotaState {
  provider: string;
  model: string;
  quota: {
    dailyLimit: number;
    used: number;
    remaining: number;
    percentUsed: number;
    status: "healthy" | "warning" | "critical" | "exhausted";
  };
  health: {
    score: number; // 0-100
    lastUpdate: Date;
    trend: "stable" | "increasing" | "decreasing";
    estimatedExhaustionTime?: Date; // Predicted time when quota hits 100%
  };
  cost: {
    costPerToken: number;
    costToday: number;
    estimatedCostEOD?: number;
  };
  fallbackChain: string[]; // Models to try in order if exhausted
}

class EnhancedQuotaMonitor {
  private models: Map<string, ModelQuotaState> = new Map();
  private monitoringInterval: NodeJS.Timer | null = null;
  private quotaHistory: Map<string, number[]> = new Map(); // Historical tracking

  constructor() {
    this.initializeModels();
    this.startContinuousMonitoring();
  }

  private initializeModels() {
    const modelConfigs = [
      // Google models (openrouter)
      {
        provider: "google-antigravity",
        model: "gemini-3-flash",
        dailyLimit: 10000,
        costPerToken: 0.00001,
        fallbackChain: ["google-antigravity/gemini-pro", "anthropic/claude-haiku-4-5"],
      },
      {
        provider: "google-antigravity",
        model: "gemini-pro",
        dailyLimit: 5000,
        costPerToken: 0.000025,
        fallbackChain: ["google-antigravity/gemini-3-flash", "anthropic/claude-sonnet-4-5"],
      },
      // Anthropic models
      {
        provider: "anthropic",
        model: "claude-haiku-4-5",
        dailyLimit: 50000,
        costPerToken: 0.000008,
        fallbackChain: ["anthropic/claude-sonnet-4-5", "openrouter/qwen/qwen3-next-80b:free"],
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        dailyLimit: 50000,
        costPerToken: 0.00003,
        fallbackChain: ["anthropic/claude-opus-4-5", "openrouter/meta-llama/llama-3.3-70b:free"],
      },
      {
        provider: "anthropic",
        model: "claude-opus-4-5",
        dailyLimit: 30000,
        costPerToken: 0.00015,
        fallbackChain: ["anthropic/claude-sonnet-4-5"],
      },
      // OpenRouter free models
      {
        provider: "openrouter",
        model: "meta-llama/llama-3.3-70b:free",
        dailyLimit: 100000,
        costPerToken: 0,
        fallbackChain: ["openrouter/qwen/qwen3-next-80b:free"],
      },
      {
        provider: "openrouter",
        model: "qwen/qwen3-next-80b:free",
        dailyLimit: 100000,
        costPerToken: 0,
        fallbackChain: ["openrouter/stepfun/step-3.5-flash:free"],
      },
    ];

    for (const config of modelConfigs) {
      const key = `${config.provider}/${config.model}`;
      this.models.set(key, {
        provider: config.provider,
        model: config.model,
        quota: {
          dailyLimit: config.dailyLimit,
          used: 0,
          remaining: config.dailyLimit,
          percentUsed: 0,
          status: "healthy",
        },
        health: {
          score: 100,
          lastUpdate: new Date(),
          trend: "stable",
        },
        cost: {
          costPerToken: config.costPerToken,
          costToday: 0,
          estimatedCostEOD: 0,
        },
        fallbackChain: config.fallbackChain,
      });

      this.quotaHistory.set(key, []);
    }
  }

  private startContinuousMonitoring() {
    this.monitoringInterval = setInterval(() => {
      void this.checkAllModels();
    }, 30000); // Every 30 seconds (more frequent than 60s)

    console.log("[QuotaMonitorEnhanced] Continuous monitoring started (30s interval)");
  }

  private async checkAllModels() {
    const timestamp = new Date().toISOString();
    console.log(`[QuotaMonitorEnhanced] Health check: ${timestamp}`);

    for (const [key, model] of this.models) {
      try {
        const usage = await this.getModelUsage(model.provider, model.model);
        this.updateModelQuota(key, usage);

        // Check for approaching exhaustion
        if (model.quota.percentUsed > 90) {
          console.warn(`[QuotaMonitorEnhanced] ⚠️ ${key} at ${model.quota.percentUsed}% usage!`);
          console.warn(`[QuotaMonitorEnhanced] → Fallback: ${model.fallbackChain[0]}`);
        }

        // Log critical status
        if (model.quota.status === "critical" || model.quota.status === "exhausted") {
          console.error(`[QuotaMonitorEnhanced] 🔴 ${key} STATUS: ${model.quota.status}`);
        }
      } catch (error) {
        console.error(`[QuotaMonitorEnhanced] Failed to check ${key}:`, error);
      }
    }
  }

  private async getModelUsage(
    provider: string,
    model: string,
  ): Promise<{ used: number; remaining: number }> {
    // In production, this would call actual provider APIs
    // For now, returning mock data based on current state

    const key = `${provider}/${model}`;
    switch (key) {
      case "google-antigravity/gemini-3-flash":
        return { used: 9850, remaining: 150 };
      case "google-antigravity/gemini-pro":
        return { used: 2400, remaining: 2600 };
      case "anthropic/claude-haiku-4-5":
        return { used: 15000, remaining: 35000 };
      case "anthropic/claude-sonnet-4-5":
        return { used: 18000, remaining: 32000 };
      case "anthropic/claude-opus-4-5":
        return { used: 8000, remaining: 22000 };
      case "openrouter/meta-llama/llama-3.3-70b:free":
        return { used: 5000, remaining: 95000 };
      case "openrouter/qwen/qwen3-next-80b:free":
        return { used: 2000, remaining: 98000 };
      default:
        return { used: 0, remaining: 0 };
    }
  }

  private updateModelQuota(key: string, usage: { used: number; remaining: number }) {
    const model = this.models.get(key);
    if (!model) {
      return;
    }

    const prevUsed = model.quota.used;
    model.quota.used = usage.used;
    model.quota.remaining = usage.remaining;
    model.quota.percentUsed = Math.round((model.quota.used / model.quota.dailyLimit) * 100);

    // Determine status
    if (model.quota.percentUsed >= 100) {
      model.quota.status = "exhausted";
    } else if (model.quota.percentUsed >= 95) {
      model.quota.status = "critical";
    } else if (model.quota.percentUsed >= 80) {
      model.quota.status = "warning";
    } else {
      model.quota.status = "healthy";
    }

    // Calculate health score
    model.health.score = Math.max(
      0,
      Math.round((model.quota.remaining / model.quota.dailyLimit) * 100),
    );
    model.health.lastUpdate = new Date();

    // Detect trend
    if (model.quota.used > prevUsed) {
      model.health.trend = "increasing";
    } else if (model.quota.used < prevUsed) {
      model.health.trend = "decreasing";
    } else {
      model.health.trend = "stable";
    }

    // Estimate exhaustion time (if increasing)
    if (model.health.trend === "increasing" && prevUsed > 0) {
      const tokensPerSecond = (model.quota.used - prevUsed) / 30; // 30s interval
      if (tokensPerSecond > 0) {
        const secondsToExhaustion = model.quota.remaining / tokensPerSecond;
        model.health.estimatedExhaustionTime = new Date(Date.now() + secondsToExhaustion * 1000);
      }
    }

    // Update cost tracking
    model.cost.costToday = model.quota.used * model.cost.costPerToken;
    if (model.health.estimatedExhaustionTime) {
      const secondsUntilEOD = (new Date("2026-02-21").getTime() - Date.now()) / 1000;
      const estimatedAdditionalTokens =
        (model.quota.dailyLimit - model.quota.used) * (secondsUntilEOD / (86400 - secondsUntilEOD));
      model.cost.estimatedCostEOD =
        model.cost.costToday + estimatedAdditionalTokens * model.cost.costPerToken;
    }

    // Track history
    const history = this.quotaHistory.get(key) || [];
    history.push(model.quota.percentUsed);
    if (history.length > 288) {
      history.shift();
    } // Keep 24h at 5min intervals
    this.quotaHistory.set(key, history);
  }

  public selectBestModel(preferredModel: string, minHealthScore: number = 20): string {
    const preferred = this.models.get(preferredModel);

    // If preferred model is healthy, use it
    if (preferred && preferred.health.score >= minHealthScore) {
      return preferredModel;
    }

    // If not, find first fallback that's healthy
    if (preferred) {
      for (const fallback of preferred.fallbackChain) {
        const fallbackModel = this.models.get(fallback);
        if (fallbackModel && fallbackModel.health.score >= minHealthScore) {
          console.log(`[QuotaMonitorEnhanced] Fallback: ${preferredModel} → ${fallback}`);
          return fallback;
        }
      }
    }

    // Last resort: cheapest healthy model
    let cheapest: [string, ModelQuotaState] | null = null;
    for (const [key, model] of this.models) {
      if (model.health.score >= minHealthScore) {
        if (!cheapest || model.cost.costPerToken < cheapest[1].cost.costPerToken) {
          cheapest = [key, model];
        }
      }
    }

    if (cheapest) {
      console.log(
        `[QuotaMonitorEnhanced] Using cheapest: ${cheapest[0]} (${cheapest[1].cost.costPerToken}/token)`,
      );
      return cheapest[0];
    }

    // Absolute fallback
    console.error("[QuotaMonitorEnhanced] ⚠️ No healthy models available! Using haiku.");
    return "anthropic/claude-haiku-4-5";
  }

  public getModelStatus(model: string): ModelQuotaState | null {
    return this.models.get(model) || null;
  }

  public getAllStatus(): ModelQuotaState[] {
    return Array.from(this.models.values());
  }

  public generateDetailedReport(): string {
    const statuses = this.getAllStatus();
    const timestamp = new Date().toISOString();

    let report = "\n";
    report += "═══════════════════════════════════════════════════════════\n";
    report += "📊 ENHANCED PROVIDER QUOTA MONITOR - DETAILED REPORT\n";
    report += "═══════════════════════════════════════════════════════════\n";
    report += `Timestamp: ${timestamp}\n\n`;

    // Sort by status criticality
    const sorted = [...statuses].toSorted((a, b) => {
      const statusOrder: Record<string, number> = {
        exhausted: 0,
        critical: 1,
        warning: 2,
        healthy: 3,
      };
      return (statusOrder[a.quota.status] ?? 4) - (statusOrder[b.quota.status] ?? 4);
    });

    for (const model of sorted) {
      const statusEmoji = {
        healthy: "🟢",
        warning: "🟡",
        critical: "🔴",
        exhausted: "⛔",
      }[model.quota.status];

      report += `${statusEmoji} ${model.provider}/${model.model}\n`;
      report += `   Status: ${model.quota.status.toUpperCase()}\n`;
      report += `   Usage: ${model.quota.used} / ${model.quota.dailyLimit} (${model.quota.percentUsed}%)\n`;
      report += `   Health Score: ${model.health.score}/100 (trend: ${model.health.trend})\n`;
      report += `   Cost Today: $${model.cost.costToday.toFixed(2)}\n`;

      if (model.health.estimatedExhaustionTime) {
        const timeStr = model.health.estimatedExhaustionTime.toLocaleTimeString();
        report += `   ⚠️ Est. Exhaustion: ${timeStr} PST\n`;
      }

      if (model.quota.status !== "healthy") {
        report += `   💡 Fallback: ${model.fallbackChain[0]}\n`;
      }

      report += "\n";
    }

    // Cost summary
    report += "─────────────────────────────────────────────────────────────\n";
    report += "💰 COST SUMMARY\n";
    const totalCost = statuses.reduce((sum, m) => sum + m.cost.costToday, 0);
    const totalEstimate = statuses.reduce((sum, m) => sum + (m.cost.estimatedCostEOD || 0), 0);
    report += `Total Cost Today: $${totalCost.toFixed(2)}\n`;
    report += `Est. Cost EOD: $${totalEstimate.toFixed(2)}\n`;
    report += "\n";

    return report;
  }

  public stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log("[QuotaMonitorEnhanced] Monitoring stopped.");
    }
  }
}

// Singleton export
export const enhancedQuotaMonitor = new EnhancedQuotaMonitor();

// Periodic report generation (every 5 minutes)
setInterval(() => {
  console.log(enhancedQuotaMonitor.generateDetailedReport());
}, 300000);
