/**
 * 📝 Chat Input Component
 *
 * Premium glassmorphic input with:
 * - Auto-expanding textarea
 * - Dark/Light mode support
 * - Smooth focus animations
 * - Accessible keyboard shortcuts
 */

import { useState, useRef, useCallback, memo } from "react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = memo(function ChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Type your message...",
  className = "",
}: ChatInputProps & { className?: string }) {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setText(target.value);

    // Auto-expand height
    target.style.height = "auto";
    const newHeight = Math.min(target.scrollHeight, 200);
    target.style.height = `${newHeight}px`;
  }, []);

  const handleSubmit = useCallback(() => {
    if (text.trim() && !isLoading && !disabled) {
      onSubmit(text);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [text, onSubmit, isLoading, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const isSubmitReady = text.trim() && !isLoading && !disabled;

  return (
    <div
      className={`
        chat-input-container
        rounded-2xl p-4
        ${isFocused ? "ring-2 ring-blue-500" : ""}
      `}
    >
      <div className="flex gap-3 items-end">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            flex-1
            chat-input-textarea
            focus:outline-none
            resize-none
            text-base
            leading-relaxed
            max-h-48
            bg-transparent
            transition-colors duration-200
          `}
          rows={1}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "currentColor transparent",
          }}
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isSubmitReady}
          className={`
            flex-shrink-0
            w-10 h-10
            rounded-lg
            flex items-center justify-center
            transition-all duration-200
            flex-none
            ${
              isSubmitReady
                ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }
          `}
          aria-label="Send message"
        >
          {isLoading ? (
            <svg
              className="w-5 h-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16.691 5.269a1.5 1.5 0 00-2.121 0l-10.5 10.5a1.5 1.5 0 102.121 2.121l10.5-10.5a1.5 1.5 0 000-2.121z" />
              <path d="M19.5 1.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
});
