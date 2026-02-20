/**
 * StreamingChatMessage Component
 * Displays chat messages with token-by-token streaming support
 * Integrates with useTokenStream for P99 optimization
 */

import { motion } from "framer-motion";
import { useState, useCallback, useRef, useEffect, memo } from "react";
import { useTokenStream } from "@/hooks/useTokenStream";
import type { StreamToken } from "@/hooks/useTokenStream";
import type { MessageRole } from "@/lib/types/chat";
import { GlassCardPro } from "./GlassCardPro";

interface StreamingChatMessageProps {
  messageId: string;
  role: MessageRole | "user" | "assistant";
  initialContent?: string;
  isComplete?: boolean;
  onComplete?: (finalContent: string) => void;
  className?: string;
}

export const StreamingChatMessage = memo(function StreamingChatMessage({
  messageId,
  role,
  initialContent = "",
  isComplete = false,
  onComplete,
  className = "",
}: StreamingChatMessageProps) {
  // State
  const [content, setContent] = useState(initialContent);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUser = role === "user";

  // Streaming hook
  const { addToken, requestScroll, isStreaming, metrics } = useTokenStream(
    useCallback((batch: StreamToken[]) => {
      // Update content with new tokens
      setContent((prev) => {
        const updated = prev + batch.map((t) => t.text).join("");
        return updated;
      });

      // Request auto-scroll
      requestScroll(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }, []),
    {
      batchSize: 5,
      maxBufferSize: 50,
      debounceMs: 50,
      enableMetrics: true,
    },
  );

  // Complete stream
  const handleStreamComplete = useCallback(() => {
    setContent((currentContent) => {
      if (onComplete) {
        onComplete(currentContent);
      }
      return currentContent;
    });
  }, [onComplete]);

  // Expose addToken for external streaming handlers
  useEffect(() => {
    // Store on window for SSR context or parent access
    (window as any)[`stream_${messageId}`] = addToken;
    return () => {
      delete (window as any)[`stream_${messageId}`];
    };
  }, [addToken, messageId]);

  // Auto-complete when isComplete prop changes
  useEffect(() => {
    if (isComplete && !isStreaming) {
      handleStreamComplete();
    }
  }, [isComplete, isStreaming, handleStreamComplete]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 mb-4 ${isUser ? "justify-end" : "justify-start"} ${className}`}
    >
      {/* Avatar - only for assistant */}
      {!isUser && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 40,
            delay: 0.1,
          }}
          className="w-8 h-8 rounded-full dark:bg-blue-600 bg-blue-500 flex items-center justify-center flex-shrink-0"
        >
          <span className="text-white text-sm font-bold">A</span>
        </motion.div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-2 max-w-[70%]">
        <GlassCardPro
          blur="lg"
          opacity={isUser ? "lg" : "md"}
          surface={isUser ? "primary" : "secondary"}
          shadow="md"
          hover={isUser ? "none" : "lift"}
          className={`
              px-4 py-3
              ${
                isUser
                  ? "dark:bg-blue-600 light:bg-blue-500 text-white"
                  : "dark:text-slate-100 light:text-slate-900"
              }
            `}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content || (isStreaming ? "..." : "")}

            {isStreaming && <TypingIndicator />}
          </div>
        </GlassCardPro>

        {/* Performance metrics (dev only) */}
        {process.env.NODE_ENV === "development" && metrics && (
          <div className="text-xs dark:text-slate-400 light:text-slate-600">
            {metrics.tokensRendered} tokens | {metrics.averageLatency.toFixed(0)}ms avg |{" "}
            {metrics.p99Latency}ms p99
          </div>
        )}
      </div>
    </motion.div>
  );
});

/**
 * Typing Indicator - Three pulsing dots
 */
function TypingIndicator() {
  return (
    <motion.div
      className="flex gap-1 mt-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full dark:bg-slate-300 bg-slate-600"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}
