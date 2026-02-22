/**
 * EPIC-003: Internal Chat Hub - Database Schema
 *
 * Canal oficial onde 111 agents vivem e conversam.
 * Telegram, Discord, WhatsApp são bridges para este hub.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// =============================================================================
// CHANNELS - Canais de comunicação (#general, #engineering, etc.)
// =============================================================================
export const channels = pgTable("chat_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  description: text("description"),
  topic: text("topic"),
  isPrivate: boolean("is_private").default(false),
  isArchived: boolean("is_archived").default(false),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// =============================================================================
// CHAT USERS - Agents (111) + External users (via bridges)
// =============================================================================
export const chatUsers = pgTable(
  "chat_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // 'agent' ou 'external'
    type: varchar("type", { length: 20 }).notNull(),

    // 'backend-architect' ou 'telegram:6334767195'
    identifier: varchar("identifier", { length: 100 }).notNull(),

    // Nome para exibição
    displayName: varchar("display_name", { length: 100 }),

    // Emoji avatar (🤖, 🎯, 🐛, etc.)
    avatar: varchar("avatar", { length: 10 }),

    // Status de presença
    status: varchar("status", { length: 20 }).default("offline"),

    // Status customizado ("Revisando PRs", "Em reunião")
    customStatus: text("custom_status"),

    // Última vez online
    lastSeen: timestamp("last_seen", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Unique constraint: type + identifier
    uniqueTypeIdentifier: index("idx_chat_users_type_identifier").on(table.type, table.identifier),
    // Index para buscar online users
    statusIndex: index("idx_chat_users_status").on(table.status),
  }),
);

// =============================================================================
// MESSAGES - Mensagens no chat
// =============================================================================
export const messages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Canal onde foi postada
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id),

    // Quem enviou
    userId: uuid("user_id")
      .notNull()
      .references(() => chatUsers.id),

    // Conteúdo da mensagem
    content: text("content").notNull(),

    // Tipo: 'text', 'thought' (💭), 'action' (🔧), 'result' (✅❌)
    messageType: varchar("message_type", { length: 20 }).default("text"),

    // Para threads - referência à mensagem pai
    parentId: uuid("parent_id"),

    // Metadados extras (attachments, etc.)
    metadata: jsonb("metadata"),

    // Timestamps
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Index para buscar mensagens por canal (ordenadas por data)
    channelCreatedIndex: index("idx_messages_channel_created").on(table.channelId, table.createdAt),
    // Index para threads
    parentIndex: index("idx_messages_parent").on(table.parentId),
  }),
);

// =============================================================================
// REACTIONS - Reações em mensagens (👍, 🎉, 🔥, etc.)
// =============================================================================
export const reactions = pgTable(
  "chat_reactions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => chatUsers.id),
    emoji: varchar("emoji", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.userId, table.emoji] }),
  }),
);

// =============================================================================
// CHANNEL MEMBERS - Membros de cada canal
// =============================================================================
export const channelMembers = pgTable(
  "chat_channel_members",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => chatUsers.id),
    role: varchar("role", { length: 20 }).default("member"), // 'admin', 'member', 'readonly'
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    lastRead: timestamp("last_read", { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.channelId, table.userId] }),
  }),
);

// =============================================================================
// MENTIONS - Menções em mensagens (@user, @channel, @here)
// =============================================================================
export const mentions = pgTable(
  "chat_mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id),
    userId: uuid("user_id").references(() => chatUsers.id), // null se @channel ou @here
    mentionType: varchar("mention_type", { length: 20 }).notNull(), // 'user', 'channel', 'here'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    messageIndex: index("idx_mentions_message").on(table.messageId),
    userIndex: index("idx_mentions_user").on(table.userId),
  }),
);

// =============================================================================
// BRIDGES - Conexões com canais externos (Telegram, Discord, etc.)
// =============================================================================
export const bridges = pgTable(
  "chat_bridges",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Tipo: 'telegram', 'discord', 'whatsapp', 'slack', 'signal'
    type: varchar("type", { length: 20 }).notNull(),

    // ID do chat externo
    externalId: varchar("external_id", { length: 100 }).notNull(),

    // Nome para exibição
    displayName: varchar("display_name", { length: 100 }),

    // Canal alvo no hub
    targetChannelId: uuid("target_channel_id").references(() => channels.id),

    // Configuração (formato de mensagens, etc.)
    config: jsonb("config"),

    // Status
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    typeExternalIndex: index("idx_bridges_type_external").on(table.type, table.externalId),
  }),
);

// =============================================================================
// PRESENCE - Tracking de presença em tempo real (Redis-backed, mas com fallback)
// =============================================================================
export const presence = pgTable("chat_presence", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => chatUsers.id),
  status: varchar("status", { length: 20 }).default("offline"),
  lastPing: timestamp("last_ping", { withTimezone: true }).defaultNow(),
  metadata: jsonb("metadata"), // device info, etc.
});

// =============================================================================
// TYPES - Exportando tipos para uso no código
// =============================================================================
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

export type ChatUser = typeof chatUsers.$inferSelect;
export type NewChatUser = typeof chatUsers.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;

export type ChannelMember = typeof channelMembers.$inferSelect;
export type NewChannelMember = typeof channelMembers.$inferInsert;

export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;

export type Bridge = typeof bridges.$inferSelect;
export type NewBridge = typeof bridges.$inferInsert;
