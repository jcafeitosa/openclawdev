# ADR-004: Primary Capability Classification

## Status

Aceito

## Contexto

O sistema anterior classificava modelos de forma binária ou com tags genéricas, sem hierarquia clara de capabilities. Isso causava routing incorreto em cenários onde um modelo tinha múltiplas capacidades mas com proficiência variável.

Problemas identificados:

- Modelos de reasoning sendo usados para tarefas de coding simples (overhead)
- Modelos de coding sendo usados para deep reasoning (underperformance)
- Ausência de critério claro para desambiguar requests ambíguos
- Impossibilidade de otimizar custo vs capacidade necessária

Exemplo crítico: `o1-preview` (reasoning specialist) sendo usado para simple code formatting, enquanto `claude-sonnet-4` (balanced) seria mais eficiente.

## Decisão

Implementar **Primary Capability Classification** como atributo principal de cada modelo:

### Capability Hierarchy:

1. **reasoning**: Deep analysis, multi-step inference, complex problem-solving
   - Exemplos: `o1-preview`, `o1-mini`
   - Use cases: Mathematical proofs, strategic planning, research synthesis

2. **coding**: Code generation, refactoring, debugging, technical implementation
   - Exemplos: `claude-sonnet-4`, `gpt-4-turbo`
   - Use cases: Feature development, code review, test generation

3. **balanced**: General-purpose com bom desempenho em ambos
   - Exemplos: `claude-sonnet-3.5`, `gpt-4o`
   - Use cases: Mixed tasks, conversational interfaces

4. **fast**: Speed-optimized para tarefas simples
   - Exemplos: `gpt-4o-mini`, `claude-haiku`
   - Use cases: Classifications, simple transformations, batch processing

### Classification Rules:

- Cada modelo tem **uma** primary capability
- Secondary capabilities podem existir mas não influenciam routing primário
- Request intent é classificado primeiro, depois matched com capability
- Tie-breaking usa secondary capabilities + model-specific scores

### Intent Detection:

```typescript
// Reasoning signals
- "analyze", "evaluate", "compare", "synthesize"
- Multi-step requirements
- Trade-off analysis

// Coding signals
- "implement", "refactor", "debug", "fix"
- Code blocks in context
- Repository references

// Fast signals
- "classify", "extract", "format"
- Single-step transformations
- Batch operations
```

## Consequências

**Positivas:**

- Routing alinhado com strengths reais dos modelos
- Redução de custos (evita over-powered models para tarefas simples)
- Redução de latência (evita slow reasoning models quando desnecessário)
- Melhoria em accuracy (tasks matched com specialists)

**Negativas:**

- Requer intent classification como pré-requisito (adiciona latency)
- Casos ambíguos podem ser misclassified
- Modelos novos precisam ser manualmente classified
- Risco de sub-utilizar capabilities secundárias

**Métricas de Sucesso:**

- % de requests routed para capability correta (target: >90%)
- Redução em average cost per request (target: 15-20%)
- Redução em average latency (target: 10-15%)

## Alternativas Consideradas

### 1. Multi-Label Classification (Todas capabilities em parallel)

**Por que não:** Ambiguidade em routing. Impossível rankear sem primary anchor.

### 2. User-Specified Capability (Forçar usuário escolher)

**Por que não:** Friction excessiva. Usuário não deveria precisar conhecer model capabilities.

### 3. Dynamic Capability via Benchmarks (Re-classify em cada request)

**Por que não:** Latência proibitiva. Benchmarks não refletem request-specific context.

### 4. Cost-Based Routing Only (Sempre usar cheapest disponível)

**Por que não:** Race to the bottom em quality. Critical tasks sofrem.
