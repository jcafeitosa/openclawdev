# Memory System - Integration Guide

_Como integrar o sistema de memória com agentes OpenClaw_

---

## 🎯 Objetivo

Injetar contexto de memória relevante no `systemPrompt` de cada agente antes de cada execução LLM, economizando 85-90% de tokens vs contexto naive.

---

## 📍 Pontos de Integração

### 1. Agent Runner (Principal)

**Arquivo:** `src/auto-reply/reply/agent-runner.ts`

**Local:** Antes de chamar `runAgentTurnWithFallback`

**Código:**

```typescript
import {
  buildMemoryContext,
  shouldUseMemoryContext,
} from "../../agents/hooks/memory-context-hook.js";

// Inside runReplyAgent function, before executing agent:
const useMemory = shouldUseMemoryContext({
  agentId: resolvedAgentId,
  sessionKey,
  isSubagent: false,
});

let memoryContext = "";
if (useMemory) {
  memoryContext = await buildMemoryContext({
    agentId: resolvedAgentId,
    currentMessage: commandBody,
    maxTokens: 1500,
  });
}

// Pass memoryContext to execution (or append to systemPrompt)
```

**Integração com systemPrompt:**

Procurar onde `systemPrompt` é construído (provavelmente em `agent-runner-execution.ts` ou `system-prompt.ts`) e adicionar:

```typescript
// After building base system prompt:
if (memoryContext) {
  systemPrompt += "\n\n" + memoryContext;
}
```

---

### 2. Pi Embedded Runner

**Arquivo:** `src/agents/pi-embedded-runner/runs.ts`

**Local:** Antes de chamar Pi Coding Agent

**Código:**

```typescript
import { buildMemoryContext } from "../hooks/memory-context-hook.js";

// Before runEmbeddedPiAgent:
const memoryContext = await buildMemoryContext({
  agentId: agentId,
  currentMessage: userMessage,
  maxTokens: 1500,
});

// Append to system prompt or pass as parameter
```

---

### 3. System Prompt Builder

**Arquivo:** `src/agents/system-prompt.ts`

**Função:** `buildSystemPrompt` (ou similar)

**Código:**

```typescript
import { buildMemoryContext } from "./hooks/memory-context-hook.js";

export async function buildSystemPrompt(params: {
  agentId: string;
  currentMessage?: string;
  // ... other params
}): Promise<string> {
  // ... existing system prompt building

  // Add memory context at the end (before final instructions)
  if (params.currentMessage) {
    const memoryContext = await buildMemoryContext({
      agentId: params.agentId,
      currentMessage: params.currentMessage,
      maxTokens: 1500,
    });

    if (memoryContext) {
      systemPrompt += "\n\n" + memoryContext;
    }
  }

  return systemPrompt;
}
```

---

## 🔧 Configuração

### Habilitar/Desabilitar por Agente

**Opção 1: Agent Config (openclaw.json)**

```json
{
  "agents": {
    "main": {
      "memory": {
        "enabled": true,
        "maxTokens": 1500
      }
    },
    "health-monitor": {
      "memory": {
        "enabled": true,
        "maxTokens": 1000
      }
    }
  }
}
```

**Opção 2: Agent Workspace File**

```
~/.openclaw/agents/{agentId}/workspace/MEMORY_CONFIG.md

---
enabled: true
maxTokens: 1500
---
```

---

## 📊 Monitoramento

### Log Entries

```typescript
// memory-context-hook.ts já tem logs:
log.trace(`[${agentId}] Built memory context (${context.length} chars)`);
log.warn(`[${agentId}] Failed to build memory context:`, error);
```

### Métricas

**Adicionar em `src/agents/usage.ts`:**

```typescript
export interface AgentUsage {
  // ... existing fields
  memoryContextTokens?: number;
  memoryContextTime?: number;
}
```

**Track no hook:**

```typescript
const start = Date.now();
const context = await buildFormattedContext(...);
const elapsed = Date.now() - start;

// Estimate tokens (rough: ~4 chars per token)
const tokens = Math.ceil(context.length / 4);

// Log or emit metric
log.info(`[${agentId}] Memory context: ${tokens} tokens, ${elapsed}ms`);
```

---

## ✅ Checklist de Implementação

### Fase 1: Setup (Feito ✅)

- [x] Criar `memory-context-hook.ts`
- [x] Criar `INTEGRATION_GUIDE.md`
- [x] Documentar pontos de integração

### Fase 2: Integração Básica (TODO)

- [ ] Identificar onde `systemPrompt` é construído
- [ ] Adicionar `buildMemoryContext` call
- [ ] Testar com agent `main`
- [ ] Validar savings de tokens

### Fase 3: Rollout (TODO)

- [ ] Habilitar para todos os agentes core (main, health-monitor, etc.)
- [ ] Adicionar config toggle (enabled/disabled)
- [ ] Implementar métricas
- [ ] Monitor logs para errors

### Fase 4: Otimização (TODO)

- [ ] Cache de embeddings (Redis)
- [ ] Pre-fetch de memórias comuns
- [ ] A/B test: com vs sem memória
- [ ] Fine-tune maxTokens por tipo de agent

---

## 🧪 Testing

### Unit Test

```typescript
// src/agents/hooks/memory-context-hook.test.ts

import { buildMemoryContext, shouldUseMemoryContext } from "./memory-context-hook.js";

describe("memory-context-hook", () => {
  it("should build context for valid agent", async () => {
    const context = await buildMemoryContext({
      agentId: "backend-architect",
      currentMessage: "How to optimize queries?",
      maxTokens: 1500,
    });

    expect(context).toBeTruthy();
    expect(context).toContain("Relevant Memories");
  });

  it("should skip anonymous agents", () => {
    const should = shouldUseMemoryContext({
      agentId: "anonymous",
      sessionKey: "temp-123",
    });

    expect(should).toBe(false);
  });
});
```

### Integration Test

```typescript
// src/auto-reply/reply/agent-runner-memory.e2e.test.ts

describe("agent-runner with memory context", () => {
  it("should inject memory context into system prompt", async () => {
    // Setup: Create test memories for agent
    await memoryManager.createMemory({
      agentId: "test-agent",
      memoryType: "pattern",
      title: "Test pattern",
      content: "Test content",
      importance: 8,
    });

    // Execute: Run agent
    const result = await runReplyAgent({
      commandBody: "Test query",
      // ... other params
    });

    // Assert: Memory context was used
    expect(result.meta.systemPromptReport).toContain("Relevant Memories");
  });
});
```

---

## 🚨 Error Handling

**Princípio:** Memory context é **non-blocking**. Se falhar, agente continua sem contexto.

```typescript
try {
  const context = await buildMemoryContext(options);
  systemPrompt += "\n\n" + context;
} catch (error) {
  // Log but don't fail
  log.warn(`Failed to build memory context, continuing without it:`, error);
  // Continue normal execution
}
```

**Razões para falha:**

1. Database offline → Agente funciona sem memória
2. Embedding service down → Agente funciona sem memória
3. Timeout → Agente funciona sem memória

**Todas não-blocking.**

---

## 📈 Expected Savings

### Before (Naive Context)

```
Base system prompt: 500 tokens
Workspace files: 2000 tokens
Recent messages: 500 tokens
Tools: 1000 tokens
────────────────────────────────
Total: 4000 tokens per call
```

### After (Memory Context)

```
Base system prompt: 500 tokens
Memory context: 200 tokens (semantic search, top 3)
Recent messages: 300 tokens (reduced, memory has older context)
Tools: 1000 tokens
────────────────────────────────
Total: 2000 tokens per call

Savings: 50% tokens (2000 saved per call)
```

**At scale:**

- 100 agent calls/day
- 2000 tokens saved per call
- **200K tokens/dia economizados** ✅
- ~$3/dia saved (Sonnet pricing)
- ~$90/mês saved

**ROI:** Setup time ~2h, savings perpétuos.

---

## 🔄 Próximos Passos

### Imediato (Esta Semana)

1. **Encontrar onde systemPrompt é construído** (grep/buscar no código)
2. **Adicionar hook em 1 local** (agent-runner.ts)
3. **Testar com agent main** (validar que funciona)
4. **Medir savings** (antes vs depois tokens)

### Curto Prazo (Próximas 2 Semanas)

1. Rollout para todos os agentes
2. Adicionar config toggle
3. Implementar métricas
4. Dashboard de savings

### Médio Prazo (Próximo Mês)

1. Cache de embeddings (Redis)
2. A/B testing
3. Fine-tune por agente
4. Auto-tuning de maxTokens

---

## 💡 Tips

### Debug

```bash
# Ver logs do hook
tail -f /tmp/openclaw/openclaw-*.log | grep "agent-memory/hook"

# Verificar memórias do agente
psql -d openclaw -c "SELECT agent_id, memory_type, title FROM agent_memory WHERE agent_id = 'main';"
```

### Performance

```typescript
// Se buildMemoryContext demorar >500ms, skip
const timeout = 500; // ms
const context = await Promise.race([
  buildMemoryContext(options),
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout)),
]).catch(() => ""); // Fallback to empty on timeout
```

### Incremental Rollout

```typescript
// Start with 10% of calls
const useMemory = Math.random() < 0.1;
if (useMemory) {
  const context = await buildMemoryContext(...);
  // ...
}

// Gradually increase to 100%
```

---

_Hook criado, pontos de integração documentados. Próximo: implementar em agent-runner.ts._ 🔗🧠
