/**
 * AnimatedChatInput Component
 * Floating input bar with Framer Motion animations
 * Auto-expanding textarea with keyboard shortcuts
 */

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useState, useRef, useCallback, memo } from "react";
import { GlassCardPro } from "./GlassCardPro";

interface AnimatedChatInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const AnimatedChatInput = memo(function AnimatedChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
}: AnimatedChatInputProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <GlassCardPro
        blur="md"
        opacity="md"
        surface="input"
        border
        shadow="sm"
        hover="none"
        className={`p-4 transition-all duration-300 ${isFocused ? "ring-2 ring-blue-500" : ""}`}
      >
        <div className="flex gap-3">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder="Type your message... (Shift+Enter for new line)"
            className={`
                flex-1
                dark:bg-transparent light:bg-transparent
                dark:text-white light:text-slate-900
                dark:placeholder:text-slate-400 light:placeholder:text-slate-500
                focus:outline-none
                resize-none
                text-base
                leading-relaxed
                max-h-48
              `}
            rows={1}
          />

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading || disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              rotate: isLoading ? 360 : 0,
            }}
            transition={{
              rotate: {
                duration: 2,
                repeat: isLoading ? Infinity : 0,
              },
            }}
            className={`
                flex-shrink-0
                w-10 h-10
                rounded-lg
                flex items-center justify-center
                transition-all duration-200
                ${
                  text.trim() && !isLoading && !disabled
                    ? "dark:bg-blue-600 light:bg-blue-500 text-white hover:dark:bg-blue-700 hover:light:bg-blue-600"
                    : "dark:bg-slate-700 light:bg-slate-200 dark:text-slate-400 light:text-slate-500 cursor-not-allowed"
                }
              `}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </GlassCardPro>
    </motion.div>
  );
});
