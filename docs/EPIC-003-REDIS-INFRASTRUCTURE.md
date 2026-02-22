# EPIC-003: Redis Infrastructure for Internal Chat Hub

**Status:** Planning & Implementation  
**Priority:** P0 - Critical  
**Created:** 2026-02-21  
**Week:** 1 (Core Infrastructure)

---

## 📋 Executive Summary

This document defines the **Redis infrastructure** required for the OpenClaw Internal Chat Hub. Redis serves three critical roles:

1. **Pub/Sub System** - Real-time message broadcasting across 111 agents
2. **Presence & State** - Track agent status, typing indicators, online/offline
3. **Message Caching** - Cache recent messages for quick retrieval

---

## ✅ Current Status

### Already Implemented ✓

- ✅ **Docker Compose Configuration**
  - Redis 7-alpine service configured
  - Volume: `openclaw_redis:/data` (persistent)
  - Port: 6379 (default)
  - Health check: `redis-cli ping`

- ✅ **Environment Configuration**
  - `.env` file has Redis connection params
  - Support for `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

- ✅ **Base Redis Client**
  - `src/infra/cache/redis.ts` - ioredis wrapper
  - Connection pooling with retry logic
  - Support for Redis URL format
  - Key prefixing ("openclaw:")

- ✅ **Unified Cache Abstraction**
  - `src/infra/cache/unified-cache.ts` - abstraction layer
  - Auto-fallback to memory if Redis unavailable
  - TTL support for cache expiry

- ✅ **Channel Events System**
  - `src/agents/chat/events/channel-events.ts` - Pub/Sub implementation
  - Event types: message, reaction, typing, presence, member updates
  - Local + Redis distribution
  - Subscribe/unsubscribe mechanisms

- ✅ **Presence Manager**
  - `src/agents/chat/presence/manager.ts` - Agent presence tracking
  - Presence data stored in Redis with TTL
  - Typing indicator support

### TODO - Week 1

- 🔲 **Redis Schema Documentation** - This document
- 🔲 **Pub/Sub Configuration Validation** - Test full setup
- 🔲 **Load Testing Config** - Redis performance targets
- 🔲 **Monitoring & Health Checks** - Setup alerts
- 🔲 **Backup & Recovery Plan** - Persistence strategy

---

## 🏗️ Architecture

### Data Flow

```
Agent A                Redis                 Agent B
  |                      |                      |
  +-- emitChannelEvent()--> PUBLISH          +--receive event
                         pubsub:channel:X    |
  +-- Subscribe-------> SUBSCRIBE
                         pubsub:channel:X   <--+
  |                      |                      |
  +-- setPresence()----> HSET                 |
  |  (TTL 5 min)        presence:X:agentA    |
  |                      |                      |
  +-- updateTyping()---> ZADD                 |
  |  (TTL 10 sec)       typing:X              |
  |                      |                      |
  +-- getMessages()---> GET                   |
                        messages:X:recent

```

### Redis Instance Topology

**Single Redis Instance (Development & Production)**

```
Redis 7 (port 6379)
  ├── Key Prefix: "openclaw:" (namespace isolation)
  ├── Database: 0 (default)
  ├── Persistence: RDB + AOF (optional)
  ├── Memory Policy: allkeys-lru (evict least recently used)
  └── Replication: None (single node for MVP)

Future: Redis Cluster or Sentinel for HA
```

---

## 📊 Redis Key Schema

### Pub/Sub Channels (real-time events)

```
pubsub:channel:{channelId}
  └─ Real-time events for a specific channel
     Example: pubsub:channel:9f3c2a1d-5e8f-4b6a-9c1e-2a3b4c5d6e7f

pubsub:global
  └─ Global events (system-wide broadcasts)

pubsub:agent:{agentId}
  └─ Direct messages to specific agent
     Example: pubsub:agent:backend-architect
```

**Event Structure (JSON):**

```json
{
  "event": {
    "type": "channel.message",
    "channelId": "9f3c2a1d-5e8f-4b6a-9c1e-2a3b4c5d6e7f",
    "message": {
      "id": "msg-uuid",
      "content": "Hello world! 🚀",
      "senderId": "backend-architect",
      "timestamp": 1708554000000,
      "threadId": null
    }
  },
  "timestamp": 1708554000000,
  "senderId": "backend-architect"
}
```

### Presence Keys

```
presence:{channelId}:{agentId}
  └─ Agent presence in a channel (TTL: 5 minutes)
  └─ Hash structure:
     {
       "agentId": "backend-architect",
       "status": "online|away|dnd",
       "customStatus": "Reviewing PRs",
       "avatar": "🤖",
       "lastSeen": 1708554000000
     }

Example key: presence:9f3c2a1d-5e8f-4b6a-9c1e-2a3b4c5d6e7f:backend-architect
```

### Typing Indicators

```
typing:{channelId}
  └─ Sorted set of agents currently typing (TTL: 10 seconds)
  └─ Score = timestamp, member = agentId
  └─ Use ZRANGEBYSCORE to find active typers

Example key: typing:9f3c2a1d-5e8f-4b6a-9c1e-2a3b4c5d6e7f
Entries: {
  "backend-architect": 1708554020000,
  "tech-lead": 1708554021000
}
```

### Channel Cache

```
channel:{channelId}
  └─ Channel metadata (TTL: 1 hour)
  └─ JSON serialized channel object

channel:{channelId}:members
  └─ Set of member agentIds
  └─ Use SMEMBERS to list members

messages:{channelId}:recent
  └─ List of recent messages (max 50)
  └─ JSON array, TTL: 5 minutes
  └─ Used for quick "recent messages" queries
```

### Message Sequence

```
seq:messages:{channelId}
  └─ Message counter for thread IDs
  └─ Use INCR to generate unique message IDs
```

### Rate Limiting

```
ratelimit:{action}:{agentId}
  └─ Counter for rate limiting (TTL: 1 minute)
  └─ Action examples: "message", "reaction", "typing"
  └─ Use INCR + EXPIRE for sliding window
```

---

## 🔄 Pub/Sub Events

### Event Types

```typescript
type ChannelEventType =
  // Messages
  | "channel.message" // New message
  | "channel.message.edit" // Message edited
  | "channel.message.delete" // Message deleted

  // Reactions
  | "channel.reaction.add" // User reacted
  | "channel.reaction.remove" // User removed reaction

  // Presence
  | "channel.typing" // User typing indicator
  | "channel.presence" // User online/offline/away

  // Members
  | "channel.member.join" // User joined channel
  | "channel.member.leave" // User left channel
  | "channel.member.update" // User info updated

  // Channel
  | "channel.update" // Channel settings changed
  | "channel.archive" // Channel archived
  | "channel.delete" // Channel deleted

  // Threads
  | "thread.create" // New thread created
  | "thread.update" // Thread updated
  | "thread.message" // Message in thread

  // Collaboration
  | "collaboration.event"; // Custom collaboration event
```

### Event Payload

```json
{
  "event": {
    "type": "channel.message",
    "channelId": "uuid",
    "message": {
      "id": "msg-uuid",
      "content": "...",
      "senderId": "agent-id",
      "timestamp": 1708554000000
    }
  },
  "timestamp": 1708554000000,
  "senderId": "agent-id",
  "channelId": "uuid"
}
```

---

## 🎯 Redis Commands Reference

### Pub/Sub Operations

```bash
# Publish a message to a channel
PUBLISH pubsub:channel:{channelId} "{json_payload}"
Returns: number of subscribers

# Subscribe to a channel (blocking)
SUBSCRIBE pubsub:channel:{channelId}

# Pattern subscribe (e.g., all channels)
PSUBSCRIBE pubsub:channel:*
```

### Presence Management

```bash
# Set agent presence
HSET presence:{channelId}:{agentId} \
  agentId "backend-architect" \
  status "online" \
  customStatus "Reviewing PRs" \
  avatar "🤖" \
  lastSeen 1708554000000
EXPIRE presence:{channelId}:{agentId} 300

# Get agent presence
HGETALL presence:{channelId}:{agentId}

# Get all agents in channel
KEYS presence:{channelId}:*

# Remove presence on disconnect
DEL presence:{channelId}:{agentId}
```

### Typing Indicators

```bash
# Mark agent as typing (10 second TTL)
ZADD typing:{channelId} {timestamp} {agentId}
EXPIRE typing:{channelId} 10

# Get current typers in channel
ZRANGEBYSCORE typing:{channelId} {min_timestamp} {max_timestamp}

# Get all typers (last 30 seconds)
ZRANGEBYSCORE typing:{channelId} {now - 30000} {now}

# Remove agent from typers
ZREM typing:{channelId} {agentId}
```

### Message Caching

```bash
# Cache recent messages
SET messages:{channelId}:recent "{json_array}" EX 300

# Get cached messages
GET messages:{channelId}:recent

# Invalidate cache on new message
DEL messages:{channelId}:recent
```

### Channel Metadata

```bash
# Set channel info
SET channel:{channelId} "{channel_json}" EX 3600

# Get channel info
GET channel:{channelId}

# Set channel members
SADD channel:{channelId}:members {agentId1} {agentId2}

# Get channel members
SMEMBERS channel:{channelId}:members

# Check membership
SISMEMBER channel:{channelId}:members {agentId}
```

### Rate Limiting

```bash
# Increment counter
INCR ratelimit:message:{agentId}
EXPIRE ratelimit:message:{agentId} 60

# Check rate limit
GET ratelimit:message:{agentId}

# Reset limit
DEL ratelimit:message:{agentId}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
REDIS_DB=0

# Chat system specific
CHAT_REDIS_HOST=localhost
CHAT_REDIS_PORT=6379
CHAT_REDIS_PASSWORD=
CHAT_REDIS_DB=0
CHAT_REDIS_TLS=false
```

### Docker Compose

```yaml
# docker-compose.yml - Already configured!
redis:
  image: redis:7-alpine
  volumes:
    - openclaw_redis:/data
  ports:
    - "${REDIS_PORT:-6379}:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Redis Configuration (redis.conf)

**Current (Development):**

```
port 6379
appendonly no                    # AOF off (speed > durability)
save ""                          # No RDB snapshots
maxmemory-policy allkeys-lru    # LRU eviction for cache
```

**Production (Recommended):**

```
port 6379
appendonly yes                   # AOF enabled
appendfsync everysec            # Fsync every second
save 900 1                       # RDB every 15 min
save 300 10                      # or 10 changes
maxmemory 4gb                    # Adjust per server
maxmemory-policy allkeys-lru
timeout 0
databases 16
```

---

## 📈 Performance Targets (Week 1)

| Metric               | Target                         |
| -------------------- | ------------------------------ |
| **Pub/Sub Latency**  | < 50ms (localhost)             |
| **Presence Updates** | < 100ms                        |
| **Typing Broadcast** | < 100ms                        |
| **Throughput**       | 1,000+ ops/sec                 |
| **Memory Usage**     | < 500MB for 111 agents         |
| **Connections**      | 111 agents + web UI concurrent |
| **Key TTL**          | Accurate within ±1 second      |

---

## 🧪 Testing Checklist (Week 1)

### Unit Tests

- [ ] Redis connection/disconnection
- [ ] Key namespace isolation ("openclaw:" prefix)
- [ ] TTL expiry (presence, typing)
- [ ] Pub/Sub publish/subscribe
- [ ] Pattern subscriptions (pubsub:channel:\*)
- [ ] Rate limiting counters

### Integration Tests

- [ ] Full chat message flow (agent → Redis → agent)
- [ ] Presence tracking (join → heartbeat → leave)
- [ ] Typing indicators (start → update → stop)
- [ ] Reaction add/remove
- [ ] Message edit/delete propagation
- [ ] Channel member list sync

### Load Tests

- [ ] 111 agents publishing simultaneously
- [ ] 1000 messages/second throughput
- [ ] Memory under load
- [ ] CPU usage under sustained load

### Failure Recovery

- [ ] Redis connection lost (fallback to memory)
- [ ] Redis reconnection recovery
- [ ] Message loss scenarios
- [ ] Presence data reconstruction

---

## 🚀 Deployment Checklist (Week 1)

### Local Development

```bash
✓ Redis running in Docker (docker-compose up redis)
✓ .env configured with Redis host/port
✓ Health check passing
✓ Memory limits set
```

### Testing Environment

```bash
[ ] Redis with persistence (AOF)
[ ] Monitoring/alerting setup
[ ] Slow log enabled
[ ] Key eviction monitoring
```

### Production (Week 10)

```bash
[ ] Redis Cluster (for HA)
[ ] Sentinel setup (auto-failover)
[ ] Backup strategy (RDB dumps)
[ ] Point-in-time recovery (AOF)
[ ] Monitoring & dashboards
[ ] Rate limiting middleware
[ ] Circuit breaker for Redis failures
```

---

## 📚 Implementation Files

### Core Files (Already Created)

| File                                       | Purpose                          |
| ------------------------------------------ | -------------------------------- |
| `src/infra/cache/redis.ts`                 | Redis client wrapper             |
| `src/infra/cache/unified-cache.ts`         | Abstraction + fallback           |
| `src/agents/chat/db/client.ts`             | DB client interface + REDIS_KEYS |
| `src/agents/chat/events/channel-events.ts` | Pub/Sub event system             |
| `src/agents/chat/presence/manager.ts`      | Presence tracking                |
| `src/agents/chat/presence/typing.ts`       | Typing indicators                |
| `docker-compose.yml`                       | Redis service definition         |

### Next Steps (Week 1)

| Task                              | Owner           |
| --------------------------------- | --------------- |
| Implement Redis health monitoring | devops-engineer |
| Create Redis monitoring dashboard | devops-engineer |
| Write integration tests           | qa-lead         |
| Document backup strategy          | devops-engineer |
| Setup Redis alerts/thresholds     | devops-engineer |

---

## 🔍 Monitoring & Debugging

### Check Redis Connection

```bash
# From container
docker-compose exec redis redis-cli ping
# Should return: PONG

# From host
redis-cli -h localhost -p 6379 ping
```

### Monitor Real-time Activity

```bash
# Watch all Redis commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# List all keys
redis-cli KEYS "*"

# Watch specific key
redis-cli WATCH presence:*
```

### Common Issues

| Issue                   | Cause                    | Solution                               |
| ----------------------- | ------------------------ | -------------------------------------- |
| `Connection refused`    | Redis not running        | `docker-compose up redis`              |
| `Memory limit exceeded` | Too many cached messages | Increase `maxmemory`, reduce TTL       |
| `Slow Pub/Sub`          | High message volume      | Check network latency, use compression |
| `High CPU`              | Key eviction overhead    | Adjust `maxmemory-policy`              |
| `Keys not expiring`     | TTL not set              | Check EXPIRE calls in code             |

---

## 📖 References

- **ioredis Library:** https://github.com/luin/ioredis
- **Redis Pub/Sub:** https://redis.io/docs/interact/pubsub/
- **Redis Commands:** https://redis.io/commands/
- **Redis Best Practices:** https://redis.io/docs/management/optimization/
- **OpenClaw Chat System:** See `src/agents/chat/`

---

## 🎯 Success Criteria

By end of Week 1:

- ✅ Redis fully integrated with chat system
- ✅ Pub/Sub working for all event types
- ✅ Presence tracking tested
- ✅ Typing indicators functional
- ✅ Load testing results documented
- ✅ No fallback to memory cache needed
- ✅ All integration tests passing

---

**Last Updated:** 2026-02-21  
**Next Review:** Week 2 (Agent Integration Testing)
