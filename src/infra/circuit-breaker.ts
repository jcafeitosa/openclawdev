export type CircuitBreakerState = "closed" | "open" | "half-open";

/** Serializable circuit breaker state for persistence (e.g. Redis). */
export type CircuitBreakerSnapshot = {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: number;
};

export type CircuitBreakerConfig = {
  /** Number of consecutive failures before tripping to open state (default: 5) */
  failureThreshold?: number;
  /** Number of consecutive successes in half-open to reset to closed (default: 2) */
  successThreshold?: number;
  /** Milliseconds before transitioning from open to half-open (default: 60_000) */
  resetTimeoutMs?: number;
  /** Filter which errors count toward the failure threshold (default: all errors count) */
  shouldTrip?: (err: unknown) => boolean;
};

export type CircuitBreaker = {
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  state: () => CircuitBreakerState;
  reset: () => void;
  /** Capture a serializable snapshot for persistence. */
  snapshot: () => CircuitBreakerSnapshot;
  /** Restore state from a persisted snapshot. */
  restore: (snap: CircuitBreakerSnapshot) => void;
};

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly key: string) {
    super(`Circuit breaker open for "${key}"`);
    this.name = "CircuitBreakerOpenError";
  }
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_SUCCESS_THRESHOLD = 2;
const DEFAULT_RESET_TIMEOUT_MS = 60_000;

export function createCircuitBreaker(key: string, config?: CircuitBreakerConfig): CircuitBreaker {
  const failureThreshold = config?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const successThreshold = config?.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD;
  const resetTimeoutMs = config?.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;
  const shouldTrip = config?.shouldTrip ?? (() => true);

  let currentState: CircuitBreakerState = "closed";
  let failureCount = 0;
  let successCount = 0;
  let lastFailureTime = 0;

  function state(): CircuitBreakerState {
    return currentState;
  }

  function reset(): void {
    currentState = "closed";
    failureCount = 0;
    successCount = 0;
    lastFailureTime = 0;
  }

  function onSuccess(): void {
    if (currentState === "half-open") {
      successCount += 1;
      if (successCount >= successThreshold) {
        reset();
      }
    } else {
      // In closed state, reset failure count on success
      failureCount = 0;
    }
  }

  function onFailure(err: unknown): void {
    if (!shouldTrip(err)) {
      return;
    }
    if (currentState === "half-open") {
      // Any trippable failure in half-open returns to open
      currentState = "open";
      lastFailureTime = Date.now();
      failureCount = failureThreshold;
      successCount = 0;
      return;
    }
    // Closed state
    failureCount += 1;
    if (failureCount >= failureThreshold) {
      currentState = "open";
      lastFailureTime = Date.now();
    }
  }

  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    if (currentState === "open") {
      const elapsed = Date.now() - lastFailureTime;
      if (elapsed < resetTimeoutMs) {
        throw new CircuitBreakerOpenError(key);
      }
      // Transition to half-open for probe
      currentState = "half-open";
      successCount = 0;
    }

    try {
      const result = await fn();
      onSuccess();
      return result;
    } catch (err) {
      onFailure(err);
      throw err;
    }
  }

  function snapshot(): CircuitBreakerSnapshot {
    return { state: currentState, failureCount, lastFailureTime };
  }

  function restore(snap: CircuitBreakerSnapshot): void {
    currentState = snap.state;
    failureCount = snap.failureCount;
    lastFailureTime = snap.lastFailureTime;
    successCount = 0;
  }

  return { execute, state, reset, snapshot, restore };
}
