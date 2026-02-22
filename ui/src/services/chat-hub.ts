/**
 * Chat Hub Service - Real-time messaging for agents
 *
 * EPIC-003: Internal Chat Hub
 */

import { atom, computed } from "nanostores";
import { gateway, $gatewayEvent } from "./gateway.ts";

// =============================================================================
// TYPES
// =============================================================================

export interface ChatUser {
  id: string;
  displayName: string;
  avatar: string;
  type: "agent" | "external";
  status: "online" | "away" | "dnd" | "offline";
  customStatus?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  author: ChatUser;
  content: string;
  messageType: "text" | "thought" | "action" | "result";
  parentId?: string;
  reactions: Array<{ emoji: string; count: number; users: string[] }>;
  createdAt: number;
  editedAt?: number;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  isPrivate: boolean;
  unreadCount: number;
  lastMessage?: ChatMessage;
}

export interface TypingIndicator {
  channelId: string;
  userId: string;
  displayName: string;
  timestamp: number;
}

// =============================================================================
// STORES
// =============================================================================

// Active channel
export const $activeChannel = atom<string>("general");

// Channels list
export const $channels = atom<ChatChannel[]>([
  {
    id: "general",
    name: "general",
    description: "Conversas gerais",
    isPrivate: false,
    unreadCount: 0,
  },
  {
    id: "engineering",
    name: "engineering",
    description: "Discussões técnicas",
    isPrivate: false,
    unreadCount: 0,
  },
  {
    id: "architecture",
    name: "architecture",
    description: "Decisões de design",
    isPrivate: false,
    unreadCount: 0,
  },
  { id: "random", name: "random", description: "Off-topic", isPrivate: false, unreadCount: 0 },
]);

// Users/agents
export const $hubUsers = atom<ChatUser[]>([]);

// Messages per channel
export const $hubMessages = atom<Map<string, ChatMessage[]>>(new Map());

// Typing indicators
export const $typingIndicators = atom<TypingIndicator[]>([]);

// Connection status
export const $hubConnected = atom<boolean>(false);

// Computed: messages for active channel
export const $activeChannelMessages = computed(
  [$activeChannel, $hubMessages],
  (channel, messages) => messages.get(channel) || [],
);

// Computed: online users
export const $onlineUsers = computed([$hubUsers], (users) =>
  users.filter((u) => u.status !== "offline"),
);

// Computed: typing users for active channel
export const $activeChannelTyping = computed(
  [$activeChannel, $typingIndicators],
  (channel, indicators) => indicators.filter((t) => t.channelId === channel),
);

// =============================================================================
// EVENT HANDLERS
// =============================================================================

// Subscribe to gateway events for chat hub
let unsubscribe: (() => void) | null = null;

export function initChatHub(): void {
  if (unsubscribe) {
    return;
  } // Already initialized

  unsubscribe = $gatewayEvent.subscribe((evt) => {
    if (!evt) {
      return;
    }

    switch (evt.event) {
      case "hub.message.new":
        handleNewMessage(evt.payload as ChatMessage);
        break;
      case "hub.message.edit":
        handleEditMessage(evt.payload as ChatMessage);
        break;
      case "hub.message.delete":
        handleDeleteMessage(evt.payload as { channelId: string; messageId: string });
        break;
      case "hub.reaction.add":
      case "hub.reaction.remove":
        handleReaction(
          evt.payload as {
            messageId: string;
            emoji: string;
            userId: string;
            action: "add" | "remove";
          },
        );
        break;
      case "hub.presence.update":
        handlePresenceUpdate(
          evt.payload as { userId: string; status: string; customStatus?: string },
        );
        break;
      case "hub.typing.start":
        handleTypingStart(evt.payload as TypingIndicator);
        break;
      case "hub.typing.stop":
        handleTypingStop(evt.payload as { channelId: string; userId: string });
        break;
      case "hub.channel.update":
        handleChannelUpdate(evt.payload as ChatChannel);
        break;
    }
  });

  $hubConnected.set(true);
}

export function destroyChatHub(): void {
  unsubscribe?.();
  unsubscribe = null;
  $hubConnected.set(false);
}

function handleNewMessage(message: ChatMessage): void {
  const messages = $hubMessages.get();
  const channelMessages = messages.get(message.channelId) || [];

  // Avoid duplicates
  if (channelMessages.some((m) => m.id === message.id)) {
    return;
  }

  const updated = new Map(messages);
  updated.set(message.channelId, [...channelMessages, message]);
  $hubMessages.set(updated);

  // Update unread count if not active channel
  if (message.channelId !== $activeChannel.get()) {
    const channels = $channels.get();
    const updatedChannels = channels.map((ch) =>
      ch.id === message.channelId
        ? { ...ch, unreadCount: ch.unreadCount + 1, lastMessage: message }
        : ch,
    );
    $channels.set(updatedChannels);
  }
}

function handleEditMessage(message: ChatMessage): void {
  const messages = $hubMessages.get();
  const channelMessages = messages.get(message.channelId) || [];

  const updated = new Map(messages);
  updated.set(
    message.channelId,
    channelMessages.map((m) => (m.id === message.id ? message : m)),
  );
  $hubMessages.set(updated);
}

function handleDeleteMessage(payload: { channelId: string; messageId: string }): void {
  const messages = $hubMessages.get();
  const channelMessages = messages.get(payload.channelId) || [];

  const updated = new Map(messages);
  updated.set(
    payload.channelId,
    channelMessages.filter((m) => m.id !== payload.messageId),
  );
  $hubMessages.set(updated);
}

function handleReaction(payload: {
  messageId: string;
  emoji: string;
  userId: string;
  action: "add" | "remove";
}): void {
  const messages = $hubMessages.get();
  const updated = new Map(messages);

  for (const [channelId, channelMessages] of updated) {
    const messageIndex = channelMessages.findIndex((m) => m.id === payload.messageId);
    if (messageIndex >= 0) {
      const message = { ...channelMessages[messageIndex] };
      const reactions = [...message.reactions];

      const reactionIndex = reactions.findIndex((r) => r.emoji === payload.emoji);

      if (payload.action === "add") {
        if (reactionIndex >= 0) {
          reactions[reactionIndex] = {
            ...reactions[reactionIndex],
            count: reactions[reactionIndex].count + 1,
            users: [...reactions[reactionIndex].users, payload.userId],
          };
        } else {
          reactions.push({ emoji: payload.emoji, count: 1, users: [payload.userId] });
        }
      } else {
        if (reactionIndex >= 0) {
          const newCount = reactions[reactionIndex].count - 1;
          if (newCount <= 0) {
            reactions.splice(reactionIndex, 1);
          } else {
            reactions[reactionIndex] = {
              ...reactions[reactionIndex],
              count: newCount,
              users: reactions[reactionIndex].users.filter((u) => u !== payload.userId),
            };
          }
        }
      }

      message.reactions = reactions;
      const newChannelMessages = [...channelMessages];
      newChannelMessages[messageIndex] = message;
      updated.set(channelId, newChannelMessages);
      break;
    }
  }

  $hubMessages.set(updated);
}

function handlePresenceUpdate(payload: {
  userId: string;
  status: string;
  customStatus?: string;
}): void {
  const users = $hubUsers.get();
  const updatedUsers = users.map((u) =>
    u.id === payload.userId
      ? { ...u, status: payload.status as ChatUser["status"], customStatus: payload.customStatus }
      : u,
  );
  $hubUsers.set(updatedUsers);
}

function handleTypingStart(indicator: TypingIndicator): void {
  const indicators = $typingIndicators.get();

  // Remove existing indicator for this user/channel
  const filtered = indicators.filter(
    (t) => !(t.channelId === indicator.channelId && t.userId === indicator.userId),
  );

  $typingIndicators.set([...filtered, indicator]);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    handleTypingStop({ channelId: indicator.channelId, userId: indicator.userId });
  }, 10000);
}

function handleTypingStop(payload: { channelId: string; userId: string }): void {
  const indicators = $typingIndicators.get();
  $typingIndicators.set(
    indicators.filter((t) => !(t.channelId === payload.channelId && t.userId === payload.userId)),
  );
}

function handleChannelUpdate(channel: ChatChannel): void {
  const channels = $channels.get();
  const index = channels.findIndex((ch) => ch.id === channel.id);

  if (index >= 0) {
    const updated = [...channels];
    updated[index] = { ...updated[index], ...channel };
    $channels.set(updated);
  } else {
    $channels.set([...channels, channel]);
  }
}

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Send a message to a channel
 */
export async function sendMessage(
  channelId: string,
  content: string,
  messageType: ChatMessage["messageType"] = "text",
  parentId?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await gateway.call("hub.message.send", {
      channelId,
      content,
      messageType,
      parentId,
    });
    return result as { success: boolean; messageId?: string; error?: string };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Load messages for a channel
 */
export async function loadMessages(
  channelId: string,
  limit = 50,
  before?: string,
): Promise<ChatMessage[]> {
  try {
    const result = await gateway.call("hub.messages.list", {
      channelId,
      limit,
      before,
    });

    const messages = (result as { messages: ChatMessage[] }).messages || [];

    // Update store
    const current = $hubMessages.get();
    const updated = new Map(current);
    updated.set(channelId, messages);
    $hubMessages.set(updated);

    return messages;
  } catch (error) {
    console.error("Failed to load messages:", error);
    return [];
  }
}

/**
 * Load channels list
 */
export async function loadChannels(): Promise<ChatChannel[]> {
  try {
    const result = await gateway.call("hub.channels.list", {});
    const channels = (result as { channels: ChatChannel[] }).channels || [];
    $channels.set(channels);
    return channels;
  } catch (error) {
    console.error("Failed to load channels:", error);
    return [];
  }
}

/**
 * Load users/agents list
 */
export async function loadUsers(): Promise<ChatUser[]> {
  try {
    const result = await gateway.call("hub.users.list", {});
    const users = (result as { users: ChatUser[] }).users || [];
    $hubUsers.set(users);
    return users;
  } catch (error) {
    console.error("Failed to load users:", error);
    return [];
  }
}

/**
 * Add reaction to a message
 */
export async function addReaction(messageId: string, emoji: string): Promise<boolean> {
  try {
    await gateway.call("hub.reaction.add", { messageId, emoji });
    return true;
  } catch (error) {
    console.error("Failed to add reaction:", error);
    return false;
  }
}

/**
 * Remove reaction from a message
 */
export async function removeReaction(messageId: string, emoji: string): Promise<boolean> {
  try {
    await gateway.call("hub.reaction.remove", { messageId, emoji });
    return true;
  } catch (error) {
    console.error("Failed to remove reaction:", error);
    return false;
  }
}

/**
 * Send typing indicator
 */
export async function sendTyping(channelId: string, typing: boolean): Promise<void> {
  try {
    await gateway.call(typing ? "hub.typing.start" : "hub.typing.stop", { channelId });
  } catch {
    // Ignore typing errors
  }
}

/**
 * Update presence status
 */
export async function updatePresence(
  status: "online" | "away" | "dnd",
  customStatus?: string,
): Promise<void> {
  try {
    await gateway.call("hub.presence.update", { status, customStatus });
  } catch (error) {
    console.error("Failed to update presence:", error);
  }
}

/**
 * Mark channel as read
 */
export function markChannelAsRead(channelId: string): void {
  const channels = $channels.get();
  const updated = channels.map((ch) => (ch.id === channelId ? { ...ch, unreadCount: 0 } : ch));
  $channels.set(updated);
}

/**
 * Set active channel
 */
export function setActiveChannel(channelId: string): void {
  $activeChannel.set(channelId);
  markChannelAsRead(channelId);
  void loadMessages(channelId);
}
