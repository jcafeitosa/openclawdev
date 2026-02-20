# 🔄 GITHUB WORKFLOW — Conflict Prevention & Work Loss Mitigation

**Purpose**: Prevent merge conflicts, work loss, and coordination chaos with 60+ agents  
**Status**: MANDATORY for all work  
**Enforcement**: Automated via pre-commit hooks + CI/CD gates

---

## 📋 GOLDEN RULES (OBRIGATÓRIO)

### ✅ RULE 1: Branch per Agent

```bash
# ❌ WRONG
git checkout main
git commit -am "implemented feature"

# ✅ CORRECT
git checkout -b feature/julio-cezar/form-mcp-implementation
git commit -m "feat(form-mcp): add React Hook Form integration"
```

**Enforcement**:

- Pre-commit hook blocks commits to `main` (cannot commit directly)
- CI/CD rejects PRs from `main` branch
- Gustavo (git-specialist) monitors 24/7

---

### ✅ RULE 2: Conventional Commits

```bash
# ✅ CORRECT FORMATS
feat(scope):    New feature
fix(scope):     Bug fix
refactor(scope): Code reorganization
perf(scope):    Performance improvement
docs(scope):    Documentation
test(scope):    Tests
chore(scope):   Dependency updates, build config

# EXAMPLES
feat(checkpoint): add red flag detection matrix
fix(gateway): correct WebSocket timeout handling
perf(database): optimize query with indexes
docs(security): add vulnerability register
```

**Enforcement**:

- `git commit` blocks non-conventional messages (husky)
- CI fails on bad commit messages
- PR title must be conventional (GitHub Actions)

---

### ✅ RULE 3: Pull Request Requirements

```
BEFORE SUBMITTING PR:
  [ ] Branched from latest main
  [ ] All tests pass locally (pnpm test)
  [ ] Lint passes (pnpm check)
  [ ] Build passes (pnpm build)
  [ ] No merge conflicts
  [ ] PR template filled (what, why, testing)
  [ ] Linked to issue (if applicable)
  [ ] Assigned reviewer (tech-lead or specialist)

TITLE FORMAT: feat(scope): description / fix(scope): description
DESCRIPTION: Explain what + why (not how)
TESTING: What did you test? How can reviewer verify?
```

**Enforcement**:

- PR template auto-populated
- Required status checks: tests, lint, build, security scan
- Must have approval from tech-lead or domain specialist
- No self-approval

---

### ✅ RULE 4: Merge Strategy (Squash + Rebase)

```bash
# Merge strategy: Squash + Rebase
# = Clean history (one commit per feature)
# = No merge commit clutter
# = Easy to revert

# GitHub setting:
Settings > General > Pull Requests >
  Allow squash merging ✅
  Allow rebase merging ✅
  Allow auto-merge ✅
  Default: Squash and merge
```

---

### ✅ RULE 5: Conflict Resolution

```bash
# IF CONFLICTS APPEAR:

# 1. Pull latest main
git fetch origin
git rebase origin/main

# 2. Resolve conflicts (editor shows <<<< ==== >>>>)
# Keep your changes or theirs?
# RULE: If unsure, ask the person who made the other change

# 3. Mark resolved
git add .

# 4. Continue rebase
git rebase --continue

# 5. Force push (safe on your branch only)
git push -f origin feature/julio-cezar/my-branch

# 6. Let CI retest (GitHub checks run automatically)

# DO NOT:
# ❌ git push origin +main (NEVER force push main)
# ❌ git merge main (use rebase instead)
# ❌ Ignore conflicts (they won't go away)
```

**Conflict Prevention**:

- Short-lived branches (max 3 days)
- Rebase frequently (daily)
- Communicate overlapping changes
- Gustavo monitors merge conflicts

---

### ✅ RULE 6: Code Review Expectations

```
CODE REVIEWER CHECKLIST:

[ ] Code is correct (logic, edge cases)
[ ] Tests cover changes
[ ] No security issues
[ ] Follows patterns & conventions
[ ] Performance acceptable
[ ] Documentation updated
[ ] Comments clear and helpful
[ ] No console.logs left
[ ] No TODOs without context

RESPONSE TIME: <1 hour (GitHub notifies)

APPROVAL TYPES:
  "Approve" = Ready to merge
  "Request changes" = Must address
  "Comment" = FYI only
```

---

## 🔐 PROTECTED BRANCHES

```
MAIN BRANCH:
  ├─ Requires 1 approval (tech-lead or cto-designated)
  ├─ Requires status checks: tests, lint, build, security
  ├─ Dismiss stale reviews when new commits pushed
  ├─ Enforce admins rule (CTO must follow rules too)
  └─ Delete head branch after merge (keep repo clean)

STAGING BRANCH (if used):
  ├─ Requires 1 approval
  ├─ CI deploys automatically
  └─ Production smoke tests run

DEVELOP BRANCH (if used):
  ├─ Direct commits allowed (feature branches preferred)
  └─ Nightly release candidate builds
```

---

## 📊 WORKFLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ GITHUB WORKFLOW                                             │
└─────────────────────────────────────────────────────────────┘

1. CREATE BRANCH (per agent)
   ↓
   git checkout -b feature/julio-cezar/form-mcp
   ↓

2. MAKE CHANGES
   ↓
   Edit files → commit → push
   ↓

3. PULL REQUEST
   ↓
   GitHub: Automated checks run (tests, lint, build)
   ├─ Tests fail → Fix and push
   ├─ Lint fails → Run pnpm check --fix
   └─ Tests pass ✅
   ↓

4. CODE REVIEW
   ↓
   Tech-lead reviews → Requests changes OR approves
   ├─ Changes requested → Fix and push
   └─ Approved ✅
   ↓

5. MERGE
   ↓
   GitHub: Squash + merge → Delete branch
   ↓

6. DEPLOY
   ↓
   CI/CD: Automated deployment
   ├─ Staging: Immediate
   └─ Production: Manual approval or scheduled
   ↓

7. MONITOR
   ↓
   SRE: Watch metrics for 24h
   ├─ Issues? Rollback or hotfix
   └─ OK? Merge to next version
```

---

## 🚨 CONFLICT PREVENTION RULES

### Rule A: Branch Scope (Prevent Overlaps)

```
ONE AGENT = ONE BRANCH

If 2+ agents work on same component:
  ❌ NO: Both on same branch (conflicts guaranteed)
  ✅ YES: Split responsibilities or use branches

Example: Form MCP
  ├─ frontend/julio-cezar/form-mcp-component (UI)
  ├─ backend/carlos/form-mcp-validation (API)
  ├─ test/isabela/form-mcp-testing (Tests)
  └─ All merge via sequential PRs (no simultaneous)
```

### Rule B: File Ownership (Clear Boundaries)

```
AREAS:
  ├─ src/gateway/     → Owned by CTO + tech-lead
  ├─ src/agents/      → Owned by agent-orchestrator
  ├─ src/security/    → Owned by security-engineer
  ├─ src/database/    → Owned by database-engineer
  └─ docs/            → Owned by technical-writer

CHANGES OUTSIDE YOUR AREA:
  ❌ Don't commit directly
  ✅ Ask owner or open PR for discussion
```

### Rule C: Merge Frequency (Small PRs)

```
PR SIZE GUIDELINES:
  ✅ <200 lines:   Fast review (30 min)
  🟡 200-500:      Normal review (1-2 hours)
  ❌ >500 lines:   Split into smaller PRs

MERGE FREQUENCY:
  ✅ 5-10 merges per day (healthy)
  🟡 1-2 merges per day (slower)
  ❌ 0 merges per week (dangerous)
```

### Rule D: Dependency Management (Prevent Lock File Conflicts)

```
pnpm-lock.yaml conflicts = VERY COMMON

PREVENTION:
  1. NEVER edit pnpm-lock.yaml directly
  2. Update dependencies atomically
  3. Each agent updates own dependencies in separate PR

PROCESS:
  1. pnpm add <package>
  2. Commit package.json + pnpm-lock.yaml together
  3. Open PR immediately
  4. Merge fast (don't let it stale)

CONFLICT RESOLUTION:
  pnpm install --frozen-lockfile
  # (This resets pnpm-lock.yaml to original)
  # Then: pnpm add <package> in your PR
```

### Rule E: Automated Conflict Detection

```
GitHub Actions: Conflict Detection
  ├─ Trigger: Daily at midnight
  ├─ Check: Are any branches conflicted with main?
  ├─ Action: Notify agent + assign to Gustavo
  └─ Auto-rebase: If author approves

Example output:
  "Branch feature/carlos/api-auth has conflicts with main"
  → Gustavo notifies Carlos
  → Carlos rebases: git rebase origin/main
  → Tests rerun automatically
```

---

## 🔄 DAILY AGENT RITUAL (MORNING)

```
EVERY MORNING (before coding):

[ ] Pull latest main
    git checkout main && git pull origin main

[ ] Rebase your branch
    git checkout feature/yourname/task
    git rebase origin/main

[ ] Resolve any conflicts (unlikely if daily)
    git rebase --continue (if conflicts)

[ ] Push to branch
    git push -f origin feature/yourname/task

[ ] Run tests locally
    pnpm test

[ ] Check CI/CD status
    GitHub → Actions tab

Result: Your branch is always in sync with main
        Conflicts caught early (not at merge)
```

---

## 📈 WORK LOSS PREVENTION

### Backup Strategy

```
RULE: Every commit is backed up to GitHub

YOUR RESPONSIBILITY:
  ✅ Commit frequently (every 30-60 min)
  ✅ Push to branch (don't keep local only)
  ✅ Don't force-push main (GitHub prevents it)

OPENCLAW RESPONSIBILITY:
  ✅ GitHub backup (enterprise grade)
  ✅ Daily automated backups (separate account)
  ✅ 90-day retention (can recover anything)

WORK LOSS PREVENTION:
  ❌ Never delete branches without merging
  ❌ Never force-push without approval (except your own branch)
  ✅ Use GitHub's branch protection for main
```

### Data Recovery

```
IF SOMETHING GOES WRONG:

Problem 1: "I deleted my branch by accident"
  Solution: GitHub keeps deleted branches for 90 days
  Recovery: Contact Gustavo → Restore branch

Problem 2: "I committed bad code, want to undo"
  Solution: git revert <commit-hash>
  Process: Revert creates new commit (doesn't erase history)
  Push: Immediately

Problem 3: "Merge conflict went wrong"
  Solution: git reset --hard origin/main
  Alternative: Gustavo can force-revert

Problem 4: "Entire branch corrupted"
  Solution: GitHub backup restore
  Timeline: <1 hour recovery
```

---

## 🤖 AUTOMATED ENFORCEMENT

### Pre-commit Hooks (Local)

```bash
# Installed: .git/hooks/pre-commit

CHECKS:
  ✅ No commits to main (blocked)
  ✅ No console.logs left
  ✅ Conventional commit message
  ✅ Files not too large (>10MB blocked)
  ✅ No secrets in code (password, apikey, etc)

If any fail:
  → Commit blocked
  → Fix issues
  → git add .
  → git commit (retry)
```

### CI/CD Gates (GitHub Actions)

```yaml
# Runs automatically on every push/PR

Tests:       pnpm test          (must pass)
Lint:        pnpm check         (must pass)
Build:       pnpm build         (must pass)
Security:    npm audit          (no critical CVEs)
Types:       TypeScript strict  (no errors)
Coverage:    >80% for new code  (must meet)
Secrets:     Scan for exposed   (must pass)

If any fail:
  → PR blocked from merging
  → Fix required
  → Re-run CI
  → Approve when green
```

---

## 📋 INCIDENT RESPONSE

### Scenario 1: Broken Merge

```
DETECTION:
  CI shows tests failing on main

IMMEDIATE (5 min):
  ├─ Git log: identify bad commit
  ├─ git revert <bad-commit-hash>
  ├─ Commit: "revert: [explain issue]"
  └─ Push: Triggers CI (should pass now)

INVESTIGATION (30 min):
  ├─ Why did this pass locally?
  ├─ Missing test coverage?
  ├─ Environment difference?
  └─ Add test to prevent recurrence

ROOT CAUSE:
  PR reviewer should have caught it
  → Gustavo reviews PR standards
```

### Scenario 2: Merge Conflict

```
DETECTION:
  "This branch has conflicts with main"

RESOLUTION (<10 min):
  ├─ git fetch origin
  ├─ git rebase origin/main
  ├─ Resolve <<<< ==== >>>> manually
  ├─ git add .
  ├─ git rebase --continue
  └─ git push -f origin your-branch

CI RUNS AGAIN:
  ├─ Tests rerun (may pass now)
  └─ If passing → Ready to merge

PREVENTION:
  ├─ Rebase daily
  ├─ Keep branches short-lived (<3 days)
  └─ Communicate overlapping work
```

### Scenario 3: Accidental Force Push

```
DETECTION:
  GitHub shows "History rewritten"

RECOVERY (If on main):
  ❌ PREVENTED: Branch protection blocks force-push to main

RECOVERY (If on feature branch):
  ├─ git reflog → Find your commits
  ├─ git reset --hard <old-commit>
  ├─ Push again
  └─ Notify Gustavo

PREVENTION:
  ├─ Never force-push without explicit need
  ├─ Always double-check branch name
  └─ Use: git push -f (not git push --force-with-lease)
```

---

## 🎓 GUSTAVO'S RESPONSIBILITIES (git-specialist)

**24/7 Monitoring** of:

```
✅ Every commit (conventional format?)
✅ Every PR (proper scope? conflicts?)
✅ Every merge (on schedule?)
✅ Branch health (old branches? stale?)
✅ Conflict detection (auto-notify agents)
✅ CI/CD status (failures? blocked PRs?)
✅ GitHub actions (secrets? performance?)
✅ Backup status (automated? verified?)
```

**Automated Alerts** when:

```
🚨 Non-conventional commit
🚨 Direct commit to main
🚨 Merge conflict detected
🚨 PR >500 lines (suggest split)
🚨 PR stale >24 hours (nudge reviewer)
🚨 Test failure on main (revert + notify)
🚨 Branch >7 days old (cleanup candidate)
🚨 Backup failure (investigate)
```

**Weekly Report** (every Monday):

```
📊 Commits this week: X
📊 PRs merged: Y
📊 Conflicts resolved: Z
📊 Avg review time: N hours
📊 Build success rate: X%
📊 Merge success rate: X%
📊 Biggest risk areas (by churn)
📊 Recommendations for next week
```

---

## ✨ SUCCESS CRITERIA

After this workflow is adopted:

```
BEFORE:
  ❌ Manual coordination chaos
  ❌ Frequent merge conflicts
  ❌ Unclear who owns what
  ❌ Work loss incidents
  ❌ Rollback necessary (broken merges)
  ❌ Deployment anxiety

AFTER:
  ✅ Clear agent responsibilities
  ✅ Minimal conflicts (auto-rebased)
  ✅ File ownership documented
  ✅ Zero work loss (backed up)
  ✅ Safe merges (CI prevents breaks)
  ✅ Confident deployments
  ✅ <30 min average review time
  ✅ 5-10 merges per day (healthy velocity)
```

---

## 🚀 IMMEDIATE ACTIONS

**TODAY**:

```
[ ] Copy this workflow to GitHub
[ ] Setup branch protection on main
[ ] Install pre-commit hooks (all agents)
[ ] Configure GitHub Actions (tests, lint, build)
[ ] Assign Gustavo as code owner
```

**THIS WEEK**:

```
[ ] Train all agents on workflow (20 min each)
[ ] Do 5 practice PRs (test the system)
[ ] Fix any missing CI/CD gates
[ ] Verify backups working
```

**ONGOING**:

```
[ ] Gustavo monitors (24/7)
[ ] Weekly report (Monday morning)
[ ] Monthly review + improvements
[ ] Quarterly cleanup (old branches, old PRs)
```

---

## 📞 SUPPORT

**Questions?** → Ask Gustavo (@git-specialist)  
**Stuck on rebase?** → Gustavo can help (1-5 min)  
**Merge conflict?** → Gustavo resolves (5-10 min)  
**Work lost?** → Gustavo recovers (within 24h)  
**Policy clarification?** → CTO decides

---

**This workflow is MANDATORY for all development.**  
**Violations = CTO notification + mandatory retraining.**  
**Gustavo enforces via automation + daily monitoring.**

🔒 **Work is protected. Conflicts are prevented. Deployments are safe.**

---

_Last updated: Feb 19, 2026_  
_Next review: Feb 22, 2026_
