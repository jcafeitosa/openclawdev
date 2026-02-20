# 🎮 Agent System Quick-Start Playbook

_How to work with 100 agents effectively. Decision trees, playbooks, best practices._

---

## 🎯 BEFORE YOU USE AN AGENT

### 1. Identify Your Need (30 seconds)

```
Do you need to...

├─ Make a DECISION?
│  ├─ Strategic ($100K+, org-wide) → CEO/CTO
│  ├─ Technical (architecture) → CTO or Architect
│  ├─ Product (feature priority) → CPO/Product Manager
│  └─ Security (vulnerability) → CISO/Security Engineer
│
├─ Execute WORK? (code, tests, analysis)
│  ├─ API/Backend → Carlos + engineers
│  ├─ Frontend/UI → Aninha + engineers
│  ├─ Database → Fernanda
│  ├─ Security → Mariana
│  ├─ Performance → Paulo
│  ├─ Tests → Tatiane/Samanta
│  └─ Analysis → Sofia/Ricardo/Marcos
│
├─ Coordinate PEOPLE?
│  ├─ Tactical (sprint planning) → Product Manager
│  ├─ Operations (team blockers) → Engineering Manager
│  └─ Code quality (reviews) → Tech Lead
│
└─ Review/Improve EXISTING?
   ├─ Code → Matheus (Tech Lead) or Carlos
   ├─ Architecture → Architects
   ├─ Performance → Paulo
   └─ Security → Mariana
```

### 2. Check Agent Availability (10 seconds)

```bash
openclaw agents list
# Shows: status, current load, model assignment
```

### 3. Formulate Request (1-2 minutes)

```
Good: "Design API for user authentication with JWT"
Bad: "Make an API"

Good: "Optimize query that takes 5s on 100K rows"
Bad: "Make it faster"

Good: "Is this vulnerable to SQL injection? [code]"
Bad: "Is this secure?"
```

---

## 🚀 COMMON WORKFLOWS

### Workflow 1: DESIGN NEW FEATURE (End-to-End)

**Timeline**: 2-3 hours | **Team**: 4-5 agents | **Cost**: ~$10

```
Step 1: CLARIFY REQUIREMENTS (10 min)
  ├─ Ping: Product Manager (Bruno)
  ├─ Ask: "What are acceptance criteria for [feature]?"
  └─ Receive: User stories + scope

Step 2: ARCHITECTURE DECISION (20 min)
  ├─ Ping: Backend Architect (Carlos)
  ├─ Ask: "API design for [feature]?"
  ├─ Ask: "Database schema implications?"
  └─ Receive: API spec + schema design

Step 3: FRONTEND DESIGN (15 min)
  ├─ Ping: Frontend Architect (Aninha)
  ├─ Ask: "Component structure for [feature]?"
  └─ Receive: Component hierarchy + state management

Step 4: IMPLEMENTATION PLANNING (15 min)
  ├─ Ping: Engineering Manager (Diego)
  ├─ Ask: "Break into tasks + assign engineers"
  └─ Receive: Sprint tasks + owners

Step 5: QUALITY PLANNING (10 min)
  ├─ Ping: QA Lead (Isabela)
  ├─ Ask: "Test strategy for [feature]?"
  └─ Receive: Test plan + acceptance criteria

Step 6: SECURITY REVIEW (10 min)
  ├─ Ping: Security Engineer (Mariana)
  ├─ Ask: "Any security concerns? [design]"
  └─ Receive: Security sign-off or mitigations

Result: Feature is designed, ready to code
```

### Workflow 2: BUG DIAGNOSIS & FIX (1-2 hours)

**Timeline**: 1-2 hours | **Team**: 2-3 agents | **Cost**: ~$5

```
Step 1: REPORT ISSUE (5 min)
  └─ "When I [action], [bad thing] happens. Expected: [good thing]"

Step 2: DIAGNOSE (20-30 min)
  ├─ Ping: Root Cause Analyst (Marcos)
  ├─ Provide: Error logs, code context, reproduction steps
  └─ Receive: Root cause hypothesis + 3 possible fixes

Step 3: VALIDATE DIAGNOSIS (10 min)
  ├─ Ping: Relevant specialist (database, API, frontend)
  └─ Receive: Confirmation + implementation guidance

Step 4: IMPLEMENT FIX (20-30 min)
  ├─ Ping: Engineer (or specialist)
  ├─ Provide: Diagnosis + architecture approval
  └─ Receive: PR with fix + tests

Step 5: REVIEW & MERGE (10 min)
  ├─ Ping: Tech Lead (Matheus)
  └─ Receive: LGTM + merge

Result: Bug fixed, deployed, monitored
```

### Workflow 3: CODE REVIEW (30-45 min)

**Timeline**: 30-45 min | **Team**: 1-2 agents | **Cost**: ~$2

```
Step 1: SUBMIT PR (immediate)
  └─ GitHub: Create PR with description

Step 2: ARCHITECTURE REVIEW (10-15 min)
  ├─ Ping: Relevant Architect (Carlos/Aninha/Rafael)
  ├─ Context: PR link, design decision
  └─ Receive: Architecture approval or suggestions

Step 3: CODE QUALITY REVIEW (10-15 min)
  ├─ Ping: Tech Lead (Matheus)
  ├─ Context: PR link
  └─ Receive: Code quality feedback (patterns, style)

Step 4: SECURITY REVIEW (5-10 min)
  ├─ Ping: Security Engineer (Mariana) — if security-related
  └─ Receive: Security approval or issues

Step 5: TEST COVERAGE (5 min)
  ├─ Ping: Testing Specialist (Tatiane)
  ├─ Context: Code changes + test files
  └─ Receive: Coverage feedback

Result: Approved PR ready to merge
```

### Workflow 4: PERFORMANCE INVESTIGATION (1-2 hours)

**Timeline**: 1-2 hours | **Team**: 2-3 agents | **Cost**: ~$5

```
Step 1: REPORT SLOWNESS (5 min)
  ├─ "Feature X takes [time], expected [time]"
  ├─ Provide: Metrics, user impact, frequency
  └─ Prioritize: Is it critical or annoying?

Step 2: INVESTIGATE (30 min)
  ├─ Ping: Performance Engineer (Paulo)
  ├─ Provide: Code, logs, reproduction steps
  └─ Receive: Bottleneck identified + optimization options

Step 3: SELECT OPTIMIZATION (10 min)
  ├─ Ping: Relevant specialist (database/API/frontend)
  ├─ Consider: Trade-offs (complexity vs speed)
  └─ Decide: Which optimization to implement

Step 4: IMPLEMENT (30 min)
  ├─ Ping: Engineer
  ├─ Provide: Optimization approach
  └─ Receive: PR with optimized code

Step 5: VALIDATE (10 min)
  ├─ Measure: New performance
  ├─ Verify: Improvement meets target
  └─ Accept: Or iterate if needed

Result: Performance improved, monitored
```

---

## 📋 DECISION TREES

### "I need code reviewed. Who do I ping?"

```
Is it ARCHITECTURAL change?
├─ YES → Backend Architect (Carlos) or Frontend Architect (Aninha)
├─ NO → Tech Lead (Matheus)

Does it involve SECURITY?
├─ YES → Security Engineer (Mariana) [in parallel]
├─ NO → [skip]

Does it need TEST review?
├─ YES → Testing Specialist (Tatiane)
├─ NO → [skip]

Timeline: 10-15 min per reviewer
```

### "Performance is bad. What to investigate?"

```
Is it API LATENCY?
├─ YES → Performance Engineer (Paulo) + Backend Architect (Carlos)
└─ NO → Continue

Is it DATABASE QUERY?
├─ YES → Database Engineer (Fernanda)
└─ NO → Continue

Is it FRONTEND rendering?
├─ YES → Frontend Architect (Aninha) + Performance Engineer
└─ NO → Continue

Is it NETWORK/CDN?
├─ YES → DevOps Engineer (Thiago)
└─ NO → Continue

Root Cause Analyst (Marcos) can help if unclear
Timeline: 30 min diagnosis
```

### "Should we use X technology?"

```
Is it a FRAMEWORK (Elysia, Astro, Drizzle)?
├─ YES → Specialist (Miguel, Beatriz, Aline)
├─ NO → Continue

Is it INFRASTRUCTURE (Docker, Kubernetes)?
├─ YES → DevOps Engineer (Thiago) + System Architect (Pedro)
├─ NO → Continue

Is it DATABASE?
├─ YES → Database Engineer (Fernanda)
├─ NO → Continue

Is it ARCHITECTURAL choice (monolith vs micro)?
├─ YES → CTO (Rodrigo) + System Architect (Pedro)
├─ NO → Continue

Is it PLATFORM selection (AWS vs GCP)?
├─ YES → CTO (Rodrigo) + Deep Research (Ricardo)
└─ NO → Continue

Default: Deep Research (Ricardo) for evaluation
Timeline: 25 min analysis
```

---

## ⚡ SPEED TIPS

### 1. Parallel Requests (Save 50% Time)

```bash
# Instead of sequential:
1. Carlos: API design (20 min)
2. Aninha: Frontend design (20 min)
3. Total: 40 min

# Do parallel:
1. Carlos + Aninha simultaneously (20 min)
2. Total: 20 min ✅
```

### 2. Use Fast Agents for Execution

```bash
# SLOW (25+ min): Ricardo, Marcos, Architectects
# MEDIUM (15 min): Engineers
# FAST (5-10 min): Sofia, Tatiane, specialists

# For quick tasks (< 5 min), use FAST agents
# For strategic decisions (> 20 min), use SLOW agents
```

### 3. Pre-Fill Context

```
BEFORE: "Why is this slow?"
AFTER: "This [function] takes 5s on 100K rows. [profiling data]. Why?"

BEFORE: "Design API"
AFTER: "Design API for [feature] with [constraints] based on [existing patterns]"

More context = faster response = lower cost
```

### 4. Batch Similar Tasks

```
DON'T:
1. Sofia: Analyze metric A (10 min)
2. Sofia: Analyze metric B (10 min)
3. Total: 20 min

DO:
1. Sofia: Analyze metrics A, B, C (12 min)
2. Total: 12 min ✅
```

---

## 💰 COST OPTIMIZATION

### Tier-Based Assignment

```
$$$$ (Expensive - 10% of requests)
└─ Strategic decisions (CEO, CTO, Architects)
   └─ Use when: Uncertain, high impact, expensive to redo

$$$ (Medium - 30% of requests)
└─ Engineering decisions (Tech Lead, Engineers, DB specialist)
   └─ Use when: Complex technical problem, needs expertise

$$ (Cheap - 40% of requests)
└─ Execution tasks (Sofia, Tatiane, specialists)
   └─ Use when: Straightforward coding, testing, analysis

$ (Free - 20% of requests)
└─ Fallback models (Llama, Mistral, Qwen)
   └─ Use when: Non-critical, batch processing, experiments
```

### Cost Per Use Case

| Task                  | Cheapest         | Cost  | Speed |
| --------------------- | ---------------- | ----- | ----- |
| Analyze SQL           | Sofia (haiku)    | $0.50 | 8s    |
| Write tests           | Tatiane (haiku)  | $0.50 | 10s   |
| Review code           | Matheus (sonnet) | $1.50 | 15s   |
| Design API            | Carlos (sonnet)  | $2.00 | 20s   |
| Architecture decision | Rodrigo (opus)   | $5.00 | 40s   |
| Strategic decision    | Elena (opus)     | $5.00 | 45s   |

---

## ✅ QUALITY CHECKLIST

### Before Pinging an Agent

- [ ] **Question is clear** (specific, not vague)
- [ ] **Context provided** (code, metrics, logs when relevant)
- [ ] **Goal stated** (what success looks like)
- [ ] **Right agent selected** (matching expertise)
- [ ] **No personal data** (no credentials, API keys, etc)
- [ ] **Reasonable timeline** (not "urgent" unless genuinely is)

### After Getting Response

- [ ] **Answer makes sense** (not contradictory)
- [ ] **You understand it** (if not, ask for clarification)
- [ ] **Next steps are clear** (what to do with answer)
- [ ] **Can implement** (not too vague)

### If Response is Wrong

- [ ] **Provide feedback** (tell agent what was wrong)
- [ ] **Give more context** (agent might have misunderstood)
- [ ] **Ask differently** (rephrase if first try didn't work)
- [ ] **Escalate if needed** (if specialist can't help, go to architect)

---

## 🎓 LEARNING PATHS

### For New Engineers

**Week 1**: Work with Sofia (data) + Tatiane (testing)

- Understand metrics, test philosophy
- Build confidence

**Week 2**: Pair with Miguel/Beatriz on features

- Learn code patterns, style

**Week 3**: Work with Matheus (Tech Lead) on reviews

- Learn code quality standards

**Week 4**: Feature work with Carlos/Aninha

- Learn architectural patterns

### For New Managers

**Week 1**: Work with Product Manager (Larissa)

- Learn product discovery, sprint planning

**Week 2**: Pair with Engineering Manager (Diego)

- Learn team coordination, blockers

**Week 3**: Work with Tech Lead (Matheus)

- Learn code quality, technical mentoring

**Week 4**: Architecture review with Architects

- Learn technical decision-making

---

## 🚨 COMMON MISTAKES

### ❌ "I pinged the wrong agent"

**Prevention**:

- Use decision trees above
- Check agent expertise (read AGENT_CAPABILITIES_ADVANCED_REFERENCE.md)
- Ask for help: "Who should I ask about [topic]?"

**Recovery**:

- Ping correct agent
- Reference previous conversation

### ❌ "Question too vague"

**Prevention**:

- Provide context (code, metrics, logs)
- State goal clearly ("I want to make this 2x faster")
- Specify constraints ("within 1 hour", "without breaking API")

**Recovery**:

- Clarify: "More specific: [details]"
- Agent will ask for clarification if needed

### ❌ "Waiting for answer took too long"

**Prevention**:

- Parallel: Ping multiple agents simultaneously
- Use Fast agents for quick tasks
- Batch similar requests

**Recovery**:

- Check agent status: `openclaw agents list`
- Escalate to Engineering Manager if blocked

### ❌ "Cost higher than expected"

**Prevention**:

- Use appropriate agent tier (FAST for execution)
- Batch requests (fewer roundtrips)
- Use fallback models for non-critical work

**Recovery**:

- Enable cost tracking: `openclaw session status`
- Adjust model assignment for future

---

## 📊 SUCCESS METRICS

### Good Collaboration

- ✅ Responses in < 30 seconds
- ✅ First response solves problem (no back-and-forth)
- ✅ Cost is reasonable (<$5 per task)
- ✅ Quality is high (rare follow-ups)
- ✅ Team is productive (short cycle times)

### Signs of Problems

- 🔴 Responses take >60 seconds (agent overloaded)
- 🔴 Multiple clarifications needed (question too vague)
- 🔴 Cost is >$10 per task (using expensive agent unnecessarily)
- 🔴 Quality is poor (wrong answer, irrelevant)
- 🔴 Frequent errors (agent confused)

---

## 🔄 FEEDBACK LOOP

### How Agents Learn (via feedback)

If agent answer was wrong:

```
Good: "That's wrong because [explanation]. The correct answer is [X]."
Bad: "This doesn't work."
```

Agents use feedback to improve future responses. Specific feedback is more valuable.

---

## 📞 ESCALATION CONTACTS

| Problem               | Contact             | Response Time |
| --------------------- | ------------------- | ------------- |
| Agent unresponsive    | Engineering Manager | <10 min       |
| Rate limiting         | DevOps Engineer     | <5 min        |
| Cost too high         | VP Engineering      | <15 min       |
| Architecture question | CTO                 | <10 min       |
| Blocked on decision   | CEO                 | <15 min       |
| Security concern      | CISO                | Immediate     |

---

## 🎬 QUICK REFERENCE: "WHAT TO SAY"

### Good Requests

```
"Carlos, design API for user registration:
  - Email + password input
  - JWT token response
  - Should work with existing DB schema
  - Error cases: invalid email, weak password"

"Sofia, analyze Q1 metrics:
  - Feature adoption rate by cohort
  - Performance trends (API latency, DB query time)
  - User retention by feature"

"Tatiane, write tests for [feature]:
  - 80%+ coverage target
  - Edge cases: [list]
  - Performance: tests should run <100ms"
```

### Bad Requests

```
❌ "Make API"
❌ "Fix performance"
❌ "Write tests"

These lack context and specifics.
```

---

## 📈 NEXT STEPS

1. **Read** `AGENT_SYSTEM_MASTER_AUDIT_20260220.md` (organization + structure)
2. **Read** `AGENT_CAPABILITIES_ADVANCED_REFERENCE_20260220.md` (detailed capabilities)
3. **Use** This playbook for daily work
4. **Provide feedback** if agents don't match descriptions

---

**Last Updated**: 2026-02-20 02:25 PST  
**Version**: 1.0 (Final for Phase 1)  
**Next Review**: After Phase 2 (May 31)

_You now have everything you need to work effectively with 100 agents._
