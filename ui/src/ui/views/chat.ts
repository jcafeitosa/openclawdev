import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../chat/grouped-render.ts";
import { normalizeMessage, normalizeRoleForGrouping } from "../chat/message-normalizer.ts";
import { icons } from "../icons.ts";
import { detectTextDirection } from "../text-direction.ts";
import type { SessionsListResult } from "../types.ts";
import type { ChatItem, MessageGroup } from "../types/chat-types.ts";
import type { ChatAttachment, ChatQueueItem } from "../ui-types.ts";
import { renderMarkdownSidebar } from "./markdown-sidebar.ts";
import "../components/resizable-divider.ts";

export type CompactionIndicatorStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};

export type HubChannel = {
  id: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  unreadCount?: number;
};

export type HubUser = {
  id: string;
  displayName: string;
  avatar?: string;
  type?: string;
  status?: "online" | "away" | "dnd" | "offline";
};

export type ChatProps = {
  sessionKey: string;
  onSessionKeyChange: (next: string) => void;
  thinkingLevel: string | null;
  showThinking: boolean;
  loading: boolean;
  sending: boolean;
  canAbort?: boolean;
  compactionStatus?: CompactionIndicatorStatus | null;
  messages: unknown[];
  toolMessages: unknown[];
  stream: string | null;
  streamStartedAt: number | null;
  assistantAvatarUrl?: string | null;
  draft: string;
  queue: ChatQueueItem[];
  connected: boolean;
  canSend: boolean;
  disabledReason: string | null;
  error: string | null;
  sessions: SessionsListResult | null;
  // Focus mode
  focusMode: boolean;
  // Sidebar state
  sidebarOpen?: boolean;
  sidebarContent?: string | null;
  sidebarError?: string | null;
  splitRatio?: number;
  // Contacts panel (channels + agents)
  hubChannels?: HubChannel[];
  hubUsers?: HubUser[];
  contactsOpen?: boolean;
  onToggleContacts?: () => void;
  assistantName: string;
  assistantAvatar: string | null;
  userAvatar?: string | null;
  // Image attachments
  attachments?: ChatAttachment[];
  onAttachmentsChange?: (attachments: ChatAttachment[]) => void;
  // Scroll control
  showNewMessages?: boolean;
  onScrollToBottom?: () => void;
  // Event handlers
  onRefresh: () => void;
  onToggleFocusMode: () => void;
  onToggleThinking?: () => void;
  onDraftChange: (next: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onQueueRemove: (id: string) => void;
  onNewSession: () => void;
  onResetSession?: () => void;
  onOpenSidebar?: (content: string) => void;
  onCloseSidebar?: () => void;
  onSplitRatioChange?: (ratio: number) => void;
  onChatScroll?: (event: Event) => void;
};

const COMPACTION_TOAST_DURATION_MS = 5000;

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function renderCompactionIndicator(status: CompactionIndicatorStatus | null | undefined) {
  if (!status) {
    return nothing;
  }

  // Show "compacting..." while active
  if (status.active) {
    return html`
      <div class="compaction-indicator compaction-indicator--active" role="status" aria-live="polite">
        ${icons.loader} Compacting context...
      </div>
    `;
  }

  // Show "compaction complete" briefly after completion
  if (status.completedAt) {
    const elapsed = Date.now() - status.completedAt;
    if (elapsed < COMPACTION_TOAST_DURATION_MS) {
      return html`
        <div class="compaction-indicator compaction-indicator--complete" role="status" aria-live="polite">
          ${icons.check} Context compacted
        </div>
      `;
    }
  }

  return nothing;
}

function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function handlePaste(e: ClipboardEvent, props: ChatProps) {
  const items = e.clipboardData?.items;
  if (!items || !props.onAttachmentsChange) {
    return;
  }

  const imageItems: DataTransferItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      imageItems.push(item);
    }
  }

  if (imageItems.length === 0) {
    return;
  }

  e.preventDefault();

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = reader.result as string;
      const newAttachment: ChatAttachment = {
        id: generateAttachmentId(),
        dataUrl,
        mimeType: file.type,
      };
      const current = props.attachments ?? [];
      props.onAttachmentsChange?.([...current, newAttachment]);
    });
    reader.readAsDataURL(file);
  }
}

function renderAttachmentPreview(props: ChatProps) {
  const attachments = props.attachments ?? [];
  if (attachments.length === 0) {
    return nothing;
  }

  return html`
    <div class="chat-attachments">
      ${attachments.map(
        (att) => html`
          <div class="chat-attachment">
            <img
              src=${att.dataUrl}
              alt="Attachment preview"
              class="chat-attachment__img"
            />
            <button
              class="chat-attachment__remove"
              type="button"
              aria-label="Remove attachment"
              @click=${() => {
                const next = (props.attachments ?? []).filter((a) => a.id !== att.id);
                props.onAttachmentsChange?.(next);
              }}
            >
              ${icons.x}
            </button>
          </div>
        `,
      )}
    </div>
  `;
}

function renderContactsPanel(props: ChatProps) {
  const channels = props.hubChannels ?? [];
  const users = props.hubUsers ?? [];
  const onlineUsers = users.filter((u) => u.status === "online" || u.status === "away");

  return html`
    <aside class="chat-contacts ${props.contactsOpen ? "is-open" : "is-closed"}" aria-label="Contacts">
      ${
        channels.length > 0
          ? html`
              <div class="chat-contacts__section">
                <div class="chat-contacts__section-title">Channels</div>
                <ul class="chat-contacts__list" role="list">
                  ${channels.map(
                    (ch) => html`
                      <li class="chat-contacts__item" role="listitem">
                        <span class="chat-contacts__channel-hash">#</span>
                        <span class="chat-contacts__name">${ch.name}</span>
                        ${
                          onlineUsers.length > 0
                            ? html`
                                <div class="avatar-stack" aria-label="${onlineUsers.length} agents">
                                  ${onlineUsers.slice(0, 4).map(
                                    (u) => html`
                                      <span class="avatar-stack__item" title=${u.displayName}>${u.avatar ?? "👤"}</span>
                                    `,
                                  )}
                                  ${
                                    onlineUsers.length > 4
                                      ? html`<span class="avatar-stack__item avatar-stack__item--more">+${onlineUsers.length - 4}</span>`
                                      : nothing
                                  }
                                </div>
                              `
                            : nothing
                        }
                        ${ch.unreadCount ? html`<span class="chat-contacts__badge">${ch.unreadCount}</span>` : nothing}
                      </li>
                    `,
                  )}
                </ul>
              </div>
            `
          : nothing
      }
      ${
        users.length > 0
          ? html`
              <div class="chat-contacts__divider"></div>
              <div class="chat-contacts__section">
                <div class="chat-contacts__section-title">
                  <span>Agents</span>
                  <span class="chat-contacts__count">${onlineUsers.length} online</span>
                </div>
                <ul class="chat-contacts__list" role="list">
                  ${users.map(
                    (u) => html`
                      <li class="chat-contacts__item" role="listitem">
                        <span class="chat-contacts__avatar" aria-hidden="true">${u.avatar ?? "👤"}</span>
                        <span class="chat-contacts__name">${u.displayName}</span>
                        <span
                          class="chat-contacts__status-dot chat-contacts__status-dot--${u.status ?? "offline"}"
                          aria-label=${u.status ?? "offline"}
                        ></span>
                      </li>
                    `,
                  )}
                </ul>
              </div>
            `
          : nothing
      }
    </aside>
  `;
}

export function renderChat(props: ChatProps) {
  const canCompose = props.connected;
  const isBusy = props.sending || props.stream !== null;
  const canAbort = Boolean(props.canAbort && props.onAbort);
  const activeSession = props.sessions?.sessions?.find((row) => row.key === props.sessionKey);
  const reasoningLevel = activeSession?.reasoningLevel ?? "off";
  const showReasoning = props.showThinking && reasoningLevel !== "off";
  const assistantIdentity = {
    name: props.assistantName,
    avatar: props.assistantAvatar ?? props.assistantAvatarUrl ?? null,
  };

  const hasAttachments = (props.attachments?.length ?? 0) > 0;
  const composePlaceholder = props.connected
    ? hasAttachments
      ? "Add a message or paste more images..."
      : "Message (↩ send, Shift+↩ newline, ⌘N new session)"
    : "Connect to the gateway to start chatting…";

  const messageCount = Array.isArray(props.messages) ? props.messages.length : 0;
  const totalTokens = activeSession?.totalTokens ?? 0;
  const contextTokens = activeSession?.contextTokens ?? 0;
  const tokenPercent =
    contextTokens > 0 ? Math.min(100, Math.round((totalTokens / contextTokens) * 100)) : 0;
  const sessionLabel =
    activeSession?.label ||
    activeSession?.displayName ||
    (props.sessionKey === "main" ? "Main" : props.sessionKey);

  const splitRatio = props.splitRatio ?? 0.6;
  const sidebarOpen = Boolean(props.sidebarOpen && props.onCloseSidebar);
  const showSkeleton = props.loading && messageCount === 0;

  const thread = html`
    <div
      class="chat-thread"
      role="log"
      aria-live="polite"
      @scroll=${props.onChatScroll}
    >
      ${
        showSkeleton
          ? html`
              <div class="chat-skeleton" aria-label="Loading messages…" aria-busy="true">
                <div class="chat-skeleton__row chat-skeleton__row--ai">
                  <div class="chat-skeleton__avatar"></div>
                  <div class="chat-skeleton__bubbles">
                    <div class="bubble-skeleton" style="width: 60%"></div>
                    <div class="bubble-skeleton" style="width: 80%"></div>
                  </div>
                </div>
                <div class="chat-skeleton__row chat-skeleton__row--user">
                  <div class="chat-skeleton__bubbles">
                    <div class="bubble-skeleton" style="width: 45%"></div>
                  </div>
                  <div class="chat-skeleton__avatar"></div>
                </div>
                <div class="chat-skeleton__row chat-skeleton__row--ai">
                  <div class="chat-skeleton__avatar"></div>
                  <div class="chat-skeleton__bubbles">
                    <div class="bubble-skeleton" style="width: 75%"></div>
                    <div class="bubble-skeleton" style="width: 55%"></div>
                    <div class="bubble-skeleton" style="width: 40%"></div>
                  </div>
                </div>
              </div>
            `
          : nothing
      }
      ${repeat(
        buildChatItems(props),
        (item) => item.key,
        (item) => {
          if (item.kind === "divider") {
            return html`
              <div class="chat-divider" role="separator" data-ts=${String(item.timestamp)}>
                <span class="chat-divider__line"></span>
                <span class="chat-divider__label">${item.label}</span>
                <span class="chat-divider__line"></span>
              </div>
            `;
          }

          if (item.kind === "reading-indicator") {
            return renderReadingIndicatorGroup(assistantIdentity);
          }

          if (item.kind === "stream") {
            return renderStreamingGroup(
              item.text,
              item.startedAt,
              props.onOpenSidebar,
              assistantIdentity,
            );
          }

          if (item.kind === "group") {
            return renderMessageGroup(item, {
              onOpenSidebar: props.onOpenSidebar,
              showReasoning,
              assistantName: props.assistantName,
              assistantAvatar: assistantIdentity.avatar,
              userAvatar: props.userAvatar ?? null,
            });
          }

          return nothing;
        },
      )}
    </div>
  `;

  // Empty state when no messages
  const hasMessages = messageCount > 0 || props.stream !== null;
  const emptyState =
    !hasMessages && !props.loading
      ? html`
      <div class="chat-empty-state">
        <div class="chat-empty-state__icon">
          ${icons.messageSquare}
        </div>
        <h2 class="chat-empty-state__title">Start a conversation</h2>
        <p class="chat-empty-state__desc">
          Send a message to begin collaborating with your AI assistant.
          Use <kbd>⌘N</kbd> to create a new session or switch sessions from the header.
        </p>
        <div class="chat-empty-state__shortcuts">
          <div class="chat-empty-state__shortcut">
            <kbd>↩</kbd>
            <span>Send message</span>
          </div>
          <div class="chat-empty-state__shortcut">
            <kbd>⇧↩</kbd>
            <span>New line</span>
          </div>
          <div class="chat-empty-state__shortcut">
            <kbd>⌘N</kbd>
            <span>New session</span>
          </div>
        </div>
      </div>
    `
      : nothing;

  return html`
    <section class="card chat">
      ${props.disabledReason ? html`<div class="callout">${props.disabledReason}</div>` : nothing}

      ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}

      <!-- Session Header Bar -->
      <div class="chat-session-bar">
        <div class="chat-session-bar__left">
          <div class="chat-session-bar__info">
            <span class="chat-session-bar__label" title=${props.sessionKey}>${sessionLabel}</span>
            ${
              messageCount > 0
                ? html`<span class="chat-session-bar__badge">${messageCount} ${messageCount === 1 ? "msg" : "msgs"}</span>`
                : nothing
            }
            ${
              totalTokens > 0
                ? html`
                <span class="chat-session-bar__tokens" title="${totalTokens.toLocaleString()} / ${contextTokens.toLocaleString()} tokens">
                  <span class="chat-session-bar__token-bar">
                    <span class="chat-session-bar__token-fill ${tokenPercent > 80 ? "warn" : ""}" style="width: ${tokenPercent}%"></span>
                  </span>
                  ${tokenPercent}%
                </span>
              `
                : nothing
            }
          </div>
        </div>
        <div class="chat-session-bar__right">
          <div class="chat-toolbar">
            ${
              props.onToggleThinking
                ? html`
                <button
                  class="chat-toolbar__btn ${props.showThinking ? "chat-toolbar__btn--active" : ""}"
                  type="button"
                  @click=${props.onToggleThinking}
                  aria-label=${props.showThinking ? "Hide tool details" : "Show tool details"}
                  title=${props.showThinking ? "Hide tool details" : "Show tool details"}
                >
                  ${icons.code}
                </button>
              `
                : nothing
            }
            ${
              props.onToggleContacts
                ? html`
                    <button
                      class="chat-toolbar__btn ${props.contactsOpen ? "chat-toolbar__btn--active" : ""}"
                      type="button"
                      @click=${props.onToggleContacts}
                      aria-label=${props.contactsOpen ? "Hide contacts" : "Show contacts"}
                      title=${props.contactsOpen ? "Hide contacts" : "Show contacts"}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </button>
                  `
                : nothing
            }
            <button
              class="chat-toolbar__btn"
              type="button"
              @click=${props.onRefresh}
              aria-label="Refresh chat"
              title="Refresh chat"
            >
              ${icons.loader}
            </button>
            <button
              class="chat-toolbar__btn"
              type="button"
              @click=${() => {
                if (confirm("Reset this session? The conversation will be cleared.")) {
                  props.onResetSession?.();
                }
              }}
              aria-label="Reset session"
              title="Reset session"
              ?disabled=${!props.connected}
            >
              ${icons.x}
            </button>
            <button
              class="chat-toolbar__btn chat-toolbar__btn--accent"
              type="button"
              @click=${props.onNewSession}
              aria-label="New session (⌘N)"
              title="New session (⌘N)"
              ?disabled=${!props.connected}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          ${
            props.focusMode
              ? html`
              <button
                class="chat-toolbar__btn"
                type="button"
                @click=${props.onToggleFocusMode}
                aria-label="Exit focus mode"
                title="Exit focus mode"
              >
                ${icons.x}
              </button>
            `
              : nothing
          }
        </div>
      </div>

      <div class="chat-body">
        ${renderContactsPanel(props)}
        <div class="chat-center">
      <div
        class="chat-split-container ${sidebarOpen ? "chat-split-container--open" : ""}"
      >
        <div
          class="chat-main"
          style="flex: ${sidebarOpen ? `0 0 ${splitRatio * 100}%` : "1 1 100%"}"
        >
          ${emptyState}
          ${thread}
        </div>

        ${
          sidebarOpen
            ? html`
              <resizable-divider
                .splitRatio=${splitRatio}
                @resize=${(e: CustomEvent) => props.onSplitRatioChange?.(e.detail.splitRatio)}
              ></resizable-divider>
              <div class="chat-sidebar">
                ${renderMarkdownSidebar({
                  content: props.sidebarContent ?? null,
                  error: props.sidebarError ?? null,
                  onClose: props.onCloseSidebar!,
                  onViewRawText: () => {
                    if (!props.sidebarContent || !props.onOpenSidebar) {
                      return;
                    }
                    props.onOpenSidebar(`\`\`\`\n${props.sidebarContent}\n\`\`\``);
                  },
                })}
              </div>
            `
            : nothing
        }
      </div>

      ${
        props.queue.length
          ? html`
            <div class="chat-queue" role="status" aria-live="polite">
              <div class="chat-queue__title">Queued (${props.queue.length})</div>
              <div class="chat-queue__list">
                ${props.queue.map(
                  (item) => html`
                    <div class="chat-queue__item">
                      <div class="chat-queue__text">
                        ${
                          item.text ||
                          (item.attachments?.length ? `Image (${item.attachments.length})` : "")
                        }
                      </div>
                      <button
                        class="btn chat-queue__remove"
                        type="button"
                        aria-label="Remove queued message"
                        @click=${() => props.onQueueRemove(item.id)}
                      >
                        ${icons.x}
                      </button>
                    </div>
                  `,
                )}
              </div>
            </div>
          `
          : nothing
      }

      ${renderCompactionIndicator(props.compactionStatus)}

      ${
        props.showNewMessages
          ? html`
            <button
              class="btn chat-new-messages"
              type="button"
              @click=${props.onScrollToBottom}
            >
              New messages ${icons.arrowDown}
            </button>
          `
          : nothing
      }

      <div class="chat-compose">
        <div class="chat-compose__bar">
          ${renderAttachmentPreview(props)}
          <textarea
            class="chat-compose__input"
            ${ref((el) => el && adjustTextareaHeight(el as HTMLTextAreaElement))}
            .value=${props.draft}
            dir=${detectTextDirection(props.draft)}
            ?disabled=${!props.connected}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key !== "Enter") {
                return;
              }
              if (e.isComposing || e.keyCode === 229) {
                return;
              }
              if (e.shiftKey) {
                return;
              }
              if (!props.connected) {
                return;
              }
              e.preventDefault();
              if (canCompose) {
                props.onSend();
              }
            }}
            @input=${(e: Event) => {
              const target = e.target as HTMLTextAreaElement;
              adjustTextareaHeight(target);
              props.onDraftChange(target.value);
            }}
            @paste=${(e: ClipboardEvent) => handlePaste(e, props)}
            placeholder=${composePlaceholder}
          ></textarea>
          <div class="chat-compose__controls">
            <div class="chat-compose__controls-left">
              <button
                class="compose-pill compose-pill--icon"
                type="button"
                ?disabled=${!props.connected}
                aria-label="Add attachment"
                title="Add attachment"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button
                class="compose-pill"
                type="button"
                ?disabled=${!props.connected}
                aria-label="Ask permissions"
                title="Ask permissions"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8a6 6 0 0 0 6 6h2a8 8 0 0 0 8-8v-1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"/></svg>
                <span class="compose-pill__label">Ask permissions</span>
                ${icons.chevronDown}
              </button>
            </div>
            <div class="chat-compose__controls-right">
              <button
                class="compose-pill compose-pill--model"
                type="button"
                aria-label="Select model"
                title="Select model"
              >
                <span class="compose-pill__label">${
                  activeSession?.model
                    ? activeSession.model
                        .replace(/^claude-/, "")
                        .replace(/-\d{8}$/, "")
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : props.thinkingLevel
                      ? "Opus 4.6"
                      : "Sonnet 4.5"
                }</span>
                ${icons.chevronDown}
              </button>
              ${
                isBusy && canAbort
                  ? html`
                  <button
                    class="compose-send compose-send--stop"
                    type="button"
                    aria-label="Stop"
                    title="Stop"
                    @click=${props.onAbort}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width:16px;height:16px"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                  </button>
                `
                  : nothing
              }
              <button
                class="compose-send compose-send--primary"
                type="button"
                ?disabled=${!props.canSend}
                aria-label=${isBusy ? "Queue message" : "Send message"}
                title=${isBusy ? "Queue" : "Send"}
                @click=${props.onSend}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    </section>
  `;
}

const CHAT_HISTORY_RENDER_LIMIT = 200;
const GROUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function groupMessages(items: ChatItem[]): Array<ChatItem | MessageGroup> {
  const result: Array<ChatItem | MessageGroup> = [];
  let currentGroup: MessageGroup | null = null;
  let lastGroupTimestamp = 0;

  for (const item of items) {
    if (item.kind !== "message") {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(item);
      continue;
    }

    const normalized = normalizeMessage(item.message);
    const role = normalizeRoleForGrouping(normalized.role);
    const timestamp = normalized.timestamp || Date.now();

    if (
      !currentGroup ||
      currentGroup.role !== role ||
      timestamp - lastGroupTimestamp > GROUP_WINDOW_MS
    ) {
      if (currentGroup) {
        result.push(currentGroup);
      }
      currentGroup = {
        kind: "group",
        key: `group:${role}:${item.key}`,
        role,
        messages: [{ message: item.message, key: item.key }],
        timestamp,
        isStreaming: false,
      };
    } else {
      currentGroup.messages.push({ message: item.message, key: item.key });
    }
    lastGroupTimestamp = timestamp;
  }

  if (currentGroup) {
    result.push(currentGroup);
  }
  return result;
}

function buildChatItems(props: ChatProps): Array<ChatItem | MessageGroup> {
  const items: ChatItem[] = [];
  const history = Array.isArray(props.messages) ? props.messages : [];
  const tools = Array.isArray(props.toolMessages) ? props.toolMessages : [];
  const historyStart = Math.max(0, history.length - CHAT_HISTORY_RENDER_LIMIT);
  if (historyStart > 0) {
    items.push({
      kind: "message",
      key: "chat:history:notice",
      message: {
        role: "system",
        content: `Showing last ${CHAT_HISTORY_RENDER_LIMIT} messages (${historyStart} hidden).`,
        timestamp: Date.now(),
      },
    });
  }
  let lastDateLabel = "";
  for (let i = historyStart; i < history.length; i++) {
    const msg = history[i];
    const normalized = normalizeMessage(msg);
    const raw = msg as Record<string, unknown>;
    const marker = raw.__openclaw as Record<string, unknown> | undefined;
    if (marker && marker.kind === "compaction") {
      items.push({
        kind: "divider",
        key:
          typeof marker.id === "string"
            ? `divider:compaction:${marker.id}`
            : `divider:compaction:${normalized.timestamp}:${i}`,
        label: "Compaction",
        timestamp: normalized.timestamp ?? Date.now(),
      });
      lastDateLabel = ""; // reset so next message re-emits date header
      continue;
    }

    if (!props.showThinking && normalized.role.toLowerCase() === "toolresult") {
      continue;
    }

    // Insert date separator when day changes between messages
    const msgTs = normalized.timestamp;
    if (msgTs) {
      const dateLabel = formatDateLabel(msgTs);
      if (dateLabel !== lastDateLabel) {
        items.push({
          kind: "divider",
          key: `divider:date:${dateLabel.replace(/\s/g, "-")}:${i}`,
          label: dateLabel,
          timestamp: msgTs,
        });
        lastDateLabel = dateLabel;
      }
    }

    items.push({
      kind: "message",
      key: messageKey(msg, i),
      message: msg,
    });
  }
  if (props.showThinking) {
    for (let i = 0; i < tools.length; i++) {
      items.push({
        kind: "message",
        key: messageKey(tools[i], i + history.length),
        message: tools[i],
      });
    }
  }

  if (props.stream !== null) {
    const key = `stream:${props.sessionKey}:${props.streamStartedAt ?? "live"}`;
    if (props.stream.trim().length > 0) {
      items.push({
        kind: "stream",
        key,
        text: props.stream,
        startedAt: props.streamStartedAt ?? Date.now(),
      });
    } else {
      items.push({ kind: "reading-indicator", key });
    }
  }

  return groupMessages(items);
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, unknown>;
  const toolCallId = typeof m.toolCallId === "string" ? m.toolCallId : "";
  if (toolCallId) {
    return `tool:${toolCallId}`;
  }
  const id = typeof m.id === "string" ? m.id : "";
  if (id) {
    return `msg:${id}`;
  }
  const messageId = typeof m.messageId === "string" ? m.messageId : "";
  if (messageId) {
    return `msg:${messageId}`;
  }
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : null;
  const role = typeof m.role === "string" ? m.role : "unknown";
  if (timestamp != null) {
    return `msg:${role}:${timestamp}:${index}`;
  }
  return `msg:${role}:${index}`;
}
