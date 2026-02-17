/**
 * Example: Integrating with Grammy (modern Telegram bot framework)
 */

import { Bot, Context } from "grammy";
import { executeCommand } from "../index";
import type { TelegramContext } from "../types";

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN required");
}
const bot = new Bot(token);

// Convert Grammy context to our format
function createContext(ctx: Context): TelegramContext {
  if (!ctx.chat) {
    throw new Error("No chat context");
  }
  if (!ctx.from) {
    throw new Error("Message from unknown sender");
  }
  if (!ctx.message) {
    throw new Error("No message context");
  }

  return {
    chatId: ctx.chat.id,
    userId: ctx.from.id,
    username: ctx.from?.username,
    messageId: ctx.message.message_id,
    text: ctx.message.text || "",

    reply: async (text, options?) => {
      await ctx.reply(text, options as Record<string, unknown>);
    },

    replyWithMarkdown: async (text, options?) => {
      await ctx.reply(text, {
        parse_mode: "Markdown",
        ...options,
      } as Record<string, unknown>);
    },

    replyWithHTML: async (text, options?) => {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...options,
      } as Record<string, unknown>);
    },
  };
}

// Handle commands
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;

  // Ignore non-commands
  if (!text.startsWith("/")) {
    return;
  }

  // Parse
  const parts = text.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  // Execute
  try {
    const ourCtx = createContext(ctx);
    await executeCommand(command, ourCtx, args);
  } catch (error) {
    console.error("Command error:", error);
    await ctx.reply("❌ An error occurred");
  }
});

// Start bot
void bot.start();
console.log("✅ Grammy bot started");

export { bot };
