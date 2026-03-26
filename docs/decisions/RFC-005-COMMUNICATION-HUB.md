# RFC-005: Integrated Communication Hub

**Status:** ✅ Approved — Ready for Phase 1  
**Author:** Henrique (Orchestrator), com input de CTO, System Architect, Security Engineer, Backend Architect  
**Date:** 2026-03-26 (updated with backend architect fixes)  
**Reviewers:** backend-architect ✅, frontend-architect, engineering-manager, vp-engineering

---

## 1. Problema

O modelo atual é **hub-and-spoke**: toda comunicação passa pelo orchestrator. Com 104 agentes, isso é um **bottleneck fatal**:

- Orchestrator = single point of failure
- Latência: A→Orchestrator→B em vez de A→B direto  
- Context loss entre agentes
- `sessions_send` bloqueado para subagents (hardcoded deny no código)

## 2. Proposta: Hierarchical Mesh

Nem full mesh (caos), nem hub-spoke (bottleneck). **Mesh dentro de times, hierarquia entre times.**

```
                    ┌──────┐
                    │  CEO │
                    └──┬───┘
          ┌────────┬───┴───┬────────┐
        ┌─┴─┐   ┌─┴─┐   ┌─┴─┐   ┌─┴──┐
        │CTO│   │CPO│   │CMO│   │CISO│
        └─┬─┘   └─┬─┘   └─┬─┘   └─┬──┘
          │       │       │       │
     ┌────┴────┐  │       │       │
     │Eng Team │  │  ...  │  ...  │
     │(mesh)   │  │       │       │
     └─────────┘  │       │       │
```

## 3. Três Layers de Comunicação

### Layer 1: Direct Messages (DM)
- Qualquer agente → qualquer agente via `sessions_send`
- `timeoutSeconds=120` para resposta síncrona
- Máx 5 trocas por conversa (ping-pong)
- **Rate limit tiered** (fix #2):
  - **DM síncrono** (`timeout > 0`): 10 msg / 5min — consultas urgentes
  - **DM assíncrono**: 20 msg / 5min — fire-and-forget
  - **Broadcast**: 3 msg / 1h — announcements
  - **Channel publish**: 50 msg / 5min — team discussion

### Layer 2: Channels (Pub/Sub)
- Canais temáticos: `#eng-architecture`, `#security-alerts`, `#releases`, `#general`
- Subscribe/publish com **SQLite persistence desde Phase 1** (fix #1)
- Digest mode para evitar inbox explosion
- Sequence numbers para ordering
- **Retention policy:** 30 dias ou 10k msgs/channel (auto-cleanup)

### Layer 3: Escalation Chain
- Escalation com severity (SEV-1 a SEV-4) e SLA
- Justificativa obrigatória + aprovação do receptor
- Audit trail imutável

## 4. Gap Analysis

### 🔴 Critical (Phase 1)

| Gap | Descrição | Effort |
|-----|-----------|--------|
| sessions_send deny | Hardcoded em `SUBAGENT_TOOL_DENY_ALWAYS` | 2h |
| **Tiered rate limiter** (fix #2) | DM sync 10/5min, async 20/5min, broadcast 3/h, channel 50/5min | 6h |
| Loop detection | Max 5 hops + content hash + thread ID | 4h |
| Message sanitization | Strip injection attempts, size limit **2KB** (fix #6) | 2h |
| **Agent discovery resolver** (fix #3) | `sessions_send({ agentId })` resolve pra `agent:X:main` | 3h |
| **SQLite channel store** (fix #1) | WAL mode, schema com indexes | 4h |
| **Backpressure** (fix #8) | Auto-pause delivery quando inbox > 100 msgs | 4h |

### 🟡 Important (Phase 2-3)

| Gap | Descrição | Effort |
|-----|-----------|--------|
| Broadcast tool | 1→N sessions_send com group resolution | 6-8h |
| Channel subscribe/publish | Pub/sub tools | 2-3 days |
| Message inbox persistence | Mensagens não entregues | 1-2 days |
| Conflict resolution | CRDT ou last-write-wins para mesh decisions | 4-6h |

### 🟢 Nice-to-Have (Phase 4+)

| Gap | Descrição |
|-----|-----------|
| Thread support | Respostas em contexto |
| Presence/status | Online/busy/offline |
| Message reactions | Ack sem resposta |
| ACK/NACK delivery | Confirmação de entrega |
| Canary tokens | Detecção de vazamento |

## 5. Plano de Implementação

### Phase 1: Unblock DMs (Week 1) 🔴
**Objetivo:** Qualquer agente pode falar com qualquer outro com safety guardrails.

| Task | Owner | Effort |
|------|-------|--------|
| Remove sessions_send do SUBAGENT_TOOL_DENY_ALWAYS | backend-engineer | 2h |
| **Tiered rate limiter** (sync 10/5min, async 20/5min, broadcast 3/h) | backend-engineer | 6h |
| Loop detection (5 hops + content hash + thread ID) | backend-engineer | 4h |
| Message sanitization (size limit **2KB**, injection prevention) | security-engineer | 2h |
| **Agent discovery resolver** (`agentId` → `agent:X:main`) | backend-engineer | 3h |
| **SQLite channel store** (WAL mode + schema) | backend-engineer | 4h |
| **Backpressure mechanism** (inbox limit 100 msgs) | backend-engineer | 4h |
| ACL validation (sender autorizado pra destinatário) | security-engineer | 4h |
| Audit logging (todas as mensagens inter-agent) | backend-engineer | 2h |
| Integration tests (3+ agents comunicando) | qa-automation | 4h |
| Update AGENTS.md com DM guidelines | technical-writer | 2h |

**Total:** ~37h (5 dias úteis) — inclui os 3 fixes do backend-architect

### Phase 2: Broadcast + Groups (Week 2) 🟡
**Objetivo:** Times conseguem comunicar em grupo.

| Task | Owner | Effort |
|------|-------|--------|
| Agent groups resolution (TEAM-DIRECTORY → groups) | platform-engineer | 4h |
| Broadcast tool (1→N sessions_send) | backend-engineer | 6h |
| Rate limit broadcasts (3/hour/agent) | backend-engineer | 2h |
| Group management tool | backend-engineer | 4h |

### Phase 3: Channels (Week 3-4) 🟡
**Objetivo:** Comunicação temática assíncrona.

| Task | Owner | Effort |
|------|-------|--------|
| channel-publish tool | backend-engineer | 6h |
| channel-subscribe tool | backend-engineer | 6h |
| Channel delivery (push on heartbeat/wake) | platform-engineer | 8h |
| Sequence numbers + ordering | backend-engineer | 4h |
| **Channel retention (30d TTL / 10k msgs)** | backend-engineer | 2h |
| Starter channels config | platform-engineer | 2h |
| UI: Channel view tab | frontend-engineer | 1d |

### Phase 4: Inbox + Escalation (Week 5-6) 🟢
**Objetivo:** Comunicação robusta e rastreável.

| Task | Owner | Effort |
|------|-------|--------|
| Message inbox (persist undelivered) | backend-engineer | 1d |
| Escalation tool (severity + SLA) | backend-engineer | 6h |
| Escalation approval flow | backend-engineer | 4h |
| SLA monitoring | platform-engineer | 1d |
| Communication dashboard | frontend-engineer | 1d |
| Conflict resolution protocol | system-architect | 4h |

## 6. Technical Design (Backend Architect Review — Incorporated)

### 6.1. SQLite Channel Store (Fix #1)

**Schema:**
```sql
-- SQLite with WAL mode for 1 writer, N concurrent readers
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE channel_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  channel     TEXT NOT NULL,
  sender      TEXT NOT NULL,  -- agent-id
  content     TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,  -- Unix ms
  sequence    INTEGER NOT NULL,  -- per-channel sequence
  thread_id   TEXT,
  UNIQUE(channel, sequence)
);

CREATE INDEX idx_channel_ts ON channel_messages(channel, timestamp DESC);
CREATE INDEX idx_sender ON channel_messages(sender);
CREATE INDEX idx_thread ON channel_messages(thread_id) WHERE thread_id IS NOT NULL;

-- Retention cleanup (cron job)
-- DELETE FROM channel_messages 
-- WHERE timestamp < (unixepoch('now') - 2592000) * 1000  -- 30 days
-- OR id NOT IN (
--   SELECT id FROM channel_messages 
--   WHERE channel = ? 
--   ORDER BY timestamp DESC 
--   LIMIT 10000
-- );
```

**Why SQLite desde Phase 1:**
- 104 agents = milhares de msgs/dia desde dia 1
- JSONL = O(n) scan + file lock contention
- SQLite WAL = 1 writer, N readers simultâneos, indexed queries
- Migration pain (JSONL → SQLite) > upfront cost

### 6.2. Tiered Rate Limiter (Fix #2)

**Implementation:**
```typescript
// Rate limit by message type
interface RateLimit {
  maxMessages: number
  windowSeconds: number
}

const RATE_LIMITS: Record<MessageType, RateLimit> = {
  'dm-sync':      { maxMessages: 10, windowSeconds: 300 },  // 10/5min
  'dm-async':     { maxMessages: 20, windowSeconds: 300 },  // 20/5min
  'broadcast':    { maxMessages: 3,  windowSeconds: 3600 }, // 3/1h
  'channel-pub':  { maxMessages: 50, windowSeconds: 300 },  // 50/5min
}

function checkRateLimit(agentId: string, messageType: MessageType): boolean {
  const limit = RATE_LIMITS[messageType]
  const key = `ratelimit:${agentId}:${messageType}`
  
  // Sliding window counter (Redis or in-memory)
  const count = getMessageCount(key, limit.windowSeconds)
  
  if (count >= limit.maxMessages) {
    return false // Rate limit exceeded
  }
  
  incrementCounter(key, limit.windowSeconds)
  return true
}
```

**Why tiered:**
- Uniform 20/5min estrangula workflows legítimos
- Backend architect consulta 5 colegas = 5 DMs síncronos em <1min = legítimo
- Broadcast spam vs DM consultation = diferentes threat models

### 6.3. Agent Discovery Resolver (Fix #3)

**API:**
```typescript
// Before (manual sessionKey lookup)
sessions_send({
  sessionKey: "agent:database-engineer:main",  // How do you know this?
  message: "Qual schema ideal?",
  timeoutSeconds: 120
})

// After (automatic resolution)
sessions_send({
  agentId: "database-engineer",  // Resolve internamente
  message: "Qual schema ideal?",
  timeoutSeconds: 120
})
```

**Resolution logic:**
1. Try `agent:{agentId}:main` (99% dos casos)
2. Fallback: última sessão ativa do agentId
3. Error se nenhuma sessão encontrada

**Implementation:**
```typescript
function resolveSessionKey(agentId: string): string | null {
  // Try default convention
  const defaultKey = `agent:${agentId}:main`
  if (sessionExists(defaultKey)) {
    return defaultKey
  }
  
  // Fallback: last active session
  const sessions = listSessions({ agentId, activeMinutes: 60 })
  if (sessions.length > 0) {
    return sessions[0].key  // Most recently active
  }
  
  return null  // No session found
}
```

## 7. Análise de Segurança

**Threat Model (Security Engineer):**

1. **DoS via message flooding** → Tiered rate limit + exponential backoff
2. **Prompt injection via mensagem** → Sanitize + prefix `[From: agent-id]` + keyword detection
3. **Privilege escalation via escalation chain** → Justificativa obrigatória + aprovação
4. **Session spoofing** → ACL validation (sender must be authorized)
5. **Loop attacks** → Content hash + hop limit + thread cycle detection
6. **Thundering herd** (fix #4) → Heartbeat jitter (random 0-60s offset)
7. **Timeout starvation** (fix #5) → Queue depth limit (max 5 pending/target)

## 8. Decisão Arquitetural

| Opção | Prós | Contras | Veredicto |
|-------|------|---------|-----------|
| Full Mesh | Mín. latência | Caos com 104 agents | ❌ |
| Hub-Spoke | Controle total | Bottleneck, SPOF | ❌ (atual) |
| **Hierarchical Mesh** | Mesh local + hierarquia global | Mais complexo | ✅ |
| Event Bus | Desacoplamento total | Overkill | ❌ (futuro) |

## 9. Riscos (System Architect + Backend Architect)

| Risco | Mitigação | Status |
|-------|-----------|--------|
| Split-brain decisions em mesh | Conflict resolution protocol | Phase 4 |
| Inbox explosion (104 agents × broadcasts) | Backpressure (inbox limit 100) | **Phase 1** ✅ |
| Message ordering em channels | Sequence numbers | Phase 3 |
| SQLite corruption em crash | WAL mode (atomic commits) | **Phase 1** ✅ |
| Session routing ambiguidade | Agent discovery resolver | **Phase 1** ✅ |
| Thundering herd no heartbeat | Jitter (random 0-60s offset) | Phase 1 |
| Timeout starvation | Queue depth limit (5 pending/target) | Phase 2 |
| Channel unbounded growth | 30d TTL / 10k msgs retention | Phase 3 |

## 10. Métricas de Sucesso

| Métrica | Target | Owner |
|---------|--------|-------|
| DM latency (P95) | < 5s | platform-engineer |
| Mensagens inter-agent/dia | > 100 | product-owner |
| Loop incidents/week | 0 | security-engineer |
| Escalation response time | < SLA | engineering-manager |
| Channel message delivery rate | > 99% | backend-engineer |
| Rate limit false positives/week | < 5 | backend-architect |

---

## 11. Aprovação Final

**Backend Architect Review (Carlos):** ✅ **LGTM**

Os 3 blocking issues foram incorporados:
1. ✅ SQLite desde Phase 1 (não JSONL)
2. ✅ Rate limit tiered (DM sync 10/5min, async 20/5min, broadcast 3/h, channel 50/5min)
3. ✅ Agent discovery resolver (`agentId` → `agent:X:main`)

Riscos adicionais endereçados:
- ✅ Message size aumentado pra 2KB
- ✅ Channel retention (30d TTL / 10k msgs)
- ✅ Backpressure movido pra Phase 1

**Status:** ✅ **Approved for Phase 1 kickoff**

---

## Próximos Passos

1. ✅ **Backend Architect Review** — LGTM (2026-03-26)
2. ⏳ **Frontend Architect Review** — pending
3. ⏳ **Engineering Manager Review** — pending
4. ⏳ **VP Engineering Review** — pending
5. 🚀 **Phase 1 Kickoff** — Sprint 12 (Week 1)

---

*Gerado em: 2026-02-23 | Atualizado: 2026-03-26 com input de Backend Architect (Carlos)*
*Reviewers: CTO, System Architect, Security Engineer, Backend Architect ✅*
