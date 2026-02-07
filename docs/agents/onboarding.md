# Agent Onboarding — Plug-and-Play Guide

Any new agent added to OpenClaw automatically inherits the full collaboration stack. Zero additional configuration needed beyond the agent entry itself.

## Minimal Agent Config

```yaml
agents:
  list:
    - id: my-new-agent
      name: "Agent Name"
      role: specialist # orchestrator | lead | specialist | worker
      capabilities: # Tags for smart routing (optional but recommended)
        - api-design
        - security
        - typescript
      expertise: # Natural-language descriptions (optional)
        - "REST API design and OpenAPI specs"
        - "Authentication flows (OAuth2, JWT)"
      availability: auto # auto = can be auto-selected based on workload
```

That's it. The agent will automatically have access to:

## What Every Agent Gets (Automatically)

### Communication Tools

| Tool                   | Description                           |
| ---------------------- | ------------------------------------- |
| `sessions_spawn`       | Spawn sub-agents                      |
| `sessions_spawn_batch` | Spawn multiple sub-agents in parallel |
| `sessions_send`        | Send messages to other sessions       |
| `sessions_list`        | List active sessions                  |
| `sessions_history`     | Read session history                  |
| `sessions_progress`    | Query sub-agent progress in real-time |
| `sessions_abort`       | Abort a running sub-agent             |
| `session_status`       | View session status and usage         |

### Collaboration Tools

| Tool            | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| `collaboration` | Multi-agent debates: init, propose, challenge, agree, finalize, poll, review, standup |
| `delegation`    | Hierarchical task delegation: delegate, request, review, accept, complete, reject     |

### Team Workspace

| Tool             | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `team_workspace` | Shared artifacts, context, and decisions across all agents |
| `agents_list`    | Discover available agents with capabilities and workload   |

### Standard Tools

| Tool                           | Description                                 |
| ------------------------------ | ------------------------------------------- |
| `read` / `write` / `edit`      | File operations                             |
| `exec` / `process`             | Shell commands                              |
| `web_search` / `web_fetch`     | Internet access                             |
| `browser`                      | Browser automation                          |
| `memory_search` / `memory_get` | Memory recall                               |
| `message`                      | Channel messaging (Telegram, Discord, etc.) |
| `cron`                         | Scheduled tasks                             |
| `image`                        | Image analysis                              |
| `tts`                          | Text-to-speech                              |
| `nodes`                        | Device control                              |

## How Auto-Routing Works

1. **Capabilities Registry**: At gateway startup, all agents' `capabilities` and `expertise` are loaded into an in-memory registry.

2. **Task Classification**: When the orchestrator needs to delegate, `findBestAgentForTask(task)` automatically:
   - Classifies the task type (coding, vision, reasoning, general)
   - Matches against agent capabilities
   - Factors in current workload (fewer active tasks = higher priority)
   - Returns the best agent with confidence score

3. **Workload Balancing**: `getAgentWorkload(agentId)` tracks:
   - Active spawned sub-agents
   - Active delegations (assigned + in_progress)
   - Weighted total load score

## Hierarchy & Permissions

Agents interact based on their `role` rank:

```
orchestrator (3) > lead (2) > specialist (1) > worker (0)
```

- **Downward delegation** (higher → lower): Direct assignment, no review needed
- **Upward request** (lower → higher): Requires justification and review
- **Same rank**: Treated as downward (peer-to-peer direct)
- **Spawn permission**: Can only spawn agents of same or lower rank

## Team Workspace

All agents share a team workspace at `~/.openclaw/agents/{defaultAgent}/workspace/.team/`:

```
.team/
├── artifacts/          # Shared files (code, docs, configs)
├── context/            # Shared key-value context store
├── decisions/          # Recorded team decisions
└── context.json        # Quick context lookup
```

Use `team_workspace` tool actions:

- `write_artifact` / `read_artifact` / `list_artifacts`
- `set_context` / `get_context`
- `list_decisions`

## Progress Tracking

Sub-agents can report progress via `emitProgress()`:

```typescript
import { emitProgress } from "./subagent-progress.js";

emitProgress(sessionKey, {
  percent: 50,
  status: "Analyzing code structure",
  detail: "Processing 30/60 files",
});
```

Parents query with `sessions_progress({ sessionKey })`.

## Adding Custom Capabilities

To make your agent discoverable for specific task types, add relevant capability tags:

```yaml
capabilities:
  # Domain tags
  - backend
  - frontend
  - database
  - security
  - devops

  # Technology tags
  - typescript
  - python
  - react
  - postgresql
  - docker

  # Skill tags
  - api-design
  - testing
  - code-review
  - performance
  - architecture
```

The capabilities registry maps these against task content to find the best match.

## Tool Policy

Tools can be filtered per-agent via `tools.allow`:

```yaml
agents:
  list:
    - id: read-only-agent
      tools:
        allow:
          - read
          - web_search
          - web_fetch
          - sessions_progress
          - team_workspace
```

By default, all tools are available unless restricted by policy.
