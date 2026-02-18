# Agent Development Patterns

Guia para criar sub-agents efetivos usando `sessions_spawn` no OpenClaw.

## Quando Usar Agentes vs. Execução Direta

| Critério          | Execução Direta       | Sub-agent              |
| ----------------- | --------------------- | ---------------------- |
| Arquivos afetados | 1-2                   | 3+                     |
| Domínio           | Dentro do meu domínio | Especialista diferente |
| Duração           | < 2 min               | > 5 min                |
| Paralelismo       | Não necessário        | Múltiplos em paralelo  |

## Estrutura de um Sub-Agent via sessions_spawn

```typescript
sessions_spawn({
  agentId: "software-architect", // ID do agente do AGENTS.md
  task: `                          // Task detalhada e autocontida
## Contexto
[O que está acontecendo e por quê esta task existe]

## Objetivo
[O que precisa ser entregue — específico e mensurável]

## Arquivos relevantes
- path/to/file.ts — [por que é relevante]

## Decisões já tomadas
- [Decisão 1] — [razão]

## Restrições
- [O que NÃO fazer]

## Após completar
[PR, commit, avisar @main, etc.]
  `,
  label: "nome-descritivo", // Aparece no sistema para identificação
  model: "sonnet", // opcional: opus, sonnet, haiku
});
```

## Padrão Fan-Out — Paralelismo

Para tasks grandes, quebre em subtasks independentes e spawne em paralelo:

```typescript
// Phase 1: Exploração em paralelo (não há dependências)
sessions_spawn({
  agentId: "deep-research",
  task: "Analise features similares...",
  label: "explore-1",
});
sessions_spawn({
  agentId: "software-architect",
  task: "Mapeie a arquitetura...",
  label: "explore-2",
});
sessions_spawn({
  agentId: "root-cause-analyst",
  task: "Identifique padrões...",
  label: "explore-3",
});

// Phase 2: Aguarde todos completarem
// (os agentes reportam de volta via mensagem quando terminam)

// Phase 3: Implementação baseada nos findings
sessions_spawn({
  agentId: "backend-architect",
  task: "Implemente [X] baseado nos achados...",
  label: "impl-backend",
});
sessions_spawn({
  agentId: "frontend-architect",
  task: "Implemente [Y]...",
  label: "impl-frontend",
});
```

## Agent IDs do Sistema (AGENTS.md)

### C-Level (Opus)

| ID     | Domínio                                  |
| ------ | ---------------------------------------- |
| `cto`  | Arquitetura, ADRs, seleção de tecnologia |
| `cpo`  | Roadmap, priorização de produto          |
| `ciso` | Compliance, threat modeling              |

### Arquitetos (Sonnet)

| ID                    | Domínio                           |
| --------------------- | --------------------------------- |
| `backend-architect`   | APIs, Elysia.js, Bun, server-side |
| `frontend-architect`  | Astro, React Islands, componentes |
| `software-architect`  | Design patterns, SOLID, DDD       |
| `system-architect`    | Distribuído, escalabilidade       |
| `solutions-architect` | Integração cross-stack            |

### Engenheiros (Sonnet)

| ID                     | Domínio                              |
| ---------------------- | ------------------------------------ |
| `security-engineer`    | OWASP, vulnerabilidades, auditorias  |
| `database-engineer`    | PostgreSQL, Drizzle, schema, queries |
| `devops-engineer`      | Docker, CI/CD, infra                 |
| `ai-engineer`          | Agno, Ollama, RAG, LLM integration   |
| `performance-engineer` | Profiling, otimização                |

### Especialistas (Sonnet/Haiku)

| ID                   | Domínio                            |
| -------------------- | ---------------------------------- |
| `testing-specialist` | Testes unitários, integração, E2E  |
| `tech-lead`          | Code review, mentoring, padrões    |
| `qa-lead`            | Estratégia de teste, release       |
| `deep-research`      | Investigação, documentação         |
| `root-cause-analyst` | Debug, RCA                         |
| `refactoring-expert` | Refatoração, simplificação         |
| `software-architect` | Design patterns, decisões técnicas |

## Escrevendo Tasks Efetivas

### ✅ Task Boa (autocontida e específica)

```
## Tarefa: Implementar rate limiting no endpoint /api/auth/login

**Contexto**: Temos múltiplos attempts de brute force (ver MEMORY.md — incidente 2026-01).

**Objetivo**: Implementar rate limiting de 5 tentativas/minuto por IP.

**Arquivos relevantes**:
- src/routes/auth.ts — endpoint atual (linha 42: `app.post('/login', ...)`)
- src/middleware/ — onde ficam os guards existentes

**Decisões já tomadas**:
- Usar Elysia's built-in rate limiter (não instalar nova lib)
- Block por 15 min após 5 falhas consecutivas

**Restrições**:
- NÃO mudar a interface do endpoint (breaking change)
- NÃO logar senhas (mesmo hashadas)

**Após completar**: Commit `feat(auth): add rate limiting to login endpoint` + avisa @main
```

### ❌ Task Ruim (ambígua, sem contexto)

```
Adiciona rate limiting no login
```

## Comunicação A2A (Agente para Agente)

Sub-agents comunicam de volta via mensagem nesta sessão principal.
O agente deve reportar ao completar:

```
[@main] ✅ [Task] completa.
Entregue: [o que foi feito]
Próximo passo: [aguardo nova task]
```

Se bloqueado:

```
[@main] ⚠️ Bloqueio em [task].
Tentei: [o que tentei]
Bloqueio: [o que não consigo resolver]
Opções: [A ou B]
Preciso de: [decisão específica]
```

## Modelo por Complexidade

| Situação                        | Model                 |
| ------------------------------- | --------------------- |
| Análise estratégica, ADR        | `opus`                |
| Implementação complexa, revisão | `sonnet` (default)    |
| Tasks simples, verificações     | `haiku`               |
| Seguir configuração do projeto  | omitir (herda padrão) |
