---
name: hookify
description: "Create and manage rule-based behavior guards using markdown files. Use when a user wants to prevent unwanted agent behaviors, define custom rules for code patterns, or configure pre/post tool validation hooks."
metadata: { "openclaw": { "emoji": "🪝", "skillKey": "hookify" } }
user-invocable: true
---

# Skill: Hookify — Rule-Based Behavior Guards

Hookify creates rule-based guards from simple markdown files. Rules intercept agent actions (bash commands, file edits, stops) and can warn or block.

## How It Works

1. User describes unwanted behavior
2. Agent creates a `.hookify.{name}.local.md` rule file
3. Rule engine evaluates on every tool use

## Rule File Format

```markdown
---
name: rule-identifier # kebab-case, unique
enabled: true # true/false toggle
event: bash|file|stop|prompt|all # which hook event
action: warn|block # default: warn
pattern: regex-pattern # simple single-condition
---

Message shown to agent when rule triggers.
Explain what was detected, why it's problematic, and alternatives.
```

## Advanced Format (Multiple Conditions)

```markdown
---
name: warn-env-api-key
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.env$
  - field: new_text
    operator: contains
    pattern: API_KEY
---

⚠️ You're adding an API key to .env. Ensure this file is in .gitignore!
```

## Event Types

| Event    | When                   | Fields                                         |
| -------- | ---------------------- | ---------------------------------------------- |
| `bash`   | Before bash command    | `command`                                      |
| `file`   | Before file edit/write | `file_path`, `new_text`, `old_text`, `content` |
| `stop`   | Before agent stops     | `reason`                                       |
| `prompt` | On user prompt         | `user_prompt`                                  |
| `all`    | Every event            | all fields                                     |

## Operators

| Operator       | Description                              |
| -------------- | ---------------------------------------- |
| `regex_match`  | Regex pattern (Python, case-insensitive) |
| `contains`     | Substring match                          |
| `equals`       | Exact match                              |
| `not_contains` | Must NOT contain                         |
| `starts_with`  | Prefix check                             |
| `ends_with`    | Suffix check                             |

## Actions

- `warn` — Mostra mensagem mas permite a operação (default)
- `block` — Impede a operação

## Como o Agente Usa as Regras

O hookify funciona via **comportamento proativo do agente**, não via hooks de sistema. O agente:

1. Antes de executar um comando bash → roda `python3 scripts/rule_engine.py` via `exec`
2. Antes de escrever um arquivo → verifica as regras
3. Antes de encerrar → verifica checklist de stop

O engine é model-agnostic: qualquer modelo que use as tools `exec` do OpenClaw pode checar as regras.

```typescript
// Padrão de uso — o agente checa antes de agir:
const result = exec(
  `echo '{"tool_name":"Bash","tool_input":{"command":"${cmd}"}}' | python3 skills/hookify/scripts/rule_engine.py`,
);
if (result.stdout) {
  /* há aviso ou bloqueio — leia e siga */
}
```

## Workflow: Criando uma Regra

1. Identifique o comportamento indesejado
2. Determine o tipo de evento: comando bash, edição de arquivo, encerramento?
3. Escreva o regex pattern
4. Crie o arquivo `.hookify.{name}.local.md` na raiz do projeto
5. Regras são lidas dinamicamente a cada verificação

## Organização de Arquivos

- **Localização**: Raiz do projeto → `.hookify.{name}.local.md`
- **Nomenclatura**: `hookify.{nome-descritivo}.local.md`
- **Gitignore**: Adicione `*.hookify.*.local.md` ao `.gitignore`

## Testando o Rule Engine

```bash
echo '{"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}}' \
  | python3 /Users/juliocezar/Desenvolvimento/openclawdev/skills/hookify/scripts/rule_engine.py
```

## Example Rules

### Block dangerous rm

```markdown
---
name: dangerous-rm
enabled: true
event: bash
action: block
pattern: rm\s+-rf\s+/
---

⛔ Blocking dangerous rm -rf /. Use trash command or specify exact paths.
```

### Warn about console.log

```markdown
---
name: console-log-warning
enabled: true
event: file
pattern: console\.log\(
---

⚠️ console.log detected in production code. Use proper logging or remove before commit.
```

### Require tests before stop

```markdown
---
name: require-tests
enabled: true
event: stop
pattern: .*
---

Before stopping, verify:

- [ ] pnpm test passes (0 failures)
- [ ] pnpm build succeeds
- [ ] No TODOs left in code
```

## Creating Rules via Claude

When user says "create a hookify rule to [prevent X]":

1. Analyze what behavior to prevent
2. Pick the right event type
3. Write a precise regex
4. Create the `.local.md` file
5. Test: `echo '{...}' | python3 scripts/rule_engine.py`
6. Confirm rule is active
