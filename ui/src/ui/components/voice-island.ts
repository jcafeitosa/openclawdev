import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway, $gatewayEvent } from "../../services/gateway.ts";
import { renderVoice, type VoiceProps } from "../views/voice.ts";

@customElement("voice-island")
export class VoiceIsland extends LitElement {
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private ttsEnabled = false;
  @state() private ttsProvider: string | null = null;
  @state() private ttsProviders: string[] = [];
  @state() private wakeWord: string | null = null;
  @state() private talkMode: string | null = null;

  private eventUnsub: (() => void) | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();
    this.eventUnsub = $gatewayEvent.subscribe((evt) => {
      if (!evt) {
        return;
      }
      if (evt.event === "voicewake.changed" || evt.event === "talk.mode") {
        void this.loadData();
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
      const [ttsResult, voicewakeResult, talkResult] = await Promise.all([
        gateway
          .call<{
            enabled: boolean;
            provider: string | null;
          }>("tts.status")
          .catch(() => ({ enabled: false, provider: null })),
        gateway.call<{ triggers: string[] }>("voicewake.get").catch(() => ({ triggers: [] })),
        gateway.call<{ mode?: string | null }>("talk.config").catch(() => ({ mode: null })),
      ]);
      this.ttsEnabled = ttsResult.enabled;
      this.ttsProvider = ttsResult.provider;

      // Load provider list
      const providersResult = await gateway
        .call<{ providers: Array<{ id: string }> }>("tts.providers")
        .catch(() => ({ providers: [] }));
      this.ttsProviders = providersResult.providers.map((p) => p.id);

      this.wakeWord = voicewakeResult.triggers?.[0] ?? null;
      this.talkMode = talkResult.mode ?? null;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  private async handleTtsToggle() {
    try {
      if (this.ttsEnabled) {
        await gateway.call("tts.disable");
      } else {
        await gateway.call("tts.enable");
      }
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  private async handleTtsProviderChange(provider: string) {
    try {
      await gateway.call("tts.setProvider", { provider });
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  private async handleWakeWordChange(word: string) {
    try {
      await gateway.call("voicewake.set", { triggers: word ? [word] : [] });
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  private async handleTalkModeToggle() {
    try {
      const nextMode = this.talkMode === "talk" ? "off" : "talk";
      await gateway.call("talk.mode", { mode: nextMode });
      await this.loadData();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  private async handleRefresh() {
    await this.loadData();
  }

  render() {
    const props: VoiceProps = {
      loading: this.loading,
      error: this.error,
      ttsEnabled: this.ttsEnabled,
      ttsProvider: this.ttsProvider,
      ttsProviders: this.ttsProviders,
      wakeWord: this.wakeWord,
      talkMode: this.talkMode,
      onRefresh: () => void this.handleRefresh(),
      onTtsToggle: () => void this.handleTtsToggle(),
      onTtsProviderChange: (p) => void this.handleTtsProviderChange(p),
      onWakeWordChange: (w) => void this.handleWakeWordChange(w),
      onTalkModeToggle: () => void this.handleTalkModeToggle(),
    };

    return html`${renderVoice(props)}`;
  }
}
