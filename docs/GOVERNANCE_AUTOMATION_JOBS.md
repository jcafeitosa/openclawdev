# ⚙️ Governance Automation - Cron Jobs & Scheduling

**Status**: Ready to Deploy  
**Jobs**: 6 critical automation jobs for governance system  
**Schedule**: Weekly reports + continuous monitoring + automated alerts

---

## 1️⃣ WEEKLY EVALUATION JOB

```json
{
  "jobId": "job-evaluator-weekly",
  "name": "Weekly Agent Evaluation & Performance Analysis",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * 1",
    "tz": "America/Vancouver"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "GOVERNANCE TASK: Weekly Agent Evaluation\n\nCollect metrics from all 100 agents and generate weekly performance report.\n\nTO ANALYZE:\n1. Fetch metrics for all agents (tasks completed, success rate, latency, errors)\n2. Identify top 5 performers (>95% success rate)\n3. Identify bottom 5 (needs attention <90%)\n4. Analyze skill validation (declared vs actual)\n5. Detect trends (improving/degrading)\n6. Generate recommendations\n7. Save report to memory/evaluations/YYYY-MM-WW.md\n8. Notify VP Engineering with summary\n\nOUTPUT FORMAT:\n- Executive Summary (2-3 lines)\n- Top 5 Performers (table)\n- Bottom 5 Needs Attention (with recommendations)\n- Skill Gaps (what training needed?)\n- Trends (week-over-week)\n- Key Recommendations (prioritized)\n\nIMPACT: Identify performance issues early, guide training, inform hiring decisions.",
    "model": "claude-opus-4-5",
    "thinking": "extended",
    "timeoutSeconds": 600
  },
  "delivery": {
    "mode": "announce",
    "channel": "governance",
    "bestEffort": false
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

**Trigger**: Every Monday 9:00 AM PST

**Output**:

- `memory/evaluations/2026-02-WW.md` (weekly report)
- Slack message to #governance channel
- Alert if any agent <80% success

---

## 2️⃣ CONTINUOUS HEALTH MONITORING JOB

```json
{
  "jobId": "job-monitor-health-continuous",
  "name": "Continuous Agent Health Monitoring (24/7)",
  "schedule": {
    "kind": "every",
    "everyMs": 30000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "GOVERNANCE TASK: Real-Time Health Monitoring\n\nContinuously monitor agent health, detect issues, send alerts.\n\nTO CHECK (every 30 seconds):\n1. Agent availability (online/offline)\n2. Response latency (p99 < 5s?)\n3. Error rates (< 5%?)\n4. Resource utilization (tokens, CPU)\n5. Cost tracking (trending vs budget?)\n6. Anomaly detection (unusual patterns?)\n\nACTIONS:\n- P1 Alert (Slack + PagerDuty): Agent offline >5min OR success <50%\n- P2 Alert (Slack): Success 50-90% OR latency spike >100%\n- P3 Alert (Log only): Success 90-95% OR cost spike\n\nDASHBOARD UPDATES:\n- Real-time metrics to /dashboards/agent-health\n- Update system health score (0-10)\n- Track trends (last 24h, 7d, 30d)\n\nOUTPUT: Automated alerts + live dashboard",
    "model": "claude-sonnet-4",
    "thinking": "low",
    "timeoutSeconds": 120
  },
  "delivery": {
    "mode": "webhook",
    "to": "http://127.0.0.1:18789/webhooks/monitoring",
    "bestEffort": true
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

**Trigger**: Every 30 seconds (continuous)

**Alerts**:

- 🔴 P1: Immediate Slack + PagerDuty
- 🟠 P2: Slack notification within 5 min
- 🟡 P3: Log entry (no alert)
- 🟢 Info: Dashboard update only

---

## 3️⃣ WEEKLY SECURITY AUDIT JOB

```json
{
  "jobId": "job-auditor-security-weekly",
  "name": "Weekly Security & Compliance Audit",
  "schedule": {
    "kind": "cron",
    "expr": "0 10 * * 1",
    "tz": "America/Vancouver"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "GOVERNANCE TASK: Weekly Security & Compliance Audit\n\nConduct comprehensive security audit of all agent operations.\n\nTO CHECK:\n1. Access Control\n   - Are agents accessing only authorized tools?\n   - Token permissions match responsibilities?\n   - No excessive privileges?\n\n2. Data Protection\n   - API tokens encrypted?\n   - Secrets not in logs/configs?\n   - No PII exposed?\n\n3. Compliance\n   - GDPR checks (data handling)\n   - SOC 2 requirements met?\n   - Audit logs complete/immutable?\n\n4. Policy Enforcement\n   - Agents following company policies?\n   - Ethical guidelines respected?\n   - No policy violations?\n\n5. Incident Investigation\n   - Any security events in past week?\n   - Root cause analysis\n   - Remediation steps\n\nOUTPUT:\n- Save to memory/audits/2026-02-WW.md\n- Risk assessment (Low/Medium/High)\n- Recommendations\n- Alert CISO if High/Critical\n\nCOMPLIANCE FRAMEWORKS:\n- GDPR, CCPA, SOC 2, HIPAA (if applicable), PCI-DSS (if applicable)",
    "model": "claude-sonnet-4",
    "thinking": "extended",
    "timeoutSeconds": 600
  },
  "delivery": {
    "mode": "announce",
    "channel": "security",
    "bestEffort": false
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

**Trigger**: Every Monday 10:00 AM PST

**Output**:

- `memory/audits/2026-02-WW.md` (audit report)
- Slack message to #security channel
- Alert CISO if issues found

---

## 4️⃣ CONTINUOUS OPTIMIZATION JOB

```json
{
  "jobId": "job-optimizer-continuous",
  "name": "Continuous Optimization Analysis (Hourly)",
  "schedule": {
    "kind": "every",
    "everyMs": 3600000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "GOVERNANCE TASK: Continuous Optimization Analysis\n\nIdentify opportunities for improvement, propose optimizations.\n\nTO ANALYZE (every hour):\n1. Performance Inefficiencies\n   - Agents with latency spikes?\n   - High error rates?\n   - Low utilization?\n\n2. Cost Optimization\n   - Can any Opus agents downgrade to Sonnet?\n   - Can any Sonnet agents downgrade to Haiku?\n   - Estimated monthly savings?\n\n3. Redundancy Detection\n   - Duplicate responsibilities between agents?\n   - Consolidation opportunities?\n   - Team structure aligned?\n\n4. Capacity Planning\n   - Utilization trending?\n   - Capacity headroom?\n   - Need for new agents?\n\nRECOMMENDATIONS:\n1. For each opportunity, estimate:\n   - Impact (cost savings, performance gain)\n   - Risk (breaking changes?)\n   - Timeline (how long to implement?)\n   - Validation (how to verify improvement?)\n\n2. Prioritize by ROI (impact / effort)\n\n3. Propose top 3 improvements for week ahead\n\nOUTPUT:\n- Save to memory/optimizations/YYYY-MM-DD.md\n- Post weekly summary to #engineering (Fridays)\n- Flag quick wins (implement immediately)",
    "model": "claude-sonnet-4",
    "thinking": "extended",
    "timeoutSeconds": 300
  },
  "delivery": {
    "mode": "webhook",
    "to": "http://127.0.0.1:18789/webhooks/optimization",
    "bestEffort": true
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

**Trigger**: Every hour (continuous analysis)

**Output**:

- `memory/optimizations/YYYY-MM-DD.md` (daily analysis)
- Weekly summary on Friday to #engineering
- Auto-flag quick wins for immediate action

---

## 5️⃣ CONFIG UPDATE & DEPLOYMENT JOB

```json
{
  "jobId": "job-config-deploy-pending",
  "name": "Configuration Update & Deployment Pipeline",
  "schedule": {
    "kind": "every",
    "everyMs": 300000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "GOVERNANCE TASK: Configuration Update & Deployment\n\nCheck for pending config changes and deploy with validation.\n\nTO DO:\n1. Check for pending changes\n   - New skills to add?\n   - MCPs to register?\n   - Tools to enable/disable?\n   - Permissions to update?\n\n2. For each change:\n   - Validate config syntax\n   - Check for conflicts/dependencies\n   - Test in staging environment\n   - Monitor for 5 minutes\n\n3. Deploy to production\n   - Update gateway.config\n   - Update AGENTS.md\n   - Update .mcp.json\n   - Notify affected agents\n\n4. Verify deployment\n   - All agents responsive?\n   - Changes took effect?\n   - No errors/warnings?\n\n5. Maintain rollback\n   - Keep previous config backed up\n   - Ready to revert if issues\n\nSAFETY CHECKS:\n- Zero-downtime deployments\n- Gradual rollout (not 100% immediate)\n- Rollback plan always ready\n- Version control all changes",
    "model": "claude-opus-4-5",
    "thinking": "extended",
    "timeoutSeconds": 300
  },
  "delivery": {
    "mode": "announce",
    "channel": "deployments",
    "bestEffort": false
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

**Trigger**: Every 5 minutes (when changes pending)

**Output**:

- `memory/deployments/YYYY-MM-DD.md` (deployment log)
- Slack message to #deployments channel
- Alert if rollback needed

---

## 6️⃣ WEEKLY GOVERNANCE SUMMARY JOB

```json
{
  "jobId": "job-governance-weekly-summary",
  "name": "Weekly Governance Summary & Planning",
  "schedule": {
    "kind": "cron",
    "expr": "0 17 * * 5",
    "tz": "America/Vancouver"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "GOVERNANCE TASK: Weekly Summary & Next Week Planning\n\nCompile all governance work from the week and plan next week.\n\nTO SUMMARIZE:\n1. Performance Insights\n   - Key metrics from evaluator report\n   - Top performers (celebrate)\n   - Issues fixed (what improved?)\n   - Trends (positive/negative)\n\n2. Security & Compliance\n   - Issues found/fixed\n   - Compliance status\n   - Any incidents?\n\n3. Optimizations Implemented\n   - What improvements shipped?\n   - Cost savings realized?\n   - Performance gains measured?\n\n4. Configuration Changes\n   - What got updated?\n   - New MCPs registered?\n   - Skills added?\n\n5. Upcoming Week\n   - Top 3 priorities\n   - Expected improvements\n   - Risk areas\n\nOUTPUT FORMAT:\n- Markdown report saved to memory/summaries/2026-02-WW.md\n- Post to #all-hands (Friday 5 PM)\n- Include metrics, achievements, plans\n\nTONE: Celebratory (what we achieved) + informative (what's next) + transparent (what we're monitoring)",
    "model": "claude-opus-4-5",
    "thinking": "extended",
    "timeoutSeconds": 600
  },
  "delivery": {
    "mode": "announce",
    "channel": "all-hands",
    "bestEffort": false
  },
  "sessionTarget": "isolated",
  "enabled": true
}
```

**Trigger**: Every Friday 5:00 PM PST

**Output**:

- `memory/summaries/2026-02-WW.md` (weekly summary)
- Slack message to #all-hands
- All stakeholders updated on governance status

---

## 📋 QUICK REFERENCE: ALL JOBS

| Job                           | Frequency   | Purpose                               | Channel           |
| ----------------------------- | ----------- | ------------------------------------- | ----------------- |
| job-evaluator-weekly          | Mon 9 AM    | Performance metrics + recommendations | #governance       |
| job-monitor-health-continuous | Every 30s   | Real-time health + alerts             | Slack + PagerDuty |
| job-auditor-security-weekly   | Mon 10 AM   | Security + compliance audit           | #security         |
| job-optimizer-continuous      | Hourly      | Cost + perf optimizations             | #engineering      |
| job-config-deploy-pending     | Every 5 min | Update + deploy configs               | #deployments      |
| job-governance-weekly-summary | Fri 5 PM    | Weekly summary + planning             | #all-hands        |

---

## 🚀 Deployment Steps

### Step 1: Create Cron Jobs

```bash
# Use cron tool to add all 6 jobs
cron.add(job: job-evaluator-weekly)
cron.add(job: job-monitor-health-continuous)
cron.add(job: job-auditor-security-weekly)
cron.add(job: job-optimizer-continuous)
cron.add(job: job-config-deploy-pending)
cron.add(job: job-governance-weekly-summary)
```

### Step 2: Configure Alerts

- Slack integration for Alerts
- PagerDuty for P1 incidents
- Email for daily digest

### Step 3: Setup Dashboards

- `/dashboards/agent-health` (live)
- `/dashboards/cost-tracking` (hourly)
- `/dashboards/compliance` (daily)

### Step 4: Monitor & Adjust

- First week: Monitor output
- Adjust schedules based on actual runtime
- Refine alert thresholds
- Optimize job payloads

---

**Status**: ✅ **READY FOR DEPLOYMENT**

**Next**: Spawn governance agents + create dashboards
