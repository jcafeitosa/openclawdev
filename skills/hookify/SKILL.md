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

- `warn` — Shows message but allows operation (default)
- `block` — Prevents operation (PreToolUse) or stops session (Stop)

## Workflow: Creating a Rule

1. Identify the unwanted behavior
2. Determine which event: bash command? file edit? agent stopping?
3. Write the regex pattern
4. Create the `.hookify.{name}.local.md` file
5. Rules load dynamically — no restart needed

## File Organization

- **Location**: Project root `.claude/hookify.{name}.local.md`
- **Naming**: `hookify.{descriptive-name}.local.md`
- **Gitignore**: Add `.claude/*.local.md` to `.gitignore`

## Using the Rule Engine

The rule engine is at `scripts/rule_engine.py`. Run directly for testing:

```bash
echo '{"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}}' | python3 scripts/rule_engine.py
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
