import { useStore } from "@nanostores/react";
import React, { useCallback, useEffect } from "react";
import { gateway, $gatewayEvent } from "../../services/gateway";
import { $activeSession } from "../../stores/app";
import {
  $chatMessages,
  $chatStream,
  $chatSending,
  $chatLoading,
  $chatMessage,
} from "../../stores/chat";
import { ChatContainer } from "./ChatContainer";

export const ChatIsland: React.FC = () => {
  const sessionKey = useStore($activeSession) || "main";
  const rawMessages = useStore($chatMessages);
  const streamingText = useStore($chatStream);
  const isSending = useStore($chatSending);
  const isLoading = useStore($chatLoading);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (rawMessages || []).map((msg: any, idx: number) => {
    let content = "";
    if (Array.isArray(msg.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content = msg.content.map((c: any) => c.text || "").join("\n");
    } else {
      content = msg.content || "";
    }

    return {
      id: msg.id || `msg-${idx}-${msg.timestamp || Date.now()}`,
      role: msg.role as "user" | "assistant",
      content: content,
      timestamp: msg.timestamp || Date.now(),
    };
  });

  if (streamingText) {
    messages.push({
      id: "streaming-msg",
      role: "assistant",
      content: streamingText,
      timestamp: Date.now(),
    });
  }

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }
      $chatSending.set(true);
      try {
        await gateway.call("chat.send", {
          sessionKey,
          message: text,
          attachments: [],
        });
        $chatMessage.set("");
      } catch (err) {
        console.error("[Chat] Failed to send message:", err);
        $chatSending.set(false);
      }
    },
    [sessionKey],
  );

  useEffect(() => {
    const refresh = async () => {
      $chatLoading.set(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await gateway.call<any>("chat.history", { sessionKey });
        $chatMessages.set(result.messages || []);
      } catch (err) {
        console.error("[Chat] History load failed:", err);
      } finally {
        $chatLoading.set(false);
      }
    };
    void refresh();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsub = $gatewayEvent.subscribe((evt: any) => {
      if (evt?.event === "chat") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = evt.payload;
        if (payload?.sessionKey === sessionKey) {
          if (payload.state === "delta") {
            const text = payload.message?.content?.[0]?.text;
            if (text !== undefined) {
              $chatStream.set(text);
            }
          } else if (payload.state === "final") {
            $chatStream.set(null);
            $chatSending.set(false);
            void refresh();
          }
        }
      }
    });

    return () => unsub();
  }, [sessionKey]);

  return (
    <div className="w-full h-full">
      <ChatContainer
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isSending || isLoading}
      />
    </div>
  );
};
