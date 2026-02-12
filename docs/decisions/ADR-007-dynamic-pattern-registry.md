# ADR-007: Dynamic Pattern Registry

## Status

Aceito

## Contexto

O sistema anterior tinha patterns de classificação hardcoded (regex patterns, keyword lists) diretamente no código de routing. Adicionar novos patterns ou ajustar existentes requeria code changes, deploys, e restarts.

Problemas identificados:

- Pattern updates travados em release cycles
- Impossibilidade de A/B test novos patterns
- Patterns desatualizados permaneciam ativos por inércia
- Customização per-tenant não era viável
- Zero visibility sobre pattern effectiveness

Exemplo: Quando `o1` foi lançado, precisamos adicionar patterns para detectar "deep reasoning" requests. Isso levou 3 dias (code → PR → review → deploy) enquanto requests eram mal-roteados.

## Decisão

Implementar **Dynamic Pattern Registry** com hot-reload e runtime configurability:

### Architecture:

#### 1. **Pattern Storage**

```typescript
interface PatternDefinition {
  id: string;
  version: number;
  capability: CapabilityType;
  patterns: {
    keywords?: string[];
    regex?: string[];
    semantic_embeddings?: number[]; // For similarity matching
  };
  weight: number; // Confidence score quando matched
  active: boolean;
  created_at: timestamp;
  updated_at: timestamp;
  metrics: {
    match_count: number;
    accuracy: number; // Post-request validation
  };
}
```

**Storage:** JSON files in `config/patterns/` (git-tracked) + in-memory cache

#### 2. **Hot-Reload Mechanism**

- File watcher monitora `config/patterns/*.json`
- Mudanças triggeram reload automático (< 100ms)
- Validação antes de aplicar (schema check + test patterns)
- Rollback automático se validation falhar
- Zero downtime durante reload

#### 3. **Pattern Evaluation**

```typescript
// Multi-strategy matching
1. Keyword matching (fast, low precision)
2. Regex matching (medium speed, high precision)
3. Semantic similarity (slow, handles paraphrasing)

// Scoring agregado
final_score = Σ(pattern.weight * match_confidence)
```

#### 4. **Runtime Management API**

```typescript
POST /api/patterns/add         // Add new pattern
PUT  /api/patterns/:id/update  // Update existing
POST /api/patterns/:id/disable // Soft disable
GET  /api/patterns/stats       // View effectiveness metrics
POST /api/patterns/test        // Test pattern against sample requests
```

### Pattern Lifecycle:

1. **Creation:** Via API ou direct file edit
2. **Testing:** Dry-run mode (match + log, não afeta routing)
3. **Activation:** Flip `active: true` → live imediatamente
4. **Monitoring:** Track match_count, accuracy, false positive rate
5. **Refinement:** Adjust weights/patterns based on metrics
6. **Deprecation:** Disable quando obsoleto ou ineffective

### Extensibility Features:

- **Per-Tenant Patterns:** Override global patterns com tenant-specific
- **A/B Testing:** Multiple pattern versions, traffic split configurável
- **Semantic Expansion:** Auto-generate pattern variations via embeddings
- **Learning Loop:** Suggest pattern improvements baseado em routing corrections

### Example Patterns:

```json
{
  "id": "deep-reasoning-v2",
  "capability": "reasoning",
  "patterns": {
    "keywords": ["analyze tradeoffs", "evaluate options", "synthesize", "compare approaches"],
    "regex": ["\\bwhy\\b.*\\bhow\\b", "step[- ]by[- ]step.*reasoning"],
    "semantic_embeddings": [0.23, -0.45, ...] // Pre-computed
  },
  "weight": 0.85,
  "active": true
}
```

## Consequências

**Positivas:**

- Pattern updates em minutos (vs dias com code changes)
- A/B testing de patterns sem deploy
- Visibility sobre pattern effectiveness
- Extensibilidade para casos de uso novos
- Tenant-specific customization viável

**Negativas:**

- Configuração externalizada (mais complexity operacional)
- Schema validation necessária (pode falhar)
- File-watching overhead (minimal mas presente)
- Risk de configuração incorreta quebrar routing

**Trade-offs:**

- Flexibility vs Safety: mitigado via validation + rollback
- Performance vs Configurability: in-memory cache mantém latency baixa
- Simplicity vs Power: complexity vale o ganho em agility

**Métricas de Sucesso:**

- Pattern update time (target: <5 min vs 3 days anterior)
- Pattern accuracy (target: >85% correct matches)
- False positive rate (target: <5%)
- Time to adapt to new model capabilities (target: <1 day)

## Alternativas Consideradas

### 1. Database-Backed Registry (Patterns em SQL/NoSQL)

**Por que não:** Overkill para volume pequeno (~50 patterns). File-based é mais simple e git-friendly.

### 2. ML-Based Pattern Learning (Auto-generate patterns)

**Por que não:** Requer training data massivo. Black box dificulta debugging. Future enhancement, não MVP.

### 3. Hardcoded Patterns com Feature Flags

**Por que não:** Ainda requer deploys. Feature flags apenas enable/disable, não editam patterns.

### 4. GraphQL Schema para Pattern Definition

**Por que não:** Overhead desnecessário. JSON schema é suficiente e mais accessible.

### 5. Plugin System (Patterns como código externo)

**Por que não:** Sandboxing complexo. Security risk. Over-engineering para current needs.

### 6. No Registry (Keep hardcoded)

**Por que não:** Status quo identificado como blocker crítico para agility.
