# OpenClaw Skill Metadata Reference

## YAML Frontmatter — Campos Obrigatórios

```yaml
---
name: skill-name
description: "Descrição do quando usar. Use when..."
---
```

## YAML Frontmatter — Metadata OpenClaw (opcional)

```yaml
metadata:
  openclaw:
    emoji: "🔍" # Ícone exibido no sistema (obrigatório para UX)
    skillKey: "research" # Chave interna única (kebab-case)
    always: true # true = carregado SEMPRE no contexto; false/omitido = trigger por description
    requires: # Dependências de binários
      bins: ["gh"] # Lista de binários necessários
    install: # Instruções de instalação automática
      - id: brew
        kind: brew
        formula: gh
        bins: ["gh"]
        label: "Install GitHub CLI (brew)"
      - id: apt
        kind: apt
        package: gh
        bins: ["gh"]
        label: "Install GitHub CLI (apt)"
```

## Exemplos por Categoria

### Skill sempre carregada (comportamento crítico do agente)

```yaml
---
name: security
description: "Security audit and vulnerability assessment skill..."
metadata: { "openclaw": { "emoji": "🔒", "always": true, "skillKey": "security" } }
user-invocable: true
---
```

Use `always: true` quando a skill define comportamentos que o agente SEMPRE deve ter
(ex: regras de segurança, review checklist, implement quality gates).

### Skill acionada por contexto (especializada, carrega on-demand)

```yaml
---
name: github
description: "Interact with GitHub using the gh CLI. Use gh issue, gh pr, gh run..."
metadata:
  openclaw:
    emoji: "🐙"
    requires: { bins: ["gh"] }
    install:
      - { id: brew, kind: brew, formula: gh, bins: ["gh"], label: "Install gh (brew)" }
---
```

Use sem `always` para skills que só são relevantes em contextos específicos.
A description é o trigger — seja específico sobre quando usar.

### Skill user-invocable

```yaml
user-invocable: true
```

Adicione quando o usuário pode invocar a skill explicitamente via chat.
Omita para skills que só são ativadas internamente pelo agente.

## Emojis por Domínio (convenção do sistema)

| Domínio          | Emoji |
| ---------------- | ----- |
| Backend/API      | ⚙️    |
| Frontend/UI      | 🖼️    |
| Database         | 🗄️    |
| Security         | 🔒    |
| Testing          | ✅    |
| DevOps/CI        | 🐳    |
| Git/GitHub       | 🐙    |
| Research         | 🔍    |
| AI/ML            | 🧠    |
| Review           | 👀    |
| Implement        | 🔧    |
| Design           | 🎨    |
| Memory/Notes     | 📝    |
| Weather/External | 🌤️    |
| Communication    | 💬    |

## Campo `description` — Boas Práticas

O `description` é o **principal mecanismo de trigger** da skill. O agente lê todas as descriptions
para decidir qual skill ativar.

### Formato recomendado

```
"[O que a skill faz]. Use when [lista de situações]. Use [lista de gatilhos]."
```

### Exemplos bons

```yaml
description: "Deep research and investigation skill. Use for technology evaluation,
best practices, competitive analysis, and documentation study."

description: "Interact with GitHub using the gh CLI. Use gh issue, gh pr, gh run,
and gh api for issues, PRs, CI runs, and advanced queries."

description: "Security audit and vulnerability assessment skill. Performs OWASP Top 10
checks, threat modeling (STRIDE), and compliance validation."
```

### Evitar

- Descriptions genéricas: `"Helps with code"` (não diferencia da skill errada)
- Muito longas: > 2 linhas (desperdiça contexto no header)
- Sem exemplos de trigger: Inclua ao menos 3 situações concretas

## Localização das Skills

```
~/Desenvolvimento/openclawdev/skills/
└── nome-da-skill/
    ├── SKILL.md           (obrigatório)
    ├── scripts/           (opcional — Python/Bash executáveis)
    ├── references/        (opcional — docs carregadas on-demand)
    └── assets/            (opcional — templates, imagens, etc.)
```

Após criar ou atualizar uma skill, o OpenClaw carrega automaticamente na próxima sessão.
Não é necessário restart para skills (apenas para plugins TypeScript).
