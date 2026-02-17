/**
 * Example: Integrating Telegram handlers with a Telegram bot
 *
 * This shows how to connect the handlers to node-telegram-bot-api or grammy
 */

// @ts-expect-error - node-telegram-bot-api is not installed; this is an example file
import TelegramBot from "node-telegram-bot-api";
import { executeCommand } from "../index";
import type { TelegramContext } from "../types";

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN required");
}
const bot = new TelegramBot(token, { polling: true });

// Convert node-telegram-bot-api message to our context format
function createContext(msg: TelegramBot.Message): TelegramContext {
  if (!msg.from) {
    throw new Error("Message from unknown sender");
  }

  return {
    chatId: msg.chat.id,
    userId: msg.from.id,
    username: msg.from?.username,
    messageId: msg.message_id,
    text: msg.text || "",

    reply: async (text, options?) => {
      await bot.sendMessage(msg.chat.id, text, options);
    },

    replyWithMarkdown: async (text, options?) => {
      await bot.sendMessage(msg.chat.id, text, {
        parse_mode: "Markdown",
        ...options,
      });
    },

    replyWithHTML: async (text, options?) => {
      await bot.sendMessage(msg.chat.id, text, {
        parse_mode: "HTML",
        ...options,
      });
    },
  };
}

// Handle incoming messages
bot.on("message", async (msg: TelegramBot.Message) => {
  const text = msg.text;

  // Ignore non-command messages
  if (!text?.startsWith("/")) {
    return;
  }

  // Parse command and args
  const parts = text.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  // Create context
  const ctx = createContext(msg);

  // Execute command
  try {
    await executeCommand(command, ctx, args);
  } catch (error) {
    console.error("Command execution error:", error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

// Handle errors
bot.on("polling_error", (error: unknown) => {
  console.error("Polling error:", error);
});

console.log("✅ Telegram bot started");

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Stopping bot...");
  bot.stopPolling();
  process.exit(0);
});

export { bot };
