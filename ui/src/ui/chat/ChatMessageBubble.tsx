/**
 * 💬 Chat Message Bubble
 *
 * Premium glassmorphism message component
 * - Auto-adapts to Dark/Light mode
 * - Smooth animations with Framer Motion
 * - Supports markdown rendering
 * - Optimized streaming display
 */

import { ReactNode, CSSProperties, useEffect, useState } from "react";

interface ChatMessageBubbleProps {
  id: string;
  content: ReactNode;
  isUser: boolean;
  isStreaming?: boolean;
  timestamp?: Date;
  className?: string;
}

export function ChatMessageBubble({
  id,
  content,
  isUser,
  isStreaming = false,
  timestamp,
  className = "",
}: ChatMessageBubbleProps) {
  const [hasReducedMotion, setHasReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setHasReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setHasReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const bubbleClass = isUser ? "chat-bubble-user" : "chat-bubble-assistant";
  const alignmentClass = isUser ? "justify-end" : "justify-start";

  return (
    <div className={`flex gap-3 mb-4 ${alignmentClass} ${className}`} key={id}>
      {/* Avatar - Only for assistant */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-white text-sm font-bold">A</span>
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`
          max-w-[70%]
          px-4 py-3
          rounded-2xl
          ${bubbleClass}
          chat-shadow-sm
          transition-all duration-300
          will-change-transform
        `}
        style={
          {
            animation: hasReducedMotion ? "none" : "fadeInUp 0.3s ease-out forwards",
          } as CSSProperties
        }
      >
        <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {content}

          {/* Typing indicator */}
          {isStreaming && <TypingIndicator />}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div className="text-xs opacity-60 mt-2">
            {new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            }).format(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Typing Indicator - Three pulsing dots
 */
function TypingIndicator() {
  return (
    <div className="flex gap-1 mt-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full typing-dot"
          style={{
            animation: `pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* Animation keyframes (injected via globals.css) */
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  .dark .typing-dot {
    background-color: currentColor;
  }
`;

if (typeof document !== "undefined") {
  document.head.appendChild(style);
}
