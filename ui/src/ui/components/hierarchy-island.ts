import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway, $gatewayEvent } from "../../services/gateway.ts";
import type { AgentHierarchyResult } from "../types.ts";
import { renderAgentsHierarchy, type AgentsHierarchyProps } from "../views/agents-hierarchy.ts";

@customElement("hierarchy-island")
export class HierarchyIsland extends LitElement {
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private data: AgentHierarchyResult | null = null;
  @state() private focusAgentId: string | undefined = undefined;

  private eventUnsub: (() => void) | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();

    // Subscribe to real-time hierarchy events from the gateway WebSocket
    this.eventUnsub = $gatewayEvent.subscribe((evt) => {
      if (!evt || evt.event !== "hierarchy") {
        return;
      }
      const payload = evt.payload as { snapshot?: AgentHierarchyResult } | undefined;
      if (payload?.snapshot) {
        this.data = payload.snapshot;
      }
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
      const result = await gateway.call<AgentHierarchyResult>("agents.hierarchy");
      this.data = result;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  private async handleRefresh() {
    await this.loadData();
  }

  private handleNodeClick(sessionKey: string) {
    const basePath =
      (typeof globalThis.window !== "undefined"
        ? (window as { __OPENCLAW_CONTROL_UI_BASE_PATH__?: string })
            .__OPENCLAW_CONTROL_UI_BASE_PATH__
        : undefined) || "";
    window.location.href = `${basePath}/chat?session=${encodeURIComponent(sessionKey)}`;
  }

  render() {
    const props: AgentsHierarchyProps = {
      loading: this.loading,
      error: this.error,
      data: this.data,
      focusAgentId: this.focusAgentId,
      onRefresh: () => void this.handleRefresh(),
      onNodeClick: (sk) => this.handleNodeClick(sk),
    };

    return html`${renderAgentsHierarchy(props)}`;
  }
}
