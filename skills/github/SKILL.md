---
name: github
description: "Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries."
metadata:
  {
    "openclaw":
      {
        "emoji": "🐙",
        "requires": { "bins": ["gh"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gh",
              "bins": ["gh"],
              "label": "Install GitHub CLI (brew)",
            },
            {
              "id": "apt",
              "kind": "apt",
              "package": "gh",
              "bins": ["gh"],
              "label": "Install GitHub CLI (apt)",
            },
          ],
      },
  }
---

# GitHub Skill

Use the `gh` CLI to interact with GitHub. Always specify `--repo owner/repo` when not in a git directory, or use URLs directly.

## Pull Requests

Check CI status on a PR:

```bash
gh pr checks 55 --repo owner/repo
```

List recent workflow runs:

```bash
gh run list --repo owner/repo --limit 10
```

View a run and see which steps failed:

```bash
gh run view <run-id> --repo owner/repo
```

View logs for failed steps only:

```bash
gh run view <run-id> --repo owner/repo --log-failed
```

## API for Advanced Queries

The `gh api` command is useful for accessing data not available through other subcommands.

Get PR with specific fields:

```bash
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'
```

## JSON Output

Most commands support `--json` for structured output. You can use `--jq` to filter:

```bash
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
```

## Commit → Push → PR (One-Step Workflow)

Para commitar, fazer push e abrir PR em um único fluxo:

### Pré-condições (verificar antes)

```bash
git status                    # Ver mudanças
git diff HEAD                 # Ver diff completo
git branch --show-current     # Ver branch atual
```

### Workflow completo

```bash
# 1. Se estiver em main/master — criar branch
git checkout -b feat/nome-da-feature

# 2. Stage todas as mudanças
git add -A

# 3. Commit com Conventional Commits
git commit -m "feat(scope): descrição clara do que foi feito

- Detalhe 1
- Detalhe 2

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Push
git push -u origin HEAD

# 5. Criar PR
gh pr create \
  --title "feat(scope): descrição" \
  --body "## Summary

O que foi feito e por quê.

## Changes
- arquivo1.ts: descrição
- arquivo2.ts: descrição

## Testing
- [ ] pnpm build
- [ ] pnpm test
- [ ] pnpm check" \
  --assignee @me
```

### Conventional Commits obrigatórios

| Tipo       | Quando usar                              |
| ---------- | ---------------------------------------- |
| `feat`     | Nova funcionalidade                      |
| `fix`      | Correção de bug                          |
| `refactor` | Refatoração sem mudança de comportamento |
| `test`     | Adição/atualização de testes             |
| `docs`     | Documentação                             |
| `chore`    | Tarefas de manutenção                    |
| `perf`     | Otimização de performance                |
| `ci`       | Mudanças de CI/CD                        |

---

## Issue Triage — Oncall Mode

Para triagem de issues críticas que precisam de atenção imediata:

### Identificar issues críticas

```bash
# Issues de bug abertas com mais engajamento, últimos 3 dias
gh issue list \
  --repo owner/repo \
  --state open \
  --label bug \
  --limit 1000 \
  --json number,title,updatedAt,comments,reactions \
  | jq -r '.[] | select(
      (.updatedAt >= (now - 259200 | strftime("%Y-%m-%dT%H:%M:%SZ"))) and
      ((.comments | length) + (.reactions | length) >= 10)
    ) | "\(.number) \(.title)"'
```

### Critérios para escalação oncall

Flags que indicam issue CRÍTICA (bloqueia usuários):

- "crash", "stuck", "frozen", "hang", "unresponsive"
- "cannot use", "blocked", "broken", "not working"
- Previne funcionalidade core? Tem workaround?

### Adicionar label oncall

```bash
gh issue edit <number> --repo owner/repo --add-label "oncall"
```

### Buscar duplicatas

```bash
# Buscar issues similares com termos variados
gh search issues --repo owner/repo "termo1 termo2" --state open --json number,title
gh search issues --repo owner/repo "termo3 termo4" --state open --json number,title
```

---

## PR Review Status

Verificar estado atual de PRs e reviews:

```bash
# Status do PR na branch atual
gh pr view --json title,state,reviewDecision,statusCheckRollup

# Ver checks de CI
gh pr checks

# Lista de PRs aguardando review
gh pr list --state open --review-requested @me

# PRs que eu criei
gh pr list --state open --author @me
```

---

## Linking PRs e Sessions

Quando Claude Code cria um PR via `gh pr create`, ele é automaticamente vinculado à sessão. Para retomar trabalho em um PR específico:

```bash
# Retomar sessão de um PR
claude --resume --from-pr <PR_NUMBER>
# ou
claude --resume --from-pr https://github.com/owner/repo/pull/123
```

---

## GitHub Actions — Monitorar e Diagnosticar

```bash
# Últimos runs do workflow
gh run list --repo owner/repo --limit 10

# Ver run específico com jobs
gh run view <run-id> --repo owner/repo

# Só logs de steps que falharam
gh run view <run-id> --repo owner/repo --log-failed

# Re-trigger um workflow
gh workflow run <workflow-name> --repo owner/repo

# Ver todos os workflows disponíveis
gh workflow list --repo owner/repo
```
