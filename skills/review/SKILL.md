---
name: review
description: "Code review skill with security and quality focus. Reviews PRs, commits, or code sections for bugs, security issues, and improvement opportunities."
metadata: { "openclaw": { "emoji": "👀", "always": true, "skillKey": "review" } }
user-invocable: true
---

# Skill: Code Review

Comprehensive code review with focus on security, quality, and maintainability.

## Review Checklist

### 1. Security (CRITICAL)

- [ ] Input validation on all external inputs
- [ ] No SQL injection (parameterized queries)
- [ ] No XSS (output encoding, CSP)
- [ ] No CSRF (tokens, SameSite cookies)
- [ ] Auth checks on protected routes
- [ ] No hardcoded secrets
- [ ] No sensitive data in logs
- [ ] Rate limiting on public endpoints
- [ ] CORS properly configured

### 2. Code Quality

- [ ] No TypeScript `any` types
- [ ] No TODO/FIXME/HACK comments
- [ ] No console.log in production code
- [ ] Proper error handling (no empty catches)
- [ ] Consistent naming conventions
- [ ] Functions under 50 lines
- [ ] Files under 500 lines
- [ ] No duplicated code

### 3. Tests

- [ ] Tests exist for new functionality
- [ ] Edge cases covered
- [ ] Mocks appropriate
- [ ] No flaky tests
- [ ] Coverage maintained or improved

### 4. Performance

- [ ] No N+1 queries
- [ ] Appropriate indexes
- [ ] Lazy loading where needed
- [ ] No memory leaks
- [ ] Efficient algorithms

### 5. Architecture

- [ ] Follows existing patterns
- [ ] Separation of concerns
- [ ] No circular dependencies
- [ ] Proper abstraction level

## Review Command Format

```bash
# Review a PR
gh pr diff <PR_NUMBER> | head -1000

# Review specific files
git diff HEAD~1 -- src/auth/

# Review with context
git log --oneline -5 && git diff HEAD~1
```

## Review Output Format

```markdown
## Code Review: [PR/Commit Title]

### Summary

[Brief description of what the code does]

### 🟢 Good

- [Positive aspect 1]
- [Positive aspect 2]

### 🟡 Suggestions

- **[File:Line]**: [Suggestion]
- **[File:Line]**: [Suggestion]

### 🔴 Issues (Must Fix)

- **[File:Line]**: [Security/Bug issue]
- **[File:Line]**: [Critical problem]

### Verdict

[ ] ✅ Approve
[ ] 🟡 Approve with suggestions
[ ] 🔴 Request changes
```

## Collaboration Review Workflow

Use `collaboration` for structured async code reviews with tracked status.

### Submit Work for Review

```typescript
collaboration({
  action: "submit_review",
  artifact: "src/orders/order-service.ts",
  reviewers: ["security-engineer", "quality-engineer"],
  context: "New order creation flow. Focus on input validation and authorization.",
});
// Returns: { reviewId: "rev-abc123" }
```

### Submit Review Feedback

```typescript
// Approve with feedback
collaboration({
  action: "review.submit",
  reviewId: "rev-abc123",
  approved: true,
  feedback: "Input validation looks solid. Minor: consider adding rate limiting on create.",
});

// Reject with feedback
collaboration({
  action: "review.submit",
  reviewId: "rev-abc123",
  approved: false,
  feedback: "Missing authorization check on the delete endpoint. Must fix before merge.",
});
```

### Check Review Status

```typescript
// Get specific review
collaboration({ action: "review.get", reviewId: "rev-abc123" });

// List all pending reviews
collaboration({ action: "review.list" });

// List completed reviews
collaboration({ action: "review.list", completed: true });
```

### When to Use Collaboration Reviews

| Scenario            | Approach                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| Quick spot check    | Direct review (read code, provide feedback)                            |
| Formal code review  | collaboration submit_review with tracked status                        |
| Security audit      | collaboration submit_review with security-engineer reviewer            |
| Architecture review | collaboration session.init for debate, then submit_review for sign-off |

---

## Confidence Scoring System

Every issue must have a confidence score (0-100). **Only report issues with score ≥ 80.**

| Score  | Level          | Meaning                                       |
| ------ | -------------- | --------------------------------------------- |
| 0-25   | False positive | Pre-existing issue or unrelated               |
| 26-50  | Possible       | Might be an issue, likely nitpick             |
| 51-75  | Probable       | Real issue but low impact                     |
| 76-90  | Important      | Likely real, will impact functionality        |
| 91-100 | Critical       | Confirmed bug or explicit guideline violation |

**Focus on quality over quantity.** 3 high-confidence issues beat 15 uncertain ones.

---

## PR Review Toolkit — Specialized Agents

For comprehensive PR reviews, use 6 specialized agents in parallel. Each focuses on one dimension.

### Running Full PR Review

```typescript
// Spawn all 6 agents in parallel usando agentIds reais do sistema
// Obtenha os arquivos alterados primeiro:
// exec("gh pr diff --name-only") ou exec("git diff --name-only HEAD~1")

// Run in parallel — cada agente com foco específico
sessions_spawn({
  agentId: "tech-lead",
  task: `Analise a qualidade e precisão dos comentários de código nos arquivos: ${files}. Verifique se comentários explicam o "porquê" (não o "o quê"), se estão desatualizados, e se TODOs foram endereçados. Report confidence ≥80.`,
});
sessions_spawn({
  agentId: "testing-specialist",
  task: `Analise cobertura de testes no PR com arquivos: ${files}. Identifique gaps críticos: error paths não testados, edge cases de boundary, lógica de negócio sem negative tests. Rate gaps 1-10.`,
});
sessions_spawn({
  agentId: "security-engineer",
  task: `Caça silent failures nos arquivos: ${files}. Procure: catch blocks genéricos, erros logados mas não surfaceados, fallbacks sem notificação ao usuário, optional chaining escondendo erros.`,
});
sessions_spawn({
  agentId: "software-architect",
  task: `Analise design de tipos nos arquivos: ${files}. Rate cada tipo novo em: encapsulamento (1-10), expressão de invariantes (1-10), utilidade (1-10), enforcement (1-10). Report tipos com qualquer dimensão < 7.`,
});
sessions_spawn({
  agentId: "tech-lead",
  task: `Code review geral dos arquivos: ${files}. Use confidence scoring (0-100), reporte apenas issues ≥80. Foque em: bugs reais, guidelines do projeto (AGENTS.md/SOUL.md), security, qualidade.`,
});
sessions_spawn({
  agentId: "refactoring-expert",
  task: `Simplifique o código nos arquivos: ${files} para maior clareza e manutenibilidade. Preserve comportamento exato. Reduza: condicionais redundantes, lógica aninhada, variáveis desnecessárias. Use features nativas da linguagem.`,
});
```

### Agent 1: comment-analyzer

**When**: After adding docs/comments, before finalizing PR

**Mission**: Verify every comment adds genuine value and remains accurate.

Check:

- ✅ Function signatures match documented params/return types
- ✅ Described behavior aligns with actual code logic
- ✅ Referenced types, functions, variables exist and are used correctly
- ✅ Edge cases mentioned are actually handled
- ✅ Comments explain _why_, not _what_ (code already shows _what_)
- ❌ Comments that merely restate obvious code → flag for removal
- ❌ TODOs/FIXMEs that may already be addressed

### Agent 2: pr-test-analyzer

**When**: After creating or updating a PR with new functionality

**Mission**: Ensure tests cover critical paths without being pedantic about 100%.

Check:

- ✅ Error handling paths that could cause silent failures
- ✅ Edge cases for boundary conditions
- ✅ Critical business logic branches
- ✅ Negative test cases for validation logic
- ✅ Async/concurrent behavior where relevant
- Rate each gap: criticality 1-10 (10 = blocking)
- Explain specific regression each missing test would catch

### Agent 3: silent-failure-hunter

**When**: Reviewing any error handling, catch blocks, or fallback logic

**Non-negotiable rules**:

1. Silent failures are unacceptable — every error needs logging + user feedback
2. Users deserve actionable feedback — messages must say what failed and what to do
3. Fallbacks must be explicit and justified
4. Catch blocks must be specific — `catch (e: any)` hides unrelated errors
5. Mock/fake implementations belong only in tests

Systematically find:

- All try-catch blocks
- All error callbacks
- All conditional branches handling error states
- All fallback logic / default values on failure
- All optional chaining (`?.`) that might hide errors

### Agent 4: type-design-analyzer

**When**: Introducing new types, before PR creation, when refactoring types

**Rate each type on 4 dimensions (1-10)**:

1. **Encapsulation** — Are internals hidden? Can invariants be violated from outside?
2. **Invariant Expression** — How clearly are constraints communicated through the type structure?
3. **Invariant Usefulness** — Do invariants prevent real bugs? Are they aligned with business rules?
4. **Enforcement** — Are invariants enforced at compile-time where possible?

Report types with any dimension < 7.

### Agent 5: code-reviewer (with Confidence Scoring)

**When**: Proactively after writing code, before commits or PRs

Default scope: `git diff` (unstaged changes)

Review dimensions:

- **Project Guidelines**: CLAUDE.md / AGENTS.md compliance, import patterns, naming
- **Bug Detection**: Logic errors, null handling, race conditions, memory leaks
- **Security**: All OWASP categories, auth checks, input validation
- **Code Quality**: Duplication, missing error handling, accessibility

**Format output**:

```
## Code Review

Reviewing: [files/scope]

### Critical Issues (confidence ≥ 91)
- [confidence: 95] file.ts:42 — [description] | [fix]

### Important Issues (confidence 80-90)
- [confidence: 85] file.ts:88 — [description] | [fix]

### No issues found / All checks pass ✅
```

### Agent 6: code-simplifier

**When**: After completing a logical chunk of code, before commit

**Focus**: Reduce complexity while preserving exact functionality.

Analyze:

- Redundant conditionals that can be simplified
- Nested logic that can be flattened
- Variables that exist only once (inline them)
- Code that can use built-in language features
- Overly verbose patterns vs concise equivalents

**Never**: Change behavior, add functionality, remove error handling, or change test coverage.

---

## When to Use Each Agent

| Scenario                  | Agents to Use                   |
| ------------------------- | ------------------------------- |
| Quick self-review         | code-reviewer only              |
| Before PR creation        | code-reviewer + code-simplifier |
| PR with new types         | + type-design-analyzer          |
| PR with error handling    | + silent-failure-hunter         |
| PR with docs/comments     | + comment-analyzer              |
| PR with new features      | + pr-test-analyzer              |
| Full comprehensive review | All 6 agents in parallel        |

---

## Delegation

For security-focused review:

```typescript
sessions_spawn({
  task: "Security review of the auth module changes in PR #123. Check for OWASP Top 10 vulnerabilities.",
  agentId: "security-engineer",
  model: "anthropic/claude-opus-4-5",
  label: "Security Review",
});
```

For quality review:

```typescript
sessions_spawn({
  task: "Code quality review of src/api/ changes. Check for patterns, tests, and maintainability.",
  agentId: "quality-engineer",
  model: "anthropic/claude-sonnet-4-5",
  label: "Quality Review",
});
```
