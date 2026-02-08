import { describe, expect, it, vi } from "vitest";
import { CircuitBreakerOpenError, createCircuitBreaker } from "./circuit-breaker.js";

describe("CircuitBreaker", () => {
  describe("closed state", () => {
    it("should start in closed state", () => {
      const cb = createCircuitBreaker("test");
      expect(cb.state()).toBe("closed");
    });

    it("should stay closed on success", async () => {
      const cb = createCircuitBreaker("test");
      const result = await cb.execute(() => Promise.resolve("ok"));
      expect(result).toBe("ok");
      expect(cb.state()).toBe("closed");
    });

    it("should stay closed when failures are below threshold", async () => {
      const cb = createCircuitBreaker("test", { failureThreshold: 3 });
      for (let i = 0; i < 2; i++) {
        await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
      }
      expect(cb.state()).toBe("closed");
    });

    it("should reset failure count on success", async () => {
      const cb = createCircuitBreaker("test", { failureThreshold: 3 });
      // 2 failures
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
      // 1 success resets counter
      await cb.execute(() => Promise.resolve("ok"));
      // 2 more failures should not trip (counter was reset)
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
      expect(cb.state()).toBe("closed");
    });
  });

  describe("open state", () => {
    it("should trip open after failureThreshold consecutive failures", async () => {
      const cb = createCircuitBreaker("test", { failureThreshold: 3 });
      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
      }
      expect(cb.state()).toBe("open");
    });

    it("should reject immediately when open", async () => {
      const cb = createCircuitBreaker("test", {
        failureThreshold: 1,
        resetTimeoutMs: 60_000,
      });
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
      expect(cb.state()).toBe("open");

      await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toThrow(
        CircuitBreakerOpenError,
      );
    });

    it("should include key in CircuitBreakerOpenError", async () => {
      const cb = createCircuitBreaker("my-provider", {
        failureThreshold: 1,
        resetTimeoutMs: 60_000,
      });
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();

      try {
        await cb.execute(() => Promise.resolve("ok"));
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CircuitBreakerOpenError);
        expect((err as CircuitBreakerOpenError).key).toBe("my-provider");
      }
    });
  });

  describe("half-open state", () => {
    it("should transition to half-open after resetTimeoutMs", async () => {
      vi.useFakeTimers();
      try {
        const cb = createCircuitBreaker("test", {
          failureThreshold: 1,
          resetTimeoutMs: 1000,
          successThreshold: 1,
        });
        await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
        expect(cb.state()).toBe("open");

        vi.advanceTimersByTime(1001);

        // Next call should probe (half-open)
        const result = await cb.execute(() => Promise.resolve("probed"));
        expect(result).toBe("probed");
        // With successThreshold=1, single success resets to closed
        expect(cb.state()).toBe("closed");
      } finally {
        vi.useRealTimers();
      }
    });

    it("should reset to closed after successThreshold successes in half-open", async () => {
      vi.useFakeTimers();
      try {
        const cb = createCircuitBreaker("test", {
          failureThreshold: 1,
          resetTimeoutMs: 1000,
          successThreshold: 3,
        });
        await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
        vi.advanceTimersByTime(1001);

        // First success -> half-open
        await cb.execute(() => Promise.resolve("ok"));
        expect(cb.state()).toBe("half-open");
        // Second success -> still half-open
        await cb.execute(() => Promise.resolve("ok"));
        expect(cb.state()).toBe("half-open");
        // Third success -> closed
        await cb.execute(() => Promise.resolve("ok"));
        expect(cb.state()).toBe("closed");
      } finally {
        vi.useRealTimers();
      }
    });

    it("should return to open on failure in half-open", async () => {
      vi.useFakeTimers();
      try {
        const cb = createCircuitBreaker("test", {
          failureThreshold: 1,
          resetTimeoutMs: 1000,
          successThreshold: 3,
        });
        await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
        vi.advanceTimersByTime(1001);

        // First success -> half-open
        await cb.execute(() => Promise.resolve("ok"));
        expect(cb.state()).toBe("half-open");

        // Failure in half-open -> back to open
        await expect(cb.execute(() => Promise.reject(new Error("fail again")))).rejects.toThrow();
        expect(cb.state()).toBe("open");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("shouldTrip filter", () => {
    it("should not trip on filtered errors", async () => {
      const cb = createCircuitBreaker("test", {
        failureThreshold: 1,
        shouldTrip: (err) => {
          if (err instanceof Error && err.message === "auth") {
            return false;
          }
          return true;
        },
      });

      // Auth errors should not trip the breaker
      await expect(cb.execute(() => Promise.reject(new Error("auth")))).rejects.toThrow("auth");
      expect(cb.state()).toBe("closed");

      // Non-auth error should trip
      await expect(cb.execute(() => Promise.reject(new Error("timeout")))).rejects.toThrow(
        "timeout",
      );
      expect(cb.state()).toBe("open");
    });

    it("should not trip in half-open on filtered errors", async () => {
      vi.useFakeTimers();
      try {
        const cb = createCircuitBreaker("test", {
          failureThreshold: 1,
          resetTimeoutMs: 1000,
          successThreshold: 2,
          shouldTrip: (err) => !(err instanceof Error && err.message === "auth"),
        });

        // Trip it open
        await expect(cb.execute(() => Promise.reject(new Error("server")))).rejects.toThrow();
        expect(cb.state()).toBe("open");

        vi.advanceTimersByTime(1001);

        // Filtered error in half-open should NOT return to open
        await expect(cb.execute(() => Promise.reject(new Error("auth")))).rejects.toThrow("auth");
        expect(cb.state()).toBe("half-open");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("reset()", () => {
    it("should force closed state from open", async () => {
      const cb = createCircuitBreaker("test", { failureThreshold: 1 });
      await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
      expect(cb.state()).toBe("open");

      cb.reset();
      expect(cb.state()).toBe("closed");

      // Should work normally after reset
      const result = await cb.execute(() => Promise.resolve("ok"));
      expect(result).toBe("ok");
    });

    it("should force closed state from half-open", async () => {
      vi.useFakeTimers();
      try {
        const cb = createCircuitBreaker("test", {
          failureThreshold: 1,
          resetTimeoutMs: 1000,
          successThreshold: 5,
        });
        await expect(cb.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
        vi.advanceTimersByTime(1001);

        // Enter half-open
        await cb.execute(() => Promise.resolve("ok"));
        expect(cb.state()).toBe("half-open");

        cb.reset();
        expect(cb.state()).toBe("closed");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("passthrough behavior", () => {
    it("should propagate the original error", async () => {
      const cb = createCircuitBreaker("test");
      const original = new Error("specific error");
      try {
        await cb.execute(() => Promise.reject(original));
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(original);
      }
    });

    it("should return the original result", async () => {
      const cb = createCircuitBreaker("test");
      const result = await cb.execute(() => Promise.resolve({ data: 42 }));
      expect(result).toEqual({ data: 42 });
    });
  });
});
