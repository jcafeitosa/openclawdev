# ADR-006: Fallback Testing Strategy

## Status

Aceito

## Contexto

O sistema tinha lógica de fallback (modelo primário falha → tenta secundário), mas os fallbacks nunca eram testados proativamente. Descobríamos fallbacks quebrados apenas quando o modelo primário falhava em production.

Problemas identificados:

- Fallback chains nunca validadas até serem necessárias
- Fallback models podiam estar offline/deprecated sem conhecimento prévio
- Configuração de fallback inconsistente entre diferentes capabilities
- Cascading failures quando fallback também falhava

Incidente real: `o1-preview` ficou indisponível, fallback configurado era `o1-mini`, que também estava com rate limits. Sistema tentou `gpt-4-turbo` como terceiro fallback, mas capability mismatch causou bad responses.

## Decisão

Implementar **Proactive Fallback Testing Strategy** com testes periódicos e validação de chains:

### Testing Approach: Proactive + Reactive

#### 1. **Proactive Testing** (Scheduled)

- **Daily fallback chain validation:**
  - Para cada primary model, testar todos fallbacks configurados
  - Executar lightweight test prompt (< $0.01 cost)
  - Validar: availability, latency < 2x primary, capability preservation

- **Weekly full-path testing:**
  - Simulate primary failure (force fallback activation)
  - Validar chain completa: primary → fallback1 → fallback2
  - Testar scenarios: API errors, timeouts, rate limits

#### 2. **Reactive Testing** (Post-Incident)

- Após cada fallback activation em production:
  - Registrar: primary failure reason, fallback usado, outcome
  - Se fallback falhou: trigger immediate chain re-validation
  - Atualizar fallback confidence score baseado em success rate

### Fallback Configuration Standards:

```typescript
interface FallbackChain {
  primary: ModelId;
  fallbacks: Array<{
    model: ModelId;
    capability_match: "exact" | "compatible" | "degraded";
    max_cost_ratio: number; // Ex: 1.5 = até 50% mais caro
    tested_at: timestamp;
    test_status: "passing" | "failing" | "unknown";
  }>;
}
```

**Rules:**

1. Cada primary model DEVE ter ≥2 fallbacks configurados
2. Fallbacks devem ter `capability_match: "exact"` ou `"compatible"`
3. Fallback chain máximo: 3 níveis (primary + 2 fallbacks)
4. Se todos fallbacks falharem: return error ao usuário (não tentar modelos aleatórios)

### Test Suite:

- **Availability test:** Simple ping com prompt mínimo
- **Capability test:** Prompt representativo da primary capability
- **Latency test:** p95 latency < 2x primary baseline
- **Cost test:** Cost per token dentro de configured ratio

### Alerting:

- Fallback test failure → alert on-call (P2)
- Primary + all fallbacks failing → page on-call (P1)
- Fallback activation rate >5% of requests → investigate (P3)

## Consequências

**Positivas:**

- Confiança que fallbacks funcionarão quando necessários
- Detecção precoce de fallbacks quebrados
- Dados históricos para otimizar fallback chains
- Redução em total system downtime (fallbacks confiáveis)

**Negativas:**

- Custo de testes proativos (~$5-10/day em API calls)
- Overhead operacional para manter test suite
- False positives em testes podem gerar noise
- Complexidade adicional em configuration management

**Trade-offs:**

- Test frequency vs cost: daily é mínimo aceitável
- Test coverage vs execution time: priorizamos critical paths
- Test realism vs cost: usamos prompts lightweight (não full production load)

**Métricas de Sucesso:**

- % fallback chains com tests passing (target: >95%)
- Fallback activation success rate (target: >99%)
- Time to detect broken fallback (target: <24h)

## Alternativas Consideradas

### 1. Reactive-Only (Testar apenas após falhas)

**Por que não:** First-user-pays. Fallbacks descobertos quebrados no pior momento possível.

### 2. Continuous Testing (Every 5 minutes)

**Por que não:** Custo proibitivo. Overhead operacional alto. Benefit marginal vs daily tests.

### 3. Synthetic Load Testing (Production-volume test traffic)

**Por que não:** Custo e complexidade extremos. Desnecessário para validar basic functionality.

### 4. Fallback Auto-Discovery (Sistema escolhe fallbacks dinamicamente)

**Por que não:** Capability mismatch risk. Prefer explicit configuration com validação.

### 5. No Fallbacks (Fail fast e return error)

**Por que não:** Usuário sofre downtime desnecessário quando alternativas estão disponíveis.
