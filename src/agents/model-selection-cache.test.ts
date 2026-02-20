import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ModelSelectionLRUCache,
  getModelSelectionCache,
  isModelCacheEnabled,
  clearModelSelectionCache,
  cachedModelSelection,
} from "./model-selection-cache.js";

describe("ModelSelectionLRUCache", () => {
  let cache: ModelSelectionLRUCache<string>;

  beforeEach(() => {
    cache = new ModelSelectionLRUCache();
  });

  describe("Basic Cache Operations", () => {
    it("should store and retrieve values", () => {
      const key = "test-key";
      const value = "test-value";

      cache.set(key, value);
      expect(cache.get(key)).toBe(value);
    });

    it("should return null for missing keys", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("should update existing keys", () => {
      const key = "test-key";
      cache.set(key, "value1");
      cache.set(key, "value2");

      expect(cache.get(key)).toBe("value2");
    });

    it("should track hit/miss statistics", () => {
      cache.set("key1", "value1");
      cache.get("key1"); // hit
      cache.get("key1"); // hit
      cache.get("key2"); // miss

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.total).toBe(3);
      expect(parseFloat(stats.hitRate)).toBeCloseTo(66.67, 1);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entry when max size reached", () => {
      const cache = new ModelSelectionLRUCache<number>();

      // Fill cache with 50 entries (max size)
      for (let i = 0; i < 50; i++) {
        cache.set(`key-${i}`, i);
      }

      expect(cache.getStats().size).toBe(50);

      // Add one more entry → should evict oldest (key-0)
      cache.set("key-50", 50);

      expect(cache.getStats().size).toBe(50);
      expect(cache.get("key-0")).toBeNull(); // Oldest should be evicted
      expect(cache.get("key-50")).toBe(50); // New entry should exist
      expect(cache.get("key-49")).toBe(49); // Other entries should still exist
    });

    it("should update LRU order on access", () => {
      const cache = new ModelSelectionLRUCache<number>();

      // Add 3 entries
      cache.set("key-1", 1);
      cache.set("key-2", 2);
      cache.set("key-3", 3);

      // Access key-1 (moves it to end)
      cache.get("key-1");

      // Fill to max and add new entry
      for (let i = 4; i <= 51; i++) {
        cache.set(`key-${i}`, i);
      }

      // key-1 should not be evicted (was accessed recently)
      expect(cache.get("key-1")).toBe(1);
      // key-2 should be evicted (least recently used after key-1 was accessed)
      expect(cache.get("key-2")).toBeNull();
    });
  });

  describe("TTL Expiration", () => {
    it("should expire entries after 30 minutes", () => {
      const cache = new ModelSelectionLRUCache<string>();
      const key = "test-key";
      const value = "test-value";

      cache.set(key, value);
      expect(cache.get(key)).toBe(value);

      // Mock time advance by 31 minutes
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 31 * 60 * 1000);

      expect(cache.get(key)).toBeNull();

      Date.now = originalNow;
    });

    it("should not expire entries before TTL", () => {
      const cache = new ModelSelectionLRUCache<string>();
      const key = "test-key";
      const value = "test-value";

      cache.set(key, value);

      // Mock time advance by 15 minutes (within TTL)
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 15 * 60 * 1000);

      expect(cache.get(key)).toBe(value);

      Date.now = originalNow;
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate consistent keys for same params", () => {
      const params1 = { task: "test", role: "worker" };
      const params2 = { task: "test", role: "worker" };

      const key1 = ModelSelectionLRUCache.generateKey(params1);
      const key2 = ModelSelectionLRUCache.generateKey(params2);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different params", () => {
      const params1 = { task: "test1", role: "worker" };
      const params2 = { task: "test2", role: "worker" };

      const key1 = ModelSelectionLRUCache.generateKey(params1);
      const key2 = ModelSelectionLRUCache.generateKey(params2);

      expect(key1).not.toBe(key2);
    });

    it("should generate SHA256 hashes", () => {
      const params = { task: "test", role: "worker" };
      const key = ModelSelectionLRUCache.generateKey(params);

      // SHA256 hex digest should be 64 characters
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should be order-independent for object keys", () => {
      const params1 = { task: "test", role: "worker" };
      const params2 = { role: "worker", task: "test" };

      const key1 = ModelSelectionLRUCache.generateKey(params1);
      const key2 = ModelSelectionLRUCache.generateKey(params2);

      expect(key1).toBe(key2);
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate specific keys", () => {
      cache.set("key-1", "value1");
      cache.set("key-2", "value2");

      cache.invalidate("key-1");

      expect(cache.get("key-1")).toBeNull();
      expect(cache.get("key-2")).toBe("value2");
    });

    it("should invalidate by pattern", () => {
      cache.set("task-1", "value1");
      cache.set("task-2", "value2");
      cache.set("role-1", "value3");

      cache.invalidatePattern((key) => key.startsWith("task-"));

      expect(cache.get("task-1")).toBeNull();
      expect(cache.get("task-2")).toBeNull();
      expect(cache.get("role-1")).toBe("value3");
    });

    it("should clear all entries", () => {
      cache.set("key-1", "value1");
      cache.set("key-2", "value2");
      cache.set("key-3", "value3");

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.getStats().hitCount).toBe(0);
      expect(cache.getStats().missCount).toBe(0);
    });
  });

  describe("Cache Statistics", () => {
    it("should report accurate statistics", () => {
      cache.set("key-1", "value1");
      cache.set("key-2", "value2");

      cache.get("key-1"); // hit
      cache.get("key-1"); // hit
      cache.get("key-3"); // miss

      const stats = cache.getStats();

      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.total).toBe(3);
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(50);
      expect(stats.ttlMinutes).toBe(30);
    });
  });
});

describe("Global Cache Functions", () => {
  afterEach(() => {
    clearModelSelectionCache();
  });

  it("should initialize cache on first access", () => {
    const cache = getModelSelectionCache();
    expect(cache).toBeDefined();
    expect(cache.getStats().size).toBe(0);
  });

  it("should check if cache is enabled via feature flag", () => {
    const enabled = isModelCacheEnabled();
    expect(typeof enabled).toBe("boolean");
  });

  it("should respect OPENCLAW_MODEL_CACHE_ENABLED environment variable", () => {
    const originalEnv = process.env.OPENCLAW_MODEL_CACHE_ENABLED;

    process.env.OPENCLAW_MODEL_CACHE_ENABLED = "true";
    expect(isModelCacheEnabled()).toBe(true);

    process.env.OPENCLAW_MODEL_CACHE_ENABLED = "false";
    expect(isModelCacheEnabled()).toBe(false);

    process.env.OPENCLAW_MODEL_CACHE_ENABLED = "0";
    expect(isModelCacheEnabled()).toBe(false);

    process.env.OPENCLAW_MODEL_CACHE_ENABLED = originalEnv;
  });

  it("should clear cache and reset statistics", () => {
    const cache = getModelSelectionCache();
    cache.set("key-1", "value1");
    cache.get("key-1");

    clearModelSelectionCache();

    const stats = cache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.hitCount).toBe(0);
    expect(stats.missCount).toBe(0);
  });
});

describe("cachedModelSelection Wrapper", () => {
  afterEach(() => {
    clearModelSelectionCache();
  });

  it("should cache function results", () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return "result";
    };

    const params = { task: "test", role: "worker" };

    const result1 = cachedModelSelection(params, fn);
    const result2 = cachedModelSelection(params, fn);

    expect(result1).toBe("result");
    expect(result2).toBe("result");
    expect(callCount).toBe(1); // Function called only once
  });

  it("should skip cache when disabled", () => {
    const originalEnv = process.env.OPENCLAW_MODEL_CACHE_ENABLED;
    process.env.OPENCLAW_MODEL_CACHE_ENABLED = "false";

    let callCount = 0;
    const fn = () => {
      callCount++;
      return "result";
    };

    const params = { task: "test", role: "worker" };

    cachedModelSelection(params, fn);
    cachedModelSelection(params, fn);

    expect(callCount).toBe(2); // Function called every time

    process.env.OPENCLAW_MODEL_CACHE_ENABLED = originalEnv;
  });

  it("should cache different results for different params", () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return `result-${callCount}`;
    };

    const result1 = cachedModelSelection({ task: "test1" }, fn);
    const result2 = cachedModelSelection({ task: "test2" }, fn);

    expect(result1).toBe("result-1");
    expect(result2).toBe("result-2");
    expect(callCount).toBe(2); // Function called twice for different params
  });

  it("should measure latency improvement (baseline vs cached)", () => {
    const expensiveOperation = () => {
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }
      return sum;
    };

    const params = { task: "complex", role: "orchestrator" };

    // Baseline: first call (cache miss)
    const start1 = performance.now();
    cachedModelSelection(params, expensiveOperation);
    const baseline = performance.now() - start1;

    // Cached: second call (cache hit)
    const start2 = performance.now();
    cachedModelSelection(params, expensiveOperation);
    const cached = performance.now() - start2;

    // Cached call should be significantly faster
    expect(cached).toBeLessThan(baseline);

    // Log for visibility in test output
    console.log(`Baseline: ${baseline.toFixed(2)}ms, Cached: ${cached.toFixed(2)}ms`);
    console.log(`Speedup: ${(baseline / cached).toFixed(1)}x faster`);
  });
});

describe("Performance: Cache Hit Rate", () => {
  afterEach(() => {
    clearModelSelectionCache();
  });

  it("should achieve >70% hit rate in typical workload", () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return `model-${callCount % 3}`; // Only 3 unique results
    };

    const cache = getModelSelectionCache();

    // Simulate 100 requests with limited task/role combinations
    const combinations = [
      { task: "task1", role: "worker" },
      { task: "task2", role: "specialist" },
      { task: "task3", role: "orchestrator" },
    ];

    for (let i = 0; i < 100; i++) {
      const params = combinations[i % 3];
      cachedModelSelection(params, fn);
    }

    const stats = cache.getStats();
    const hitRate = (stats.hitCount / stats.total) * 100;

    expect(hitRate).toBeGreaterThan(70);
    console.log(`Hit Rate: ${hitRate.toFixed(1)}% (${stats.hitCount}/${stats.total} requests)`);
  });
});
