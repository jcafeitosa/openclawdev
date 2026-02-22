/**
 * OpenAI-compatible chat completions route — Express Router.
 *
 * POST /v1/chat/completions — OpenAI chat completions API with streaming support.
 * Streaming uses SSE written directly to the Express response.
 */

import { Router } from "express";
import {
  buildHistoryContextFromEntries,
  type HistoryEntry,
} from "../../auto-reply/reply/history.js";
import { createDefaultDeps } from "../../cli/deps.js";
import { agentCommand } from "../../commands/agent.js";
import { emitAgentEvent, onAgentEvent } from "../../infra/agent-events.js";
import { defaultRuntime } from "../../runtime.js";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "../auth.js";
import { getBearerToken } from "../http-utils.js";
import { resolveAgentIdForRequest, resolveSessionKey } from "../http-utils.js";

type OpenAiChatMessage = {
  role?: unknown;
  content?: unknown;
  name?: unknown;
};

type OpenAiChatCompletionRequest = {
  model?: unknown;
  stream?: unknown;
  messages?: unknown;
  user?: unknown;
};

function asMessages(val: unknown): OpenAiChatMessage[] {
  return Array.isArray(val) ? (val as OpenAiChatMessage[]) : [];
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }
        const type = (part as { type?: unknown }).type;
        const text = (part as { text?: unknown }).text;
        const inputText = (part as { input_text?: unknown }).input_text;
        if (type === "text" && typeof text === "string") {
          return text;
        }
        if (type === "input_text" && typeof text === "string") {
          return text;
        }
        if (typeof inputText === "string") {
          return inputText;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function buildAgentPrompt(messagesUnknown: unknown): {
  message: string;
  extraSystemPrompt?: string;
} {
  const messages = asMessages(messagesUnknown);

  const systemParts: string[] = [];
  const conversationEntries: Array<{ role: "user" | "assistant" | "tool"; entry: HistoryEntry }> =
    [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      continue;
    }
    const role = typeof msg.role === "string" ? msg.role.trim() : "";
    const content = extractTextContent(msg.content).trim();
    if (!role || !content) {
      continue;
    }
    if (role === "system" || role === "developer") {
      systemParts.push(content);
      continue;
    }

    const normalizedRole = role === "function" ? "tool" : role;
    if (normalizedRole !== "user" && normalizedRole !== "assistant" && normalizedRole !== "tool") {
      continue;
    }

    const name = typeof msg.name === "string" ? msg.name.trim() : "";
    const sender =
      normalizedRole === "assistant"
        ? "Assistant"
        : normalizedRole === "user"
          ? "User"
          : name
            ? `Tool:${name}`
            : "Tool";

    conversationEntries.push({
      role: normalizedRole,
      entry: { sender, body: content },
    });
  }

  let message = "";
  if (conversationEntries.length > 0) {
    let currentIndex = -1;
    for (let i = conversationEntries.length - 1; i >= 0; i -= 1) {
      const entryRole = conversationEntries[i]?.role;
      if (entryRole === "user" || entryRole === "tool") {
        currentIndex = i;
        break;
      }
    }
    if (currentIndex < 0) {
      currentIndex = conversationEntries.length - 1;
    }
    const currentEntry = conversationEntries[currentIndex]?.entry;
    if (currentEntry) {
      const historyEntries = conversationEntries.slice(0, currentIndex).map((entry) => entry.entry);
      if (historyEntries.length === 0) {
        message = currentEntry.body;
      } else {
        const formatEntry = (entry: HistoryEntry) => `${entry.sender}: ${entry.body}`;
        message = buildHistoryContextFromEntries({
          entries: [...historyEntries, currentEntry],
          currentMessage: formatEntry(currentEntry),
          formatEntry,
        });
      }
    }
  }

  return {
    message,
    extraSystemPrompt: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
  };
}

function coerceRequest(val: unknown): OpenAiChatCompletionRequest {
  if (!val || typeof val !== "object") {
    return {};
  }
  return val as OpenAiChatCompletionRequest;
}

export function openAiRouter(params: { auth: ResolvedGatewayAuth }) {
  const { auth } = params;
  const router = Router();

  router.post("/v1/chat/completions", async (req, res) => {
    const token = getBearerToken(req);

    const authResult = await authorizeGatewayConnect({
      auth,
      connectAuth: { token, password: token },
      req,
      trustedProxies: undefined,
    });
    if (!authResult.ok) {
      res.status(401).json({ error: { message: "Unauthorized", type: "unauthorized" } });
      return;
    }

    const payload = coerceRequest(req.body);
    const stream = Boolean(payload.stream);
    const model = typeof payload.model === "string" ? payload.model : "openclaw";
    const user = typeof payload.user === "string" ? payload.user : undefined;

    const agentId = resolveAgentIdForRequest({ req, model });
    const sessionKey = resolveSessionKey({ req, agentId, user, prefix: "openai" });

    const prompt = buildAgentPrompt(payload.messages);
    if (!prompt.message) {
      res.status(400).json({
        error: {
          message: "Missing user message in `messages`.",
          type: "invalid_request_error",
        },
      });
      return;
    }

    const runId = `chatcmpl_${crypto.randomUUID()}`;
    const deps = createDefaultDeps();

    // Non-streaming mode
    if (!stream) {
      try {
        const result = await agentCommand(
          {
            message: prompt.message,
            extraSystemPrompt: prompt.extraSystemPrompt,
            sessionKey,
            runId,
            deliver: false,
            messageChannel: "webchat",
            bestEffortDeliver: false,
          },
          defaultRuntime,
          deps,
        );

        const payloads = (result as { payloads?: Array<{ text?: string }> } | null)?.payloads;
        const content =
          Array.isArray(payloads) && payloads.length > 0
            ? payloads
                .map((p) => (typeof p.text === "string" ? p.text : ""))
                .filter(Boolean)
                .join("\n\n")
            : "No response from OpenClaw.";

        res.json({
          id: runId,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });
      } catch (err) {
        res.status(500).json({
          error: { message: String(err), type: "api_error" },
        });
      }
      return;
    }

    // Streaming mode — write SSE directly to response
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let wroteRole = false;
    let sawAssistantDelta = false;
    let closed = false;

    req.on("close", () => {
      closed = true;
    });

    const writeSse = (data: unknown) => {
      if (closed || res.destroyed) {
        return;
      }
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const writeDone = () => {
      if (closed || res.destroyed) {
        return;
      }
      res.write("data: [DONE]\n\n");
    };

    const finish = () => {
      if (closed) {
        return;
      }
      closed = true;
      unsubscribe();
      writeDone();
      res.end();
    };

    const unsubscribe = onAgentEvent((evt) => {
      if (evt.runId !== runId) {
        return;
      }
      if (closed) {
        return;
      }

      if (evt.stream === "assistant") {
        const delta = evt.data?.delta;
        const text = evt.data?.text;
        const content = typeof delta === "string" ? delta : typeof text === "string" ? text : "";
        if (!content) {
          return;
        }

        if (!wroteRole) {
          wroteRole = true;
          writeSse({
            id: runId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: { role: "assistant" } }],
          });
        }

        sawAssistantDelta = true;
        writeSse({
          id: runId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, delta: { content }, finish_reason: null }],
        });
        return;
      }

      if (evt.stream === "lifecycle") {
        const phase = evt.data?.phase;
        if (phase === "end" || phase === "error") {
          finish();
        }
      }
    });

    // Run agent command asynchronously
    void (async () => {
      try {
        const result = await agentCommand(
          {
            message: prompt.message,
            extraSystemPrompt: prompt.extraSystemPrompt,
            sessionKey,
            runId,
            deliver: false,
            messageChannel: "webchat",
            bestEffortDeliver: false,
          },
          defaultRuntime,
          deps,
        );

        if (closed) {
          return;
        }

        // Fallback: if no streaming deltas were received, send full response
        if (!sawAssistantDelta) {
          if (!wroteRole) {
            wroteRole = true;
            writeSse({
              id: runId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [{ index: 0, delta: { role: "assistant" } }],
            });
          }

          const payloads = (result as { payloads?: Array<{ text?: string }> } | null)?.payloads;
          const content =
            Array.isArray(payloads) && payloads.length > 0
              ? payloads
                  .map((p) => (typeof p.text === "string" ? p.text : ""))
                  .filter(Boolean)
                  .join("\n\n")
              : "No response from OpenClaw.";

          sawAssistantDelta = true;
          writeSse({
            id: runId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: { content }, finish_reason: null }],
          });
        }
      } catch (err) {
        if (closed) {
          return;
        }
        writeSse({
          id: runId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              delta: { content: `Error: ${String(err)}` },
              finish_reason: "stop",
            },
          ],
        });
        emitAgentEvent({
          runId,
          stream: "lifecycle",
          data: { phase: "error" },
        });
      } finally {
        finish();
      }
    })();
  });

  return router;
}
