import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway } from "../../services/gateway.ts";
import type { TwitterData, TwitterRelationships } from "../controllers/twitter.ts";
import { renderTwitter, type TwitterViewProps } from "../views/twitter.ts";

@customElement("twitter-island")
export class TwitterIsland extends LitElement {
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private data: TwitterData | null = null;
  @state() private relationships: TwitterRelationships | null = null;
  @state() private relationshipsLoading = false;
  @state() private activeTab: "dashboard" | "relationships" = "dashboard";

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();
  }

  private async loadData() {
    this.loading = true;
    this.error = null;
    try {
      const result = await gateway.call<TwitterData>("twitter.data");
      this.data = result;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.data = null;
    } finally {
      this.loading = false;
    }
  }

  private async loadRelationships() {
    this.relationshipsLoading = true;
    try {
      const result = await gateway.call<TwitterRelationships>("twitter.relationships", {
        limit: 80,
      });
      this.relationships = result;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.relationshipsLoading = false;
    }
  }

  private handleTabChange(tab: "dashboard" | "relationships") {
    this.activeTab = tab;
    if (tab === "relationships" && !this.relationships && !this.relationshipsLoading) {
      void this.loadRelationships();
    }
  }

  private handleRefresh() {
    if (this.activeTab === "dashboard") {
      void this.loadData();
    } else {
      void this.loadRelationships();
    }
  }

  render() {
    const props: TwitterViewProps = {
      loading: this.loading,
      error: this.error,
      data: this.data,
      relationships: this.relationships,
      relationshipsLoading: this.relationshipsLoading,
      activeTab: this.activeTab,
      onRefresh: () => this.handleRefresh(),
      onTabChange: (tab) => this.handleTabChange(tab),
      onLoadRelationships: () => void this.loadRelationships(),
    };

    return html`${renderTwitter(props)}`;
  }
}
