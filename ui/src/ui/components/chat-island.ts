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
  $chatQueue,
  $chatAttachments,
  $sidebarOpen,
  $sidebarContent,
  $sidebarError,
  $splitRatio,
} from "../../stores/chat.ts";
import { renderChat, type ChatProps } from "../views/chat.ts";

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

  @state() private showNewMessages = false;
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

      if (evt.event === "chat.stream") {
        const payload = evt.payload as { text?: string; startedAt?: number } | undefined;
        if (payload?.text !== undefined) {
          $chatStream.set(payload.text);
        }
        if (payload?.startedAt) {
          $chatStreamStartedAt.set(payload.startedAt);
        }
        // Auto-scroll while streaming if we were at the bottom
        if (this.isAtBottom) {
          this.scrollToBottom();
        }
      }
      if (evt.event === "chat.done") {
        $chatStream.set(null);
        $chatStreamStartedAt.set(null);
        $chatSending.set(false);
        void this.refreshChat().then(() => {
          if (this.isAtBottom) {
            this.scrollToBottom();
          }
        });
      }
    });
    void this.refreshChat().then(() => {
      this.scrollToBottom();
    });

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

  private scrollToBottom() {
    const thread = this.querySelector(".chat-thread");
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
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
      assistantName: "OpenClaw",
      assistantAvatar: null,
      attachments: [...this.chatAttachments.value],
      onAttachmentsChange: (attachments) => {
        $chatAttachments.set(attachments);
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

    $chatSending.set(true);
    // Optimistic at-bottom during send
    this.isAtBottom = true;
    this.scrollToBottom();

    try {
      const sessionKey = this.activeSession.value || "main";
      await gateway.call("chat.send", {
        sessionKey,
        message,
        attachments: [...this.chatAttachments.value],
      });
      // Clear input on successful send — $chatSending will be reset by
      // the "chat.done" event when the agent finishes its response.
      $chatMessage.set("");
      $chatAttachments.set([]);
    } catch (err) {
      // On send failure, reset sending state immediately so the user can
      // retry. The "chat.done" event won't fire since the RPC failed.
      console.error("Failed to send message:", err);
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
    } catch (err) {
      console.error("Failed to reset session:", err);
    }
  }
}
