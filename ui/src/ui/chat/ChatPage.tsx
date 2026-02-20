/**
 * ChatPage Component
 * Pro Max Chat interface with streaming, glass effects, and animations
 * Combines all chat components into a unified chat interface
 */

import { motion } from "framer-motion";
import { useState, useCallback, useRef, useEffect, memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/lib/types/chat";
import { AnimatedChatInput } from "./AnimatedChatInput";
import { StreamingChatMessage } from "./StreamingChatMessage";

interface ChatPageProps {
  title?: string;
  onMessageSend?: (message: string) => Promise<string>;
}

export const ChatPage = memo(function ChatPage({
  title = "Pro Max Chat",
  onMessageSend,
}: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle message submission
  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Create assistant message
      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(true);

      try {
        // Simulate streaming response
        if (onMessageSend) {
          const response = await onMessageSend(text);

          // Simulate token streaming for demo
          const streamFn = (window as any)[`stream_${assistantId}`];
          if (streamFn) {
            // Split response into tokens and stream them
            for (const char of response) {
              streamFn(char);
              await new Promise((resolve) => setTimeout(resolve, 10));
            }

            // Mark as complete
            const completeFn = (window as any)[`complete_${assistantId}`];
            if (completeFn) {
              completeFn();
            }
          }
        } else {
          // Demo response
          const demoResponse =
            "This is a demo response. In production, this would be replaced with actual API calls to your LLM endpoint. The streaming system will display tokens as they arrive from the server.";

          const streamFn = (window as any)[`stream_${assistantId}`];
          if (streamFn) {
            for (const char of demoResponse) {
              streamFn(char);
              await new Promise((resolve) => setTimeout(resolve, 20));
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: "Error: Failed to get response",
                  isStreaming: false,
                }
              : msg,
          ),
        );
      } finally {
        setIsLoading(false);

        // Mark message as complete
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantId ? { ...msg, isStreaming: false } : msg)),
        );
      }
    },
    [onMessageSend],
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  return (
    <div
      className={`
          flex flex-col h-screen
          dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800
          light:bg-gradient-to-br light:from-white light:to-slate-50
          transition-colors duration-300
        `}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
            border-b border-white/10
            dark:bg-slate-900/50 light:bg-white/50
            backdrop-blur-lg
            p-4
            sticky top-0 z-10
          `}
      >
        <h1 className="text-xl font-bold dark:text-white light:text-slate-900">{title}</h1>
        <p className="text-sm dark:text-slate-400 light:text-slate-600">
          Pro Max Interface with Streaming & Glassmorphism
        </p>
      </motion.div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 space-y-2">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                  flex flex-col items-center justify-center h-96
                  dark:text-slate-400 light:text-slate-600
                `}
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Welcome to Pro Max Chat</h2>
                <p>Start a conversation to see streaming in action</p>
              </div>
            </motion.div>
          )}

          {messages.map((message) => (
            <StreamingChatMessage
              key={message.id}
              messageId={message.id}
              role={message.role}
              initialContent={message.content}
              isComplete={!message.isStreaming}
              className="transition-all duration-300"
            />
          ))}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div
        className={`
            border-t border-white/10
            dark:bg-slate-900/50 light:bg-white/50
            backdrop-blur-lg
            p-4
            sticky bottom-0 z-10
          `}
      >
        <AnimatedChatInput onSubmit={handleSubmit} isLoading={isLoading} disabled={isLoading} />
      </div>
    </div>
  );
});
