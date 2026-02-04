import type { GatewayBrowserClient } from "../gateway.ts";

export type HealthState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  healthLoading: boolean;
  healthError: string | null;
  healthData: unknown;
  healthChannels: Array<{ id: string; status: string }>;
};

export async function loadHealth(state: HealthState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.healthLoading) {
    return;
  }
  state.healthLoading = true;
  state.healthError = null;
  try {
    const res = await state.client.request("health", {});
    state.healthData = res;
  } catch (err) {
    state.healthError = String(err);
  } finally {
    state.healthLoading = false;
  }
}

export async function loadHealthChannels(state: HealthState) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    const res = await state.client.request<{ channels?: Array<{ id: string; status: string }> }>(
      "channels.status",
      {},
    );
    const channels = res?.channels;
    if (Array.isArray(channels)) {
      state.healthChannels = channels.map((ch) => ({
        id: typeof ch.id === "string" ? ch.id : String(ch.id ?? ""),
        status: typeof ch.status === "string" ? ch.status : "unknown",
      }));
    }
  } catch {
    // Non-critical; channel health is supplementary
  }
}
