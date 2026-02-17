/**
 * Shared types for Telegram command handlers
 */

export interface TelegramContext {
  chatId: number;
  userId: number;
  username?: string;
  messageId: number;
  text: string;
  reply: (text: string, options?: ReplyOptions) => Promise<void>;
  replyWithMarkdown: (text: string, options?: ReplyOptions) => Promise<void>;
  replyWithHTML: (text: string, options?: ReplyOptions) => Promise<void>;
}

export interface ReplyOptions {
  parse_mode?: "Markdown" | "HTML";
  disable_web_page_preview?: boolean;
  reply_to_message_id?: number;
  reply_markup?: InlineKeyboardMarkup;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export type CommandHandler = (ctx: TelegramContext, args: string[]) => Promise<void>;

export interface HandlerRegistry {
  [command: string]: CommandHandler;
}

export interface AgentInfo {
  id: string;
  name?: string;
  role?: string;
  expertise?: string[];
  canSpawn?: boolean;
  model?: string;
  tools?: string;
}

/**
 * Raw agent config structure from openclaw.json
 */
export interface RawAgentConfig {
  id: string;
  identity?: {
    name?: string;
    role?: string;
    expertise?: string[];
  };
  role?: string;
  model?: {
    primary?: string;
  };
  tools?: string;
  subagents?: {
    allowAgents?: string[];
  };
}

export interface SystemInfo {
  totalAgents: number;
  orchestrators: number;
  leads: number;
  specialists: number;
  canSpawn: number;
  models: {
    opus: number;
    sonnet: number;
    haiku: number;
    defaults: number;
  };
  tools: {
    full: number;
    coding: number;
    messaging: number;
    minimal: number;
    defaults: number;
  };
}

export interface SessionInfo {
  sessionKey: string;
  agentId: string;
  status: "running" | "completed" | "failed";
  startedAt: number;
  progress?: string;
  eta?: number;
}

export interface CommandError extends Error {
  code: "UNAUTHORIZED" | "INVALID_ARGS" | "AGENT_NOT_FOUND" | "RATE_LIMITED" | "INTERNAL";
  details?: string;
}
