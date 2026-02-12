# ADR-005: Model Selection Precedence

## Status

Aceito

## Contexto

O sistema anterior aplicava múltiplos critérios de seleção (capability, cost, availability, user preference) sem ordem de precedência clara. Isso causava comportamento não-determinístico e dificultava debugging de routing decisions.

Problemas identificados:

- Routing decisions inconsistentes para requests similares
- User preferences sendo ignoradas em favor de cost optimization
- Health status sendo checado tarde demais no pipeline
- Impossibilidade de explicar por que um modelo foi escolhido

Exemplo: Request com `preferredModel: "gpt-4"` + `capability: coding` poderia resultar em `claude-sonnet-4` se cost score fosse mais alto.

## Decisão

Implementar **strict precedence order** no model selection pipeline:

### Precedence Chain (Hard Gates → Soft Ranking):

#### 1. **Availability Gate** (HARD - elimina modelos)

- Health status: `unhealthy` → eliminado
- API limits: rate limit ativo → eliminado
- Timeout history: >3 consecutive timeouts → eliminado

#### 2. **Explicit User Preference** (HARD - força seleção)

- Se `preferredModel` especificado E disponível → selecionado (bypass demais critérios)
- Se `modelFamily` especificado → restringe pool (ex: "anthropic", "openai")
- Se `avoidModels` especificado → elimina do pool

#### 3. **Capability Match** (SOFT - scoring)

- Primary capability match: **+100 points**
- Secondary capability match: **+30 points**
- No capability match: **0 points** (não elimina, mas penaliza)

#### 4. **Performance Score** (SOFT - scoring)

- Latency percentile (p95 < target): **+50 points**
- Success rate (>99%): **+40 points**
- Degraded health: **-30 points**

#### 5. **Cost Optimization** (SOFT - scoring)

- Dentro de target budget: **+20 points**
- 2x acima target: **-20 points**
- 5x acima target: **-50 points**

#### 6. **Context Window** (HARD GATE - elimina se insuficiente)

- Token count > model context limit → eliminado

### Selection Algorithm:

```typescript
1. Apply Availability Gate → valid_models[]
2. Apply User Preferences → filtered_models[]
3. Apply Context Window Gate → feasible_models[]
4. Calculate scores (Capability + Performance + Cost) → ranked_models[]
5. Return top-ranked model
6. If failure, cascade to next in ranked list
```

### Transparency:

- Cada routing decision registra scores de todos modelos considerados
- Logs incluem: eliminated models (e razão), score breakdown, final choice
- Debug endpoint disponível para replay routing logic

## Consequências

**Positivas:**

- Comportamento determinístico e previsível
- User preferences respeitadas (elimina surpresas ruins)
- Health e availability checados primeiro (evita failures evitáveis)
- Debugging facilitado via transparent scoring

**Negativas:**

- Hard gates podem ser excessivamente restritivos em edge cases
- Usuários com preferências sub-ótimas não recebem sugestões
- Scoring weights são arbitrários (requerem tuning)
- Transparência aumenta log volume

**Trade-offs:**

- Determinismo vs Adaptabilidade: preferimos determinismo
- User control vs System intelligence: user vence em ties
- Performance vs Cost: performance tem peso maior (40 vs 20)

## Alternativas Consideradas

### 1. Pure ML-Based Ranking (Neural ranker treinado)

**Por que não:** Black box dificulta debugging. Requer training data massivo. Overkill para domínio estruturado.

### 2. All-Soft Scoring (Sem hard gates)

**Por que não:** Modelos unhealthy poderiam ser selecionados se scores compensarem. Inaceitável.

### 3. Cost-First Precedence (Otimizar custo como primary)

**Por que não:** Degrada experiência. Usuários não tolerariam downgrade forçado.

### 4. Random Selection with Constraints (Exploit-explore)

**Por que não:** Variabilidade inaceitável para production system. A/B testing deve ser explícito, não default behavior.

### 5. Two-Stage Selection (Coarse filter → Fine ranking)

**Por que não:** Added complexity sem benefit claro. Current single-pass já suficiente.
