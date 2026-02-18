---
name: implement
description: "Coordinated feature implementation with quality validation. Use to create, develop or implement new functionality with full team delegation."
metadata: { "openclaw": { "emoji": "🔧", "always": true, "skillKey": "implement" } }
user-invocable: true
---

# Skill: Implementation with Quality Gate

## PHASE 0: PRE-ACTION GATE (before everything)

```
MANDATORY questions before starting:
1. "Do I 100% understand what needs to be done?"
   +-- Clear requirements? No ambiguities?
   +-- If NO --> ask user BEFORE continuing
2. "Do I have all necessary context?"
   +-- Read relevant files? Know the patterns?
   +-- If NO --> read more code before proceeding
3. "Does my approach follow existing patterns?"
   +-- Grep confirmed the pattern? Is there precedent?
   +-- If NO --> adjust approach for consistency

ONLY PROCEED when all are YES.
```

## PHASE 1: ANALYSIS (10%)

### Team Context Check

```
BEFORE analyzing:
1. Check inbox: sessions_inbox({ scope: "agent" })
   --> Pick up messages, instructions, or context from other agents
2. Check team state: team_workspace({ action: "get_summary" })
   --> Read shared decisions, artifacts, and context
3. Discover team: agents_list({})
   --> Know who is available for delegation
```

### Complexity Tree

```
How many files will be affected?
|
+-- 1-2 files --> SIMPLE
|   Action: 1 agent, execute directly
|
+-- 3-5 files --> MEDIUM
|   Action: 3 agents, parallel delegation
|
+-- 6+ files --> COMPLEX
|   Action: 5+ agents, full team coordination
```

### Identify Files

```
Glob(pattern: "**/*.ts", path: "src/modules/$ARGUMENTS")
Grep(pattern: "$ARGUMENTS", output_mode: "files_with_matches")
```

### Consult Documentation

```
WebFetch --> Official docs for main library
WebSearch --> Best practices for the pattern
```

## PHASE 2: DELEGATION (20%)

### Tree: Which agent implements?

```
Type of work?
|
+-- Backend API/routes/service
|   --> sessions_spawn(agentId: "backend-architect")
|
+-- Frontend page/component/island
|   --> sessions_spawn(agentId: "frontend-architect")
|
+-- Database schema/migration/query
|   --> sessions_spawn(agentId: "database-engineer")
|
+-- Auth/session/permission
|   --> sessions_spawn(agentId: "auth-specialist")
|
+-- Trading logic/orders/exchange
|   --> sessions_spawn(agentId: "trading-engine")
|
+-- UI component/styling
|   --> sessions_spawn(agentId: "ui-components")
|
+-- Charts/visualization
|   --> sessions_spawn(agentId: "charts-specialist")
|
+-- AI/ML feature
|   --> sessions_spawn(agentId: "ai-engineer")
|
+-- Tests
|   --> sessions_spawn(agentId: "testing-specialist")
|
+-- Security review
|   --> sessions_spawn(agentId: "security-engineer")
|
+-- Elysia plugin/guard/derive
|   --> sessions_spawn(agentId: "elysia-specialist")
|
+-- Drizzle schema/query/migration
|   --> sessions_spawn(agentId: "drizzle-specialist")
|
+-- Astro page/SSG/SSR/hydration
|   --> sessions_spawn(agentId: "astro-specialist")
|
+-- Zod validation/schema
|   --> sessions_spawn(agentId: "zod-specialist")
|
+-- Performance profiling/optimization
|   --> sessions_spawn(agentId: "performance-engineer")
```

## FEATURE DEV MODE — 7 Phase Workflow

Para features novas e complexas, use este workflow estruturado em lugar de ir direto à execução.

Ative quando o usuário pede uma feature nova não trivial (>3 arquivos, novo domínio, nova integração).

### Phase 1 — Discovery

**Goal**: Entender o que precisa ser construído.

1. Crie todo list com todas as fases
2. Se a feature não está clara, pergunte:
   - Que problema resolve?
   - O que exatamente deve fazer?
   - Constraints ou requisitos?
3. Resuma o entendimento e confirme

### Phase 2 — Codebase Exploration

**Goal**: Entender o código existente antes de qualquer decisão.

Spawne 2-3 `code-explorer` agents em paralelo, cada um com foco diferente:

- "Trace features similares a [X] — como estão implementadas?"
- "Mapeie a arquitetura de [área] — abstrações e fluxo de controle"
- "Identifique padrões de UI/teste/integração relevantes para [feature]"

Após os agents retornarem, **leia todos os arquivos identificados** antes de prosseguir.

### Phase 3 — Clarifying Questions

**Goal**: Eliminar todas as ambiguidades ANTES de projetar.

Perguntas que DEVEM ser respondidas:

- Casos de borda e edge cases
- Comportamento esperado em erros
- Integração com features existentes
- Requisitos de performance
- Constraints de segurança

**Aguarde respostas antes de projetar.**

### Phase 4 — Architecture Design

**Goal**: Projetar a arquitetura com base nos padrões existentes.

Spawne `code-architect` agent:

- Analisa padrões existentes no codebase
- Propõe arquitetura concreta (não "opções")
- Lista TODOS os arquivos a criar/modificar
- Define sequência de implementação

Output do architect:

- Decisão arquitetural com rationale
- Blueprint completo (file → responsibility → interface)
- Sequência de build em fases

**Confirme o design com o usuário antes de implementar.**

### Phase 5 — Implementation

**Goal**: Implementar seguindo o blueprint aprovado.

Siga o plano do architect. A cada arquivo:

1. Implemente
2. `pnpm lint [file]` — 0 erros
3. `pnpm typecheck` — 0 erros
4. Testes para o módulo

Use subagents para módulos paralelos quando possível.

### Phase 6 — Code Review

**Goal**: Revisar antes de entregar.

Spawne `code-reviewer` agent (confidence ≥ 80):

- Guidelines compliance
- Bug detection
- Security check
- Code quality

Corrija todos os issues de confidence ≥ 80.

### Phase 7 — Delivery

**Goal**: Entregar limpo e documentado.

```bash
pnpm build    # 0 erros
pnpm check    # 0 warnings
pnpm test     # 100% passando
```

Commit ou PR seguindo o padrão do projeto.

---

## RALPH-WIGGUM LOOP — Autonomous Iteration

Para tasks que precisam de iteração até completar (ex: "implementar X até funcionar perfeitamente").

**Como funciona**: O agente executa a task, vê o próprio trabalho anterior, e itera até atingir a condição de conclusão.

### Quando usar

- Task que requer múltiplos ciclos (testes falhando → corrigir → testar novamente)
- Refinamento iterativo de código
- Build-until-green workflows

### Pattern de implementação

```markdown
## Iteração [N]

**Vendo trabalho anterior**: [lê git log, arquivos modificados]

**Status atual**:

- Build: [passou/falhou]
- Testes: [X/Y passando]
- Issues pendentes: [lista]

**Ações desta iteração**:

1. [o que vou corrigir]
2. [por que]

**Condição de conclusão**: Só termino quando pnpm build + pnpm test = 0 erros.
```

### Regra crítica do Ralph Loop

Só declare conclusão quando a condição for **completamente e inequivocamente verdadeira**. Não declare "pronto" para escapar do loop — o loop está lá justamente para garantir a qualidade.

---

## PHASE 3: EXECUTION (50%)

### Share Outputs

```
AFTER implementing each module:
- Write artifacts: team_workspace({ action: "write_artifact", name: "...", content: "...", tags: [...] })
- Share context: team_workspace({ action: "set_context", key: "...", value: "..." })
- Notify team: sessions_send({ agentId: "...", message: "..." })
```

### Mandatory Patterns

- Backend: Elysia plugins, TypeBox schemas, guards
- Frontend: Astro static-first, React islands, shadcn/ui
- Database: Drizzle ORM, DECIMAL for money, reversible migrations
- Tests: 100% coverage, edge cases, financial precision

### CRITICAL RULE: ZERO LINT ERRORS

```
NEVER deliver code with lint or typecheck errors.
- Run lint AFTER EACH modified file
- Fix ALL errors BEFORE proceeding
- Remove unused imports and variables
- If lint fails, fix immediately (don't ignore)
```

### Continuous Validation

```bash
pnpm lint <file>           # MANDATORY after each file
pnpm typecheck             # MANDATORY after each module
pnpm test <file>.test.ts   # After each function
```

## PHASE 4: POST-ACTION GATE — VALIDATION (15%)

```
MANDATORY: Answer ALL after implementing.
If ANY answer is NO --> go back to PHASE 3 and fix.
ONLY proceed to PHASE 5 when ALL are YES.
```

### 7 Critical Questions (POST-ACTION)

1. COMPLETENESS: "100% complete? No TODOs?" If NO --> back to PHASE 3
2. QUALITY: "Lint + TypeCheck = 0 errors?" If NO --> fix
3. TESTS: "Edge cases covered? Coverage >= 90%?" If NO --> create tests
4. SECURITY (EXTRA CARE): If NO on ANY item --> fix
   - Input validation with TypeBox/Zod on EVERY route?
   - Auth guard on protected routes?
   - Rate limiting on public endpoints?
   - No SQL injection, XSS, CSRF?
   - Secrets in env vars? Logs without PII?
   - If touches auth/financial --> security-engineer reviews
5. PERFORMANCE: "No N+1? Indexes? Lazy loading?" If NO --> optimize
6. UX: "Loading/empty/error states? WCAG 2.1 AA?" If NO --> implement
7. DOCUMENTATION: "JSDoc? Types exported?" If NO --> document
8. SHARED: "Outputs written to team_workspace?" If NO --> write_artifact
9. REVIEW: "Needs team review?" If YES --> collaboration submit_review

### Quality Gate

```bash
pnpm lint       # 0 errors
pnpm typecheck  # 0 errors
pnpm test       # 100% passing
pnpm build      # no errors
```

## PHASE 5: DELIVERY (5%)

### Tree: Commit vs PR

```
Change?
+-- 1-3 files + fix --> git commit
+-- 4+ files        --> gh pr create
+-- New feature     --> gh pr create
+-- Breaking change --> gh pr create
```

## Prohibitions

- Implement without consulting official docs
- Use `any` in TypeScript
- TODO/FIXME/HACK in code
- console.log in production
- Hardcoded secrets in code
- Float for money
- Raw SQL with interpolation
- Commit without quality gate passing
- Endpoint without rate limiting
- Protected route without auth guard
- Input without TypeBox/Zod validation
- Sensitive data in logs
- CORS with origin `*`
- Cookies without httpOnly/secure/sameSite
- Redirect without URL whitelist
- Dependencies with known CVEs
