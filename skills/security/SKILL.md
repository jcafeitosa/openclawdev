---
name: security
description: "Security audit and vulnerability assessment skill. Performs OWASP Top 10 checks, threat modeling (STRIDE), and compliance validation."
metadata: { "openclaw": { "emoji": "🔒", "always": true, "skillKey": "security" } }
user-invocable: true
---

# Skill: Security Audit

Comprehensive security assessment following industry standards.

## OWASP Top 10 Checklist

### A01: Broken Access Control

- [ ] Auth required on all protected routes
- [ ] Role-based access control implemented
- [ ] No direct object references without validation
- [ ] CORS configured restrictively
- [ ] Rate limiting on sensitive endpoints

### A02: Cryptographic Failures

- [ ] Passwords hashed with bcrypt/argon2
- [ ] Sensitive data encrypted at rest
- [ ] TLS enforced for data in transit
- [ ] No weak algorithms (MD5, SHA1)
- [ ] Secrets in environment variables

### A03: Injection

- [ ] SQL parameterized queries (no string concat)
- [ ] NoSQL injection prevention
- [ ] Command injection prevention
- [ ] LDAP injection prevention

### A04: Insecure Design

- [ ] Threat model documented
- [ ] Security requirements defined
- [ ] Secure defaults configured
- [ ] Defense in depth

### A05: Security Misconfiguration

- [ ] Error messages don't leak info
- [ ] Debug mode disabled in prod
- [ ] Security headers configured
- [ ] Unnecessary features disabled

### A06: Vulnerable Components

- [ ] Dependencies up to date
- [ ] No known CVEs
- [ ] Automated dependency scanning
- [ ] Minimal dependencies

### A07: Auth Failures

- [ ] Strong password policy
- [ ] Account lockout implemented
- [ ] Session management secure
- [ ] MFA available

### A08: Data Integrity Failures

- [ ] Input validation on all endpoints
- [ ] CI/CD pipeline secured
- [ ] Code signing where appropriate

### A09: Logging Failures

- [ ] Security events logged
- [ ] No sensitive data in logs
- [ ] Log integrity protected
- [ ] Alerting configured

### A10: SSRF

- [ ] URL validation
- [ ] Allowlist for external calls
- [ ] Response validation

## STRIDE Threat Model

| Threat                | Question                  | Mitigation                  |
| --------------------- | ------------------------- | --------------------------- |
| **S**poofing          | Can attacker impersonate? | Auth, certificates          |
| **T**ampering         | Can data be modified?     | Integrity checks, signing   |
| **R**epudiation       | Can actions be denied?    | Audit logs                  |
| **I**nfo Disclosure   | Can data leak?            | Encryption, access control  |
| **D**enial of Service | Can service be blocked?   | Rate limiting, redundancy   |
| **E**levation         | Can privileges increase?  | Least privilege, validation |

## Security Review Command

```bash
# Check for hardcoded secrets
grep -rn "password\|secret\|api_key\|token" --include="*.ts" src/

# Check dependencies
npm audit
pnpm audit

# Check for SQL injection patterns
grep -rn "SELECT.*\${" --include="*.ts" src/
grep -rn "INSERT.*\${" --include="*.ts" src/
```

## Security Report Format

```markdown
## Security Audit Report: [Component/Feature]

### Scope

- Files reviewed: [list]
- Date: [date]
- Reviewer: security-engineer

### Findings

#### Critical (P0)

| ID  | Issue   | Location    | Remediation |
| --- | ------- | ----------- | ----------- |
| S01 | [Issue] | [File:Line] | [Fix]       |

#### High (P1)

| ID  | Issue | Location | Remediation |
| --- | ----- | -------- | ----------- |

#### Medium (P2)

| ID  | Issue | Location | Remediation |
| --- | ----- | -------- | ----------- |

#### Low (P3)

| ID  | Issue | Location | Remediation |
| --- | ----- | -------- | ----------- |

### Recommendations

1. [Recommendation]
2. [Recommendation]

### Compliance Status

- [ ] OWASP Top 10 compliant
- [ ] No hardcoded secrets
- [ ] Dependencies secure
```

## Real-Time Security Hook

O security hook intercepta edições de arquivo em tempo real e avisa sobre 9 padrões de segurança críticos.

### Padrões Detectados

| #   | Pattern                                   | Risco                     |
| --- | ----------------------------------------- | ------------------------- |
| 1   | `child_process.exec()` / `execSync()`     | Command injection         |
| 2   | `new Function()` com strings dinâmicas    | Code injection            |
| 3   | `eval()`                                  | Code execution arbitrário |
| 4   | `dangerouslySetInnerHTML`                 | XSS em React              |
| 5   | `document.write()`                        | XSS clássico              |
| 6   | `.innerHTML =`                            | XSS via DOM               |
| 7   | `pickle` (Python)                         | Arbitrary code execution  |
| 8   | `os.system()` (Python)                    | Command injection         |
| 9   | GitHub Actions com inputs não sanitizados | Workflow injection        |

### Usando o Hook

O script fica em `skills/security/hooks/security_hook.py`. É model-agnostic — qualquer agente pode rodá-lo via `exec` antes de editar arquivos.

**Uso proativo pelo agente** (antes de escrever qualquer arquivo):

```bash
# O agente checa antes de editar — passa o contexto como JSON
echo '{
  "session_id": "current",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "caminho/do/arquivo.ts",
    "new_string": "conteúdo novo aqui"
  }
}' | python3 /Users/juliocezar/Desenvolvimento/openclawdev/skills/security/hooks/security_hook.py

# Exit 0 = seguro prosseguir
# Exit 2 = aviso de segurança no stderr — leia antes de continuar
```

**Variável de controle**: `ENABLE_SECURITY_REMINDER=0` desabilita o hook.

### Como Funciona

1. Agente passa contexto da edição via JSON (stdin)
2. Script verifica path do arquivo e conteúdo novo contra 9 padrões
3. Se match → imprime aviso detalhado no stderr (exit 2)
4. O aviso aparece UMA vez por arquivo/sessão (sem spam repetido)
5. Exit 0 = operação segura, pode prosseguir

### Alternativas Seguras

Quando o hook detecta um padrão, sugere alternativas:

- `exec()` → Use `execFileNoThrow` (sem shell injection)
- `eval()` → Use `JSON.parse()` ou redesign
- `innerHTML` → Use `textContent` ou DOMPurify
- `os.system()` → Use `subprocess.run(args_list)` sem shell=True
- `pickle` → Use JSON ou msgpack

## Team Security Workflow

### Submit Security Audit for Review

```typescript
// Submit audit findings for team review
collaboration({
  action: "submit_review",
  artifact: "Security audit report for src/auth/ module",
  reviewers: ["backend-architect", "tech-lead"],
  context: "Found 2 high-severity issues in token handling. Review remediation plan.",
});
```

### Record Security Decisions

```typescript
// Write security decision as artifact
team_workspace({
  action: "write_artifact",
  name: "security-audit-auth-2024.md",
  content: "# Security Audit: Auth Module\n\n## Findings\n...\n## Remediation\n...",
  description: "Security audit findings and remediation plan for auth module",
  tags: ["security", "audit", "auth"],
});
```

---

## Delegation

```typescript
// Full security audit
sessions_spawn({
  task: "Complete security audit of src/auth/ module. Check OWASP Top 10, review auth flows, session management, and token handling.",
  agentId: "security-engineer",
  model: "anthropic/claude-opus-4-5",
  label: "Auth Security Audit",
});

// Quick vulnerability scan
sessions_spawn({
  task: "Quick vulnerability scan of the API endpoints. Focus on injection and auth bypass.",
  agentId: "security-engineer",
  model: "anthropic/claude-sonnet-4-5",
  label: "API Vuln Scan",
});
```
