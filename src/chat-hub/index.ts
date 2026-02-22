/**
 * EPIC-003: Internal Chat Hub
 *
 * Canal oficial onde 111 agents vivem e conversam.
 */

// =============================================================================
// DATABASE SCHEMA
// =============================================================================
export * from "./schema.js";

// =============================================================================
// SEED DATA (111 agents + default channels)
// =============================================================================
export * from "./seed.js";

// =============================================================================
// WEBSOCKET SERVER (Real-time messaging)
// =============================================================================
export { ChatHub, chatHub } from "./websocket-server.js";
export type {
  ChatWebSocketMessage,
  ChatConnection,
  MessagePayload,
  PresencePayload,
  TypingPayload,
} from "./websocket-server.js";

// =============================================================================
// CHAT TOOLS (Functions agents use to send messages)
// =============================================================================
export {
  chat_send,
  chat_read,
  chat_react,
  chat_presence,
  chat_typing,
  chat_thought,
  chat_action,
  chat_result,
  formatMessageForBridge,
  handleBridgeMessage,
  getAgentIdentity,
} from "./chat-tools.js";
export type {
  ChatSendParams,
  ChatReadParams,
  ChatReactParams,
  ChatPresenceParams,
  ChatTypingParams,
  ChatMessage,
} from "./chat-tools.js";

// =============================================================================
// TELEGRAM BRIDGE
// =============================================================================
export { TelegramBridge, BridgeManager, bridgeManager } from "./telegram-bridge.js";
export type { TelegramBridgeConfig } from "./telegram-bridge.js";

// =============================================================================
// DATABASE TYPES
// =============================================================================
export type {
  Channel,
  NewChannel,
  ChatUser,
  NewChatUser,
  Message,
  NewMessage,
  Reaction,
  NewReaction,
  ChannelMember,
  NewChannelMember,
  Mention,
  NewMention,
  Bridge,
  NewBridge,
} from "./schema.js";
