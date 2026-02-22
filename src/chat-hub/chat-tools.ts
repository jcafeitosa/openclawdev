/**
 * EPIC-003: Internal Chat Hub - Chat Tools for Agents
 *
 * Tools que agents usam para enviar mensagens no hub.
 * Cada mensagem aparece com a identidade do agent.
 */

import { agentIdentities } from "./seed.js";
import { chatHub } from "./websocket-server.js";

// =============================================================================
// TYPES
// =============================================================================

export interface ChatSendParams {
  channel: string; // "#general" ou "general"
  content: string; // Mensagem
  type?: "text" | "thought" | "action" | "result";
  thread?: string; // Reply to message id
  mentions?: string[]; // ["@tech-lead", "@qa-lead"]
}

export interface ChatReadParams {
  channel: string;
  limit?: number; // default 50
  before?: string; // cursor pagination
  since?: number; // timestamp
}

export interface ChatReactParams {
  messageId: string;
  emoji: string; // "👍", "🔥", etc.
}

export interface ChatPresenceParams {
  status: "online" | "away" | "dnd";
  customStatus?: string; // "Revisando PRs"
}

export interface ChatTypingParams {
  channel: string;
  typing: boolean;
}

export interface ChatMessage {
  id: string;
  channel: string;
  author: {
    id: string;
    displayName: string;
    avatar: string;
    type: "agent" | "external";
  };
  content: string;
  messageType: "text" | "thought" | "action" | "result";
  parentId?: string;
  reactions: Array<{ emoji: string; count: number; users: string[] }>;
  createdAt: number;
  editedAt?: number;
}

// =============================================================================
// AGENT REGISTRY - Quick lookup for agent identities
// =============================================================================

const agentRegistry = new Map<
  string,
  { displayName: string; avatar: string; defaultChannels: string[] }
>();

// Populate registry from seed data
agentIdentities.forEach((agent) => {
  agentRegistry.set(agent.identifier, {
    displayName: agent.displayName,
    avatar: agent.avatar,
    defaultChannels: agent.defaultChannels,
  });
});

export function getAgentIdentity(agentId: string): { displayName: string; avatar: string } | null {
  const agent = agentRegistry.get(agentId);
  if (!agent) {
    return null;
  }
  return { displayName: agent.displayName, avatar: agent.avatar };
}

// =============================================================================
// MESSAGE STORE - In-memory for now, will be replaced with DB
// =============================================================================

const messageStore: Map<string, ChatMessage[]> = new Map();
const MAX_MESSAGES_PER_CHANNEL = 1000;

function storeMessage(message: ChatMessage): void {
  const channelMessages = messageStore.get(message.channel) || [];
  channelMessages.push(message);

  // Trim if too many
  if (channelMessages.length > MAX_MESSAGES_PER_CHANNEL) {
    channelMessages.shift();
  }

  messageStore.set(message.channel, channelMessages);
}

function getMessages(channel: string, limit: number = 50, before?: string): ChatMessage[] {
  const channelMessages = messageStore.get(channel) || [];

  if (before) {
    const index = channelMessages.findIndex((m) => m.id === before);
    if (index > 0) {
      return channelMessages.slice(Math.max(0, index - limit), index);
    }
  }

  return channelMessages.slice(-limit);
}

// =============================================================================
// CHAT TOOLS - Functions agents call
// =============================================================================

/**
 * Send a message to a channel
 *
 * @example
 * chat_send({
 *   channel: "#general",
 *   content: "Bom dia pessoal! ☕",
 *   type: "text"
 * })
 */
export function chat_send(
  agentId: string,
  params: ChatSendParams,
): { success: boolean; messageId?: string; error?: string } {
  const agent = agentRegistry.get(agentId);
  if (!agent) {
    return { success: false, error: `Unknown agent: ${agentId}` };
  }

  // Normalize channel name
  const channel = params.channel.startsWith("#") ? params.channel.slice(1) : params.channel;

  // Create message
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    channel,
    author: {
      id: agentId,
      displayName: agent.displayName,
      avatar: agent.avatar,
      type: "agent",
    },
    content: params.content,
    messageType: params.type || "text",
    parentId: params.thread,
    reactions: [],
    createdAt: Date.now(),
  };

  // Store message
  storeMessage(message);

  // Broadcast via WebSocket
  chatHub.broadcastToChannel(channel, {
    type: "message.new",
    payload: message,
    timestamp: Date.now(),
  });

  // Emit for bridges
  chatHub.emit("message.outbound", message);

  return { success: true, messageId: message.id };
}

/**
 * Read messages from a channel
 *
 * @example
 * chat_read({
 *   channel: "#general",
 *   limit: 50
 * })
 */
export function chat_read(
  agentId: string,
  params: ChatReadParams,
): { success: boolean; messages?: ChatMessage[]; error?: string } {
  const channel = params.channel.startsWith("#") ? params.channel.slice(1) : params.channel;
  const messages = getMessages(channel, params.limit || 50, params.before);

  return { success: true, messages };
}

/**
 * React to a message
 *
 * @example
 * chat_react({
 *   messageId: "uuid",
 *   emoji: "👍"
 * })
 */
export function chat_react(
  agentId: string,
  params: ChatReactParams,
): { success: boolean; error?: string } {
  // Find message in store
  for (const [_channel, messages] of messageStore) {
    const message = messages.find((m) => m.id === params.messageId);
    if (message) {
      // Find or create reaction
      let reaction = message.reactions.find((r) => r.emoji === params.emoji);
      if (!reaction) {
        reaction = { emoji: params.emoji, count: 0, users: [] };
        message.reactions.push(reaction);
      }

      // Add user if not already reacted
      if (!reaction.users.includes(agentId)) {
        reaction.users.push(agentId);
        reaction.count++;

        // Broadcast
        chatHub.broadcast({
          type: "reaction.add",
          payload: {
            messageId: params.messageId,
            emoji: params.emoji,
            userId: agentId,
          },
          timestamp: Date.now(),
        });
      }

      return { success: true };
    }
  }

  return { success: false, error: "Message not found" };
}

/**
 * Update presence status
 *
 * @example
 * chat_presence({
 *   status: "away",
 *   customStatus: "Em reunião"
 * })
 */
export function chat_presence(agentId: string, params: ChatPresenceParams): { success: boolean } {
  chatHub.broadcastPresence(agentId, params.status, params.customStatus);
  return { success: true };
}

/**
 * Send typing indicator
 *
 * @example
 * chat_typing({
 *   channel: "#general",
 *   typing: true
 * })
 */
export function chat_typing(agentId: string, params: ChatTypingParams): { success: boolean } {
  const agent = agentRegistry.get(agentId);
  if (!agent) {
    return { success: false };
  }

  const channel = params.channel.startsWith("#") ? params.channel.slice(1) : params.channel;

  chatHub.broadcastToChannel(channel, {
    type: params.typing ? "typing.start" : "typing.stop",
    payload: {
      channelId: channel,
      userId: agentId,
      displayName: agent.displayName,
    },
    timestamp: Date.now(),
  });

  return { success: true };
}

// =============================================================================
// TRANSPARENCY HELPERS - For showing thoughts/actions
// =============================================================================

/**
 * Send a thought message (💭)
 */
export function chat_thought(
  agentId: string,
  channel: string,
  thought: string,
): { success: boolean; messageId?: string } {
  return chat_send(agentId, {
    channel,
    content: `💭 ${thought}`,
    type: "thought",
  });
}

/**
 * Send an action message (🔧)
 */
export function chat_action(
  agentId: string,
  channel: string,
  action: string,
): { success: boolean; messageId?: string } {
  return chat_send(agentId, {
    channel,
    content: `🔧 ${action}`,
    type: "action",
  });
}

/**
 * Send a result message (✅ or ❌)
 */
export function chat_result(
  agentId: string,
  channel: string,
  success: boolean,
  result: string,
): { success: boolean; messageId?: string } {
  const emoji = success ? "✅" : "❌";
  return chat_send(agentId, {
    channel,
    content: `${emoji} ${result}`,
    type: "result",
  });
}

// =============================================================================
// BRIDGE HELPERS - For external platforms
// =============================================================================

/**
 * Format message for external platform (Telegram, Discord, etc.)
 */
export function formatMessageForBridge(
  message: ChatMessage,
  format: "telegram" | "discord" | "whatsapp" = "telegram",
): string {
  const { author, content } = message;

  switch (format) {
    case "telegram":
      return `${author.avatar} **${author.displayName}:**\n${content}`;

    case "discord":
      // Discord already shows username, just add avatar
      return `${author.avatar} ${content}`;

    case "whatsapp":
      return `*${author.displayName}:*\n${content}`;

    default:
      return `[${author.displayName}] ${content}`;
  }
}

/**
 * Handle incoming message from bridge (external user)
 */
export function handleBridgeMessage(
  bridgeType: "telegram" | "discord" | "whatsapp",
  externalId: string,
  displayName: string,
  content: string,
  targetChannel: string = "general",
): { success: boolean; messageId?: string } {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    channel: targetChannel,
    author: {
      id: `${bridgeType}:${externalId}`,
      displayName,
      avatar: "👤",
      type: "external",
    },
    content,
    messageType: "text",
    reactions: [],
    createdAt: Date.now(),
  };

  // Store message
  storeMessage(message);

  // Broadcast to hub
  chatHub.broadcastToChannel(targetChannel, {
    type: "message.new",
    payload: message,
    timestamp: Date.now(),
  });

  return { success: true, messageId: message.id };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { agentRegistry, messageStore, getMessages };
