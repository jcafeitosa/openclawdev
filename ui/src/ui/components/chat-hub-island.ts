/**
 * Chat Hub Island - Clean chat interface for 111 agents
 * Inspired by Minimax Agent UI - minimal, modern, focused
 */

import { StoreController } from "@nanostores/lit";
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  $activeChannel,
  $channels,
  $hubUsers,
  $activeChannelMessages,
  $activeChannelTyping,
  initChatHub,
  destroyChatHub,
  sendMessage,
  loadMessages,
  loadChannels,
  loadUsers,
  sendTyping,
  setActiveChannel,
  addReaction,
  type ChatUser,
  type ChatMessage,
  type ChatChannel,
} from "../../services/chat-hub.ts";

// Simple markdown parser
function parseMarkdown(text: string): string {
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
    .replace(/\n/g, "<br>");
}

@customElement("chat-hub-island")
export class ChatHubIsland extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private activeChannelCtrl = new StoreController(this, $activeChannel);
  private channelsCtrl = new StoreController(this, $channels);
  private usersCtrl = new StoreController(this, $hubUsers);
  private messagesCtrl = new StoreController(this, $activeChannelMessages);
  private typingCtrl = new StoreController(this, $activeChannelTyping);

  @state() private inputValue = "";
  @state() private sidebarCollapsed = false;
  @query(".messages") messagesEl!: HTMLElement;
  @query(".hub-input-field") inputEl!: HTMLTextAreaElement;

  connectedCallback() {
    super.connectedCallback();
    initChatHub();
    void this.loadInitialData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    destroyChatHub();
  }

  private async loadInitialData() {
    await Promise.all([loadChannels(), loadUsers()]);
    const channels = this.channelsCtrl.value;
    if (channels.length > 0 && !this.activeChannelCtrl.value) {
      void this.selectChannel(channels[0]);
    }
  }

  private async selectChannel(channel: ChatChannel) {
    setActiveChannel(channel.id);
    await loadMessages(channel.id);
    this.scrollToBottom();
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      if (this.messagesEl) {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }
    });
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 150) + "px";
    void sendTyping(this.activeChannelCtrl.value, true);
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void this.send();
    }
  }

  private async send() {
    const text = this.inputValue.trim();
    if (!text) {
      return;
    }

    const channel = this.activeChannelCtrl.value;
    if (!channel) {
      return;
    }

    this.inputValue = "";
    if (this.inputEl) {
      this.inputEl.style.height = "auto";
    }

    await sendMessage(channel, text);
    this.scrollToBottom();
  }

  private toggleReaction(msg: ChatMessage, emoji: string) {
    void addReaction(msg.id, emoji);
  }

  private getUser(userId: string): ChatUser | undefined {
    return this.usersCtrl.value.find((u) => u.id === userId);
  }

  private formatTime(ts: number | Date): string {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  render() {
    return html`
      <div class="hub">
        ${this.renderSidebar()}
        ${this.renderMain()}
      </div>
    `;
  }

  private renderSidebar(): TemplateResult {
    const channels = this.channelsCtrl.value;
    const active = this.activeChannelCtrl.value;

    return html`
      <aside class="hub-sidebar ${this.sidebarCollapsed ? "collapsed" : ""}">
        <div class="hub-sidebar-header">
          <span class="hub-title">Agent Hub</span>
          <button class="hub-collapse-btn" @click=${() => (this.sidebarCollapsed = !this.sidebarCollapsed)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
        </div>
        
        <div class="hub-channels">
          ${repeat(
            channels,
            (c) => c.id,
            (c) => html`
            <button 
              class="hub-channel ${active === c.id ? "active" : ""}"
              @click=${() => this.selectChannel(c)}
            >
              <span class="hub-channel-icon">${c.isPrivate ? "🔒" : "#"}</span>
              <span class="hub-channel-name">${c.name}</span>
            </button>
          `,
          )}
        </div>
        
        <div class="hub-sidebar-footer">
          <div class="hub-user-count">
            <span class="hub-dot online"></span>
            <span>${this.usersCtrl.value.filter((u) => u.status === "online").length} online</span>
          </div>
        </div>
      </aside>
    `;
  }

  private renderMain(): TemplateResult {
    const channelId = this.activeChannelCtrl.value;
    const channel = this.channelsCtrl.value.find((c) => c.id === channelId);
    const messages = this.messagesCtrl.value;
    const typing = this.typingCtrl.value;

    if (!channel) {
      return html`
        <main class="hub-main">
          <div class="hub-empty">
            <div class="hub-empty-icon">💬</div>
            <div class="hub-empty-text">Select a channel to start</div>
          </div>
        </main>
      `;
    }

    return html`
      <main class="hub-main">
        <header class="hub-header">
          <div class="hub-header-info">
            <span class="hub-header-icon">${channel.isPrivate ? "🔒" : "#"}</span>
            <span class="hub-header-name">${channel.name}</span>
          </div>
          ${channel.topic ? html`<span class="hub-header-topic">${channel.topic}</span>` : nothing}
        </header>

        <div class="messages">
          ${
            messages.length === 0
              ? html`
            <div class="hub-welcome">
              <div class="hub-welcome-icon">👋</div>
              <div class="hub-welcome-title">Welcome to #${channel.name}</div>
              <div class="hub-welcome-desc">This is the start of the conversation.</div>
            </div>
          `
              : nothing
          }
          
          ${repeat(
            messages,
            (m) => m.id,
            (m) => this.renderMessage(m),
          )}
        </div>

        <div class="hub-input-area">
          ${
            typing.length > 0
              ? html`
            <div class="hub-typing">
              <span class="hub-typing-dots"><span></span><span></span><span></span></span>
              <span>${typing.map((t) => t.displayName).join(", ")} typing...</span>
            </div>
          `
              : nothing
          }
          
          <div class="hub-input-box">
            <div class="hub-input-actions">
              <button class="hub-input-action" title="Attach file">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <button class="hub-input-action" title="Add emoji">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
                </svg>
              </button>
              <button class="hub-input-action" title="Mention">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/>
                </svg>
              </button>
            </div>
            
            <textarea
              class="hub-input-field"
              placeholder="Send a message..."
              .value=${this.inputValue}
              @input=${(e: Event) => this.handleInput(e)}
              @keydown=${(e: KeyboardEvent) => this.handleKeydown(e)}
              rows="1"
            ></textarea>
            
            <button class="hub-send-btn ${this.inputValue.trim() ? "active" : ""}" @click=${() => {
              void this.send();
            }} ?disabled=${!this.inputValue.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </main>
    `;
  }

  private renderMessage(msg: ChatMessage): TemplateResult {
    const user = msg.author;
    const quickReactions = ["👍", "❤️", "😂", "🎉", "🚀"];

    return html`
      <div class="hub-message">
        <div class="hub-message-avatar">${user?.avatar || "🤖"}</div>
        <div class="hub-message-content">
          <div class="hub-message-header">
            <span class="hub-message-author">${user?.displayName || "Unknown"}</span>
            <span class="hub-message-time">${this.formatTime(msg.createdAt)}</span>
          </div>
          <div class="hub-message-body">${unsafeHTML(parseMarkdown(msg.content))}</div>
          
          ${
            msg.reactions && msg.reactions.length > 0
              ? html`
            <div class="hub-message-reactions">
              ${msg.reactions.map(
                (r) => html`
                <button class="hub-reaction" @click=${() => this.toggleReaction(msg, r.emoji)}>
                  <span>${r.emoji}</span>
                  <span class="hub-reaction-count">${r.count}</span>
                </button>
              `,
              )}
            </div>
          `
              : nothing
          }
        </div>
        
        <div class="hub-message-actions">
          ${quickReactions.map(
            (emoji) => html`
            <button class="hub-action-btn" @click=${() => this.toggleReaction(msg, emoji)}>${emoji}</button>
          `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-hub-island": ChatHubIsland;
  }
}
