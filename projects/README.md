# 🎯 OpenClaw Projects — Automated Team Coordination

Multi-agent project management with RACI matrices, agent registries, and automatic delegation.

---

## 📁 Structure

```
projects/
├── README.md                          # This file
├── PROJECT_INIT_GUIDE.md              # How to initialize projects
├── templates/
│   ├── bigbot-week1.yaml              # Bigbot Quality Week 1 template
│   └── [future templates]
└── active/
    └── [active projects go here]
```

---

## 🚀 Quick Start

### 1. Copy Template & Create Project Directory

```bash
mkdir -p ~/my-project
cd ~/my-project

cp /path/to/openclawdev/projects/templates/bigbot-week1.yaml ./project.yaml
```

### 2. Generate Project Files

See `PROJECT_INIT_GUIDE.md` for step-by-step instructions to generate:

- `REGISTRY.md` — Agent profiles & team structure
- `RESPONSIBILITIES.md` — RACI matrix & escalation rules
- `ACTION_PLAN_WEEK1.md` — Day-by-day task breakdown

### 3. Spawn Agents

Use the `team-coordinator` skill to delegate work:

```bash
# In OpenClaw, use sessions_spawn with agentId from your REGISTRY
sessions_spawn({
  agentId: "qa-lead",
  task: "Lead project...",
  label: "My Project: Leadership"
});
```

---

## 📋 Available Templates

### Bigbot Quality Week 1 (`bigbot-week1.yaml`)

**Purpose:** Implement critical quality improvements  
**Duration:** 5 business days (Mon-Fri)  
**Goal:** Increase test maturity from 42% → 60%  
**Team:** 4 agents (qa-lead, devops-engineer, backend-architect, frontend-architect)

**Key Features:**

- TypeScript/ESLint blocker resolution
- Unit test coverage increase (65% → 80%)
- Component test implementation (1 → 80+)
- GitHub Actions CI/CD setup
- 30 GitHub issues tracked
- RACI matrix with escalation rules
- Daily standups + weekly review

**Status:** 🟢 Ready to use

---

## 🎯 What's in a Project Template

Each YAML template includes:

```yaml
name: project-name # Unique identifier
displayName: "Full Name" # Human-readable title
description: "What we're building" # Executive summary
timeline: # Dates, duration, timezone
  startDate: "2026-02-06"
  endDate: "2026-02-12"
goal: | # High-level objective
  What success looks like
team: # Agent roster
  lead: qa-lead
  members:
    - id: agent-name
      role: "Title"
      responsibility: "What they do"
raci: # RACI matrix
  - task: "Something"
    responsible: agent-name
    accountable: agent-name
    consulted: [agent1, agent2]
    informed: [agent3]
successCriteria: # Measurable outcomes
  - id: "metric-name"
    title: "Human-readable"
    goal: "Target value"
schedule: # Standups, reviews
  standup:
    time: "09:00"
    format: "slack"
escalation: # Risk levels
  low_risk:
    definition: "..."
    process: "..."
deliverables: # What we ship
  - name: "Deliverable 1"
    owner: agent-name
    dueDate: "2026-02-12"
```

---

## 🎓 Key Concepts

### RACI Matrix

**R** = Responsible (does the work)  
**A** = Accountable (signs off, single owner)  
**C** = Consulted (provides input)  
**I** = Informed (notified after)

```
Task: "Implement unit tests"
- Responsible: backend-architect (does the coding)
- Accountable: backend-architect (signs off)
- Consulted: qa-lead (advises on targets)
- Informed: devops-engineer (needs to know for CI/CD)
```

### Escalation Rules

**Low Risk** (< 2 hours)
→ Responsible decides independently  
Example: Writing a test for a specific function

**Medium Risk** (2-48 hours)
→ Responsible proposes, accountable reviews  
Example: New test coverage approach

**High Risk** (> 48 hours)
→ Responsible proposes, accountable + main approve  
Example: CI/CD pipeline changes

**Blocker** (blocks other work)
→ Escalate immediately to main (15-min resolution)  
Example: TypeScript won't compile

### Agent Registry

Central reference for team members in a project:

```
Agent: devops-engineer
├── Role: Infrastructure Lead
├── Responsibility: TypeScript, ESLint, CI/CD
├── Status: 🟢 Online
├── Response Time: < 1 hour
├── Availability: Mon-Fri 09:00-18:00 PST
└── Tasks: [list of assigned work]
```

---

## 📊 Project Lifecycle

### Phase 1: Setup (Day 0-1)

- Initialize project from template
- Generate REGISTRY + RESPONSIBILITIES
- Create ACTION_PLAN
- Kickoff meeting

### Phase 2: Execution (Day 2-4)

- Daily standups (09:00 PST)
- Track progress against RACI
- Escalate blockers immediately
- Update metrics

### Phase 3: Closure (Day 5)

- Friday review (17:00 PST)
- Consolidate metrics
- Generate final report
- Celebrate wins, identify lessons

---

## 🛠️ Using project-coordinator Skill

The `project-coordinator` skill handles:

✅ Project initialization from templates  
✅ REGISTRY + RESPONSIBILITIES auto-generation  
✅ Agent registry per project  
✅ Automatic team spawning  
✅ Daily standup scheduling  
✅ Progress tracking  
✅ Escalation routing

See `/openclawdev/skills/project-coordinator/SKILL.md` for full documentation.

---

## 📖 Documentation

- **PROJECT_INIT_GUIDE.md** — Step-by-step project creation
- **skills/project-coordinator/SKILL.md** — Full skill documentation
- **templates/bigbot-week1.yaml** — Bigbot Week 1 template (example)
- **REGISTRY.md** — Agent discovery & capabilities (per project)
- **RESPONSIBILITIES.md** — RACI matrix & escalation (per project)
- **ACTION_PLAN_WEEK1.md** — Day-by-day task breakdown (per project)

---

## 🚀 Creating a New Project Template

1. Copy an existing template:

   ```bash
   cp templates/bigbot-week1.yaml templates/my-project.yaml
   ```

2. Update the YAML with your:
   - Project name, goal, timeline
   - Team members & roles
   - RACI matrix
   - Success criteria
   - Schedule & escalation rules
   - Deliverables

3. Validate the YAML:

   ```bash
   yamllint templates/my-project.yaml
   ```

4. Add to git:
   ```bash
   git add templates/my-project.yaml
   git commit -m "feat: Add my-project template"
   ```

---

## 💡 Best Practices

### RACI Discipline

✅ **Every task has exactly 1 Accountable**  
✅ **Responsible role is clear**  
✅ **Consulted agents are specific (not "everyone")**  
✅ **Escalation rules are explicit**

❌ Don't: "Everyone is accountable"  
❌ Don't: Skip consulting required parties  
❌ Don't: Leave escalation undefined

### Team Communication

✅ **Daily standups** (15 min, async-friendly)  
✅ **Shared REGISTRY + RESPONSIBILITIES** (single source of truth)  
✅ **Explicit escalation paths** (who to contact)  
✅ **Weekly reviews** (progress against targets)

❌ Don't: Scatter documentation across tools  
❌ Don't: Unclear who owns what  
❌ Don't: Skip reviews

### Metrics & Tracking

✅ **Measurable success criteria**  
✅ **Daily progress updates**  
✅ **Blocker visibility** (Slack alerts)  
✅ **Final metrics report**

❌ Don't: Vague goals ("improve quality")  
❌ Don't: Go dark for days without updates  
❌ Don't: Ignore blockers

---

## 🔗 Integration Points

- **team-coordinator** skill → Spawns agents
- **sessions_spawn** → Delegates tasks
- **message tool** → Sends status updates (Slack, Telegram)
- **cron** → Schedules standups & reviews
- **REGISTRY.md** → Central agent discovery
- **RESPONSIBILITIES.md** → RACI enforcement

---

## 🆘 Troubleshooting

### "Can't find agent in REGISTRY"

Check your `project.yaml`:

```yaml
team:
  members:
    - id: devops-engineer # ← Must match OpenClaw agent ID
```

Valid agent IDs: `qa-lead`, `devops-engineer`, `backend-architect`, `frontend-architect`, etc.

### "RACI matrix conflicts"

If R and A disagree:

1. Try consensus (15 min)
2. Ask senior expert opinion (15 min)
3. Escalate to `main` (30 min)
4. Document decision in DECISIONS.md

### "Blocker not escalating"

Escalation is **manual** in current version:

1. React with 🔴 in Slack
2. Tag @main in #channel
3. Message main directly
4. Target: 15-min response

---

## 📅 Version History

| Version | Date       | Changes                                 |
| ------- | ---------- | --------------------------------------- |
| 1.0.0   | 2026-02-06 | Initial release, Bigbot Week 1 template |

---

## 📝 Contributing

To add a new project template:

1. Create `templates/my-project.yaml`
2. Include all required fields (see YAML schema above)
3. Test with `PROJECT_INIT_GUIDE.md` process
4. Submit PR with description
5. Request review from `main` (orchestrator)

---

## 🎯 Next Steps

1. ✅ Initialize Bigbot Week 1 (Monday 2026-02-06)
2. 🔄 Run daily standups (Mon-Fri 09:00 PST)
3. 📊 Track metrics against targets
4. 📋 Generate final report (Friday 17:00 PST)
5. 📚 Document lessons learned
6. 🔄 Iterate on templates based on experience

---

**Created:** 2026-02-06  
**Status:** 🟢 Production Ready  
**Maintained By:** Julio Cezar (OpenClaw Development)
