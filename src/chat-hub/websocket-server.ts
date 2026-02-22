/**
 * EPIC-003: Internal Chat Hub - WebSocket Server
 *
 * Real-time messaging para 111 agents + usuários externos.
 */

import { EventEmitter } from "events";

// =============================================================================
// TYPES
// =============================================================================

export interface ChatWebSocketMessage {
  type:
    | "message.send"
    | "message.new"
    | "message.edit"
    | "message.delete"
    | "reaction.add"
    | "reaction.remove"
    | "presence.update"
    | "typing.start"
    | "typing.stop"
    | "channel.join"
    | "channel.leave"
    | "error";
  payload: unknown;
  timestamp?: number;
}

export interface ChatConnection {
  id: string;
  userId: string;
  userType: "agent" | "external";
  displayName: string;
  avatar: string;
  channels: Set<string>;
  lastPing: number;
  send: (message: ChatWebSocketMessage) => void;
}

export interface MessagePayload {
  channelId: string;
  content: string;
  messageType?: "text" | "thought" | "action" | "result";
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface PresencePayload {
  status: "online" | "away" | "dnd" | "offline";
  customStatus?: string;
}

export interface TypingPayload {
  channelId: string;
}

// =============================================================================
// CHAT HUB - Central message router
// =============================================================================

export class ChatHub extends EventEmitter {
  private connections: Map<string, ChatConnection> = new Map();
  private channelSubscriptions: Map<string, Set<string>> = new Map(); // channelId -> connectionIds
  private typingIndicators: Map<string, Map<string, number>> = new Map(); // channelId -> userId -> timestamp

  constructor() {
    super();

    // Cleanup typing indicators every 5 seconds
    setInterval(() => this.cleanupTypingIndicators(), 5000);
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  addConnection(connection: ChatConnection): void {
    this.connections.set(connection.id, connection);

    // Auto-join default channels
    connection.channels.forEach((channelId) => {
      this.joinChannel(connection.id, channelId);
    });

    // Broadcast presence
    this.broadcastPresence(connection.userId, "online");

    this.emit("connection.added", connection);
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Leave all channels
    connection.channels.forEach((channelId) => {
      this.leaveChannel(connectionId, channelId);
    });

    // Broadcast offline
    this.broadcastPresence(connection.userId, "offline");

    this.connections.delete(connectionId);
    this.emit("connection.removed", connection);
  }

  getConnection(connectionId: string): ChatConnection | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionByUserId(userId: string): ChatConnection | undefined {
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) {
        return conn;
      }
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Channel Management
  // ---------------------------------------------------------------------------

  joinChannel(connectionId: string, channelId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.channels.add(channelId);

    if (!this.channelSubscriptions.has(channelId)) {
      this.channelSubscriptions.set(channelId, new Set());
    }
    this.channelSubscriptions.get(channelId)!.add(connectionId);

    // Notify channel members
    this.broadcastToChannel(
      channelId,
      {
        type: "channel.join",
        payload: {
          channelId,
          user: {
            id: connection.userId,
            displayName: connection.displayName,
            avatar: connection.avatar,
          },
        },
        timestamp: Date.now(),
      },
      connectionId,
    ); // Exclude self
  }

  leaveChannel(connectionId: string, channelId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.channels.delete(channelId);
    this.channelSubscriptions.get(channelId)?.delete(connectionId);

    // Notify channel members
    this.broadcastToChannel(channelId, {
      type: "channel.leave",
      payload: {
        channelId,
        userId: connection.userId,
      },
      timestamp: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Message Handling
  // ---------------------------------------------------------------------------

  handleMessage(connectionId: string, message: ChatWebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    switch (message.type) {
      case "message.send":
        this.handleMessageSend(connection, message.payload as MessagePayload);
        break;
      case "typing.start":
        this.handleTypingStart(connection, message.payload as TypingPayload);
        break;
      case "typing.stop":
        this.handleTypingStop(connection, message.payload as TypingPayload);
        break;
      case "presence.update":
        this.handlePresenceUpdate(connection, message.payload as PresencePayload);
        break;
      case "reaction.add":
      case "reaction.remove":
        this.handleReaction(connection, message);
        break;
      default:
        connection.send({
          type: "error",
          payload: { message: `Unknown message type: ${message.type}` },
        });
    }
  }

  private handleMessageSend(connection: ChatConnection, payload: MessagePayload): void {
    // Validate channel membership
    if (!connection.channels.has(payload.channelId)) {
      connection.send({
        type: "error",
        payload: { message: "Not a member of this channel" },
      });
      return;
    }

    // Create message object
    const newMessage = {
      id: crypto.randomUUID(),
      channelId: payload.channelId,
      userId: connection.userId,
      displayName: connection.displayName,
      avatar: connection.avatar,
      content: payload.content,
      messageType: payload.messageType || "text",
      parentId: payload.parentId,
      metadata: payload.metadata,
      createdAt: Date.now(),
    };

    // Emit for persistence
    this.emit("message.new", newMessage);

    // Broadcast to channel
    this.broadcastToChannel(payload.channelId, {
      type: "message.new",
      payload: newMessage,
      timestamp: Date.now(),
    });

    // Clear typing indicator
    this.typingIndicators.get(payload.channelId)?.delete(connection.userId);
  }

  private handleTypingStart(connection: ChatConnection, payload: TypingPayload): void {
    if (!this.typingIndicators.has(payload.channelId)) {
      this.typingIndicators.set(payload.channelId, new Map());
    }
    this.typingIndicators.get(payload.channelId)!.set(connection.userId, Date.now());

    this.broadcastToChannel(
      payload.channelId,
      {
        type: "typing.start",
        payload: {
          channelId: payload.channelId,
          userId: connection.userId,
          displayName: connection.displayName,
        },
        timestamp: Date.now(),
      },
      connection.id,
    );
  }

  private handleTypingStop(connection: ChatConnection, payload: TypingPayload): void {
    this.typingIndicators.get(payload.channelId)?.delete(connection.userId);

    this.broadcastToChannel(
      payload.channelId,
      {
        type: "typing.stop",
        payload: {
          channelId: payload.channelId,
          userId: connection.userId,
        },
        timestamp: Date.now(),
      },
      connection.id,
    );
  }

  private handlePresenceUpdate(connection: ChatConnection, payload: PresencePayload): void {
    this.broadcastPresence(connection.userId, payload.status, payload.customStatus);
  }

  private handleReaction(connection: ChatConnection, message: ChatWebSocketMessage): void {
    this.emit(message.type, {
      ...(message.payload as Record<string, unknown>),
      userId: connection.userId,
    });

    // Broadcast to all connections (reactions are visible everywhere)
    this.broadcast({
      type: message.type,
      payload: {
        ...(message.payload as Record<string, unknown>),
        userId: connection.userId,
        displayName: connection.displayName,
      },
      timestamp: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Broadcasting
  // ---------------------------------------------------------------------------

  broadcastToChannel(
    channelId: string,
    message: ChatWebSocketMessage,
    excludeConnectionId?: string,
  ): void {
    const subscribers = this.channelSubscriptions.get(channelId);
    if (!subscribers) {
      return;
    }

    for (const connId of subscribers) {
      if (connId === excludeConnectionId) {
        continue;
      }
      const conn = this.connections.get(connId);
      if (conn) {
        conn.send(message);
      }
    }
  }

  broadcast(message: ChatWebSocketMessage, excludeConnectionId?: string): void {
    for (const [connId, conn] of this.connections) {
      if (connId === excludeConnectionId) {
        continue;
      }
      conn.send(message);
    }
  }

  broadcastPresence(userId: string, status: string, customStatus?: string): void {
    this.broadcast({
      type: "presence.update",
      payload: {
        userId,
        status,
        customStatus,
      },
      timestamp: Date.now(),
    });

    this.emit("presence.update", { userId, status, customStatus });
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private cleanupTypingIndicators(): void {
    const now = Date.now();
    const timeout = 10000; // 10 seconds

    for (const [channelId, users] of this.typingIndicators) {
      for (const [userId, timestamp] of users) {
        if (now - timestamp > timeout) {
          users.delete(userId);
          this.broadcastToChannel(channelId, {
            type: "typing.stop",
            payload: { channelId, userId },
            timestamp: now,
          });
        }
      }
    }
  }

  getOnlineUsers(): Array<{ userId: string; displayName: string; avatar: string; status: string }> {
    const users: Array<{ userId: string; displayName: string; avatar: string; status: string }> =
      [];
    const seen = new Set<string>();

    for (const conn of this.connections.values()) {
      if (!seen.has(conn.userId)) {
        seen.add(conn.userId);
        users.push({
          userId: conn.userId,
          displayName: conn.displayName,
          avatar: conn.avatar,
          status: "online",
        });
      }
    }

    return users;
  }

  getChannelMembers(
    channelId: string,
  ): Array<{ userId: string; displayName: string; avatar: string }> {
    const members: Array<{ userId: string; displayName: string; avatar: string }> = [];
    const subscribers = this.channelSubscriptions.get(channelId);
    if (!subscribers) {
      return members;
    }

    for (const connId of subscribers) {
      const conn = this.connections.get(connId);
      if (conn) {
        members.push({
          userId: conn.userId,
          displayName: conn.displayName,
          avatar: conn.avatar,
        });
      }
    }

    return members;
  }

  getTypingUsers(channelId: string): string[] {
    const users = this.typingIndicators.get(channelId);
    if (!users) {
      return [];
    }
    return Array.from(users.keys());
  }

  getStats(): {
    totalConnections: number;
    totalChannels: number;
    connectionsByType: Record<string, number>;
  } {
    const connectionsByType: Record<string, number> = { agent: 0, external: 0 };

    for (const conn of this.connections.values()) {
      connectionsByType[conn.userType] = (connectionsByType[conn.userType] || 0) + 1;
    }

    return {
      totalConnections: this.connections.size,
      totalChannels: this.channelSubscriptions.size,
      connectionsByType,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const chatHub = new ChatHub();
