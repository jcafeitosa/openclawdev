# 🔄 WORKFLOWS, RULES & PROTOCOLS FRAMEWORK

**Objective**: Define how agents work individually and collectively  
**Scope**: Individual autonomy, collective coordination, decision governance, explicit rules  
**Status**: Design phase (implementation after audit complete)

---

## 📋 THREE WORKFLOW LAYERS

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: INDIVIDUAL WORKFLOWS (What agent decides alone)    │
│          └─ Solo tasks, domain expertise, routine decisions  │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: TEAM WORKFLOWS (What team coordinates)            │
│          └─ Multi-agent, sequential or parallel tasks       │
├─────────────────────────────────────────────────────────────┤
│ LAYER 3: ORGANIZATIONAL WORKFLOWS (Governance + approval)   │
│          └─ Cross-team, approval gates, risk decisions      │
└─────────────────────────────────────────────────────────────┘
```

---

## LAYER 1: INDIVIDUAL WORKFLOWS

### Definition

**Agent acts alone when**:

- Decision is within their domain expertise
- Risk is LOW (reversible, no cross-team impact)
- Effort is LOW (<4 hours)
- No competing priorities

### Example: Frontend Engineer (Aninha)

```yaml
WORKFLOW: "Implement Button MCP"

TRIGGER: Task assigned

PHASES:
  1. UNDERSTAND (15 min)
     - Read task description
     - Check design specs
     - Verify no blockers
     DECISION: Can I proceed alone?
       → YES: go to DESIGN
       → NO: escalate (needs clarification)

  2. DESIGN (30 min)
     - Design component API
     - Write TypeScript types
     - Check accessibility requirements
     DECISION: Does design make sense?
       → YES: go to IMPLEMENT
       → NO: revisit or get design review

  3. IMPLEMENT (60 min)
     - Write component code
     - Add prop validation
     - Style with Tailwind
     - Add accessibility attrs
     DECISION: Code complete?
       → YES: go to TEST
       → NO: continue coding

  4. TEST (20 min)
     - Write unit tests
     - Test accessibility
     - Manual browser test
     DECISION: Tests pass?
       → YES: go to REVIEW
       → NO: fix and retest

  5. REVIEW (10 min)
     - Self-review code
     - Check for TODOs
     - Lint/format
     DECISION: Ready to submit?
       → YES: go to SUBMIT
       → NO: fix issues

  6. SUBMIT
     - Create PR with template
     - Link to task
     - Tag reviewer

ESCAPE HATCHES:
  - Stuck >2 hours? → Escalate to tech-lead (Carlos)
  - Blockers appear? → Escalate to engineering-manager (Diego)
  - Questions on design? → Ask frontend-architect (Aninha)

METRICS:
  - Time per phase (target)
  - Code quality (linting, tests)
  - Accessibility compliance
  - Completion rate (%)
```

### Individual Workflow Rules

**Agent has FULL AUTONOMY when**:

- ✅ Effort < 4 hours
- ✅ Risk = LOW (can rollback easily)
- ✅ No cross-team dependencies
- ✅ Follows established patterns
- ✅ Within domain expertise
- ✅ Success criteria clear

**Agent MUST ESCALATE when**:

- ❌ Effort > 4 hours (needs estimation)
- ❌ Risk = MEDIUM/HIGH (impacts others)
- ❌ Cross-team dependency
- ❌ Novel pattern (no precedent)
- ❌ Outside domain expertise
- ❌ Blocked > 30 minutes

---

## LAYER 2: TEAM WORKFLOWS

### Definition

**Team coordinates when**:

- Multiple agents involved
- Sequential OR parallel execution
- Shared resources or dependencies
- Medium risk (team-level impact)
- Decision requires consensus

### Example: Form MCP Implementation (Frontend + Backend)

```yaml
WORKFLOW: "Implement Form MCP"
TEAM: Frontend (Aninha) + Backend (Carlos) + QA (Isabela)

PHASES:
  1. PLANNING (30 min)
     OWNER: Aninha (frontend-architect)
     PARTICIPANTS: Carlos, Isabela

     TASKS:
       - Define form component API
       - Plan validation layer (client + server)
       - Plan error handling flow
       - Define test strategy

     OUTPUT: Shared design document

     DECISION POINT:
       All agree on design?
         → YES: go to PARALLEL_BUILD
         → NO: iterate design

  2. PARALLEL_BUILD (90 min)
     OWNER: Aninha (frontend) | Carlos (backend)

     PARALLEL_TRACK_1 (Aninha):
       - Implement React form component
       - Add client-side validation
       - Add error display
       - Tests for component

     PARALLEL_TRACK_2 (Carlos):
       - Design form API endpoint
       - Implement server validation
       - Add error responses
       - Tests for API

     SYNC_POINT: 45 min
       → Check progress
       → Identify blockers
       → Realign if needed

  3. INTEGRATION (30 min)
     OWNER: Aninha
     PARTICIPANTS: Carlos, Isabela

     TASKS:
       - Connect frontend to backend
       - Test end-to-end
       - Fix integration issues
       - Verify error flows

     DECISION POINT:
       Integration works?
         → YES: go to QA
         → NO: debug + retry

  4. QA (60 min)
     OWNER: Isabela (qa-lead)
     PARTICIPANTS: Aninha, Carlos

     TASKS:
       - Test all form flows
       - Test error scenarios
       - Test accessibility
       - Test performance

     DECISION POINT:
       Quality gates passed?
         → YES: go to REVIEW
         → NO: file bugs, iterate

  5. REVIEW (30 min)
     OWNER: Matheus (tech-lead)
     PARTICIPANTS: Aninha, Carlos, Isabela

     TASKS:
       - Code review (both frontend + backend)
       - Architecture review
       - Security review

     DECISION POINT:
       Approved?
         → YES: go to SUBMISSION
         → NO: request changes, iterate

  6. SUBMISSION
     - Merge PR
     - Deploy to staging
     - Announce completion

ESCAPE HATCHES:
  - Blocked > 1 hour? → Escalate to engineering-manager (Diego)
  - Design disagreement? → CTO (Rodrigo) makes decision
  - Quality concern? → QA Lead (Isabela) owns decision
  - Dependency issue? → engineering-manager (Diego) unblocks

METRICS:
  - Total time (target: 250 min)
  - Time per phase
  - Number of iterations (design/integration/qa)
  - Quality metrics (tests, coverage, a11y compliance)
```

### Team Workflow Rules

**Team COORDINATES when**:

- ✅ 2-5 agents involved
- ✅ Medium complexity (10-50 hours total)
- ✅ Medium risk (team-level impact)
- ✅ Timeline is tight (need parallelism)
- ✅ Clear dependencies between tracks

**Team MUST ESCALATE to Org Workflow when**:

- ❌ >5 agents involved (too complex for team coordination)
- ❌ High complexity (>50 hours, novel patterns)
- ❌ High risk (cross-team impact, production-critical)
- ❌ Scope uncertainty (needs architecture review)
- ❌ Resource conflicts (competing priorities)

---

## LAYER 3: ORGANIZATIONAL WORKFLOWS

### Definition

**Organization governs when**:

- Large scope (>100 hours, multiple teams)
- High risk (impacts product/customers)
- Architectural decisions
- Approval gates required
- Cross-company dependencies

### Example: New Feature (Form MCP + Backend + Frontend + DevOps + QA)

```yaml
WORKFLOW: "New Feature: Advanced Form System"
TEAMS: Frontend, Backend, DevOps, QA, Platform
GOVERNANCE: CTO (architecture), VP Eng (resources), CEO (strategy)

PHASES:
  1. PROPOSAL (2 hours)
     OWNER: Feature Owner (CPO or PM)

     INPUTS:
       - User problem statement
       - Success metrics
       - Estimated effort
       - Resource requirements

     OUTPUT: Feature Proposal Document

     GATE: APPROVAL REQUIRED
       → CTO: Architecture makes sense?
       → VP Eng: Resources available?
       → CPO: Priority correct?

     DECISION:
       Approved?
         → YES: go to PLANNING
         → NO: revise or REJECT
         → BLOCKED: wait for resources

  2. PLANNING (8 hours)
     OWNER: engineering-manager (Diego)
     PARTICIPANTS: All team leads (tech-lead, qa-lead, devops-lead)

     WORKSTREAMS:
       - Architecture design (CTO + tech-lead)
       - Database design (database-engineer)
       - API design (backend-architect)
       - Frontend design (frontend-architect)
       - Testing strategy (qa-lead)
       - DevOps/infrastructure (devops-engineer)

     PARALLEL RESEARCH (3 hours):
       - Each team explores domain
       - Identifies risks
       - Documents findings

     SYNC_POINT (1 hour):
       - All teams present findings
       - Identify dependencies
       - Align on approach

     DESIGN (4 hours):
       - Detailed technical design
       - Database schema
       - API contracts
       - Frontend components
       - Test plan

     OUTPUT: Design Document (approved by CTO)

     GATE: REVIEW REQUIRED
       → CTO: Architecture sound?
       → VA: Can we maintain this?
       → VP Eng: Timeline realistic?

  3. EXECUTION (50+ hours across teams)
     OWNER: engineering-manager (Diego)
     TEAMS: Frontend, Backend, QA, DevOps

     APPROACH: Parallel execution with sync points

     PARALLEL_TRACKS:
       1. Frontend team (Aninha) → 40 hours
       2. Backend team (Carlos) → 50 hours
       3. DevOps team (Thiago) → 20 hours
       4. QA team (Isabela) → 30 hours

     SYNC_POINTS (every 8 hours):
       - Progress update
       - Blocker identification
       - Resource reallocation if needed

     CHECKPOINTS (Team framework):
       - All teams use checkpoint framework
       - BEFORE checkpoint (team understands)
       - 50% checkpoint (on track?)
       - COMPLETION checkpoint (quality gates passed?)

     ESCALATION_CRITERIA:
       - Blocker >4 hours → escalate to manager
       - Design issue → escalate to CTO
       - Quality concern → escalate to qa-lead
       - Resource conflict → escalate to VP eng
       - Timeline slip >20% → escalate to VP eng

  4. INTEGRATION (10 hours)
     OWNER: engineering-manager (Diego)

     TASKS:
       - API contract validation
       - End-to-end test
       - Database migration testing
       - Security validation (CISO review)
       - Performance validation

     GATE: SECURITY & QUALITY
       → CISO: Security OK?
       → qa-lead: Quality gates passed?
       → performance-engineer: Performance OK?

  5. STAGING DEPLOYMENT (4 hours)
     OWNER: devops-engineer (Thiago)
     PARTICIPANTS: All team leads

     TASKS:
       - Deploy to staging
       - Smoke tests
       - Performance testing
       - Load testing
       - User acceptance testing

     GATE: GO/NO-GO DECISION
       → VP Eng + CTO: Ready for production?
       → CEO (if customer-facing): Business implications OK?

  6. PRODUCTION DEPLOYMENT
     OWNER: release-manager (Caio)

     APPROACH: Staged rollout (if building system)
       - Canary (1% traffic) → 30 min
       - Phase 2 (10% traffic) → 1 hour
       - Phase 3 (50% traffic) → 2 hours
       - Phase 4 (100% traffic) → complete

     MONITORING: SRE watches 24 hours

     GATE: ROLLBACK READY
       → SRE: Can rollback if issues?
       → DevOps: Alerts configured?

ESCAPE_HATCHES:
  - Stuck phase >1 day? → Escalate to VP Eng
  - Design uncertainty? → CTO decides
  - Resource conflict? → VP Eng resolves
  - Quality concern? → QA Lead owns decision

METRICS:
  - Timeline (actual vs estimated)
  - Budget (hours, resources)
  - Quality (tests, coverage, security, performance)
  - Risk incidents (bugs found, escalations)
  - Team satisfaction
```

### Organizational Workflow Rules

**Organization GOVERNS when**:

- ✅ >100 hours total effort
- ✅ HIGH risk (customer-facing, financial, security)
- ✅ Architectural decisions
- ✅ Cross-team dependencies
- ✅ Requires approval gates

**GOVERNANCE GATES** (must pass before proceeding):

```
GATE 1: PROPOSAL GATE
  Required approvals:
    - CTO: Architecture sound?
    - VP Eng: Resources available?
    - CEO (if strategy): Alignment?

  Decision options:
    - APPROVED → go to PLANNING
    - BLOCKED → resolve blockers → resubmit
    - REJECTED → close or pivot

GATE 2: DESIGN GATE
  Required approvals:
    - CTO: Design review passed?
    - Tech Leads: Feasible?
    - QA Lead: Test plan adequate?

  Decision options:
    - APPROVED → go to EXECUTION
    - NEEDS_REVISION → iterate design
    - REJECTED → redesign or cancel

GATE 3: QUALITY GATE
  Required approvals:
    - qa-lead: Tests passing? Coverage OK?
    - security-engineer: Security review passed?
    - performance-engineer: Perf OK?

  Decision options:
    - APPROVED → go to STAGING
    - NEEDS_FIXES → fix issues
    - REJECTED → revert

GATE 4: DEPLOYMENT GATE (Production)
  Required approvals:
    - VP Eng: Go-ahead?
    - SRE: Rollback ready?
    - CEO (if major feature): Business OK?

  Decision options:
    - APPROVED → deploy to production
    - BLOCKED → resolve blockers
    - ABORT → don't deploy (defer or cancel)
```

---

## 🎯 EXPLICIT RULES (Not Implicit)

### RULE 1: AUTONOMY BOUNDARIES

```
Individual Agent Autonomy:
  Domain:       Own expertise only
  Effort:       < 4 hours (solo)
  Risk:         Low (reversible)
  Dependencies: None (or internal only)
  Pattern:      Established (not novel)

Violation action:
  → Escalate to manager
  → Cannot proceed alone
  → Wait for team/org guidance
```

### RULE 2: ESCALATION CRITERIA

```
Escalate to Manager when:
  - Stuck > 30 minutes
  - Needs clarification from another domain
  - Uncertain about approach
  - Risk assessment needed
  - Resource allocation needed

Escalate to Director/VP when:
  - Stuck > 4 hours
  - Cross-team coordination needed
  - Timeline concern (>20% slip)
  - Budget concern
  - Scope uncertainty

Escalate to CTO when:
  - Architectural question
  - Design pattern decision needed
  - Technology selection
  - Trade-off between architecture options

Escalate to CEO when:
  - Strategy alignment question
  - Business impact question
  - Market/customer impact
  - Major company decision
```

### RULE 3: DECISION OWNERSHIP

```
Individual Agent Decides:
  - Implementation details (how to code)
  - Testing approach (what to test)
  - Code quality (standards, patterns)

Manager Decides:
  - Task assignment
  - Priority ordering
  - Timeline feasibility
  - Resource allocation
  - Cross-team coordination

Director Decides:
  - Team structure
  - Budget allocation
  - Hiring decisions
  - Process improvements

CTO Decides:
  - Architecture direction
  - Technology stack
  - Major design patterns
  - System scalability approach

CEO Decides:
  - Product strategy
  - Market positioning
  - Business priorities
  - Major resource allocation
```

### RULE 4: CHECKPOINT REQUIREMENTS

```
For Individual Tasks (<4 hours):
  ✅ No checkpoints (too small)
  ✅ Just submit when done

For Team Tasks (4-50 hours):
  ✅ BEFORE checkpoint (5 questions)
  ✅ 50% checkpoint (5 questions)
  ✅ COMPLETION checkpoint (5 questions)

For Org Tasks (>50 hours):
  ✅ PROPOSAL checkpoint (before approval)
  ✅ PLANNING checkpoint (design validation)
  ✅ EXECUTION checkpoints (every 8 hours sync)
  ✅ QUALITY checkpoint (before deployment)
  ✅ DEPLOYMENT checkpoint (production ready)
```

### RULE 5: BLOCKING & DEPENDENCIES

```
Agent A blocks Agent B when:
  - Agent A's output is Agent B's input
  - Agent B cannot proceed without Agent A

Handling:
  1. Make blocker EXPLICIT (don't hide)
  2. Escalate immediately (don't wait)
  3. Identify critical path (what must finish first)
  4. Assign unblocker (manager finds alternative)
  5. Parallel if possible (can we reorder?)
  6. Communicate ETA (when will blocker clear?)

Timeout:
  - If blocker >4 hours AND no ETA → escalate to VP Eng
  - VP Eng decides: Wait, reorder, or get help
```

---

## 🌳 DECISION TREES (Conditional Logic)

### Decision Tree: Agent Receives Task

```
┌─ Task Assigned
│
├─→ Q1: Is this in my domain expertise?
│   ├─ NO  → Escalate to manager
│   └─ YES → Q2
│
├─→ Q2: Can I estimate effort?
│   ├─ NO  → Ask manager for help
│   └─ YES → Q3
│
├─→ Q3: Is effort < 4 hours?
│   ├─ NO  → Go to TEAM_WORKFLOW
│   └─ YES → Q4
│
├─→ Q4: Are there dependencies?
│   ├─ YES → Go to TEAM_WORKFLOW
│   └─ NO  → Q5
│
├─→ Q5: Is risk LOW?
│   ├─ NO  → Go to ORG_WORKFLOW
│   └─ YES → Q6
│
└─→ Q6: Do I have clear success criteria?
    ├─ NO  → Ask manager for clarification
    └─ YES → Proceed with INDIVIDUAL_WORKFLOW
             (understand → design → implement → test → review → submit)
```

### Decision Tree: Team Lead Receives Multi-Agent Task

```
┌─ Task Assigned to Team
│
├─→ Q1: How many agents needed?
│   ├─ 1   → Route to individual agent
│   ├─ 2-5 → Q2 (TEAM_WORKFLOW)
│   └─ 6+  → Go to ORG_WORKFLOW
│
├─→ Q2: Effort estimate?
│   ├─ <4h  → Not a team task
│   ├─ 4-50h → Q3 (TEAM_WORKFLOW)
│   └─ >50h  → Go to ORG_WORKFLOW
│
├─→ Q3: Risk level?
│   ├─ HIGH → Go to ORG_WORKFLOW
│   ├─ MED  → Q4
│   └─ LOW  → Q5
│
├─→ Q4: Approval needed?
│   ├─ YES → Go to ORG_WORKFLOW
│   └─ NO  → Q5
│
├─→ Q5: Can tasks be parallelized?
│   ├─ NO  → Sequential planning
│   └─ YES → Parallel tracks + sync points
│
└─→ Q6: Assign owners + plan phases
    → Planning → Parallel Execution → Integration → QA → Review → Submit
```

### Decision Tree: Manager Handles Blocker

```
┌─ Blocker Reported
│
├─→ Q1: What's the nature?
│   ├─ TECHNICAL   → Escalate to tech-lead
│   ├─ RESOURCE    → Resolve allocation
│   ├─ DEPENDENCY  → Q2
│   ├─ CLARIFICATION → Provide info
│   └─ ARCHITECTURAL → Escalate to CTO
│
├─→ Q2 (for DEPENDENCY): Can we parallelize?
│   ├─ YES → Reorder tasks
│   ├─ NO  → Q3
│   └─ PARTIAL → Q4
│
├─→ Q3: How long until dependency clears?
│   ├─ <4h  → Agent waits (acceptable)
│   ├─ >4h  → Escalate to VP Eng
│   └─ UNKNOWN → Get ETA or escalate
│
├─→ Q4: Assign alternative work?
│   ├─ YES → Agent does alternative
│   └─ NO  → Agent waits or escalates
│
└─→ Follow up: Blocker resolved?
    ├─ YES → Agent resumes
    └─ NO  → Escalate to VP Eng (>4h without resolution)
```

---

## 📊 WORKFLOW SELECTION GUIDE

| Aspect          | Individual               | Team                   | Org                |
| --------------- | ------------------------ | ---------------------- | ------------------ |
| **Agents**      | 1                        | 2-5                    | 6+                 |
| **Effort**      | <4h                      | 4-50h                  | >50h               |
| **Risk**        | LOW                      | MEDIUM                 | HIGH               |
| **Complexity**  | Simple                   | Medium                 | High               |
| **Approval**    | None                     | Manager                | CTO/VP/CEO         |
| **Checkpoints** | None                     | 3                      | 5+                 |
| **Timeline**    | Hours                    | Days                   | Weeks              |
| **Example**     | Fix bug, write component | Implement API+Frontend | Launch new feature |

---

## 🚀 IMPLEMENTATION ROADMAP (After Audit)

### Phase 1: Individual Workflow Definition (Week 1)

- [ ] Define for each agent type (5 types × 15 agents)
- [ ] Create workflow templates
- [ ] Document escape hatches
- [ ] Test with real tasks

### Phase 2: Team Workflow Implementation (Week 2)

- [ ] Design team coordination patterns
- [ ] Create parallel execution framework
- [ ] Implement sync points
- [ ] Test with 3-5 person teams

### Phase 3: Organizational Governance (Week 3)

- [ ] Define approval gates
- [ ] Create decision trees
- [ ] Implement governance checkpoints
- [ ] Test with large features

### Phase 4: Automation (Week 4)

- [ ] Automate workflow routing (use decision trees)
- [ ] Auto-escalation based on criteria
- [ ] Metrics/dashboards per workflow
- [ ] Continuous improvement based on metrics

---

## 📌 CRITICAL SUCCESS FACTORS

```
✅ Rules are EXPLICIT (not implicit in code)
✅ Boundaries are CLEAR (when to escalate)
✅ Decision ownership is UNAMBIGUOUS
✅ Checkpoints are AUTOMATIC (by workflow)
✅ Escape hatches are CLEAR (what if stuck)
✅ Metrics track EFFICIENCY (time per workflow)
✅ Feedback loop improves WORKFLOWS (weekly review)
```

---

**Ready for implementation after system audit complete.** 🚀
