# Telegram Handlers - Deployment Guide

**Goal:** Deploy Telegram handlers to production

---

## Prerequisites

1. **OpenClaw Gateway** running
2. **Telegram Bot Token** from @BotFather
3. **Node.js 20+** installed
4. **TypeScript** compiler

---

## Step 1: Build TypeScript

```bash
cd ~/Desenvolvimento/openclawdev/src/telegram-handlers

# Install dependencies (if using package.json)
pnpm install

# Compile TypeScript
pnpm build

# Output: dist/ directory with compiled JS
```

---

## Step 2: Choose Integration Method

### Option A: Standalone Bot Process

Run as separate Node.js process alongside OpenClaw Gateway.

**Pros:**

- Independent deployment
- Can restart independently
- Simpler debugging

**Cons:**

- Requires IPC or API to call OpenClaw tools
- More processes to manage

### Option B: Integrated into Gateway

Include handlers as part of OpenClaw Gateway codebase.

**Pros:**

- Direct access to tools
- Single process
- Simpler architecture

**Cons:**

- Tightly coupled
- Gateway restart affects bot

**Recommended: Option B** (integrate into gateway)

---

## Step 3: Integration Code

### A. Add to Gateway Dependencies

```json
// In openclawdev/package.json
{
  "dependencies": {
    "@openclaw/telegram-handlers": "file:./src/telegram-handlers"
  }
}
```

### B. Initialize in Gateway

```typescript
// In gateway initialization code
import { initializeOpenClawAPI } from "@openclaw/telegram-handlers/api/openclaw";
import { executeCommand } from "@openclaw/telegram-handlers";
import TelegramBot from "node-telegram-bot-api";

// Initialize API layer with OpenClaw tools
initializeOpenClawAPI({
  sessions_spawn,
  sessions_send,
  sessions_list,
  sessions_progress,
  sessions_abort,
  memory_search,
  gateway,
  // ... pass all tools
});

// Initialize Telegram bot
const bot = new TelegramBot(config.channels.telegram.botToken, {
  polling: true,
});

// Handle commands
bot.on("message", async (msg) => {
  if (!msg.text?.startsWith("/")) return;

  const [command, ...args] = msg.text.split(/\s+/);

  const ctx = {
    chatId: msg.chat.id,
    userId: msg.from!.id,
    messageId: msg.message_id,
    text: msg.text,
    reply: (text) => bot.sendMessage(msg.chat.id, text),
    replyWithMarkdown: (text) => bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" }),
  };

  await executeCommand(command, ctx, args);
});
```

### C. Update Config

Ensure `openclaw.json` has Telegram config:

```json
{
  "channels": {
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN",
      "commands": {
        "enabled": true,
        "adminUsers": ["YOUR_USER_ID"]
        // ... rest of command config
      }
    }
  }
}
```

---

## Step 4: Environment Variables

```bash
# .env file
TELEGRAM_BOT_TOKEN=7350441021:AAFYIb924ODUIKz5SPHfDI8c-CLS2Mj-Iaw
TELEGRAM_ADMIN_USER_ID=6334767195
OPENCLAW_CONFIG_PATH=/Users/juliocezar/.openclaw/openclaw.json
```

---

## Step 5: Start Service

### Development

```bash
cd ~/Desenvolvimento/openclawdev

# Start with Telegram handlers enabled
pnpm dev --telegram

# Or via OpenClaw CLI
openclaw gateway run --telegram
```

### Production

```bash
# Via systemd (Linux)
sudo systemctl start openclaw-gateway

# Via PM2 (Node.js process manager)
pm2 start openclaw-gateway --name openclaw

# Via Docker
docker run -d \
  -e TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN \
  -v ~/.openclaw:/root/.openclaw \
  openclaw/gateway:latest
```

---

## Step 6: Test Commands

### Basic Test

```bash
# In Telegram, send:
/agents

# Expected response:
**All Agents** (63)

**ORCHESTRATOR** (3):
  • main (`main`)
  ...
```

### Test Each Category

```bash
/system           # System overview
/agent cto        # Agent details
/spawn deep-research Test task   # Spawn agent
/help             # Command list
/health           # System health
```

---

## Step 7: Monitor

### Logs

```bash
# Gateway logs
tail -f /tmp/openclaw/openclaw-*.log

# Filter for Telegram
tail -f /tmp/openclaw/openclaw-*.log | grep -i telegram

# Bot-specific logs (if standalone)
tail -f /tmp/telegram-bot.log
```

### Metrics

Monitor:

- Command execution time
- Success/failure rates
- Most used commands
- Error patterns
- User activity

---

## Troubleshooting

### Bot Not Responding

1. Check bot token is correct
2. Verify polling is enabled
3. Check network connectivity
4. Review logs for errors

### Commands Not Working

1. Verify handler is registered
2. Check OpenClaw tools are accessible
3. Review error messages
4. Test with verbose logging

### Permission Errors

1. Check admin user IDs in config
2. Verify `isAdmin()` logic
3. Test with admin account

---

## Security Checklist

- [ ] Bot token stored securely (env var, not in code)
- [ ] Admin user IDs whitelisted
- [ ] Rate limiting enabled
- [ ] Input validation on all commands
- [ ] Sensitive commands require admin
- [ ] Error messages don't leak info
- [ ] Logs don't contain secrets

---

## Performance Optimization

### Response Time

- Cache config loading
- Batch agent queries
- Use async/await properly
- Add command timeouts

### Resource Usage

- Limit concurrent spawns
- Clean up old sessions
- Monitor memory usage
- Set max message size

---

## Rollback Plan

If issues occur:

1. **Disable Telegram commands:**

   ```json
   {
     "channels": {
       "telegram": {
         "commands": {
           "enabled": false
         }
       }
     }
   }
   ```

2. **Restart gateway:**

   ```bash
   openclaw gateway restart
   ```

3. **Check logs for root cause**

4. **Fix and redeploy**

---

## Next Steps After Deployment

1. **Monitor usage patterns**
   - Which commands are most used?
   - Where do errors occur?

2. **Gather feedback**
   - User experience issues?
   - Missing features?

3. **Iterate**
   - Add requested features
   - Fix bugs
   - Optimize performance

4. **Scale if needed**
   - Multiple bot instances
   - Load balancing
   - Caching layer

---

_Deployment guide v1.0_  
_Updated: 2026-02-13_
