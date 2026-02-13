---
description: System Health Monitor - Continuous monitoring and automated issue detection
---

# System Health Monitor Workflow

Este workflow implementa o **Health Monitor Agent** - um agente supervisor que monitora continuamente a saúde do OpenClaw.

## Quick Start

```bash
# Run health check manually
pnpm openclaw agent --message "Run comprehensive health check" --agent health-monitor

# Setup automated monitoring (heartbeat)
# Add to HEARTBEAT.md (see below)

# Setup cron monitoring
pnpm openclaw cron add --job health-monitor-scan.json

# Check monitoring status
pnpm openclaw session-status --agent health-monitor
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│      Health Monitor (Autonomous Agent)      │
│                                             │
│  Triggers:                                  │
│  • Heartbeat (every 30min)                 │
│  • Cron (periodic scans)                   │
│  • Manual (on-demand)                      │
│  • Post-deployment (automated)             │
└──────────────┬──────────────────────────────┘
               │
               ├─── 1. Security Scan
               │    └→ security_audit (deep=false)
               │    └→ security_stats
               │    └→ security_alerts
               │
               ├─── 2. Code Quality Scan
               │    └→ exec: pnpm check
               │    └→ exec: pnpm test:coverage
               │    └→ analyze complexity/duplication
               │
               ├─── 3. System Health Scan
               │    └→ gateway status --deep
               │    └→ Check process health
               │    └→ Monitor resource usage
               │
               ├─── 4. Dependencies Scan
               │    └→ exec: npm audit
               │    └→ exec: pnpm outdated
               │    └→ Check for breaking changes
               │
               └─── 5. Issue Triage & Delegation
                    │
                    ├→ Critical → collaboration.session.init
                    │              (CISO + CTO + specialists)
                    │
                    ├→ High → sessions_spawn (specialist)
                    │
                    └→ Medium/Low → team_workspace.write_artifact
```

---

## Installation

### Step 1: Create Agent Configuration

Create `agents/health-monitor.json`:

```json
{
  "id": "health-monitor",
  "name": "System Health Monitor",
  "role": "lead",
  "emoji": "🏥",
  "expertise": [
    "System monitoring",
    "Security auditing",
    "Quality assurance",
    "Performance analysis",
    "Dependency management"
  ],
  "reports_to": "cto",
  "manages": ["security-engineer", "quality-engineer", "qa-lead", "performance-engineer"]
}
```

### Step 2: Configure Heartbeat Monitoring

Add to `HEARTBEAT.md`:

```markdown
# Health Monitor - Automated Scans

Every 30 minutes:

1. Run security_stats - check for critical/high alerts
2. Verify Gateway status
3. Quick code quality check (no full build)
4. Check for critical TODOs/FIXMEs in recent commits

If issues detected:

- Critical → Start collaboration debate
- High → Delegate to specialist
- Medium/Low → Log to workspace

If all clear: HEARTBEAT_OK
```

### Step 3: Configure Cron Job

Create `health-monitor-scan.json`:

```json
{
  "name": "health-monitor-scan",
  "schedule": {
    "kind": "every",
    "everyMs": 1800000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "Run automated health scan (30min cycle)",
    "model": "anthropic/claude-sonnet-4-5",
    "thinking": "low"
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

Then register:

```bash
pnpm openclaw cron add --job health-monitor-scan.json
```

---

## Health Check Procedures

### Procedure 1: Security Scan (Lightweight)

```typescript
async function securityScanLight() {
  // Get stats (fast, no deep probe)
  const stats = await security_stats();

  if (stats.critical > 0 || stats.high > 0) {
    return {
      severity: "critical",
      category: "security",
      count: { critical: stats.critical, high: stats.high },
      action: "escalate",
    };
  }

  // Check recent alerts
  const alerts = await security_alerts({ limit: 10 });
  const recentCritical = alerts.filter(
    (a) => a.severity === "critical" && Date.now() - a.timestamp < 3600000,
  );

  if (recentCritical.length > 0) {
    return {
      severity: "critical",
      category: "security",
      alerts: recentCritical,
      action: "escalate",
    };
  }

  return { status: "ok" };
}
```

### Procedure 2: Code Quality Scan (Fast)

```bash
# Quick lint check (no fix, just report)
pnpm oxlint . --deny-warnings 2>&1 | head -50

# Type check (faster than full build)
pnpm tsc --noEmit --incremental

# Check for new linting issues in recent commits
git diff HEAD~5..HEAD | grep -E "^\+" | pnpm oxlint --stdin
```

### Procedure 3: Coverage Check (Targeted)

```bash
# Only run tests for recently changed files
git diff --name-only HEAD~5..HEAD | grep "\.ts$" | xargs pnpm test --coverage

# Parse coverage and flag if dropped
# Target: lines > 70%, branches > 70%
```

### Procedure 4: Gateway Health

```bash
# Quick status check
pnpm openclaw status

# Deep probe (use sparingly - more expensive)
pnpm openclaw status --deep

# Check for zombie processes
ps aux | grep openclaw-gateway | grep -v grep

# Verify response time
time pnpm openclaw status 2>&1 | grep "real"
```

### Procedure 5: Dependencies Audit

```bash
# Security audit (npm built-in)
npm audit --audit-level=high --json > audit-report.json

# Check outdated deps (major versions only)
pnpm outdated --format json > outdated-report.json

# Check for deprecated dependencies
pnpm list --depth=0 --json | jq '.dependencies | to_entries[] | select(.value.deprecated) | {name: .key, reason: .value.deprecated}'
```

---

## Issue Triage Logic

### Severity Levels

| Severity | Criteria                           | Response Time | Action       |
| -------- | ---------------------------------- | ------------- | ------------ |
| Critical | Security vulnerability (CVE high+) | Immediate     | Debate + Fix |
|          | Gateway down/unresponsive          |               |              |
|          | Data loss risk                     |               |              |
| High     | Test coverage < 60%                | < 4 hours     | Delegate     |
|          | Build failures                     |               |              |
|          | Performance regression > 2x        |               |              |
| Medium   | Test coverage 60-70%               | < 24 hours    | Log + Track  |
|          | Lint warnings                      |               |              |
|          | Outdated deps (major)              |               |              |
| Low      | Minor code smells                  | < 1 week      | Log only     |
|          | Outdated deps (minor/patch)        |               |              |

### Escalation Matrix

```typescript
const ESCALATION_MAP = {
  security: {
    critical: { agents: ["ciso", "security-engineer", "backend-architect"], action: "debate" },
    high: { agents: ["security-engineer"], action: "delegate" },
  },
  quality: {
    critical: { agents: ["qa-lead", "quality-engineer"], action: "debate" },
    high: { agents: ["quality-engineer"], action: "delegate" },
  },
  performance: {
    critical: { agents: ["performance-engineer", "sre", "backend-architect"], action: "debate" },
    high: { agents: ["performance-engineer"], action: "delegate" },
  },
  dependencies: {
    critical: { agents: ["backend-architect", "security-engineer"], action: "debate" },
    high: { agents: ["backend-architect"], action: "delegate" },
  },
  infrastructure: {
    critical: { agents: ["devops-engineer", "sre", "cto"], action: "debate" },
    high: { agents: ["devops-engineer"], action: "delegate" },
  },
};
```

---

## Response Templates

### Template 1: Critical Security Issue

```markdown
🚨 **CRITICAL SECURITY ALERT**

**Category:** Security Vulnerability
**Severity:** Critical
**Detected:** [timestamp]

**Issue:** [CVE-XXXX-XXXXX] High-severity vulnerability in [package-name]

**Impact:**

- Affected versions: [version range]
- Attack vector: [description]
- CVSS Score: [score]

**Recommended Action:**

1. Upgrade [package-name] to [safe-version]
2. Run full security audit
3. Review affected endpoints/features
4. Deploy hotfix if production affected

**Assignees:**

- @ciso (coordination)
- @security-engineer (investigation)
- @backend-architect (implementation)

**Escalation:** Collaboration debate started - session: [sessionKey]
```

### Template 2: High Priority Quality Issue

```markdown
⚠️ **HIGH PRIORITY: Code Quality Degradation**

**Category:** Code Quality
**Severity:** High
**Detected:** [timestamp]

**Issue:** Test coverage dropped to [X]% (target: 70%+)

**Affected Modules:**

- [module-1]: [coverage]%
- [module-2]: [coverage]%

**Root Cause:** [analysis if available]

**Recommended Action:**

1. Add tests for uncovered modules
2. Review recent commits for testing gaps
3. Update test suite documentation

**Assignee:** @qa-lead

**Tracking:** Logged to team workspace - artifact: [artifact-name]
```

### Template 3: All Clear

```markdown
✅ **Health Check: All Systems Normal**

**Scan Completed:** [timestamp]
**Duration:** [duration]

**Security:** No critical/high alerts
**Quality:** Coverage at [X]% (target: 70%)
**Gateway:** Status: healthy, Response time: [X]ms
**Dependencies:** [X] total, [Y] outdated (minor)

**Next Scan:** [next-timestamp]

HEARTBEAT_OK
```

---

## Manual Operations

### On-Demand Deep Scan

```bash
# Full comprehensive scan (expensive)
pnpm openclaw agent --message "Run DEEP health investigation with full reports" --agent health-monitor

# Specific category scan
pnpm openclaw agent --message "Run security-only deep scan" --agent health-monitor
pnpm openclaw agent --message "Run quality-only deep scan" --agent health-monitor
```

### Pre-Release Health Check

```bash
# Before any release
pnpm openclaw agent --message "Pre-release health check: verify all systems ready for deployment" --agent health-monitor

# Expected output:
# - Security audit clean
# - All tests passing (coverage >= 70%)
# - No critical TODOs
# - Dependencies up to date
# - Gateway stable
```

### Post-Deployment Verification

```bash
# After deployment
pnpm openclaw agent --message "Post-deployment verification: ensure release did not introduce issues" --agent health-monitor

# Checks:
# - Gateway still healthy
# - No new security alerts
# - No regressions in metrics
```

### Investigate Specific Issue

```bash
# Deep-dive into a specific category
pnpm openclaw agent --message "Investigate high memory usage in Gateway process" --agent health-monitor
```

---

## Integration with Team

### Collaboration Flow

```
Health Monitor detects critical issue
         ↓
  Creates debate session
  collaboration.session.init({
    topic: "Critical: [issue]",
    agents: [relevant specialists],
    moderator: "cto"
  })
         ↓
  Specialists debate solution
         ↓
  Moderator finalizes decision
         ↓
  Implementation spawned
  sessions_spawn({
    task: "Implement solution from decision",
    agentId: [specialist],
    debateSessionKey: [session]
  })
```

### Delegation Flow

```
Health Monitor detects high-priority issue
         ↓
  Identifies specialist
  (via ESCALATION_MAP)
         ↓
  Spawns task
  sessions_spawn({
    task: "Fix [issue]",
    agentId: [specialist],
    label: "Fix: [category]"
  })
         ↓
  Specialist investigates & fixes
         ↓
  Reports back via announce
         ↓
  Health Monitor validates fix
```

---

## Metrics & Reporting

### Daily Health Report

Generated every 24h and saved to `team_workspace`:

```markdown
# Daily Health Report - [date]

## Summary

- Scans: 48/48 completed
- Issues detected: [count]
  - Critical: [count]
  - High: [count]
  - Medium: [count]
  - Low: [count]
- Issues resolved: [count]
- Average response time: [duration]

## Security

- Alerts: [count]
- Blocked events: [count]
- Audit findings: [summary]

## Quality

- Test coverage: [percentage]
- Lint issues: [count]
- Build status: [status]

## Dependencies

- Total: [count]
- Outdated: [count]
- Vulnerabilities: [count]

## Gateway

- Uptime: [percentage]
- Avg response time: [ms]
- Error rate: [percentage]

## Actions Taken

1. [action 1]
2. [action 2]
   ...
```

---

## Troubleshooting

### Health Monitor Not Running

```bash
# Check cron jobs
pnpm openclaw cron list

# Verify heartbeat configured
cat HEARTBEAT.md

# Check session status
pnpm openclaw session-status --agent health-monitor

# Restart monitoring
pnpm openclaw cron run --job health-monitor-scan
```

### Too Many False Positives

Adjust thresholds in configuration:

```json
{
  "health-monitor": {
    "thresholds": {
      "coverage": {
        "critical": 50,
        "high": 60,
        "medium": 70
      },
      "security": {
        "critical": ["critical"],
        "high": ["high"],
        "medium": ["medium"]
      }
    }
  }
}
```

### Performance Impact

If monitoring is too resource-intensive:

```bash
# Reduce scan frequency
# Update cron everyMs from 1800000 (30min) to 3600000 (1hr)

# Use lighter scans in heartbeat
# Skip deep probes, use quick checks only

# Limit concurrent spawned tasks
# Reduce maxConcurrent for subagents
```

---

## Next Steps

1. ✅ Create agent profile
2. ✅ Setup heartbeat monitoring
3. ✅ Configure cron jobs
4. ⏳ Integrate with team (add to AGENTS.md)
5. ⏳ Create health dashboard (optional)
6. ⏳ Setup alerting (Slack/Discord/email)

---

## References

- Security tools: `docs/security/`
- Collaboration system: `AGENT_COLLABORATION.md`
- Sub-agents: `docs/tools/subagents.md`
- Gateway ops: `docs/gateway/`
