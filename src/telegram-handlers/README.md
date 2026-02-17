# Telegram Command Handlers

Handler implementations for OpenClaw Telegram bot commands.

## Structure

```
telegram-handlers/
├── README.md                 # This file
├── index.ts                  # Main handler registry
├── types.ts                  # Shared types
├── utils.ts                  # Shared utilities
│
├── agent-management/         # Agent management commands
│   ├── agents.ts            # /agents
│   ├── agent.ts             # /agent
│   ├── spawn.ts             # /spawn
│   ├── status.ts            # /status
│   └── ask.ts               # /ask
│
├── system-info/             # System info commands
│   ├── system.ts            # /system
│   ├── capabilities.ts      # /capabilities
│   ├── models.ts            # /models
│   ├── tools.ts             # /tools
│   └── cost.ts              # /cost
│
├── discovery/               # Discovery commands
│   ├── find.ts              # /find
│   ├── who.ts               # /who
│   └── expert.ts            # /expert
│
├── actions/                 # Quick action commands
│   ├── research.ts          # /research
│   ├── review.ts            # /review
│   ├── audit.ts             # /audit
│   └── optimize.ts          # /optimize
│
├── monitoring/              # Monitoring commands
│   ├── sessions.ts          # /sessions
│   ├── progress.ts          # /progress
│   ├── logs.ts              # /logs
│   └── health.ts            # /health
│
├── configuration/           # Configuration commands (admin)
│   ├── config.ts            # /config
│   ├── backup.ts            # /backup
│   └── restart.ts           # /restart
│
└── help/                    # Help commands
    ├── help.ts              # /help
    ├── docs.ts              # /docs
    └── examples.ts          # /examples
```

## Usage

```typescript
import { handlersRegistry } from "./telegram-handlers";

// Get handler for command
const handler = handlersRegistry.get("/agents");

// Execute
await handler(ctx, args);
```

## Handler Interface

```typescript
type CommandHandler = (ctx: TelegramContext, args: string[]) => Promise<void>;
```

## Adding New Handler

1. Create handler file in appropriate category
2. Implement CommandHandler interface
3. Register in index.ts
4. Add tests
5. Update documentation
