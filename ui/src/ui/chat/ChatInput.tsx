import React, { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = "Enviar mensagem...",
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "48px"; // Base height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + "px";
    }
  }, [message]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative flex items-end w-full bg-slate-50 border border-slate-200/80 rounded-[28px] shadow-sm focus-within:bg-white focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-50 transition-all duration-300 p-1.5 pl-4">
        {/* Attachment Button */}
        <button className="flex items-center justify-center w-10 h-10 mb-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors shrink-0">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-3.5 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 resize-none overflow-y-auto text-[16px] leading-snug"
          style={{ height: "48px" }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className={`flex items-center justify-center w-10 h-10 mb-1 rounded-[20px] transition-all duration-300 shrink-0 ${
            message.trim() && !isLoading
              ? "bg-slate-800 text-white shadow hover:bg-slate-700 active:scale-95"
              : "bg-slate-200/50 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
