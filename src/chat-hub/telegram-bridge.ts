/**
 * EPIC-003: Internal Chat Hub - Telegram Bridge
 *
 * Conecta o hub interno com o Telegram.
 * Mensagens do hub → Telegram (com identidade do agent)
 * Mensagens do Telegram → Hub (#general)
 */

import { formatMessageForBridge, handleBridgeMessage, type ChatMessage } from "./chat-tools.js";
import { chatHub } from "./websocket-server.js";

// =============================================================================
// TYPES
// =============================================================================

export interface TelegramBridgeConfig {
  chatId: string;
  targetChannel: string;
  enabled: boolean;
  formatTemplate?: string;
}

// =============================================================================
// TELEGRAM BRIDGE
// =============================================================================

export class TelegramBridge {
  private config: TelegramBridgeConfig;
  private sendFunction?: (chatId: string, message: string) => Promise<void>;

  constructor(config: TelegramBridgeConfig) {
    this.config = config;
    this.setupListeners();
  }

  /**
   * Set the function to send messages to Telegram
   * This will be called by the main gateway
   */
  setSendFunction(fn: (chatId: string, message: string) => Promise<void>): void {
    this.sendFunction = fn;
  }

  /**
   * Setup listeners for hub messages
   */
  private setupListeners(): void {
    // Listen for outbound messages from hub
    chatHub.on("message.outbound", async (message: ChatMessage) => {
      if (!this.config.enabled) {
        return;
      }
      if (message.channel !== this.config.targetChannel) {
        return;
      }

      // Don't echo back external messages
      if (message.author.type === "external") {
        return;
      }

      await this.sendToTelegram(message);
    });
  }

  /**
   * Send a hub message to Telegram
   */
  async sendToTelegram(message: ChatMessage): Promise<void> {
    if (!this.sendFunction) {
      console.warn("[TelegramBridge] No send function configured");
      return;
    }

    const formattedMessage = formatMessageForBridge(message, "telegram");

    try {
      await this.sendFunction(this.config.chatId, formattedMessage);
    } catch (error) {
      console.error("[TelegramBridge] Failed to send message:", error);
    }
  }

  /**
   * Handle incoming message from Telegram
   */
  handleIncoming(senderId: string, senderName: string, content: string): void {
    if (!this.config.enabled) {
      return;
    }

    handleBridgeMessage("telegram", senderId, senderName, content, this.config.targetChannel);
  }

  /**
   * Enable/disable the bridge
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get bridge status
   */
  getStatus(): { enabled: boolean; chatId: string; targetChannel: string } {
    return {
      enabled: this.config.enabled,
      chatId: this.config.chatId,
      targetChannel: this.config.targetChannel,
    };
  }
}

// =============================================================================
// BRIDGE MANAGER - Handles multiple bridges
// =============================================================================

export class BridgeManager {
  private bridges: Map<string, TelegramBridge> = new Map();

  /**
   * Register a new Telegram bridge
   */
  registerTelegramBridge(id: string, config: TelegramBridgeConfig): TelegramBridge {
    const bridge = new TelegramBridge(config);
    this.bridges.set(id, bridge);
    return bridge;
  }

  /**
   * Get a bridge by ID
   */
  getBridge(id: string): TelegramBridge | undefined {
    return this.bridges.get(id);
  }

  /**
   * Handle incoming message from any external source
   */
  handleIncomingMessage(
    bridgeId: string,
    senderId: string,
    senderName: string,
    content: string,
  ): void {
    const bridge = this.bridges.get(bridgeId);
    if (bridge) {
      bridge.handleIncoming(senderId, senderName, content);
    }
  }

  /**
   * Get all bridge statuses
   */
  getAllStatuses(): Array<{ id: string; status: ReturnType<TelegramBridge["getStatus"]> }> {
    const statuses: Array<{ id: string; status: ReturnType<TelegramBridge["getStatus"]> }> = [];

    for (const [id, bridge] of this.bridges) {
      statuses.push({ id, status: bridge.getStatus() });
    }

    return statuses;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const bridgeManager = new BridgeManager();

// =============================================================================
// INTEGRATION EXAMPLE
// =============================================================================

/**
 * Example: How to integrate with the main OpenClaw gateway
 *
 * ```typescript
 * import { bridgeManager, TelegramBridge } from './chat-hub/telegram-bridge';
 * import { chat_send, chat_thought, chat_action, chat_result } from './chat-hub/chat-tools';
 *
 * // 1. Register bridge for a Telegram chat
 * const bridge = bridgeManager.registerTelegramBridge('main', {
 *   chatId: '6334767195',
 *   targetChannel: 'general',
 *   enabled: true,
 * });
 *
 * // 2. Connect to Telegram send function
 * bridge.setSendFunction(async (chatId, message) => {
 *   await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
 * });
 *
 * // 3. Handle incoming Telegram messages
 * telegramBot.on('message', (msg) => {
 *   bridgeManager.handleIncomingMessage(
 *     'main',
 *     msg.from.id.toString(),
 *     msg.from.first_name,
 *     msg.text
 *   );
 * });
 *
 * // 4. Agents can now send messages that appear in Telegram
 * chat_send('backend-architect', {
 *   channel: '#general',
 *   content: 'Bom dia pessoal! ☕',
 * });
 * // → Telegram shows: "🤖 **Backend Architect:**\nBom dia pessoal! ☕"
 *
 * // 5. Agents can show their thinking
 * chat_thought('backend-architect', '#general', 'Analisando o código...');
 * // → Telegram shows: "🤖 **Backend Architect:**\n💭 Analisando o código..."
 *
 * chat_action('backend-architect', '#general', 'Criando arquivo: src/new.ts');
 * // → Telegram shows: "🤖 **Backend Architect:**\n🔧 Criando arquivo: src/new.ts"
 *
 * chat_result('backend-architect', '#general', true, 'Build passou!');
 * // → Telegram shows: "🤖 **Backend Architect:**\n✅ Build passou!"
 * ```
 */
