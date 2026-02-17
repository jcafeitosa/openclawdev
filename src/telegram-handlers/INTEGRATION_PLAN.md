# Telegram Handlers - OpenClaw API Integration Plan

**Goal:** Connect stub handlers to real OpenClaw tools

---

## Integration Strategy

### Option A: Tool Injection (Recommended)

**Concept:** Pass OpenClaw tools as dependencies to handlers

```typescript
// Initialize with tools
const openclawAPI = {
  sessions_spawn: (params) => /* call tool */,
  sessions_send: (params) => /* call tool */,
  sessions_list: (params) => /* call tool */,
  // ... etc
};

// Pass to handlers
const ctx = { ...telegramCtx, openclaw: openclawAPI };
await executeCommand(command, ctx, args);
```

**Pros:**

- Clean separation of concerns
- Easy to test (mock the API)
- No tight coupling

**Cons:**

- Requires tool injection setup
- More boilerplate

---

### Option B: Direct Import (Simpler)

**Concept:** Import OpenClaw functions directly in handlers

```typescript
// In handler file
import { sessions_spawn } from "@openclaw/tools";

export const handleSpawn: CommandHandler = async (ctx, args) => {
  const result = await sessions_spawn({ agentId, task });
  // ...
};
```

**Pros:**

- Simpler implementation
- Less boilerplate
- Direct access

**Cons:**

- Tight coupling
- Harder to test
- Requires OpenClaw as dependency

---

### Option C: API Layer (Hybrid)

**Concept:** Create abstraction layer that wraps OpenClaw tools

```typescript
// api/openclaw.ts
export async function spawnAgent(agentId: string, task: string) {
  // Call OpenClaw tool here
  return await sessions_spawn({ agentId, task });
}

// In handler
import { spawnAgent } from "../api/openclaw";

export const handleSpawn: CommandHandler = async (ctx, args) => {
  const result = await spawnAgent(agentId, task);
  // ...
};
```

**Pros:**

- Clean abstraction
- Easy to swap implementations
- Testable
- Type-safe

**Cons:**

- Extra layer of indirection

---

## Recommended Approach: Option C (API Layer)

**Why:**

- Best balance of simplicity and maintainability
- Easy to test (mock the API layer)
- Clean separation between Telegram logic and OpenClaw logic
- Can evolve independently

---

## Implementation Steps

### Phase 1: API Layer (30min)

1. ✅ Create `api/openclaw.ts` with function signatures
2. Implement real tool calls:
   - `spawnAgent()` → `sessions_spawn`
   - `askAgent()` → `sessions_send`
   - `getSessions()` → `sessions_list`
   - `getSessionProgress()` → `sessions_progress`
   - `abortSession()` → `sessions_abort`
   - `getSystemStatus()` → query system state
   - `searchMemory()` → `memory_search`
   - `restartGateway()` → `gateway` tool
   - `createBackup()` → file operation

### Phase 2: Update Handlers (1h)

Update handlers to use API layer:

**High Priority:**

- `/spawn` - Use `spawnAgent()`
- `/ask` - Use `askAgent()`
- `/sessions` - Use `getSessions()`
- `/progress` - Use `getSessionProgress()`
- `/health` - Use `getSystemStatus()`

**Medium Priority:**

- `/research` - Use `spawnAgent('deep-research', ...)`
- `/review` - Use `spawnAgent('qa-lead', ...)`
- `/audit` - Use `spawnAgent('security-engineer', ...)`
- `/optimize` - Use `spawnAgent('performance-engineer', ...)`

**Low Priority:**

- `/config` - Read/write config
- `/backup` - Use `createBackup()`
- `/restart` - Use `restartGateway()`
- `/logs` - Read log files

### Phase 3: Testing (1h)

1. Unit tests with mocked API
2. Integration tests with real OpenClaw
3. End-to-end tests via Telegram bot

### Phase 4: Error Handling (30min)

Handle OpenClaw-specific errors:

- Rate limiting
- Agent not found
- Spawn failures
- Timeout errors
- Permission errors

---

## Tool Call Integration Pattern

### Current OpenClaw Tool Usage

In the main agent code, tools are called like:

```typescript
sessions_spawn({
  agentId: "deep-research",
  task: "Analyze GraphQL vs REST",
  label: "research-task",
  runTimeoutSeconds: 300,
});
```

### Wrapper Pattern

```typescript
// api/openclaw.ts
import type { OpenClawTools } from "@openclaw/types";

let tools: OpenClawTools | null = null;

export function initializeOpenClawAPI(openclawTools: OpenClawTools) {
  tools = openclawTools;
}

export async function spawnAgent(agentId: string, task: string, options?) {
  if (!tools) throw new Error("OpenClaw tools not initialized");

  return await tools.sessions_spawn({
    agentId,
    task,
    label: options?.label,
    model: options?.model,
    thinking: options?.thinking,
    runTimeoutSeconds: options?.runTimeoutSeconds || 300,
    cleanup: "idle",
  });
}
```

### Handler Usage

```typescript
// agent-management/spawn.ts
import { spawnAgent } from "../api/openclaw";

export const handleSpawn: CommandHandler = async (ctx, args) => {
  const agentId = args[0];
  const task = args.slice(1).join(" ");

  try {
    const result = await spawnAgent(agentId, task);

    await ctx.replyWithMarkdown(
      formatSuccess(`Spawned ${agentId}`) +
        `\n\nSession: \`${result.sessionKey}\`` +
        `\nTask: ${task}` +
        `\n\nUse /progress ${result.sessionKey} to check status`,
    );
  } catch (error) {
    if (error.code === "RATE_LIMITED") {
      await ctx.reply("⏸️ Too many spawns. Please wait a moment.");
    } else {
      throw error;
    }
  }
};
```

---

## Type Definitions

```typescript
// types.ts additions

export interface OpenClawTools {
  sessions_spawn: (params: SessionsSpawnParams) => Promise<SessionsSpawnResult>;
  sessions_send: (params: SessionsSendParams) => Promise<SessionsSendResult>;
  sessions_list: (params?: SessionsListParams) => Promise<SessionsListResult>;
  sessions_progress: (params: SessionsProgressParams) => Promise<SessionsProgressResult>;
  sessions_abort: (params: SessionsAbortParams) => Promise<SessionsAbortResult>;
  memory_search: (params: MemorySearchParams) => Promise<MemorySearchResult>;
  gateway: (params: GatewayParams) => Promise<GatewayResult>;
  // ... etc
}

export interface SessionsSpawnParams {
  agentId?: string;
  task: string;
  label?: string;
  model?: string;
  thinking?: string;
  runTimeoutSeconds?: number;
  cleanup?: "delete" | "keep" | "idle";
}

export interface SessionsSpawnResult {
  sessionKey: string;
  status: string;
  message?: string;
}

// ... etc for other tools
```

---

## Next Steps

1. **Decide on integration approach**
   - Recommended: Option C (API Layer)

2. **Implement API layer**
   - Create real tool call wrappers
   - Add error handling
   - Add type definitions

3. **Update handlers**
   - Start with high-priority handlers
   - Test each incrementally

4. **Test integration**
   - Unit tests
   - Integration tests
   - End-to-end tests

5. **Deploy**
   - Connect to Telegram bot
   - Monitor for errors
   - Iterate based on usage

---

## Estimated Timeline

- API Layer: 30-60min
- Update Handlers: 1-2h
- Testing: 1h
- Deployment: 30min

**Total: 3-4 hours to full production**

---

_Plan created: 2026-02-13 19:15 PST_
