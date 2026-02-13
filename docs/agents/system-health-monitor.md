# System Health Monitor Agent

**Agent ID:** `health-monitor`  
**Role:** `lead`  
**Expertise:** System health, security, quality assurance, continuous monitoring

---

## Overview

O **System Health Monitor** é um agente supervisor que monitora continuamente a saúde, segurança e qualidade do OpenClaw. Ele detecta problemas, analisa impactos e coordena correções através do time de especialistas.

## Responsabilidades

### 1. **Monitoramento de Código**

- Análise estática contínua (lint, type-check)
- Detecção de code smells e anti-patterns
- Verificação de duplicação e complexidade
- Monitoramento de dívida técnica

### 2. **Segurança**

- Execução periódica de `security_audit`
- Monitoramento de `security_alerts` e `security_blocked`
- Análise de vulnerabilidades em dependências
- Verificação de configurações sensíveis

### 3. **Saúde do Sistema**

- Status do Gateway
- Verificação de performance
- Monitoramento de recursos (CPU, memória)
- Health checks de serviços externos

### 4. **Qualidade**

- Cobertura de testes (target: 70%+)
- Execução de testes em background
- Detecção de testes quebrados
- Validação de commits recentes

### 5. **Dependências & Updates**

- Verificação de updates disponíveis
- Análise de breaking changes
- Auditoria de `npm audit`
- Verificação de patches pendentes

### 6. **Lacunas (Gaps)**

- Documentação faltante
- Features incompletas
- TODOs e FIXMEs críticos
- Inconsistências entre código e docs

---

## Arquitetura

```
┌─────────────────────────────────────────────┐
│      System Health Monitor (Guardian)       │
│                                             │
│  • Scans continuamente                     │
│  • Prioriza problemas                      │
│  • Delega correções                        │
└──────────────┬──────────────────────────────┘
               │
               ├─── Security Audit (automated)
               │    └→ security_audit, security_alerts
               │
               ├─── Code Quality (automated)
               │    └→ pnpm check, pnpm test:coverage
               │
               ├─── Dependencies (automated)
               │    └→ npm audit, outdated check
               │
               └─── Coordination (collaboration)
                    │
                    ├→ Critical: Start debate session
                    │   └→ collaboration.session.init
                    │       └→ Agents: CISO, CTO, relevant specialists
                    │
                    ├→ High: Delegate to specialist
                    │   └→ sessions_spawn (security-engineer, qa-lead)
                    │
                    └→ Medium/Low: Log to workspace
                        └→ team_workspace.write_artifact
```

---

## Workflows

### Workflow 1: Continuous Health Check (Automated)

```typescript
// Executado a cada X minutos (via cron ou heartbeat)
async function healthCheck() {
  const issues: Issue[] = [];

  // 1. Security scan
  const securityStats = await security_stats();
  if (securityStats.critical > 0) {
    issues.push({
      severity: "critical",
      category: "security",
      description: `${securityStats.critical} critical security events`,
      action: "escalate_to_ciso",
    });
  }

  // 2. Code quality
  const lintResult = await exec("pnpm check");
  if (lintResult.code !== 0) {
    issues.push({
      severity: "medium",
      category: "quality",
      description: "Lint/format failures detected",
      action: "delegate_to_quality_engineer",
    });
  }

  // 3. Test coverage
  const coverage = await exec("pnpm test:coverage --reporter=json");
  const coverageData = JSON.parse(coverage.stdout);
  if (coverageData.total.lines.pct < 70) {
    issues.push({
      severity: "medium",
      category: "testing",
      description: `Coverage at ${coverageData.total.lines.pct}% (target: 70%)`,
      action: "delegate_to_qa_lead",
    });
  }

  // 4. Dependencies
  const auditResult = await exec("npm audit --json");
  const audit = JSON.parse(auditResult.stdout);
  if (audit.metadata.vulnerabilities.high > 0) {
    issues.push({
      severity: "high",
      category: "dependencies",
      description: `${audit.metadata.vulnerabilities.high} high-severity dependency vulnerabilities`,
      action: "delegate_to_backend_architect",
    });
  }

  // 5. Gateway health
  const gatewayStatus = await exec("openclaw status --deep");
  // Parse and check for issues...

  return issues;
}
```

### Workflow 2: Issue Triage & Coordination

```typescript
async function triageIssues(issues: Issue[]) {
  // Critical: Start immediate debate
  const critical = issues.filter((i) => i.severity === "critical");
  if (critical.length > 0) {
    const debateSession = await collaboration({
      action: "session.init",
      topic: "Critical System Issues Detected",
      agents: ["ciso", "cto", "vp-engineering"],
      moderator: "cto",
    });

    for (const issue of critical) {
      await collaboration({
        action: "proposal.publish",
        sessionKey: debateSession.sessionKey,
        decisionTopic: issue.category,
        proposal: issue.description,
        reasoning: "Automated detection via health monitor",
      });
    }
  }

  // High: Delegate to specialist
  const high = issues.filter((i) => i.severity === "high");
  for (const issue of high) {
    const specialist = mapCategoryToSpecialist(issue.category);
    await sessions_spawn({
      task: `Fix high-priority issue:

Category: ${issue.category}
Description: ${issue.description}

Please investigate and provide a fix. Report back when complete.`,
      agentId: specialist,
      label: `Fix: ${issue.category}`,
    });
  }

  // Medium/Low: Log to workspace
  const others = issues.filter((i) => i.severity === "medium" || i.severity === "low");
  if (others.length > 0) {
    await team_workspace({
      action: "write_artifact",
      name: `health-report-${new Date().toISOString()}.md`,
      content: formatHealthReport(others),
      description: "Health monitoring report",
      tags: ["health", "monitoring", "automated"],
    });
  }
}
```

### Workflow 3: Deep Investigation (On-Demand)

```typescript
// Quando o usuário pede análise profunda
async function deepInvestigation() {
  // 1. Full security audit
  const securityAudit = await security_audit({ deep: true });

  // 2. Code analysis
  const codeMetrics = await analyzeCodebase();
  // - Cyclomatic complexity
  // - Code duplication
  // - Dead code
  // - Test coverage per module

  // 3. Performance profiling
  const perfMetrics = await analyzePerformance();
  // - Gateway response times
  // - Tool execution times
  // - Memory usage patterns

  // 4. Integration health
  const integrations = await checkIntegrations();
  // - Provider status
  // - Channel health
  // - External API availability

  // Generate comprehensive report
  return {
    securityAudit,
    codeMetrics,
    perfMetrics,
    integrations,
    recommendations: generateRecommendations(),
  };
}
```

---

## Configuration

### HEARTBEAT.md Integration

```markdown
# System Health Monitor Heartbeat

Every 30 minutes:

1. Run security_stats + security_alerts
2. Check Gateway status
3. Verify test coverage
4. Scan for critical TODOs
5. Report only if issues detected

If all clear: HEARTBEAT_OK
```

### Cron Schedule

```json5
{
  cron: {
    jobs: [
      {
        name: "health-monitor-scan",
        schedule: {
          kind: "every",
          everyMs: 1800000, // 30 minutes
        },
        payload: {
          kind: "agentTurn",
          message: "Run health check and report critical issues only",
          model: "anthropic/claude-sonnet-4-5",
        },
        sessionTarget: "isolated",
        enabled: true,
      },
    ],
  },
}
```

---

## Team Integration

### Especialistas Delegados

| Categoria       | Especialista Principal      | Backup                  |
| --------------- | --------------------------- | ----------------------- |
| Security        | `security-engineer`, `ciso` | `backend-architect`     |
| Code Quality    | `quality-engineer`          | `refactoring-expert`    |
| Testing         | `qa-lead`, `qa-automation`  | `testing-specialist`    |
| Dependencies    | `backend-architect`         | `devops-engineer`       |
| Performance     | `performance-engineer`      | `sre`                   |
| Documentation   | `technical-writer`          | `product-manager`       |
| Architecture    | `software-architect`        | `system-architect`      |
| Database Issues | `database-engineer`         | `backend-architect`     |
| Frontend Issues | `frontend-architect`        | `ui-components`         |
| DevOps/Infra    | `devops-engineer`, `sre`    | `backend-architect`     |
| Git/Releases    | `release-manager`           | `git-specialist`        |
| Root Cause      | `root-cause-analyst`        | `troubleshoot-expert`\* |

\*Nota: `troubleshoot-expert` não existe ainda, mas pode ser criado

### Escalation Path

```
Critical Issue Detected
         ↓
   Health Monitor
         ↓
    ┌────┴────┐
    │         │
Security?  Quality?
    │         │
  CISO     QA Lead
    │         │
    └────┬────┘
         ↓
    CTO/VP Engineering
         ↓
   Final Decision
```

---

## Tools Utilizados

### Security

- `security_audit` - Auditoria completa
- `security_alerts` - Alertas recentes
- `security_stats` - Estatísticas
- `security_blocked` - Eventos bloqueados
- `security_summary` - Resumo 24h

### System

- `exec` - Executar comandos (pnpm check, test, etc)
- `Read` - Ler arquivos de código
- `gateway` - Status e controle do Gateway
- `session_status` - Métricas de uso

### Coordination

- `collaboration` - Debates e decisões
- `sessions_spawn` - Delegação de tarefas
- `team_workspace` - Persistir relatórios

### Analysis

- `web_search` - Pesquisar soluções/CVEs
- `web_fetch` - Buscar documentação

---

## Métricas de Sucesso

1. **Tempo de Detecção**
   - Target: < 30 minutos para issues críticos
   - Atual: (baseline a estabelecer)

2. **Tempo de Resolução**
   - Critical: < 4 horas
   - High: < 24 horas
   - Medium: < 1 semana

3. **Prevenção**
   - Redução de 80% em bugs críticos em produção
   - Zero vulnerabilidades high/critical em releases

4. **Cobertura**
   - Manter > 70% code coverage
   - 100% das features críticas cobertas

5. **Disponibilidade**
   - Gateway uptime > 99.9%
   - Response time p99 < 500ms

---

## Exemplo de Uso

### Scenario 1: Security Vulnerability Detected

```bash
# Health Monitor detecta vulnerabilidade crítica
[Health Monitor] 🚨 Critical security vulnerability in dependency 'jsonwebtoken'

# Inicia debate imediato
collaboration.session.init({
  topic: "Critical: JWT Vulnerability CVE-2023-XXXX",
  agents: ["ciso", "security-engineer", "backend-architect"],
  moderator: "cto"
})

# CISO propõe solução
collaboration.proposal.publish({
  proposal: "Upgrade jsonwebtoken to 9.0.2 immediately",
  reasoning: "Patches critical auth bypass vulnerability"
})

# Security Engineer valida
collaboration.proposal.agree({...})

# CTO finaliza
collaboration.decision.finalize({
  finalDecision: "Upgrade jsonwebtoken to 9.0.2 + run full auth test suite"
})

# Backend Architect implementa
sessions_spawn({
  task: "Upgrade jsonwebtoken following security decision",
  agentId: "backend-architect"
})
```

### Scenario 2: Code Quality Degradation

```bash
# Health Monitor detecta queda na cobertura
[Health Monitor] ⚠️ Test coverage dropped to 65% (target: 70%)

# Delega para QA Lead
sessions_spawn({
  task: "Coverage dropped to 65%. Identify uncovered modules and add tests.",
  agentId: "qa-lead",
  label: "Coverage Recovery"
})

# QA Lead identifica gaps e delega
# ... gera relatório e escala para qa-automation
```

### Scenario 3: Performance Regression

```bash
# Health Monitor detecta degradação
[Health Monitor] 🐌 Gateway p99 latency: 1.2s (target: <500ms)

# Inicia investigação
sessions_spawn({
  task: "Investigate performance regression in Gateway",
  agentId: "performance-engineer"
})

# Performance Engineer identifica e delega fix
# ... encontra N+1 query e delega para database-engineer
```

---

## Próximos Passos

1. **Criar o agente** em `AGENTS.md`
2. **Configurar heartbeat** com health checks
3. **Integrar cron** para scans periódicos
4. **Definir thresholds** de alerta
5. **Criar dashboard** de métricas (opcional)

---

## Profile Sugerido

```yaml
# agents/health-monitor.md

name: System Health Monitor
id: health-monitor
role: lead
emoji: 🏥

expertise:
  - System monitoring
  - Security auditing
  - Quality assurance
  - Performance analysis
  - Dependency management
  - Risk assessment

responsibilities:
  - Monitor system health continuously
  - Detect security vulnerabilities
  - Ensure code quality standards
  - Track test coverage
  - Coordinate issue resolution
  - Escalate critical problems

when_to_call:
  - Automated health checks (cron/heartbeat)
  - Before releases
  - After major changes
  - Security concerns
  - Quality degradation
  - Performance issues

reports_to: cto
manages:
  - security-engineer
  - quality-engineer
  - qa-lead
  - performance-engineer
```

---

Quer que eu:

1. **Crie o agente** completo no `AGENTS.md`?
2. **Implemente** o script de health check?
3. **Configure** o heartbeat/cron?
4. **Adicione** ao time existente?
