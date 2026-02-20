# 🎯 Funcionalidades — Matriz Rápida de Referência

_Quick lookup para todas as features do sistema. Veja SYSTEM_FUNCTIONALITY_ANALYSIS_20260220.md para detalhes aprofundados._

---

## 📱 Canais (13+ Integrados)

| Canal           | Tipo   | Status | Command                                  |
| --------------- | ------ | ------ | ---------------------------------------- |
| Telegram        | Push   | ✅     | `openclaw message send --to telegram`    |
| WhatsApp        | Push   | ✅     | `openclaw message send --to whatsapp`    |
| Discord         | Pull   | ✅     | `openclaw message send --to discord`     |
| Slack           | Pull   | ✅     | `openclaw message send --to slack`       |
| Google Chat     | Pull   | ✅     | `openclaw message send --to google-chat` |
| Signal          | Push   | ✅     | `openclaw message send --to signal`      |
| iMessage        | Native | ✅     | BlueBubbles/Legacy                       |
| Microsoft Teams | Pull   | ✅     | `openclaw message send --to teams`       |
| WebChat         | Web    | ✅     | Browser-based                            |
| macOS           | Native | ✅     | Menu bar app                             |
| iOS/Android     | Native | ✅     | Mobile app                               |
| Matrix          | Push   | 🔄     | Planned                                  |
| Zalo            | Push   | 🔄     | Planned                                  |

---

## 🤖 Agentes (100 Especialistas)

### C-Level (4)

| Agente | Nome    | Modelo | Função                |
| ------ | ------- | ------ | --------------------- |
| ceo    | Elena   | Opus   | Decisões estratégicas |
| cto    | Rodrigo | Opus   | Arquitetura technical |
| cpo    | Camila  | Opus   | Roadmap de produto    |
| ciso   | Valeria | Opus   | Compliance & security |

### Directors (6)

| Agente              | Nome     | Função                  |
| ------------------- | -------- | ----------------------- |
| engineering-manager | Diego    | Coordenação de equipe   |
| product-manager     | Larissa  | Stakeholder + sprint    |
| tech-lead           | Matheus  | Code review + mentoring |
| qa-lead             | Isabela  | Test strategy           |
| vp-engineering      | Henrique | DORA metrics            |
| product-owner       | Bruno    | Backlog + priorização   |

### Architects (4)

| Agente             | Especialidade | Função                 |
| ------------------ | ------------- | ---------------------- |
| backend-architect  | Carlos        | APIs, Elysia, Bun      |
| frontend-architect | Aninha        | Astro, React Islands   |
| software-architect | Rafael        | Design patterns, SOLID |
| system-architect   | Pedro         | Distribuídos, scale    |

### Engineers (15+)

| Tipo        | Exemplos        | Função                  |
| ----------- | --------------- | ----------------------- |
| Security    | Mariana         | OWASP, vuln audit       |
| Database    | Fernanda        | PostgreSQL, Drizzle     |
| DevOps      | Thiago          | Docker, CI/CD, infra    |
| AI/ML       | Lucas, Vinícius | LLM, MLOps              |
| Data        | André, Patrícia | ETL, data modeling      |
| Performance | Paulo           | Profiling, optimization |
| SRE         | Rafael          | Uptime, SLOs            |

### Specialists (35+)

| Domínio       | Exemplos                                                                |
| ------------- | ----------------------------------------------------------------------- |
| Frameworks    | astro-specialist, elysia-specialist, bun-specialist, drizzle-specialist |
| Quality       | testing-specialist, qa-automation, refactoring-expert, git-specialist   |
| Analysis      | deep-research, root-cause-analyst, data-analyst, ux-researcher          |
| Design        | ux-designer, ui-designer, ui-components                                 |
| Communication | content-strategist, technical-writer, copywriter, pr-manager            |
| Operations    | release-manager, scrum-master, python-specialist                        |

---

## 💻 Comandos CLI (219)

### Mais Usados

```bash
# Gateway
openclaw gateway run --port 18789          # Start
openclaw gateway status                    # Check
openclaw gateway restart                   # Reload config

# Agents
openclaw agent --message "Your task" --model sonnet
openclaw agents add --id new-agent --name "Agent Name"
openclaw agents list

# Messaging
openclaw message send --to telegram --message "Hi"
openclaw channels list
openclaw pairing approve telegram CODE

# Sessions
openclaw sessions list
openclaw sessions history --sessionKey KEY
openclaw sessions spawn --task "Audit" --agent deep-research

# Cron
openclaw cron list
openclaw cron create --schedule "0 9 * * 1" --task "audit"
openclaw cron run --jobId JOB_ID

# Skills
openclaw skills list
openclaw skills install github

# System
openclaw doctor
openclaw onboard
openclaw update --channel stable|beta|dev
```

---

## 🛠️ Skills (72 Disponíveis)

### Integração com Apps (22)

```
apple-notes, apple-reminders, bear-notes, obsidian, things-mac,
eightctl, himalaya, imsg, wacli, 1password, gog, github, gh-issues,
blogwatcher, weather, ...
```

### Dev & Code (15)

```
coding-agent, oracle, mcporter, nano-pdf, songsee, video-frames,
peekaboo, tmux, ...
```

### Análise & Research (8)

```
research, security, troubleshoot, design, review, test, implement,
validate
```

### Team & Collab (7)

```
collaborate, delegate, team-coordinator, team-inbox,
project-coordinator, task-decompose, ...
```

### Workflow & Ops (6)

```
workflow, healthcheck, skill-creator, session-logs, hookify, ...
```

**Search**: `openclaw skills list --query "keyword"`

---

## 🔧 Funcionalidades por Módulo

### Gateway (`src/gateway/`)

| Funcionalidade         | Implementado | Teste |
| ---------------------- | ------------ | ----- |
| Session routing        | ✅           | ✅    |
| Message normalization  | ✅           | ✅    |
| Tool schema validation | ✅           | ✅    |
| OAuth flows            | ✅           | ✅    |
| Dynamic config reload  | ✅           | ✅    |
| Browser automation     | ✅           | ✅    |
| Canvas rendering       | ✅           | ✅    |
| File I/O               | ✅           | ✅    |
| Web fetch              | ✅           | ✅    |
| Image analysis         | ✅           | ✅    |

### Agents (`src/agents/`)

| Funcionalidade            | Implementado | Teste |
| ------------------------- | ------------ | ----- |
| 100 agents config         | ✅           | ✅    |
| Autonomous spawning       | ✅           | ✅    |
| Team coordination         | ✅           | ✅    |
| Hierarchical delegation   | ✅           | ✅    |
| Context sharing           | ✅           | ✅    |
| Cross-hierarchy messaging | ✅           | ✅    |
| Task classification       | ✅           | ✅    |
| Model routing             | ✅           | ✅    |

### Channels (`src/channels/`)

| Funcionalidade  | Implementado | Teste |
| --------------- | ------------ | ----- |
| Telegram        | ✅           | ✅    |
| WhatsApp        | ✅           | ✅    |
| Discord         | ✅           | ✅    |
| Slack           | ✅           | ✅    |
| Google Chat     | ✅           | ✅    |
| Signal          | ✅           | ✅    |
| iMessage        | ✅           | ✅    |
| Teams           | ✅           | ✅    |
| WebChat         | ✅           | ✅    |
| Pairing codes   | ✅           | ✅    |
| DM allowlisting | ✅           | ✅    |

### Commands (`src/commands/`)

| Área     | # Comandos | Principais                   |
| -------- | ---------- | ---------------------------- |
| Gateway  | 10         | run, status, restart, config |
| Agents   | 20         | add, delete, list, identity  |
| Messages | 15         | send, poll, react, delete    |
| Sessions | 12         | list, history, send, spawn   |
| Cron     | 10         | create, list, run, remove    |
| Skills   | 8          | list, install, run           |
| Channels | 15         | list, add, delete, config    |
| System   | 20         | doctor, onboard, update      |
| Config   | 15         | get, patch, apply            |
| Other    | 84         | Miscellaneous                |

### Monitoring (`src/monitoring/`)

| Funcionalidade               | Status | Deploy Date |
| ---------------------------- | ------ | ----------- |
| Quota monitor (basic)        | ✅     | 2026-02-19  |
| Enhanced monitor (per-model) | ✅     | 2026-02-20  |
| Health checks                | ✅     | 2026-02-17  |
| Cost tracking                | ✅     | 2026-02-20  |
| Alerts (30-sec interval)     | ✅     | 2026-02-20  |
| Fallback automation          | ✅     | 2026-02-20  |

### Memory (`src/memory/`)

| Funcionalidade         | Status      |
| ---------------------- | ----------- |
| PostgreSQL backend     | ✅          |
| Local embedding search | ✅          |
| Session history        | ✅          |
| Context pruning        | ✅          |
| Overflow prevention    | ✅ (Feb 20) |
| Archive system         | ✅          |

### Security (`src/security/`)

| Feature           | Status | Details                   |
| ----------------- | ------ | ------------------------- |
| OAuth integration | ✅     | Anthropic, OpenAI, GitHub |
| API key rotation  | ✅     | Token expiry management   |
| Pairing codes     | ✅     | DM allowlist              |
| Rate limiting     | ✅     | Per-provider, per-user    |
| CORS handling     | ✅     | Channel-specific          |
| 1Password vault   | ✅     | Secrets management        |

---

## 📊 Providers & Models

### Task-Based Routing

```yaml
Task Type          │ Primary Model              │ Budget │ Fallbacks
──────────────────┼────────────────────────────┼────────┼──────────────
audit_task         │ claude-sonnet-4-5          │ 50K    │ opus, llama
data_analysis      │ claude-haiku-4-5           │ 40K    │ qwen, sonnet
implementation     │ claude-sonnet-4-5          │ 60K    │ opus, llama
operational_proc   │ claude-haiku-4-5           │ 35K    │ free models
risk_analysis      │ google-antigravity/gemini-pro │ 45K    │ sonnet, opus
documentation      │ claude-haiku-4-5           │ 30K    │ free models
```

### Provider Health (Real-time, 30-sec interval)

```
gemini-3-flash (10K quota):    🔴 1% remaining  → FALLBACK ACTIVE
gemini-pro (5K quota):         🟢 52% healthy   → PRIMARY
claude-haiku (50K quota):      🟢 70% healthy
claude-sonnet (50K quota):     🟢 64% healthy
claude-opus (30K quota):       🟢 73% healthy
llama-3.3-free (100K quota):   🟢 95% healthy   → FALLBACK AVAILABLE
```

---

## 🧪 Testes

### Test Suites

| Tipo               | Quantidade | Tempo | Command                |
| ------------------ | ---------- | ----- | ---------------------- |
| Unit               | 50+        | ~30s  | `pnpm test:fast`       |
| E2E                | 25+        | ~2m   | `pnpm test:e2e`        |
| Live (Real Models) | 15+        | ~5m   | `pnpm test:live`       |
| Docker Integration | 10+        | ~10m  | `pnpm test:docker:all` |

### Coverage

```
Target:        80%+
Current:       75-80% (varies by module)
Command:       pnpm test:coverage
Report Output: coverage/index.html
```

### Quality Gates (Pre-Commit)

```
✅ format:check    (oxfmt)
✅ lint            (oxlint --type-aware)
✅ tsgo            (TypeScript strict)
✅ detect-secrets  (no leaked credentials)
✅ conventional    (commit message format)
```

---

## 📈 Operações 24/7

### Wave Architecture

| Wave        | Status | Deliverables                   | Duration  |
| ----------- | ------ | ------------------------------ | --------- |
| **Wave 1**  | ✅     | Agent name fix, autonomy setup | Feb 17-19 |
| **Wave 2A** | ✅     | 10 system audits               | 14 min    |
| **Wave 2B** | 🔄     | Phase 1-2 execution plans      | 80% done  |
| **Wave 2C** | 📅     | Friday leadership meeting prep | Next      |
| **Wave 3**  | 📅     | Phase 1 execution sprint       | Week 1    |

### Financial Impact

```
Current Monthly Spend:      $27,000
After Optimization:         $6,000
Year 1 Savings:            $124,900
Cost Reduction:            78%
ROI:                       1,711%
Payback (Phase 1):         3 weeks
```

---

## 🎯 Roadmap & Status

### Completed (Esta Semana)

- ✅ Agent name disambiguation (60 agents, 0 duplicates)
- ✅ Autonomous cycles (Phase 1-5)
- ✅ System audits (10/10 complete)
- ✅ Memory overflow fix (deployed)
- ✅ Model caching (+13% throughput)
- ✅ Provider quota enhancement (Feb 20)
- ✅ Financial impact doc ($124.9K savings)

### In Progress

- 🔄 Risk mitigation deep dive (PM task, ETA 02:05 PST)
- 🔄 Phase 1 execution prep
- 🔄 Friday leadership brief
- 🔄 Provider quota full integration

### Next Week

- 📅 Phase 1 security hardening
- 📅 Swagger/OpenAPI launch
- 📅 GitHub workflow enforcement
- 📅 Gates deployment (Feb 27-28)
- 📅 Production readiness: 6.3/10 → 8.9/10

---

## 🔍 Lookup: "Como fazer X?"

| Quer fazer...     | Comando/Ferramenta                                    |
| ----------------- | ----------------------------------------------------- |
| Enviar mensagem   | `openclaw message send --to CHANNEL --message TEXT`   |
| Criar agente      | `openclaw agents add --id ID --name NAME`             |
| Agendar tarefa    | `openclaw cron create --schedule CRON --task COMMAND` |
| Buscar na memória | `openclaw memory search --query TERM`                 |
| Executar skill    | `openclaw skills list` + skill docs                   |
| Diagnosticar      | `openclaw doctor --verbose`                           |
| Atualizar         | `openclaw update --channel stable\|beta\|dev`         |
| Config gateway    | `openclaw gateway config get`                         |
| Rodar testes      | `pnpm test` (all) ou `pnpm test:fast` (unit)          |
| Build             | `pnpm build`                                          |
| Ver agentes       | `openclaw agents list`                                |
| Spawn paralelo    | `openclaw sessions spawn --task TASK --agent AGENT`   |
| Pairing           | `openclaw pairing approve CHANNEL CODE`               |

---

## 📚 Mais Informações

**Documentação Aprofundada:**

- `SYSTEM_FUNCTIONALITY_ANALYSIS_20260220.md` — Análise completa (27.8 KB)
- `MASTER_AUDIT_REPORT_20260220.md` — 10 audits consolidados
- `LEADERSHIP_BRIEF_20260220.md` — 5-min executive summary
- `PROVIDER_QUOTA_EMERGENCY_FIX_20260220.md` — Provider details
- `GITHUB_WORKFLOW.md` — Dev guidelines

**Configuração:**

- `/config/providers/task-based-routing.yaml` — Model routing
- `/config/agents/agent-config.json` — 100 agents
- `openclaw.json` — Main config (in ~/.openclaw/)

**Localização:**

```
~/Desenvolvimento/openclawdev/    # Source code
~/.openclaw/                       # Runtime config + sessions
~/.openclaw/agents/main/workspace/ # Working directory
```

---

**Última atualização**: 2026-02-20 02:00 PST  
**Status**: ✅ 85% funcional, 🔄 15% em progresso  
**Próximo check**: Friday 6 AM leadership meeting
