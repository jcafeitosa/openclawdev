#!/bin/bash
# Redis Commands Reference for EPIC-003 Internal Chat Hub
# Usage: source redis-commands.sh
# Then call: redis_publish_message, redis_check_presence, etc.

set -e

# Redis connection settings (from .env)
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Helper: Connect to Redis
redis_connect() {
  if [ -z "$REDIS_PASSWORD" ]; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT"
  else
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD"
  fi
}

# ============================================================================
# PUB/SUB COMMANDS
# ============================================================================

# Publish a message to a channel
redis_publish_message() {
  local channel_id="$1"
  local message="$2"
  
  echo "🔔 Publishing to pubsub:channel:$channel_id"
  redis_connect <<EOF
PUBLISH pubsub:channel:$channel_id "$message"
QUIT
EOF
}

# Subscribe to a channel (blocking)
redis_subscribe_channel() {
  local channel_id="$1"
  
  echo "📥 Subscribing to pubsub:channel:$channel_id (Press Ctrl+C to exit)"
  redis_connect <<EOF
SUBSCRIBE pubsub:channel:$channel_id
EOF
}

# Subscribe to all channels (pattern)
redis_subscribe_all_channels() {
  echo "📥 Subscribing to all channels: pubsub:channel:* (Press Ctrl+C to exit)"
  redis_connect <<EOF
PSUBSCRIBE pubsub:channel:*
EOF
}

# Subscribe to agent-specific events
redis_subscribe_agent() {
  local agent_id="$1"
  
  echo "📥 Subscribing to pubsub:agent:$agent_id (Press Ctrl+C to exit)"
  redis_connect <<EOF
SUBSCRIBE pubsub:agent:$agent_id
EOF
}

# Publish to global channel
redis_publish_global() {
  local message="$1"
  
  echo "🔔 Publishing to global channel"
  redis_connect <<EOF
PUBLISH pubsub:global "$message"
QUIT
EOF
}

# ============================================================================
# PRESENCE COMMANDS
# ============================================================================

# Set agent presence in channel
redis_set_presence() {
  local channel_id="$1"
  local agent_id="$2"
  local status="${3:-online}"
  local custom_status="${4:-}"
  
  echo "👤 Setting presence: $agent_id in $channel_id ($status)"
  redis_connect <<EOF
HSET presence:$channel_id:$agent_id \
  agentId "$agent_id" \
  status "$status" \
  customStatus "$custom_status" \
  avatar "🤖" \
  lastSeen $(date +%s)000
EXPIRE presence:$channel_id:$agent_id 300
QUIT
EOF
}

# Get agent presence
redis_get_presence() {
  local channel_id="$1"
  local agent_id="$2"
  
  echo "👤 Getting presence for $agent_id in $channel_id:"
  redis_connect <<EOF
HGETALL presence:$channel_id:$agent_id
QUIT
EOF
}

# List all agents in channel
redis_list_presence() {
  local channel_id="$1"
  
  echo "👥 Agents in channel $channel_id:"
  redis_connect <<EOF
KEYS presence:$channel_id:*
QUIT
EOF
}

# Clear presence (agent disconnect)
redis_clear_presence() {
  local channel_id="$1"
  local agent_id="$2"
  
  echo "🚫 Clearing presence: $agent_id from $channel_id"
  redis_connect <<EOF
DEL presence:$channel_id:$agent_id
QUIT
EOF
}

# ============================================================================
# TYPING INDICATOR COMMANDS
# ============================================================================

# Mark agent as typing
redis_start_typing() {
  local channel_id="$1"
  local agent_id="$2"
  
  echo "⌨️  $agent_id is typing in $channel_id"
  redis_connect <<EOF
ZADD typing:$channel_id $(date +%s)000 $agent_id
EXPIRE typing:$channel_id 10
QUIT
EOF
}

# Get agents currently typing
redis_get_typing() {
  local channel_id="$1"
  local now=$(date +%s)000
  local thirty_sec_ago=$((now - 30000))
  
  echo "⌨️  Agents typing in $channel_id (last 30s):"
  redis_connect <<EOF
ZRANGEBYSCORE typing:$channel_id $thirty_sec_ago $now
QUIT
EOF
}

# Stop typing indicator
redis_stop_typing() {
  local channel_id="$1"
  local agent_id="$2"
  
  echo "⌨️  $agent_id stopped typing in $channel_id"
  redis_connect <<EOF
ZREM typing:$channel_id $agent_id
QUIT
EOF
}

# ============================================================================
# MESSAGE CACHING COMMANDS
# ============================================================================

# Cache recent messages
redis_cache_messages() {
  local channel_id="$1"
  local json_array="$2"
  
  echo "💾 Caching messages for $channel_id"
  redis_connect <<EOF
SET messages:$channel_id:recent '$json_array' EX 300
QUIT
EOF
}

# Get cached messages
redis_get_cached_messages() {
  local channel_id="$1"
  
  echo "📦 Getting cached messages for $channel_id:"
  redis_connect <<EOF
GET messages:$channel_id:recent
QUIT
EOF
}

# Invalidate message cache
redis_invalidate_message_cache() {
  local channel_id="$1"
  
  echo "🗑️  Invalidating message cache for $channel_id"
  redis_connect <<EOF
DEL messages:$channel_id:recent
QUIT
EOF
}

# ============================================================================
# CHANNEL METADATA COMMANDS
# ============================================================================

# Set channel metadata
redis_set_channel() {
  local channel_id="$1"
  local channel_json="$2"
  
  echo "📋 Setting channel metadata for $channel_id"
  redis_connect <<EOF
SET channel:$channel_id '$channel_json' EX 3600
QUIT
EOF
}

# Get channel metadata
redis_get_channel() {
  local channel_id="$1"
  
  echo "📋 Getting channel metadata for $channel_id:"
  redis_connect <<EOF
GET channel:$channel_id
QUIT
EOF
}

# Add member to channel
redis_add_channel_member() {
  local channel_id="$1"
  local agent_id="$2"
  
  echo "➕ Adding $agent_id to channel:$channel_id:members"
  redis_connect <<EOF
SADD channel:$channel_id:members $agent_id
QUIT
EOF
}

# Get channel members
redis_get_channel_members() {
  local channel_id="$1"
  
  echo "👥 Members of channel $channel_id:"
  redis_connect <<EOF
SMEMBERS channel:$channel_id:members
QUIT
EOF
}

# Remove member from channel
redis_remove_channel_member() {
  local channel_id="$1"
  local agent_id="$2"
  
  echo "➖ Removing $agent_id from channel:$channel_id:members"
  redis_connect <<EOF
SREM channel:$channel_id:members $agent_id
QUIT
EOF
}

# ============================================================================
# RATE LIMITING COMMANDS
# ============================================================================

# Check rate limit
redis_check_rate_limit() {
  local action="$1"
  local agent_id="$2"
  
  echo "⏱️  Checking rate limit: ratelimit:$action:$agent_id"
  redis_connect <<EOF
GET ratelimit:$action:$agent_id
QUIT
EOF
}

# Increment rate limit counter
redis_increment_rate_limit() {
  local action="$1"
  local agent_id="$2"
  
  echo "⏱️  Incrementing rate limit for $action:$agent_id"
  redis_connect <<EOF
INCR ratelimit:$action:$agent_id
EXPIRE ratelimit:$action:$agent_id 60
QUIT
EOF
}

# Reset rate limit
redis_reset_rate_limit() {
  local action="$1"
  local agent_id="$2"
  
  echo "🔄 Resetting rate limit for $action:$agent_id"
  redis_connect <<EOF
DEL ratelimit:$action:$agent_id
QUIT
EOF
}

# ============================================================================
# MONITORING & DIAGNOSTICS
# ============================================================================

# Check Redis connection
redis_health_check() {
  echo "🏥 Redis Health Check"
  redis_connect <<EOF
PING
INFO memory
INFO stats
QUIT
EOF
}

# Monitor all Redis commands in real-time
redis_monitor() {
  echo "👁️  Monitoring Redis (Press Ctrl+C to exit)"
  redis_connect <<EOF
MONITOR
EOF
}

# List all keys
redis_list_keys() {
  local pattern="${1:-*}"
  
  echo "🔍 Redis Keys (pattern: $pattern):"
  redis_connect <<EOF
KEYS $pattern
QUIT
EOF
}

# Get memory stats
redis_memory_stats() {
  echo "💾 Redis Memory Statistics:"
  redis_connect <<EOF
INFO memory
QUIT
EOF
}

# Get database stats
redis_db_stats() {
  echo "📊 Redis Database Statistics:"
  redis_connect <<EOF
INFO stats
QUIT
EOF
}

# Flush all data (⚠️ USE WITH CAUTION)
redis_flush_all() {
  echo "⚠️  WARNING: This will delete ALL Redis data!"
  read -p "Type 'yes' to confirm: " confirm
  
  if [ "$confirm" = "yes" ]; then
    echo "🗑️  Flushing all Redis data..."
    redis_connect <<EOF
FLUSHALL
QUIT
EOF
    echo "✅ Done"
  else
    echo "❌ Cancelled"
  fi
}

# Flush chat-specific keys
redis_flush_chat() {
  echo "🗑️  Flushing chat keys (prefix: openclaw:chat:)"
  redis_connect <<EOF
EVAL "return redis.call('del', unpack(redis.call('keys', 'openclaw:chat:*')))" 0
QUIT
EOF
}

# ============================================================================
# EXAMPLE USAGE
# ============================================================================

echo "✅ Redis Commands Loaded!"
echo ""
echo "Available functions:"
echo "  PUB/SUB:"
echo "    - redis_publish_message <channel_id> <message>"
echo "    - redis_subscribe_channel <channel_id>"
echo "    - redis_subscribe_all_channels"
echo "    - redis_subscribe_agent <agent_id>"
echo ""
echo "  PRESENCE:"
echo "    - redis_set_presence <channel_id> <agent_id> [status] [custom_status]"
echo "    - redis_get_presence <channel_id> <agent_id>"
echo "    - redis_list_presence <channel_id>"
echo "    - redis_clear_presence <channel_id> <agent_id>"
echo ""
echo "  TYPING:"
echo "    - redis_start_typing <channel_id> <agent_id>"
echo "    - redis_get_typing <channel_id>"
echo "    - redis_stop_typing <channel_id> <agent_id>"
echo ""
echo "  MESSAGES:"
echo "    - redis_cache_messages <channel_id> <json_array>"
echo "    - redis_get_cached_messages <channel_id>"
echo "    - redis_invalidate_message_cache <channel_id>"
echo ""
echo "  CHANNEL:"
echo "    - redis_set_channel <channel_id> <json>"
echo "    - redis_get_channel <channel_id>"
echo "    - redis_add_channel_member <channel_id> <agent_id>"
echo "    - redis_get_channel_members <channel_id>"
echo "    - redis_remove_channel_member <channel_id> <agent_id>"
echo ""
echo "  RATE LIMITING:"
echo "    - redis_check_rate_limit <action> <agent_id>"
echo "    - redis_increment_rate_limit <action> <agent_id>"
echo "    - redis_reset_rate_limit <action> <agent_id>"
echo ""
echo "  MONITORING:"
echo "    - redis_health_check"
echo "    - redis_monitor"
echo "    - redis_list_keys [pattern]"
echo "    - redis_memory_stats"
echo "    - redis_db_stats"
echo "    - redis_flush_all (⚠️)"
echo "    - redis_flush_chat"
echo ""
