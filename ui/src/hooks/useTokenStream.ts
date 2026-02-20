/**
 * 🚀 useTokenStream Hook
 *
 * Optimized token streaming for LLM chat with P99 latency focus
 * - Batches tokens for efficient rendering
 * - Debounces auto-scroll
 * - Tracks performance metrics
 * - Respects animation frame timing
 */

import { useCallback, useRef, useState, useEffect } from "react";

export interface StreamToken {
  id: string;
  text: string;
  timestamp: number;
  index: number;
}

export interface StreamConfig {
  batchSize?: number; // Tokens to batch per render (default: 5)
  maxBufferSize?: number; // Max buffered tokens (default: 50)
  debounceMs?: number; // Scroll debounce (default: 50)
  enableMetrics?: boolean; // Track performance (default: false)
}

interface StreamMetrics {
  tokensReceived: number;
  tokensRendered: number;
  averageLatency: number;
  p99Latency: number;
  frameDrops: number;
}

export function useTokenStream(onToken: (batch: StreamToken[]) => void, config: StreamConfig = {}) {
  const { batchSize = 5, maxBufferSize = 50, debounceMs = 50, enableMetrics = false } = config;

  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);

  // Refs for non-blocking operations
  const bufferRef = useRef<StreamToken[]>([]);
  const rafRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTokenTimeRef = useRef<number>(Date.now());
  const tokenIndexRef = useRef<number>(0);

  // Performance tracking
  const metricsRef = useRef({
    tokensReceived: 0,
    tokensRendered: 0,
    latencies: [] as number[],
    frameDrops: 0,
    lastFrameTime: typeof performance !== "undefined" ? performance.now() : Date.now(),
  });

  // Check for frame drops (should be <16ms for 60fps)
  const checkFrameHealth = useCallback(() => {
    if (typeof performance === "undefined") {
      return;
    }
    const now = performance.now();
    const frameTime = now - metricsRef.current.lastFrameTime;
    if (frameTime > 20) {
      metricsRef.current.frameDrops++;
    }
    metricsRef.current.lastFrameTime = now;
  }, []);

  // Batch and flush tokens on animation frame
  const flushBuffer = useCallback(() => {
    checkFrameHealth();

    if (bufferRef.current.length === 0) {
      setIsStreaming(false);
      return;
    }

    // Take up to batchSize tokens
    const batch = bufferRef.current.splice(0, batchSize);

    // Track metrics
    if (enableMetrics) {
      metricsRef.current.tokensRendered += batch.length;

      // Calculate latency for this batch
      const now = Date.now();
      const latencies = batch.map((t) => now - t.timestamp);
      metricsRef.current.latencies.push(...latencies);
    }

    // Send batch to handler (non-blocking)
    onToken(batch);

    // Schedule next flush if more tokens waiting
    if (bufferRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(flushBuffer);
    } else {
      setIsStreaming(false);
    }
  }, [onToken, batchSize, enableMetrics, checkFrameHealth]);

  // Add token to buffer
  const addToken = useCallback(
    (text: string) => {
      // Validate token
      if (!text || typeof text !== "string") {
        console.warn("Invalid token:", text);
        return;
      }

      // Track metrics
      if (enableMetrics) {
        metricsRef.current.tokensReceived++;
      }

      // Create token object
      const token: StreamToken = {
        id: `${Date.now()}-${tokenIndexRef.current++}`,
        text,
        timestamp: Date.now(),
        index: tokenIndexRef.current,
      };

      // Add to buffer
      bufferRef.current.push(token);

      // Drop oldest tokens if buffer exceeds maxBufferSize
      if (bufferRef.current.length > maxBufferSize) {
        bufferRef.current.shift();
      }

      // Set streaming state
      setIsStreaming(true);

      // Schedule flush if not already scheduled
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flushBuffer);
      }

      lastTokenTimeRef.current = Date.now();
    },
    [flushBuffer, batchSize, maxBufferSize, enableMetrics],
  );

  // Request scroll (debounced to prevent thrashing)
  const requestScroll = useCallback(
    (scrollFn: () => void) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        scrollFn();
      }, debounceMs);
    },
    [debounceMs],
  );

  // Complete stream
  const complete = useCallback(() => {
    // Flush any remaining tokens immediately
    if (bufferRef.current.length > 0) {
      const remaining = bufferRef.current.splice(0);
      if (enableMetrics) {
        metricsRef.current.tokensRendered += remaining.length;
      }
      onToken(remaining);
    }

    // Clean up
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    setIsStreaming(false);

    // Calculate final metrics
    if (enableMetrics && metricsRef.current.latencies.length > 0) {
      const latencies = [...metricsRef.current.latencies].toSorted((a, b) => a - b);
      const p99Index = Math.ceil(latencies.length * 0.99) - 1;

      setMetrics({
        tokensReceived: metricsRef.current.tokensReceived,
        tokensRendered: metricsRef.current.tokensRendered,
        averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p99Latency: latencies[Math.max(0, p99Index)],
        frameDrops: metricsRef.current.frameDrops,
      });
    }
  }, [onToken, enableMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    addToken,
    requestScroll,
    complete,
    isStreaming,
    bufferSize: bufferRef.current.length,
    metrics,
  };
}
