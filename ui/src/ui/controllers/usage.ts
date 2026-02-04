import type { GatewayBrowserClient } from "../gateway.ts";

export type UsageState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  usageLoading: boolean;
  usageError: string | null;
  usageStatus: unknown;
  usageCost: unknown;
  usagePeriod: "24h" | "7d" | "30d" | "all";
};

export async function loadUsage(state: UsageState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.usageLoading) {
    return;
  }
  state.usageLoading = true;
  state.usageError = null;
  try {
    const res = await state.client.request("usage.status", {
      period: state.usagePeriod,
    });
    state.usageStatus = res;
  } catch (err) {
    state.usageError = String(err);
  } finally {
    state.usageLoading = false;
  }
}

export async function loadUsageCost(state: UsageState) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    const res = await state.client.request("usage.cost", {
      period: state.usagePeriod,
    });
    state.usageCost = res;
  } catch {
    // Cost endpoint is optional; don't overwrite main error
  }
}
