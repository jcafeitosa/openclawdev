import { StoreController } from "@nanostores/lit";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway, $gatewayEvent } from "../../services/gateway.ts";
import { $connected } from "../../stores/app.ts";
import type { HealthChannelEntry, HealthAgentEntry, HealthData } from "../controllers/health.ts";
import { renderHealth, type HealthProps } from "../views/health.ts";

/**
 * Raw shape returned by the `health` RPC.  `channels` is a Record keyed by
 * channel id (e.g. "whatsapp", "telegram"), NOT an array.  We convert it to
 * the `HealthChannelEntry[]` that `HealthData` expects.
 */
type RawHealthResponse = {
  ok?: boolean;
  ts?: number;
  durationMs?: number;
  heartbeatSeconds?: number;
  defaultAgentId?: string;
  channelOrder?: string[];
  channelLabels?: Record<string, string>;
  channels?: Record<string, { configured?: boolean; linked?: boolean }>;
  agents?: Array<{
    agentId: string;
    name?: string;
    isDefault: boolean;
    heartbeat?: { alive?: boolean; ageMs?: number | null };
    sessions?: { count?: number };
  }>;
  sessions?: { path?: string; count?: number };
  system?: HealthData["system"];
};

function parseHealthResponse(raw: RawHealthResponse): HealthData {
  const channelOrder = raw.channelOrder ?? [];
  const channelLabels = raw.channelLabels ?? {};
  const rawChannels = raw.channels ?? {};

  const channels: HealthChannelEntry[] = channelOrder.map((id) => {
    const ch = rawChannels[id];
    return {
      id,
      label: channelLabels[id] ?? id,
      configured: ch?.configured ?? false,
      linked: ch?.linked ?? false,
    };
  });

  const agents: HealthAgentEntry[] = (raw.agents ?? []).map((a) => ({
    agentId: a.agentId,
    name: a.name,
    isDefault: a.isDefault,
    heartbeatAlive: a.heartbeat?.alive ?? false,
    heartbeatAgeMs: a.heartbeat?.ageMs ?? null,
    sessionCount: a.sessions?.count ?? 0,
  }));

  return {
    ok: raw.ok ?? false,
    ts: raw.ts ?? Date.now(),
    durationMs: raw.durationMs ?? 0,
    heartbeatSeconds: raw.heartbeatSeconds ?? 0,
    defaultAgentId: raw.defaultAgentId ?? "",
    sessionCount: raw.sessions?.count ?? 0,
    sessionPath: raw.sessions?.path ?? "",
    channels,
    agents,
    system: raw.system ?? null,
  };
}

@customElement("health-island")
export class HealthIsland extends LitElement {
  private connectedCtrl = new StoreController(this, $connected);

  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private data: HealthData | null = null;
  @state() private channels: Array<{ id: string; status: string }> = [];
  @state() private debugHealth: unknown = null;

  private eventUnsub: (() => void) | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();
    this.eventUnsub = $gatewayEvent.subscribe((evt) => {
      if (!evt || evt.event !== "health") {
        return;
      }
      void this.loadData();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.eventUnsub?.();
    this.eventUnsub = null;
  }

  private async loadData() {
    this.loading = true;
    this.error = null;
    try {
      const raw = await gateway.call<RawHealthResponse>("health").catch(() => null);
      if (raw) {
        const parsed = parseHealthResponse(raw);
        this.data = parsed;
        this.channels = parsed.channels.map((ch) => ({
          id: ch.label,
          status: ch.linked ? "connected" : ch.configured ? "warning" : "disconnected",
        }));
        this.debugHealth = raw;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  private async handleRefresh() {
    await this.loadData();
  }

  render() {
    const props: HealthProps = {
      loading: this.loading,
      error: this.error,
      data: this.data,
      channels: this.channels,
      connected: this.connectedCtrl.value,
      debugHealth: this.debugHealth,
      onRefresh: () => void this.handleRefresh(),
    };

    return html`${renderHealth(props)}`;
  }
}
