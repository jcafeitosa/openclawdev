# EPIC-003: Pub/Sub Schema for Real-Time Chat

**Objective:** Define the complete Redis Pub/Sub structure for the OpenClaw Internal Chat Hub  
**Status:** Week 1 Planning  
**Last Updated:** 2026-02-21

---

## 🔄 Pub/Sub Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          REDIS 7                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             PUB/SUB CHANNELS (Real-time)                 │  │
│  │                                                           │  │
│  │  1. pubsub:channel:{channelId}                           │  │
│  │     ├─ channel.message (new message)                     │  │
│  │     ├─ channel.message.edit (edit)                       │  │
│  │     ├─ channel.message.delete (delete)                   │  │
│  │     ├─ channel.reaction.add (emoji reaction)             │  │
│  │     ├─ channel.reaction.remove                           │  │
│  │     ├─ channel.typing (typing indicator)                 │  │
│  │     ├─ channel.presence (online/offline/away)            │  │
│  │     ├─ channel.member.* (join/leave/update)              │  │
│  │     ├─ thread.create (new thread)                        │  │
│  │     ├─ thread.message (message in thread)                │  │
│  │     └─ collaboration.event (custom events)               │  │
│  │                                                           │  │
│  │  2. pubsub:global                                        │  │
│  │     ├─ System-wide announcements                         │  │
│  │     ├─ Server events                                     │  │
│  │     └─ Emergency broadcasts                              │  │
│  │                                                           │  │
│  │  3. pubsub:agent:{agentId}                               │  │
│  │     └─ Direct messages to specific agent                 │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │    DATA STORAGE KEYS (State Management)                  │  │
│  │                                                           │  │
│  │  ✓ presence::{channelId}::{agentId} (TTL 5min)          │  │
│  │  ✓ typing::{channelId} (TTL 10sec)                      │  │
│  │  ✓ messages::{channelId}:recent (TTL 5min)              │  │
│  │  ✓ channel::{channelId} (TTL 1h)                        │  │
│  │  ✓ channel::{channelId}::members (set)                  │  │
│  │  ✓ ratelimit::{action}::{agentId} (TTL 60sec)           │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 Event Flow Diagram

```
Agent A                    Redis                      Agent B
  │                          │                          │
  ├─ chat_send()            │                          │
  │  (new message)          │                          │
  │                          │                          │
  ├──────PUBLISH────────────>│ pubsub:channel:X       │
  │  {                       │   {                      │
  │    event: {             │     event: {             │
  │      type: msg          │       type: msg          │
  │      content: "hi"      │       content: "hi"      │
  │    }                    │     }                    │
  │  }                      │   }                      │
  │                          │                          │
  │                          │<──SUBSCRIBE DELIVERY─────┤
  │                          │     (< 50ms)             │
  │                          │                          │
  │                    Handle Event                    │
  │                   Update UI State                  │
  │                  Show Message                      │
  │                          │                          │
  ├─ setPresence()          │                          │
  │  (going online)          │                          │
  │                          │                          │
  ├──────HSET──────────────>│ presence:X:agentA      │
  │  {agentId, status}       │  (TTL: 5 min)          │
  │                          │                          │
  ├─ updateTyping()         │                          │
  │  (start typing)          │                          │
  │                          │                          │
  ├──────ZADD──────────────>│ typing:X               │
  │  {agentId, timestamp}    │  (TTL: 10 sec)         │
  │                          │                          │
  │  ┌─ Broadcast Event    │                          │
  │  └─────PUBLISH────────────> pubsub:channel:X   │
  │                          │   {type: typing}       │
  │                          │                          │
  │                          │<──SUBSCRIBE DELIVERY─────┤
  │                          │                          │
  │                    Get Typing List                 │
  │                   Show "Agent A typing..."        │
  │                          │                          │
```

---

## 🎯 Pub/Sub Channels

### 1. Channel-Specific Events

**Channel:** `pubsub:channel:{channelId}`

The primary channel for all channel-specific real-time events.

```typescript
type ChannelEvent =
  | {
      type: "channel.message";
      channelId: string;
      message: {
        id: string; // UUID
        content: string;
        senderId: string; // agent-id or external:telegram:123
        timestamp: number; // ms since epoch
        threadId?: string;
        edited?: boolean;
        reactions?: Record<string, number>; // emoji -> count
      };
    }
  | {
      type: "channel.message.edit";
      channelId: string;
      messageId: string;
      content: string;
      editedAt: number;
    }
  | {
      type: "channel.message.delete";
      channelId: string;
      messageId: string;
      deletedAt: number;
    }
  | {
      type: "channel.reaction.add";
      channelId: string;
      messageId: string;
      emoji: string;
      agentId: string;
    }
  | {
      type: "channel.reaction.remove";
      channelId: string;
      messageId: string;
      emoji: string;
      agentId: string;
    }
  | {
      type: "channel.typing";
      channelId: string;
      agentId: string;
      started: boolean;
      threadId?: string; // for thread typing
    }
  | {
      type: "channel.presence";
      channelId: string;
      presence: {
        agentId: string;
        status: "online" | "away" | "dnd" | "offline";
        customStatus?: string;
        avatar: string; // emoji
        lastSeen: number;
      };
    }
  | {
      type: "channel.member.join";
      channelId: string;
      member: {
        agentId: string;
        joinedAt: number;
        role: "member" | "moderator" | "owner";
      };
    }
  | {
      type: "channel.member.leave";
      channelId: string;
      agentId: string;
      leftAt?: number;
    }
  | {
      type: "channel.update";
      channelId: string;
      channel: {
        name?: string;
        topic?: string;
        description?: string;
        isPrivate?: boolean;
      };
    }
  | {
      type: "channel.archive";
      channelId: string;
      archivedBy: string;
      archivedAt: number;
    }
  | {
      type: "channel.delete";
      channelId: string;
      deletedBy: string;
      deletedAt: number;
    }
  | {
      type: "thread.create";
      channelId: string;
      thread: {
        id: string;
        parentMessageId: string;
        createdBy: string;
        createdAt: number;
        replyCount: number;
      };
    }
  | {
      type: "thread.message";
      channelId: string;
      threadId: string;
      message: ChannelMessage;
    }
  | {
      type: "collaboration.event";
      channelId: string;
      event: {
        type: string;
        data: Record<string, any>;
      };
    };
```

**Payload Wrapper:**

```json
{
  "event": { ... },
  "timestamp": 1708554000000,
  "channelId": "9f3c2a1d-5e8f-4b6a-9c1e-2a3b4c5d6e7f",
  "senderId": "backend-architect"
}
```

---

### 2. Global Events

**Channel:** `pubsub:global`

System-wide broadcasts, emergency notifications, server announcements.

```typescript
type GlobalEvent = {
  type:
    | "system.announcement"
    | "system.maintenance"
    | "system.shutdown"
    | "system.performance.alert"
    | "auth.token.revoked"
    | "agent.joined"
    | "agent.left";

  data: {
    message?: string;
    severity?: "info" | "warning" | "critical";
    affectedAgents?: string[];
    startTime?: number;
    estimatedDuration?: number;
  };
};
```

---

### 3. Agent-Specific Events

**Channel:** `pubsub:agent:{agentId}`

Direct messages to a specific agent (private messages, notifications, commands).

```typescript
type AgentEvent = {
  type: "agent.direct_message" | "agent.notification" | "agent.command" | "agent.invite";

  data: {
    fromAgent?: string;
    content?: string;
    channelId?: string;
    actionRequired?: boolean;
  };
};
```

---

## 💾 State Storage Keys

### Presence Data (TTL: 5 minutes)

**Key:** `presence:{channelId}:{agentId}`  
**Type:** Hash  
**TTL:** 300 seconds (5 minutes)

```bash
# SET presence:channel-uuid:backend-architect
HSET presence:channel-uuid:backend-architect \
  agentId "backend-architect" \
  status "online" \
  customStatus "Reviewing PRs" \
  avatar "🤖" \
  lastSeen "1708554000000"

EXPIRE presence:channel-uuid:backend-architect 300
```

**Use Cases:**

- Display "who's online" in channel sidebar
- Heartbeat mechanism (renew TTL on activity)
- Clean up stale presence after disconnection

---

### Typing Indicators (TTL: 10 seconds)

**Key:** `typing:{channelId}`  
**Type:** Sorted Set (score = timestamp)  
**TTL:** 10 seconds

```bash
# START typing
ZADD typing:channel-uuid 1708554020000 backend-architect

# GET typing agents (last 30 seconds)
ZRANGEBYSCORE typing:channel-uuid 1708553990000 1708554020000

# STOP typing
ZREM typing:channel-uuid backend-architect
```

**Use Cases:**

- Show "X is typing..." indicators
- Automatically clear after 10 seconds (no heartbeat needed)
- Use ZRANGEBYSCORE to find active typers

---

### Recent Messages Cache (TTL: 5 minutes)

**Key:** `messages:{channelId}:recent`  
**Type:** String (JSON)  
**TTL:** 300 seconds

```bash
# CACHE recent messages
SET messages:channel-uuid:recent '[
  {"id":"msg-1","content":"Hi","senderId":"..."},
  {"id":"msg-2","content":"Hey","senderId":"..."}
]' EX 300

# GET cached messages
GET messages:channel-uuid:recent

# INVALIDATE on new message
DEL messages:channel-uuid:recent
```

**Use Cases:**

- Quick load of recent message history
- Reduce database queries on channel load
- Invalidate when new message arrives

---

### Channel Metadata (TTL: 1 hour)

**Key:** `channel:{channelId}`  
**Type:** String (JSON)  
**TTL:** 3600 seconds

```bash
SET channel:uuid '{
  "id":"uuid",
  "name":"#engineering",
  "topic":"Engineering discussions",
  "isPrivate":false,
  "createdAt":1708550000000,
  "memberCount":23
}' EX 3600
```

**Key:** `channel:{channelId}:members`  
**Type:** Set  
**No TTL** (managed explicitly)

```bash
# ADD members
SADD channel:uuid:members agent1 agent2 agent3

# GET members
SMEMBERS channel:uuid:members

# REMOVE member
SREM channel:uuid:members agent1
```

---

### Rate Limiting (TTL: 1 minute)

**Key:** `ratelimit:{action}:{agentId}`  
**Type:** String (counter)  
**TTL:** 60 seconds

```bash
# CHECK limit
GET ratelimit:message:backend-architect

# INCREMENT on action
INCR ratelimit:message:backend-architect
EXPIRE ratelimit:message:backend-architect 60

# RESET
DEL ratelimit:message:backend-architect
```

**Actions:**

- `message` - 10 messages per minute
- `reaction` - 20 reactions per minute
- `typing` - unlimited (ephemeral indicator)
- `invite` - 5 invites per minute

---

## 🔀 Subscription Patterns

### Client Subscriptions

Each connected client should subscribe to multiple channels:

```typescript
// Web/UI Client (JavaScript)
const pubsub = redis.psubscribe("pubsub:channel:*");
const agentEvents = redis.subscribe(`pubsub:agent:${userId}`);
const globalEvents = redis.subscribe("pubsub:global");

// Handle different event types
pubsub.on("message", (channel, payload) => {
  const event = JSON.parse(payload);

  switch (event.type) {
    case "channel.message":
      handleNewMessage(event);
      break;
    case "channel.typing":
      showTypingIndicator(event);
      break;
    // ... etc
  }
});
```

### Server Subscriptions

Each backend server instance should subscribe to:

```typescript
// Server-side (Node.js)
const db = getChatDbClient();

// Channel-specific events
await db.psubscribe("pubsub:channel:*", (channel, payload) => {
  const event = JSON.parse(payload);
  broadcastToWebSocketClients(event);
});

// Agent-specific events
await db.subscribe(`pubsub:agent:${agentId}`, (payload) => {
  const event = JSON.parse(payload);
  routeToAgent(event);
});

// Global events
await db.subscribe("pubsub:global", (payload) => {
  const event = JSON.parse(payload);
  handleSystemEvent(event);
});
```

---

## 🚀 Event Publishing Example

```typescript
// File: src/agents/chat/events/channel-events.ts

async function emitChannelEvent(event: ChannelEvent): Promise<void> {
  const payload: EventPayload = {
    event,
    timestamp: Date.now(),
    channelId: event.channelId,
    senderId: event.senderId,
  };

  // Publish to Redis
  const db = getChatDbClient();
  const channel = REDIS_KEYS.pubsubChannel(event.channelId);

  await db.publish(channel, JSON.stringify(payload));

  // Also notify local listeners
  notifyLocalListeners(event);
}

// Usage:
await emitChannelEvent({
  type: "channel.message",
  channelId: "9f3c2a1d-5e8f-4b6a-9c1e-2a3b4c5d6e7f",
  message: {
    id: "msg-uuid",
    content: "Hello! 👋",
    senderId: "backend-architect",
    timestamp: Date.now(),
  },
});
```

---

## ⚡ Real-Time Latency Breakdown

```
Agent A sends message
  │
  ├─ Time: 0ms
  │  └─ JS: chat_send() called
  │
  ├─ Time: 1-2ms
  │  └─ Network: POST /api/messages
  │
  ├─ Time: 3-5ms
  │  └─ Server: Message validated, stored in DB
  │
  ├─ Time: 6-10ms
  │  └─ Redis: PUBLISH to pubsub:channel:X
  │
  ├─ Time: 11-20ms
  │  └─ All subscribers receive message
  │
  ├─ Time: 21-30ms
  │  └─ Client: WebSocket message handler
  │
  ├─ Time: 31-40ms
  │  └─ UI: React re-render
  │
  └─ Time: 41-50ms
     └─ Browser: Paint new message

Total: ~50ms (< 100ms target ✅)
```

---

## 🧪 Testing Strategy

### Unit Tests

- [ ] Event payload serialization/deserialization
- [ ] Channel naming conventions
- [ ] TTL accuracy
- [ ] Payload validation

### Integration Tests

- [ ] Publish-subscribe flow
- [ ] Cross-process message delivery
- [ ] Pattern subscription matching
- [ ] Presence tracking cycle
- [ ] Typing indicator timeouts

### Load Tests

```bash
# Generate 100 concurrent publishers
# Measure: latency, throughput, memory

redis-benchmark -t publish,subscribe -n 10000 -c 100
```

---

## 📋 Checklist for Week 1

- [x] Define Pub/Sub channels
- [x] Define event types and payloads
- [x] Define state storage schema
- [x] Implement event system (channel-events.ts)
- [x] Document Redis commands
- [ ] Write integration tests
- [ ] Load test with 111 agents
- [ ] Verify latency targets
- [ ] Setup monitoring
- [ ] Document failure scenarios

---

**References:**

- Redis Pub/Sub: https://redis.io/docs/interact/pubsub/
- OpenClaw Chat: `src/agents/chat/`
- Event Types: `src/agents/chat/events/channel-events.ts`
