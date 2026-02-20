/**
 * Chat Pro Max V4 - Modern Minimalist with Tailwind 4
 * Fully compatible with Tailwind CSS 4 + @astrojs/tailwind
 */

import React, { useState, useRef, useEffect } from "react";
import { ChatInput } from "./ChatInput";
import { MarkdownPro } from "./MarkdownPro";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatContainerProps {
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
  streamingContent?: string | null;
  isLoading?: boolean;
  agentName?: string;
  agentStatus?: "online" | "offline" | "idle";
}

export function ChatContainer({
  onSendMessage,
  messages,
  streamingContent = "",
  isLoading = false,
  agentName = "Assistant",
  agentStatus = "online",
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex h-screen w-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 h-screen bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              O
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">OpenClaw</div>
              <div className="text-xs text-slate-500">Pro Max</div>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-6 py-4">
          <button className="btn-primary w-full">+ Nova Conversa</button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 py-2 mb-2">
            Histórico
          </div>
          {messages.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-slate-400">
              Nenhuma conversa ainda
            </div>
          ) : (
            <button className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors text-sm font-medium truncate">
              Conversa Atual
            </button>
          )}
        </div>

        {/* User Profile */}
        <div className="p-6 border-t border-slate-200">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">Julio C.</div>
              <div className="text-xs text-slate-500">Engineer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Agent Header */}
        <div className="h-16 px-8 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
              {agentName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{agentName}</div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${agentStatus === "online" ? "bg-green-500" : "bg-slate-400"}`}
                ></div>
                <span className="text-xs text-slate-500 capitalize">{agentStatus}</span>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg
              className="w-5 h-5 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-6">
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
            {/* Empty State */}
            {messages.length === 0 && !streamingContent && (
              <div className="flex flex-col items-center justify-center pt-20">
                <div className="text-center mb-12">
                  <h1 className="text-5xl font-bold text-slate-900 mb-3">Como posso ajudar?</h1>
                  <p className="text-lg text-slate-500">Comece uma conversa ou envie um comando</p>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  {["Revisar Código", "Escrever Teste", "Debugar Erro", "Otimizar Performance"].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => onSendMessage(suggestion)}
                        className="card p-4 hover:border-slate-300 hover:bg-slate-50 text-left"
                      >
                        <p className="text-sm font-semibold text-slate-900">{suggestion}</p>
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 animate-fade-in ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xl px-4 py-3 rounded-xl break-words ${
                    message.role === "user" ? "message-user" : "message-assistant"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose-custom">
                      <MarkdownPro content={message.content} />
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {streamingContent && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-xl message-assistant px-4 py-3">
                  <div className="prose-custom">
                    <MarkdownPro content={streamingContent} />
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && !streamingContent && (
              <div className="flex justify-start">
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex gap-2">
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce-pulse"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-white px-8 py-6">
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex gap-4 items-end">
              <button className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                <svg
                  className="w-6 h-6 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>

              <div className="flex-1">
                <ChatInput
                  onSubmit={onSendMessage}
                  isLoading={isLoading}
                  placeholder="Escreva algo..."
                  className="input-base"
                />
              </div>

              <button className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                <svg
                  className="w-6 h-6 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4"
                  />
                </svg>
              </button>

              <button
                onClick={() => {
                  const input = document.querySelector("textarea") as HTMLTextAreaElement;
                  if (input?.value) {
                    onSendMessage(input.value);
                    input.value = "";
                  }
                }}
                disabled={isLoading}
                className="btn-primary disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.40795457,22.99 3.50612381,23.1 4.13399899,22.9429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 C22.9702544,11.6889879 22.9702544,11.5318905 22.9702544,11.4748931 L4.13399899,2.57748479 C3.34915502,2.25696924 2.40795457,2.3139667 1.77946707,2.78526495 C0.994623095,3.4077381 0.837654326,4.50702624 1.15159189,5.29251322 L3.03521743,11.7335061 C3.03521743,11.89 3.19218622,12.0471035 3.50612381,12.0471035 L16.6915026,12.8325905 C16.6915026,12.8325905 17.1624089,12.8325905 17.1624089,12.3613981 C17.1624089,11.8902057 17.1624089,12.4744748 16.6915026,12.4744748 Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;
