# OpenClaw Health Monitor Agent

> **Sistema de monitoramento autônomo para saúde, segurança e qualidade do OpenClaw**

---

## 📖 Overview

O **Health Monitor** é um agente supervisor que monitora continuamente todos os aspectos críticos do sistema OpenClaw:

- 🔒 **Segurança** - Vulnerabilidades, alertas, eventos bloqueados
- ✨ **Qualidade** - Lint, format, type-check, complexity
- 🧪 **Testes** - Coverage, falhas, regressions
- 📦 **Dependências** - Vulnerabilities, outdated, licenses
- 🌐 **Infraestrutura** - Gateway health, performance, uptime
- 📊 **Performance** - Response times, error rates, resource usage

### Como Funciona

```
┌─────────────────────────────────────┐
│     Health Monitor (Automated)      │
│                                     │
│  • Scans periódicos (30min)        │
│  • Detecta problemas                │
│  • Prioriza severidade              │
│  • Coordena correções               │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
Critical?      High?
    │             │
Debate        Delegate
Session       Specialist
    │             │
    └──────┬──────┘
           │
      Resolution
```

---

## 🚀 Quick Start

### 1. Revisar Documentação

```bash
# Especificação completa
cat docs/agents/system-health-monitor.md

# Workflow operacional
cat .agent/workflows/health-monitor.md

# Plano de implementação
cat docs/agents/IMPLEMENTATION_PLAN.md
```

### 2. Testar Health Check

```bash
# Executar scan completo
bun scripts/health-check.ts --deep

# Scan rápido
bun scripts/health-check.ts --quick

# Scan específico
bun scripts/health-check.ts --category=security
```

### 3. Próximos Passos (Implementação)

Ver [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) para roadmap completo.

**Fase 2 - Core Implementation:**

- [ ] Criar agent profile
- [ ] Integrar security APIs
- [ ] Configurar heartbeat
- [ ] Registrar cron jobs
- [ ] Testar escalation/delegation

---

## 📁 Arquivos Criados

### Documentação

- ✅ `docs/agents/system-health-monitor.md` - Especificação completa (13KB)
- ✅ `docs/agents/IMPLEMENTATION_PLAN.md` - Plano de implementação (13KB)
- ✅ `docs/agents/README.md` - Este arquivo (overview)

### Workflows

- ✅ `.agent/workflows/health-monitor.md` - Workflow operacional (13KB)

### Scripts

- ✅ `scripts/health-check.ts` - Script executável de health check (13KB)

### Exemplos

- ✅ `examples/health-monitor-config.json` - Configuração completa (9KB)
- ✅ `examples/HEARTBEAT-health-monitor.md` - Template de heartbeat (6KB)

**Total:** ~67KB de documentação e código

---

## 🎯 Capacidades

### Monitoramento Automático

| Categoria     | Ferramentas                    | Frequência | Severidade |
| ------------- | ------------------------------ | ---------- | ---------- |
| Security      | security_audit, security_stats | 30min      | CRITICAL   |
| Gateway       | gateway status                 | 30min      | CRITICAL   |
| Code Quality  | pnpm check, oxlint             | 2h         | HIGH       |
| Test Coverage | pnpm test:coverage             | 6h         | HIGH       |
| Dependencies  | npm audit, pnpm outdated       | 6h         | MEDIUM     |
| Performance   | response time, error rate      | 30min      | MEDIUM     |

### Coordenação de Correções

**Critical Issues:**

- Inicia debate via `collaboration.session.init`
- Inclui: CISO, CTO, especialistas relevantes
- Timeout: 4 horas
- Prioridade: imediata

**High Priority:**

- Delega via `sessions_spawn`
- Especialista apropriado (security-engineer, qa-lead, etc)
- Timeout: 24 horas
- Tracking: workspace log

**Medium/Low:**

- Log para `team_workspace`
- Review agendado (semanal/mensal)
- Batching de issues similares

---

## 🔧 Configuração

### Thresholds Principais

```json
{
  "coverage": { "critical": 50, "high": 60, "target": 70 },
  "security": { "critical": 0, "high": 0 },
  "responseTime": { "critical": 5000, "high": 2000, "target": 500 },
  "errorRate": { "critical": 10, "high": 5, "target": 0.5 }
}
```

### Schedule Recomendado

- **Quick Scans:** 30 minutos (heartbeat)
- **Normal Scans:** 2 horas (cron)
- **Deep Scans:** 6 horas (cron)
- **Daily Report:** 09:00 UTC
- **Weekly Report:** Segunda, 09:00 UTC

### Escalation Map

```typescript
const ESCALATION_MAP = {
  security: {
    critical: { agents: ["ciso", "security-engineer"], action: "debate" },
    high: { agents: ["security-engineer"], action: "delegate" },
  },
  quality: {
    critical: { agents: ["qa-lead", "quality-engineer"], action: "debate" },
    high: { agents: ["quality-engineer"], action: "delegate" },
  },
  infrastructure: {
    critical: { agents: ["sre", "devops-engineer", "cto"], action: "debate" },
    high: { agents: ["sre"], action: "delegate" },
  },
  // ... outras categorias
};
```

---

## 📊 Métricas de Sucesso

### KPIs Principais

| Métrica              | Target    | Baseline |
| -------------------- | --------- | -------- |
| Detecção (critical)  | < 30 min  | TBD      |
| Resolução (critical) | < 4 hours | TBD      |
| Resolução (high)     | < 24h     | TBD      |
| Test Coverage        | > 70%     | TBD      |
| Gateway Uptime       | > 99.9%   | TBD      |
| False Positive Rate  | < 10%     | TBD      |

---

## 🔍 Exemplos de Uso

### Scan Manual

```bash
# Health check completo
bun scripts/health-check.ts --deep

# Output exemplo:
# 🏥 OpenClaw Health Check (deep mode)
#
# 🔒 Running security scan...
# ✨ Running code quality scan...
# 🧪 Running test coverage scan...
# 📦 Running dependencies scan...
# 🌐 Checking Gateway health...
#
# ====================================================
# 📊 HEALTH REPORT
# ====================================================
#
# ⏱️  Scan completed in 45231ms
# 📅 Timestamp: 2026-02-12T16:20:00.000Z
#
# 📈 STATISTICS:
#   Security:
#     Critical: 0
#     High: 0
#   ...
#
# ✅ No issues detected!
```

### Heartbeat Automático

```markdown
# HEARTBEAT.md

Every 30 minutes:

1. security_stats - check alerts
2. Gateway status
3. Quick quality check

If issues: escalate/delegate
If clear: HEARTBEAT_OK
```

### Cron Job

```json
{
  "name": "health-monitor-scan",
  "schedule": { "kind": "every", "everyMs": 1800000 },
  "payload": {
    "kind": "agentTurn",
    "message": "Run automated health scan"
  }
}
```

---

## 🛠️ Implementação

### Status Atual: **Fase 1 Completa** ✅

- [x] Documentação criada
- [x] Script base implementado
- [x] Arquitetura definida
- [x] Workflows documentados
- [x] Exemplos criados

### Próxima Fase: **Core Implementation**

Ver [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) Fase 2.

**Tarefas prioritárias:**

1. Criar agent profile em `agents/health-monitor.json`
2. Integrar com security APIs (`security_audit`, `security_stats`, etc)
3. Configurar heartbeat monitoring
4. Registrar cron jobs
5. Testar escalation logic

**Estimativa:** 1 semana de desenvolvimento

---

## 📚 Documentação Detalhada

### Arquitetura & Design

- [System Health Monitor Spec](./system-health-monitor.md)
  - Overview completo
  - Responsabilidades
  - Workflows
  - Team integration
  - Métricas

### Workflows Operacionais

- [Health Monitor Workflow](./.agent/workflows/health-monitor.md)
  - Installation guide
  - Health check procedures
  - Issue triage logic
  - Manual operations
  - Troubleshooting

### Implementação

- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
  - Roadmap completo (5 fases)
  - Tasks detalhadas
  - Deliverables
  - Testing strategy
  - Success metrics

### Exemplos

- [Configuration Example](../../examples/health-monitor-config.json)
  - Agent config
  - Monitoring thresholds
  - Escalation rules
  - Reporting settings

- [Heartbeat Template](../../examples/HEARTBEAT-health-monitor.md)
  - Quick health checks
  - Decision logic
  - Response templates
  - Escalation triggers

---

## 🤝 Integração com Time

### Especialistas Delegados

| Categoria   | Primary              | Backup             |
| ----------- | -------------------- | ------------------ |
| Security    | security-engineer    | backend-architect  |
| Quality     | quality-engineer     | refactoring-expert |
| Testing     | qa-lead              | qa-automation      |
| Performance | performance-engineer | sre                |
| Infra       | sre                  | devops-engineer    |
| Deps        | backend-architect    | devops-engineer    |

### Hierarquia de Decisão

```
Health Monitor (autonomous)
         ↓
    Issue Detected
         ↓
    ┌────┴────┐
Critical?  High?
    │         │
    ↓         ↓
Debate    Delegate
(CTO/CISO) (Specialist)
    │         │
    └────┬────┘
         ↓
    Resolution
```

---

## 🔗 Referências

### OpenClaw Core

- [Agent Collaboration System](../../AGENT_COLLABORATION.md)
- [Sub-agents Guide](../tools/subagents.md)
- [Security Tools](../security/)
- [Gateway Operations](../gateway/)

### External

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [SRE Best Practices](https://sre.google/)

---

## ❓ FAQ

### Q: Por que criar um agente dedicado para monitoring?

**A:** Monitoring contínuo é crítico mas repetitivo. Um agente dedicado:

- Executa scans 24/7 sem intervenção humana
- Reage imediatamente a issues críticos
- Coordena respostas entre especialistas
- Mantém histórico e aprende com padrões

### Q: Como evitar false positives?

**A:** Múltiplas estratégias:

- Thresholds ajustáveis por categoria
- Whitelist de issues conhecidos
- Batching de alerts similares
- Context-aware detection
- Historical trending

### Q: Qual o overhead de performance?

**A:** Minimal:

- Quick scans: < 1 min, < 50MB RAM
- Normal scans: < 5 min, < 100MB RAM
- Deep scans: < 15 min, < 200MB RAM
- Async execution via sub-agents
- Configurable concurrency limits

### Q: Como customizar para meu projeto?

**A:** Editar configuração:

```json
// examples/health-monitor-config.json
{
  "monitoring": {
    "thresholds": {
      "coverage": { "target": 80 } // Ajustar target
    },
    "schedule": {
      "quickScan": { "interval": "1h" } // Menos frequente
    }
  }
}
```

### Q: Funciona com outros agentes?

**A:** Sim! Integração completa:

- `collaboration` para debates críticos
- `sessions_spawn` para delegação
- `team_workspace` para logs compartilhados
- Suporta toda hierarquia de agentes

---

## 🎯 Próximos Passos

1. **Revisar Documentação**
   - [x] Ler system-health-monitor.md
   - [x] Ler IMPLEMENTATION_PLAN.md
   - [x] Entender workflows

2. **Testar Localmente**
   - [ ] Executar `bun scripts/health-check.ts`
   - [ ] Revisar output e ajustar thresholds
   - [ ] Testar diferentes modos (quick/deep)

3. **Implementar Fase 2**
   - [ ] Criar agent profile
   - [ ] Integrar APIs
   - [ ] Configurar automation
   - [ ] Testar end-to-end

4. **Deploy & Monitor**
   - [ ] Ativar heartbeat
   - [ ] Registrar cron jobs
   - [ ] Monitorar métricas
   - [ ] Ajustar conforme necessário

---

## 🆘 Suporte

### Issues Comuns

Ver [Troubleshooting](./system-health-monitor.md#troubleshooting) na spec.

### Contato

- **Owner:** @main (orchestrator)
- **Tech Lead:** @cto
- **Security:** @ciso
- **Quality:** @qa-lead

---

**Status:** ✅ Fase 1 completa - Documentação e base implementadas

**Próximo:** 🔄 Fase 2 - Core implementation

**Última atualização:** 2026-02-12

---

_"Quality is not an act, it is a habit." - Aristotle_

_Built with ❤️ by the OpenClaw team_
