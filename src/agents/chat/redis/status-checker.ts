/**
 * Redis Status Checker for EPIC-003
 * Verifies Redis configuration, connectivity, and Pub/Sub setup
 */

import { getRedis, isRedisConnected } from "../../../infra/cache/redis.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

const log = createSubsystemLogger("chat/redis/status");

export type RedisHealthStatus = {
  connected: boolean;
  redis_version?: string;
  memory_usage_mb?: number;
  connected_clients?: number;
  pubsub_channels?: number;
  pubsub_patterns?: number;
  uptime_seconds?: number;
  errors?: string[];
};

export type PubSubValidation = {
  can_publish: boolean;
  can_subscribe: boolean;
  channel_patterns_valid: boolean;
  errors: string[];
};

export type RedisConfiguration = {
  host: string;
  port: number;
  database: number;
  keyPrefix?: string;
  hasPassword: boolean;
};

/**
 * Check Redis connection and basic health
 */
export async function checkRedisHealth(): Promise<RedisHealthStatus> {
  const status: RedisHealthStatus = {
    connected: false,
    errors: [],
  };

  try {
    const connected = await isRedisConnected();
    status.connected = connected;

    if (!connected) {
      status.errors?.push("Cannot connect to Redis");
      return status;
    }

    const redis = getRedis();

    // Get Redis version and stats
    const info = await redis.info("all");
    const infoLines = info.split("\r\n");

    for (const line of infoLines) {
      if (line.startsWith("redis_version:")) {
        status.redis_version = line.split(":")[1];
      } else if (line.startsWith("used_memory_human:")) {
        const memHuman = line.split(":")[1];
        const memMb = parseMemorySize(memHuman);
        status.memory_usage_mb = memMb;
      } else if (line.startsWith("connected_clients:")) {
        status.connected_clients = Number.parseInt(line.split(":")[1], 10);
      } else if (line.startsWith("pubsub_channels:")) {
        status.pubsub_channels = Number.parseInt(line.split(":")[1], 10);
      } else if (line.startsWith("pubsub_patterns:")) {
        status.pubsub_patterns = Number.parseInt(line.split(":")[1], 10);
      } else if (line.startsWith("uptime_in_seconds:")) {
        status.uptime_seconds = Number.parseInt(line.split(":")[1], 10);
      }
    }

    return status;
  } catch (error) {
    status.errors?.push(
      `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return status;
  }
}

/**
 * Validate Redis Pub/Sub capabilities
 */
export async function validatePubSub(): Promise<PubSubValidation> {
  const validation: PubSubValidation = {
    can_publish: false,
    can_subscribe: false,
    channel_patterns_valid: false,
    errors: [],
  };

  try {
    const redis = getRedis();
    const testChannelId = "health-check-" + Date.now();
    const testChannel = `pubsub:channel:${testChannelId}`;

    // Test publish
    try {
      const result = await redis.publish(testChannel, JSON.stringify({ type: "health-check" }));
      validation.can_publish = result >= 0;
    } catch (error) {
      validation.errors.push(
        `Publish failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test pattern subscription (use separate client for subscribe)
    try {
      const subRedis = getRedis().duplicate();
      await subRedis.psubscribe("pubsub:channel:*");
      validation.channel_patterns_valid = true;
      await subRedis.punsubscribe("pubsub:channel:*");
      await subRedis.quit();
    } catch (error) {
      validation.errors.push(
        `Pattern subscription failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test subscribe capability
    try {
      const subRedis = getRedis().duplicate();
      await subRedis.subscribe(testChannel);
      validation.can_subscribe = true;
      await subRedis.unsubscribe(testChannel);
      await subRedis.quit();
    } catch (error) {
      validation.errors.push(
        `Subscribe failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return validation;
  } catch (error) {
    validation.errors.push(
      `PubSub validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return validation;
  }
}

/**
 * Get current Redis configuration
 */
export function getRedisConfig(): RedisConfiguration {
  const redis = getRedis();
  const options = redis.options;

  return {
    host: (options.host as string) || "localhost",
    port: (options.port as number) || 6379,
    database: (options.db as number) || 0,
    keyPrefix: (options.keyPrefix as string) || "openclaw:",
    hasPassword: !!(options.password as string),
  };
}

/**
 * Check required Pub/Sub channels for chat
 */
export async function validateChatChannels(): Promise<{
  valid: boolean;
  channels: string[];
  errors: string[];
}> {
  const result = {
    valid: true,
    channels: [
      "pubsub:global",
      "pubsub:channel:*", // pattern
      "pubsub:agent:*", // pattern
    ],
    errors: [] as string[],
  };

  try {
    const redis = getRedis();

    // Test global channel
    try {
      await redis.publish("pubsub:global", "test");
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Cannot publish to pubsub:global: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test channel pattern
    try {
      const testId = "test-" + Date.now();
      await redis.publish(`pubsub:channel:${testId}`, "test");
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Cannot publish to channel pattern: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test agent pattern
    try {
      await redis.publish("pubsub:agent:test-agent", "test");
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Cannot publish to agent pattern: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  } catch (error) {
    return {
      valid: false,
      channels: result.channels,
      errors: [
        `Channel validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Test Redis key operations
 */
export async function validateKeyOperations(): Promise<{
  valid: boolean;
  operations: {
    get_set: boolean;
    hset_hget: boolean;
    sadd_smembers: boolean;
    zadd_zrange: boolean;
    expire: boolean;
  };
  errors: string[];
}> {
  const result = {
    valid: true,
    operations: {
      get_set: false,
      hset_hget: false,
      sadd_smembers: false,
      zadd_zrange: false,
      expire: false,
    },
    errors: [] as string[],
  };

  try {
    const redis = getRedis();
    const testKey = "test:validate:" + Date.now();

    // Test GET/SET
    try {
      await redis.set(`${testKey}:str`, "test-value");
      const value = await redis.get(`${testKey}:str`);
      result.operations.get_set = value === "test-value";
      await redis.del(`${testKey}:str`);
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `GET/SET failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test HSET/HGET
    try {
      await redis.hset(`${testKey}:hash`, "field", "value");
      const value = await redis.hget(`${testKey}:hash`, "field");
      result.operations.hset_hget = value === "value";
      await redis.del(`${testKey}:hash`);
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `HSET/HGET failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test SADD/SMEMBERS
    try {
      await redis.sadd(`${testKey}:set`, "member1", "member2");
      const members = await redis.smembers(`${testKey}:set`);
      result.operations.sadd_smembers = members.length === 2;
      await redis.del(`${testKey}:set`);
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `SADD/SMEMBERS failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test ZADD/ZRANGE
    try {
      await redis.zadd(`${testKey}:zset`, 1, "member1", 2, "member2");
      const members = await redis.zrange(`${testKey}:zset`, 0, -1);
      result.operations.zadd_zrange = members.length === 2;
      await redis.del(`${testKey}:zset`);
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `ZADD/ZRANGE failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test EXPIRE
    try {
      await redis.set(`${testKey}:expire`, "value");
      await redis.expire(`${testKey}:expire`, 1);
      const ttl = await redis.ttl(`${testKey}:expire`);
      result.operations.expire = ttl > 0;
      await redis.del(`${testKey}:expire`);
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `EXPIRE failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  } catch (error) {
    return {
      valid: false,
      operations: result.operations,
      errors: [
        `Key operations validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Perform complete Redis status check
 */
export async function performFullHealthCheck(): Promise<{
  timestamp: string;
  overall_healthy: boolean;
  health: RedisHealthStatus;
  pubsub: PubSubValidation;
  channels: Awaited<ReturnType<typeof validateChatChannels>>;
  keys: Awaited<ReturnType<typeof validateKeyOperations>>;
  config: RedisConfiguration;
}> {
  const [health, pubsub, , keys] = await Promise.all([
    checkRedisHealth(),
    validatePubSub(),
    validateChatChannels(),
    validateKeyOperations(),
  ]);

  const config = getRedisConfig();

  const overall_healthy =
    health.connected && pubsub.can_publish && pubsub.can_subscribe && keys.valid;

  return {
    timestamp: new Date().toISOString(),
    overall_healthy,
    health,
    pubsub,
    channels: await validateChatChannels(),
    keys,
    config,
  };
}

/**
 * Log health check results
 */
export async function logHealthCheckResults(): Promise<void> {
  const check = await performFullHealthCheck();

  if (check.overall_healthy) {
    log.info("✅ Redis Health Check Passed");
  } else {
    log.error("❌ Redis Health Check Failed");
  }

  log.info("Configuration:", {
    host: check.config.host,
    port: check.config.port,
    database: check.config.database,
    keyPrefix: check.config.keyPrefix,
  });

  if (check.health.connected) {
    log.info("Connection: ✅", {
      version: check.health.redis_version,
      memory: `${check.health.memory_usage_mb}MB`,
      clients: check.health.connected_clients,
      uptime: `${check.health.uptime_seconds}s`,
    });
  } else {
    log.error("Connection: ❌", { errors: check.health.errors });
  }

  if (check.pubsub.can_publish && check.pubsub.can_subscribe) {
    log.info("Pub/Sub: ✅");
  } else {
    log.error("Pub/Sub: ❌", { errors: check.pubsub.errors });
  }

  if (check.channels.valid) {
    log.info("Channels: ✅");
  } else {
    log.error("Channels: ❌", { errors: check.channels.errors });
  }

  if (check.keys.valid) {
    log.info("Key Operations: ✅");
  } else {
    log.error("Key Operations: ❌", { errors: check.keys.errors });
  }
}

// Helper: Parse memory size (e.g., "2.5M" -> 2.5)
function parseMemorySize(sizeStr: string): number {
  const match = sizeStr.match(/(\d+\.?\d*)\s*([KMG])?B?/);
  if (!match) {
    return 0;
  }

  const size = Number.parseFloat(match[1]);
  const unit = match[2]?.toUpperCase() ?? "";

  switch (unit) {
    case "K":
      return size / 1024;
    case "M":
      return size;
    case "G":
      return size * 1024;
    default:
      return size / (1024 * 1024);
  }
}

// Export for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  await logHealthCheckResults();
}
