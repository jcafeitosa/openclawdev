/**
 * Chat Island - Interactive chat component for Astro.
 * Wraps the existing renderChat view with gateway service calls.
 */

import { StoreController } from "@nanostores/lit";
import { LitElement, html, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gateway, $gatewayEvent } from "../../services/gateway.ts";
import { $connected, $activeSession, $sessions } from "../../stores/app.ts";
import {
  $chatLoading,
  $chatSending,
  $chatMessage,
  $chatMessages,
  $chatToolMessages,
  $chatStream,
  $chatStreamStartedAt,
  $chatRunId,
  $chatQueue,
  $chatAttachments,
  $sidebarOpen,
  $sidebarContent,
  $sidebarError,
  $splitRatio,
} from "../../stores/chat.ts";
import { resolveInjectedAssistantIdentity } from "../assistant-identity.ts";
import { extractText } from "../chat/message-extract.ts";
import { initMermaidRenderer, initCodeCopyButtons } from "../markdown.ts";
import type { SessionsListResult } from "../types.ts";
import { generateUUID } from "../uuid.ts";
import { renderChat, type ChatProps, type HubChannel, type HubUser } from "../views/chat.ts";

@customElement("chat-island")
export class ChatIsland extends LitElement {
  private chatLoading = new StoreController(this, $chatLoading);
  private chatSending = new StoreController(this, $chatSending);
  private chatMessage = new StoreController(this, $chatMessage);
  private chatMessages = new StoreController(this, $chatMessages);
  private chatToolMessages = new StoreController(this, $chatToolMessages);
  private chatStream = new StoreController(this, $chatStream);
  private chatStreamStartedAt = new StoreController(this, $chatStreamStartedAt);
  private chatQueue = new StoreController(this, $chatQueue);
  private chatAttachments = new StoreController(this, $chatAttachments);
  private sidebarOpen = new StoreController(this, $sidebarOpen);
  private sidebarContent = new StoreController(this, $sidebarContent);
  private sidebarError = new StoreController(this, $sidebarError);
  private splitRatio = new StoreController(this, $splitRatio);
  private connectedCtrl = new StoreController(this, $connected);
  private activeSession = new StoreController(this, $activeSession);
  private sessions = new StoreController(this, $sessions);

  @state() private focusMode = false;
  @state() private showThinking = false;
  @state() private contactsOpen = false;
  @state() private hubChannels: HubChannel[] = [];
  @state() private hubUsers: HubUser[] = [];

  @state() private showNewMessages = false;
  @state() private availableModels: Array<{ id: string; name: string; provider: string }> = [];
  @state() private modelDropdownOpen = false;
  @state() private modelFilter = "";
  private isAtBottom = true;

  private gatewayEventUnsub: (() => void) | null = null;
  /** Guard to discard stale refreshChat() responses after session switch. */
  private refreshGeneration = 0;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    initMermaidRenderer();
    initCodeCopyButtons();
    // Listen for chat events from gateway — filter by active session to prevent
    // cross-session message leakage (Issue #5).
    this.gatewayEventUnsub = $gatewayEvent.subscribe((evt) => {
      if (!evt) {
        return;
      }
      // Only process events for the currently active session
      const evtSession = (evt.payload as { sessionKey?: string } | undefined)?.sessionKey;
      const currentSession = this.activeSession.value || "main";
      if (evtSession && evtSession !== currentSession) {
        return;
      }

      if (evt.event === "chat") {
        const payload = evt.payload as
          | {
              runId?: string;
              sessionKey?: string;
              state?: string;
              message?: unknown;
              errorMessage?: string;
            }
          | undefined;

        if (!payload) {
          return;
        }

        // Final from a different run (e.g. sub-agent announce): refresh history.
        const currentRunId = $chatRunId.get();
        if (payload.runId && currentRunId && payload.runId !== currentRunId) {
          if (payload.state === "final") {
            void this.refreshChat().then(() => {
              if (this.isAtBottom) {
                this.scrollToBottom(true);
              }
            });
          }
          return;
        }

        if (payload.state === "delta") {
          const next = extractText(payload.message);
          if (typeof next === "string") {
            $chatStream.set(next);
          }
          if (this.isAtBottom) {
            this.scrollToBottom();
          }
        } else if (payload.state === "final") {
          $chatStream.set(null);
          $chatStreamStartedAt.set(null);
          $chatRunId.set(null);
          $chatSending.set(false);
          void this.refreshChat().then(() => {
            if (this.isAtBottom) {
              this.scrollToBottom(true);
            }
          });
        } else if (payload.state === "aborted" || payload.state === "error") {
          $chatStream.set(null);
          $chatStreamStartedAt.set(null);
          $chatRunId.set(null);
          $chatSending.set(false);
          // Refresh history so any error message from the agent appears in chat
          void this.refreshChat().then(() => {
            if (this.isAtBottom) {
              this.scrollToBottom(true);
            }
          });
        }
      }
    });
    void this.refreshChat().then(() => {
      this.scrollToBottom();
    });
    void this.refreshSessions();
    void this.refreshHub();
    void this.loadAvailableModels();

    // Keyboard shortcuts
    this.keyboardHandler = (e: KeyboardEvent) => {
      // Cmd+N or Ctrl+N: new session
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        void this.createNewSession();
      }
    };
    document.addEventListener("keydown", this.keyboardHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.gatewayEventUnsub?.();
    this.gatewayEventUnsub = null;
    if (this.keyboardHandler) {
      document.removeEventListener("keydown", this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  protected updated() {
    if (this.isAtBottom) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(smooth = false) {
    const thread = this.querySelector(".chat-thread");
    if (thread) {
      if (smooth) {
        thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
      } else {
        thread.scrollTop = thread.scrollHeight;
      }
      this.showNewMessages = false;
    }
  }

  private handleChatScroll(e: Event) {
    const target = e.target as HTMLElement;
    const threshold = 50;
    const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    this.isAtBottom = atBottom;
    this.showNewMessages = !atBottom;
  }

  private async abortRun() {
    try {
      const sessionKey = this.activeSession.value || "main";
      await gateway.call("chat.abort", { sessionKey });
    } catch (err) {
      console.error("Failed to abort:", err);
    }
  }

  render(): TemplateResult {
    const assistantIdentity = resolveInjectedAssistantIdentity();
    const props: ChatProps = {
      sessionKey: this.activeSession.value || "main",
      onSessionKeyChange: (next: string) => {
        $activeSession.set(next);
        // Clear stale stream state when switching sessions
        $chatStream.set(null);
        $chatStreamStartedAt.set(null);
        void this.refreshChat();
      },
      thinkingLevel: null,
      showThinking: this.showThinking,
      loading: this.chatLoading.value,
      sending: this.chatSending.value,
      canAbort: true,
      compactionStatus: null,
      messages: [...this.chatMessages.value],
      toolMessages: [...this.chatToolMessages.value],
      stream: this.chatStream.value,
      streamStartedAt: this.chatStreamStartedAt.value,
      assistantAvatarUrl: null,
      draft: this.chatMessage.value,
      queue: [...this.chatQueue.value],
      connected: this.connectedCtrl.value,
      canSend:
        this.connectedCtrl.value &&
        !this.chatSending.value &&
        (this.chatMessage.value.trim().length > 0 || this.chatAttachments.value.length > 0),
      disabledReason: this.connectedCtrl.value ? null : "Connect to gateway to chat",
      error: null,
      sessions: this.sessions.value as ChatProps["sessions"],
      focusMode: this.focusMode,
      sidebarOpen: this.sidebarOpen.value,
      sidebarContent: this.sidebarContent.value,
      sidebarError: this.sidebarError.value,
      splitRatio: this.splitRatio.value,
      assistantName: assistantIdentity.name,
      assistantAvatar: assistantIdentity.avatar,
      userAvatar: null,
      attachments: [...this.chatAttachments.value],
      onAttachmentsChange: (attachments) => {
        $chatAttachments.set(attachments);
      },
      hubChannels: this.hubChannels,
      hubUsers: this.hubUsers,
      contactsOpen: this.contactsOpen,
      onToggleContacts: () => {
        this.contactsOpen = !this.contactsOpen;
      },
      onRefresh: () => void this.refreshChat(),
      onToggleFocusMode: () => {
        this.focusMode = !this.focusMode;
      },
      onToggleThinking: () => {
        this.showThinking = !this.showThinking;
      },
      onDraftChange: (next: string) => {
        $chatMessage.set(next);
      },
      onSend: () => void this.sendMessage(),
      onQueueRemove: (id: string) => {
        $chatQueue.set(this.chatQueue.value.filter((item) => item.id !== id));
      },
      onNewSession: () => void this.createNewSession(),
      onResetSession: () => void this.resetSession(),
      onOpenSidebar: (content: string) => {
        $sidebarContent.set(content);
        $sidebarOpen.set(true);
      },
      onCloseSidebar: () => {
        $sidebarOpen.set(false);
      },
      onSplitRatioChange: (ratio: number) => {
        $splitRatio.set(ratio);
      },
      onChatScroll: (e: Event) => this.handleChatScroll(e),
      onScrollToBottom: () => this.scrollToBottom(),
      onAbort: () => void this.abortRun(),
      showNewMessages: this.showNewMessages,
      availableModels: this.availableModels,
      modelDropdownOpen: this.modelDropdownOpen,
      modelFilter: this.modelFilter,
      onModelSelect: (modelId: string) => void this.selectModel(modelId),
      onToggleModelDropdown: () => {
        this.modelDropdownOpen = !this.modelDropdownOpen;
        if (!this.modelDropdownOpen) {
          this.modelFilter = "";
        }
      },
      onModelFilterChange: (value: string) => {
        this.modelFilter = value;
      },
    };

    return html`${renderChat(props)}`;
  }

  private async refreshChat() {
    // Increment generation to discard stale responses when user switches
    // sessions rapidly (Issue #2 — race condition).
    const gen = ++this.refreshGeneration;
    $chatLoading.set(true);
    try {
      const sessionKey = this.activeSession.value || "main";
      const result = await gateway.call<{
        messages?: unknown[];
        toolMessages?: unknown[];
      }>("chat.history", { sessionKey });
      // Only apply result if this is still the latest refresh request
      if (gen !== this.refreshGeneration) {
        return;
      }
      $chatMessages.set(result.messages ?? []);
      $chatToolMessages.set(result.toolMessages ?? []);

      // Auto-scroll on initial load or session switch
      setTimeout(() => this.scrollToBottom(), 100);
    } catch (err) {
      if (gen !== this.refreshGeneration) {
        return;
      }
      // Silently handle — gateway may not be ready yet
      if (this.connectedCtrl.value) {
        console.warn("Failed to load chat:", err);
      }
    } finally {
      if (gen === this.refreshGeneration) {
        $chatLoading.set(false);
      }
    }
  }

  private async sendMessage() {
    const message = this.chatMessage.value.trim();
    if (!message && this.chatAttachments.value.length === 0) {
      return;
    }

    const runId = generateUUID();
    const now = Date.now();
    $chatRunId.set(runId);
    $chatStream.set("");
    $chatStreamStartedAt.set(now);
    $chatSending.set(true);

    // Optimistic user message — appears immediately while the AI responds
    const attachments = [...this.chatAttachments.value];
    const contentBlocks: Array<{ type: string; text?: string; source?: unknown }> = [];
    if (message) {
      contentBlocks.push({ type: "text", text: message });
    }
    for (const att of attachments) {
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: att.mimeType, data: att.dataUrl },
      });
    }
    $chatMessages.set([
      ...$chatMessages.get(),
      { role: "user", content: contentBlocks, timestamp: now },
    ]);

    // Optimistic at-bottom during send
    this.isAtBottom = true;
    this.scrollToBottom();

    try {
      const sessionKey = this.activeSession.value || "main";
      const sendResult = await gateway.call<{ runId?: string; sessionKey?: string }>("chat.send", {
        sessionKey,
        message,
        deliver: false,
        idempotencyKey: runId,
        attachments,
      });
      // Server returns the canonical sessionKey (e.g. "agent:default:main").
      // Update $activeSession so event filtering matches broadcast events.
      if (sendResult.sessionKey && sendResult.sessionKey !== $activeSession.get()) {
        $activeSession.set(sendResult.sessionKey);
      }
      // Clear input on successful send — $chatSending will be reset by
      // the "chat" event (state: "final") when the agent finishes its response.
      $chatMessage.set("");
      $chatAttachments.set([]);
      this.scrollToBottom(true);
    } catch (err) {
      // On send failure, reset sending state immediately so the user can
      // retry. The "chat" final event won't fire since the RPC failed.
      console.error("Failed to send message:", err);
      $chatRunId.set(null);
      $chatStream.set(null);
      $chatStreamStartedAt.set(null);
      $chatSending.set(false);
    }
  }

  private async createNewSession() {
    try {
      const result = await gateway.call<{ sessionKey?: string }>("sessions.create");
      if (result.sessionKey) {
        $activeSession.set(result.sessionKey);
        $chatMessages.set([]);
        $chatToolMessages.set([]);
        this.isAtBottom = true;
        this.scrollToBottom();
        void this.refreshSessions();
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }

  private async resetSession() {
    try {
      const sessionKey = this.activeSession.value || "main";
      await gateway.call("sessions.reset", { key: sessionKey });
      // Clear UI state
      $chatMessages.set([]);
      $chatToolMessages.set([]);
      $chatStream.set(null);
      $chatStreamStartedAt.set(null);
      $chatSending.set(false);
      this.isAtBottom = true;
      this.scrollToBottom();
      void this.refreshSessions();
    } catch (err) {
      console.error("Failed to reset session:", err);
    }
  }

  private async refreshSessions() {
    try {
      const result = await gateway.call<SessionsListResult>("sessions.list");
      $sessions.set(result);
    } catch {
      // Non-critical — silently ignore
    }
  }

  private async loadAvailableModels() {
    try {
      const result = await gateway.call<{
        models?: Array<{ id: string; name?: string; provider?: string }>;
      }>("models.list");
      this.availableModels = (result.models ?? []).map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        provider: m.provider ?? "",
      }));
    } catch {
      // Non-critical — models selector will be empty
    }
  }

  private async selectModel(modelId: string) {
    this.modelDropdownOpen = false;
    this.modelFilter = "";
    const sessionKey = this.activeSession.value || "main";
    try {
      await gateway.call("sessions.patch", { key: sessionKey, model: modelId });
      void this.refreshSessions();
    } catch (err) {
      console.error("Failed to set model:", err);
    }
  }

  private async refreshHub() {
    try {
      const [channelsResult, usersResult] = await Promise.all([
        gateway.call<{ channels?: HubChannel[] }>("hub.channels.list"),
        gateway.call<{ users?: HubUser[] }>("hub.users.list"),
      ]);
      this.hubChannels = channelsResult.channels ?? [];
      this.hubUsers = usersResult.users ?? [];
    } catch (err) {
      // Non-critical — hub may not be available
      console.warn("[chat-island] refreshHub failed:", err);
    }
  }
}
