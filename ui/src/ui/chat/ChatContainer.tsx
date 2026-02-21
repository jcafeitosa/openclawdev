import React, { useRef, useEffect } from "react";
import { ChatInput } from "./ChatInput";
import { Markdown } from "./Markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  isLoading,
}) => {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="flex-1 overflow-y-auto px-4 md:px-0">
        <div className="max-w-2xl mx-auto pt-12 pb-48 space-y-10">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-700 mb-10">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-semibold text-xl shadow-md mb-6 tracking-tight">
                OC
              </div>
              <h1 className="text-3xl font-medium text-slate-800 tracking-tight mb-2">
                Como posso ajudar?
              </h1>
              <p className="text-slate-500 text-base">Inicie uma conversa ou selecione uma ação.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2 select-none">
                  <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center text-[10px] text-white font-medium shadow-sm">
                    OC
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">OpenClaw</span>
                </div>
              )}

              <div
                className={`max-w-[90%] ${
                  msg.role === "user"
                    ? "bg-slate-100 text-slate-800 rounded-2xl px-5 py-3.5 shadow-sm text-[15px]"
                    : "text-slate-800 leading-relaxed text-[15.5px]"
                }`}
              >
                <Markdown content={msg.content} />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 py-2 animate-in fade-in duration-300">
              <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center text-[10px] text-white font-medium shadow-sm animate-pulse">
                OC
              </div>
              <div className="flex gap-1.5 ml-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={scrollAnchorRef} className="h-4 w-full" />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none h-40 -top-24"></div>
        <div className="relative bg-white pb-6 px-4">
          <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
