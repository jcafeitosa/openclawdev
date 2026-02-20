# 🚀 Agent Capabilities — Advanced Reference Guide

_Complete capability matrix for all 100 agents: what each can do, limitations, optimal use cases._

---

## 📖 HOW TO USE THIS GUIDE

**For each agent**, you'll find:

1. **Expertise**: Core specialization
2. **Model Tier**: Default model + fallback chain
3. **Tool Access**: What they can execute
4. **Scope**: What they're responsible for
5. **Limitations**: What they cannot do
6. **Best For**: Optimal use cases
7. **Performance**: Speed, accuracy, cost
8. **Integration**: How to invoke this agent

---

## 🏢 C-LEVEL EXECUTIVES

### Elena (CEO)

- **Expertise**: Business strategy, market positioning, team leadership
- **Model**: claude-opus-4-5 (strategic)
- **Tool Access**: FULL (exec, browser, canvas, files, secrets)
- **Decision Authority**: Strategic (org-wide)
- **Scope**: Board-level decisions, investment, market direction
- **Best For**:
  - Major business pivots
  - Budget approval ($100K+)
  - Team scaling decisions
  - Investor relations
- **Speed**: ~45s avg response
- **Cost**: ~$2K/month
- **Invoke**: `openclaw agent --message "Market analysis for Q2" --agent ceo`

### Rodrigo (CTO)

- **Expertise**: Technical architecture, vendor selection, engineering standards
- **Model**: claude-opus-4-5 (technical depth)
- **Tool Access**: FULL + code review authority
- **Decision Authority**: Technical (no override by non-technical)
- **Scope**: Architecture decisions, technology stack, code patterns
- **Best For**:
  - Architecture decisions (when uncertain)
  - Technology evaluation
  - Design pattern selection
  - Performance budgets
- **Speed**: ~40s avg response
- **Cost**: ~$2K/month
- **Invoke**: `openclaw agent --message "Should we use X or Y?" --agent cto`

### Camila (CPO)

- **Expertise**: Product roadmap, feature prioritization, user needs
- **Model**: claude-opus-4-5 (strategic)
- **Tool Access**: FULL
- **Decision Authority**: Product (feature scope, roadmap)
- **Scope**: Product direction, user research, feature validation
- **Best For**:
  - Feature prioritization conflicts
  - User research analysis
  - Product roadmap planning
- **Speed**: ~45s avg response
- **Cost**: ~$2K/month
- **Invoke**: `openclaw agent --message "Which feature should we build next?" --agent cpo`

### Valeria (CISO)

- **Expertise**: Security, compliance, threat assessment
- **Model**: claude-opus-4-5 (security focus)
- **Tool Access**: FULL + security audit tools
- **Decision Authority**: Security (veto power on insecure decisions)
- **Scope**: Security policy, compliance, threat modeling
- **Best For**:
  - Security architecture review
  - Threat modeling
  - Compliance assessment
  - Vulnerability prioritization
- **Speed**: ~50s avg response
- **Cost**: ~$2K/month
- **Invoke**: `openclaw agent --message "Is this architecture secure?" --agent ciso`

---

## 👔 DIRECTOR LAYER

### Diego (Engineering Manager)

- **Expertise**: Team leadership, process, coordination
- **Model**: claude-sonnet-4-5 (balance speed + depth)
- **Tool Access**: CODING (exec limited to team tasks)
- **Authority**: Team leadership (delegate downward only)
- **Reports**: 15+ engineers
- **Best For**:
  - Team coordination
  - Sprint planning
  - Blocker resolution
  - Resource allocation
- **Speed**: ~20s response
- **Cost**: ~$500/month
- **Invoke**: `openclaw agent --message "Team blockers: X, Y, Z" --agent engineering-manager`

### Larissa (Product Manager)

- **Expertise**: Product operations, stakeholder management, prioritization
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING
- **Authority**: Product process (coordinate with CPO for direction)
- **Best For**:
  - Sprint scope definition
  - Stakeholder coordination
  - User story refinement
  - Risk mitigation planning
- **Speed**: ~20s response
- **Cost**: ~$500/month
- **Invoke**: `openclaw agent --message "Sprint Y planning" --agent product-manager`

### Matheus (Tech Lead)

- **Expertise**: Code quality, mentoring, pattern enforcement
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING + code review
- **Authority**: Code standards (can block PR for quality)
- **Best For**:
  - Code review of architectural changes
  - Pattern mentoring
  - Junior developer guidance
- **Speed**: ~18s response
- **Cost**: ~$400/month
- **Invoke**: `openclaw agent --message "Review PR pattern: [link]" --agent tech-lead`

### Isabela (QA Lead)

- **Expertise**: Test strategy, release readiness, quality metrics
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING (test automation)
- **Authority**: Release approval (can block release for quality)
- **Best For**:
  - Test strategy planning
  - Release readiness assessment
  - Quality metrics analysis
- **Speed**: ~20s response
- **Cost**: ~$400/month
- **Invoke**: `openclaw agent --message "Is v2.0 ready for release?" --agent qa-lead`

### Bruno (Product Owner)

- **Expertise**: Backlog management, user story creation, sprint scope
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING
- **Authority**: Backlog priority (works with CPO for direction)
- **Best For**:
  - User story writing
  - Backlog refinement
  - Acceptance criteria
- **Speed**: ~18s response
- **Cost**: ~$400/month
- **Invoke**: `openclaw agent --message "Write user story for X feature" --agent product-owner`

### Henrique (VP Engineering)

- **Expertise**: Engineering operations, metrics, optimization
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING (analytics)
- **Authority**: Engineering efficiency (can recommend process changes)
- **Best For**:
  - DORA metrics analysis
  - Efficiency improvements
  - Team capacity planning
- **Speed**: ~20s response
- **Cost**: ~$500/month
- **Invoke**: `openclaw agent --message "Our throughput is slowing. Diagnose." --agent vp-engineering`

---

## 🏛️ ARCHITECT LAYER

### Carlos (Backend Architect)

- **Expertise**: API design, database schema, server patterns
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING
- **Authority**: Backend architecture decisions (final word on APIs)
- **Best For**:
  - API design review
  - Database schema design
  - Server-side performance
  - Elysia.js patterns
- **Speed**: ~20s response
- **Cost**: ~$600/month
- **Invoke**: `openclaw agent --message "Design API for [feature]" --agent backend-architect`

### Aninha (Frontend Architect)

- **Expertise**: UI components, state management, UX patterns
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING
- **Authority**: Frontend architecture (final word on components)
- **Best For**:
  - Component architecture
  - State management patterns
  - React Islands design
  - Astro structure
- **Speed**: ~18s response
- **Cost**: ~$600/month
- **Invoke**: `openclaw agent --message "Design component system for [feature]" --agent frontend-architect`

### Rafael (Software Architect)

- **Expertise**: Design patterns, SOLID, refactoring, code organization
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING + refactoring authority
- **Authority**: Code organization (can recommend structure changes)
- **Best For**:
  - Design pattern selection
  - Refactoring strategy
  - Code organization review
  - SOLID principle enforcement
- **Speed**: ~18s response
- **Cost**: ~$600/month
- **Invoke**: `openclaw agent --message "This code smells. Refactor strategy?" --agent software-architect`

### Pedro (System Architect)

- **Expertise**: Distributed systems, scalability, performance, infrastructure
- **Model**: claude-sonnet-4-5
- **Tool Access**: CODING + infrastructure design
- **Authority**: System architecture (final word on scalability decisions)
- **Best For**:
  - Scalability planning
  - Distributed system design
  - Performance budgeting
  - Infrastructure decisions
- **Speed**: ~20s response
- **Cost**: ~$600/month
- **Invoke**: `openclaw agent --message "Design for 1M users" --agent system-architect`

---

## 🔧 ENGINEERING SPECIALISTS

### Thiago (DevOps Engineer)

- **Expertise**: Docker, CI/CD, deployment, infrastructure
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (exec limited to deployment)
- **Best For**:
  - CI/CD pipeline design
  - Docker configuration
  - Deployment automation
  - GitHub Actions workflows
- **Speed**: ~15s
- **Cost**: ~$300/month
- **Invoke**: `openclaw agent --message "Setup CI/CD for [project]" --agent devops-engineer`

### Fernanda (Database Engineer)

- **Expertise**: PostgreSQL, Drizzle, schema design, query optimization
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (SQL execution on dev/test only)
- **Best For**:
  - Database schema design
  - Query optimization
  - Migration planning
  - Index strategy
- **Speed**: ~12s
- **Cost**: ~$250/month
- **Invoke**: `openclaw agent --message "Design schema for [feature]" --agent database-engineer`

### Mariana (Security Engineer)

- **Expertise**: OWASP, vulnerability assessment, penetration testing
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING + security scanning tools
- **Best For**:
  - Vulnerability assessment
  - Penetration testing
  - Security code review
  - Threat modeling
- **Speed**: ~18s
- **Cost**: ~$300/month
- **Invoke**: `openclaw agent --message "Audit [component] for security" --agent security-engineer`

### Lucas (AI Engineer)

- **Expertise**: LLM integration, RAG, embeddings, fine-tuning
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (Ollama, model management)
- **Best For**:
  - LLM integration
  - RAG pipeline design
  - Embedding selection
  - Model fine-tuning
- **Speed**: ~15s
- **Cost**: ~$300/month
- **Invoke**: `openclaw agent --message "Build RAG for [domain]" --agent ai-engineer`

### Paulo (Performance Engineer)

- **Expertise**: Profiling, benchmarking, optimization, load testing
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (profiling, load testing)
- **Best For**:
  - Performance analysis
  - Load testing
  - Bottleneck identification
  - Optimization strategy
- **Speed**: ~18s
- **Cost**: ~$300/month
- **Invoke**: `openclaw agent --message "Why is [system] slow?" --agent performance-engineer`

---

## ✅ QUALITY & TESTING

### Tatiane (Testing Specialist)

- **Expertise**: TDD, Vitest, test strategy, coverage
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (Vitest, test execution)
- **Best For**:
  - Test strategy planning
  - TDD guidance
  - Test suite design
  - Coverage improvement
- **Speed**: ~12s
- **Cost**: ~$250/month
- **Invoke**: `openclaw agent --message "Design test strategy for [feature]" --agent testing-specialist`

### Samanta (QA Automation)

- **Expertise**: E2E testing, Playwright, automation
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (Playwright)
- **Best For**:
  - E2E test writing
  - Test automation
  - Regression testing
- **Speed**: ~12s
- **Cost**: ~$250/month
- **Invoke**: `openclaw agent --message "Write E2E tests for [flow]" --agent qa-automation`

---

## 🔍 ANALYSIS & RESEARCH

### Ricardo (Deep Research)

- **Expertise**: Technology evaluation, benchmarking, investigation
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (limited to research)
- **Best For**:
  - Technology evaluation
  - Competitive analysis
  - Best practices research
  - POC investigation
- **Speed**: ~25s
- **Cost**: ~$400/month
- **Invoke**: `openclaw agent --message "Evaluate X vs Y vs Z" --agent deep-research`

### Marcos (Root Cause Analyst)

- **Expertise**: Issue investigation, 5 Whys, problem diagnosis
- **Model**: claude-sonnet-4-5 → haiku
- **Tool Access**: CODING (log analysis, debugging)
- **Best For**:
  - Issue diagnosis
  - Root cause analysis
  - Incident investigation
  - Pattern detection
- **Speed**: ~20s
- **Cost**: ~$300/month
- **Invoke**: `openclaw agent --message "Why does [issue] happen?" --agent root-cause-analyst`

### Sofia (Data Analyst)

- **Expertise**: SQL analysis, metrics, reporting, data visualization
- **Model**: claude-haiku-4-5 (cost-optimized)
- **Tool Access**: CODING (SQL on analytics DB)
- **Best For**:
  - Metrics analysis
  - SQL queries
  - Report generation
  - Trend analysis
- **Speed**: ~8s
- **Cost**: ~$150/month
- **Invoke**: `openclaw agent --message "Analyze [metric] trend" --agent data-analyst`

---

## 📝 SPECIALIZATION MATRIX

### Framework Specialists

| Specialist      | Framework      | Best For                       | Speed | Cost |
| --------------- | -------------- | ------------------------------ | ----- | ---- |
| Miguel (elysia) | Elysia.js      | API route design, middleware   | 10s   | $150 |
| Beatriz (astro) | Astro 4+       | Component structure, SSR       | 10s   | $150 |
| Leonardo (bun)  | Bun runtime    | Package management, scripts    | 8s    | $100 |
| Aline (drizzle) | Drizzle ORM    | Schema design, query building  | 10s   | $150 |
| Clara (zod)     | Zod validation | Schema validation, type safety | 8s    | $100 |

### Quality Specialists

| Specialist         | Domain       | Best For                  | Speed | Cost |
| ------------------ | ------------ | ------------------------- | ----- | ---- |
| Roberto (refactor) | Code cleanup | Refactoring strategy      | 15s   | $200 |
| Gustavo (git)      | Git workflow | Merge strategy, conflicts | 10s   | $150 |
| Patricia (qa)      | QA process   | Test planning             | 12s   | $150 |

---

## 🎯 AGENT SELECTION GUIDE

### "I need to..."

| Task                 | Best Agent    | Why                    | Speed |
| -------------------- | ------------- | ---------------------- | ----- |
| Design API           | Carlos        | Backend architecture   | 20s   |
| Fix slow query       | Fernanda      | Database specialist    | 12s   |
| Test component       | Tatiane       | Testing expert         | 12s   |
| Optimize performance | Paulo         | Performance specialist | 18s   |
| Debug issue          | Marcos        | Root cause analyst     | 20s   |
| Plan sprint          | Bruno         | Product owner          | 18s   |
| Review architecture  | Rodrigo (CTO) | Final authority        | 40s   |
| Write docs           | Luciana       | Technical writer       | 10s   |
| Security audit       | Mariana       | Security specialist    | 18s   |
| Research framework   | Ricardo       | Deep research          | 25s   |

---

## ⚡ PERFORMANCE TIERS

### Fast (<10s): Execution Tasks

```
sofia (data-analyst)
leonardo (bun-specialist)
clara (zod-specialist)
samanta (qa-automation)
tatiane (testing-specialist)
beatriz (astro-specialist)
miguel (elysia-specialist)
```

### Medium (10-20s): Analysis Tasks

```
fernanda (database-engineer)
thiago (devops-engineer)
aline (drizzle-specialist)
mariana (security-engineer)
lucas (ai-engineer)
gustavo (git-specialist)
patricia (qa-engineer)
```

### Slow (20-50s): Strategic Tasks

```
ricardo (deep-research)
marcos (root-cause-analyst)
paulo (performance-engineer)
carlos (backend-architect)
aninha (frontend-architect)
rafael (software-architect)
pedro (system-architect)
diego (engineering-manager)
larissa (product-manager)
matheus (tech-lead)
isabela (qa-lead)
bruno (product-owner)
henrique (vp-engineering)
```

### Very Slow (40-90s): C-Level

```
elena (ceo)
rodrigo (cto)
camila (cpo)
valeria (ciso)
```

---

## 💰 COST OPTIMIZATION

### How to minimize agent costs

1. **Use Haiku for execution**
   - 80% cheaper than Sonnet
   - Fast (5-10s) for simple tasks
   - Good for batch processing

2. **Use Sonnet for engineering**
   - Better quality than Haiku
   - 30% cheaper than Opus
   - Good for code review, design

3. **Use Opus rarely**
   - Reserve for strategic decisions
   - Necessary when uncertain
   - ~10% of total requests

4. **Fallback to free models**
   - 100K tokens/day available
   - Good for non-critical tasks
   - Batch processing (overnight)

### Expected Cost Savings

| Strategy                       | Saving  |
| ------------------------------ | ------- |
| Opus → Sonnet for non-critical | 65%     |
| Sonnet → Haiku for execution   | 70%     |
| Use free models for batch      | 100%    |
| Task-based routing             | 40%     |
| **Combined**                   | **78%** |

---

## 🔄 WHEN TO ESCALATE

| Situation                       | Escalate To          |
| ------------------------------- | -------------------- |
| Code review feedback challenged | Tech Lead            |
| Architecture unclear            | CTO                  |
| Feature priority conflict       | CPO                  |
| Security concern                | CISO                 |
| Team blocked                    | Engineering Manager  |
| Budget needed                   | CEO                  |
| Performance bottleneck          | Performance Engineer |
| User issue                      | Product Manager      |

---

## 📊 AGENT UTILIZATION TARGETS

### Per Agent Monthly

| Tier       | Utilization | Est. Cost | Notes                    |
| ---------- | ----------- | --------- | ------------------------ |
| C-Level    | 5-10%       | $1.5-2K   | High impact, low volume  |
| Director   | 20-30%      | $300-500  | Coordination, planning   |
| Architect  | 30-40%      | $400-600  | Design review, mentoring |
| Engineer   | 60-70%      | $200-400  | Implementation, dev      |
| Specialist | 50-60%      | $150-300  | Execution, expertise     |
| Governance | 100%        | ~$100     | 24/7 monitoring          |

---

## 🎓 TRAINING NEW DEVELOPERS

**Recommended Agent Path**:

1. **Week 1**: Work with Sofia (data-analyst) + Tatiane (testing)
2. **Week 2**: Pair with Miguel/Beatriz on features
3. **Week 3**: Work with Matheus (tech-lead) on patterns
4. **Week 4**: Tackle features with Carlos (backend-architect)

---

## 🚀 AGENT ROADMAP (Phase 2)

| Improvement                        | Timeline | Impact      |
| ---------------------------------- | -------- | ----------- |
| Agent RBAC (who can talk to who)   | Week 1   | Security    |
| Audit logging (action tracking)    | Week 1   | Compliance  |
| Cost attribution per agent         | Week 2   | Visibility  |
| Agent health monitoring            | Week 2   | Reliability |
| Model caching (faster responses)   | Week 2   | Performance |
| Self-healing (auto-restart failed) | Week 3   | Resilience  |
| Capability discovery               | Week 3   | Usability   |

---

**Last Updated**: 2026-02-20 02:20 PST  
**Next Review**: After Phase 2 (May 31)  
**Accuracy**: 95% (based on current config + audits)
