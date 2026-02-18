# Sandbox Skill

Use this skill when asked to:

- Enable or configure Docker sandboxing for agents
- Isolate agents from the host filesystem or network
- Set up custom sandbox images with specific runtimes
- Harden agent execution environment
- Debug sandbox issues ("why is exec blocked?")

## What is sandboxing in OpenClaw?

OpenClaw runs tool calls (`exec`, `read`, `write`, `edit`, etc.) inside Docker containers when sandbox mode is enabled. The gateway itself stays on the host; only tool execution is isolated.

**Key properties:**

- No network by default (`docker.network: "none"`)
- Separate filesystem from host
- One container per session (default scope)
- Configurable per-agent or globally

---

## Quick Enable (minimal, non-main sessions only)

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "scope": "session",
        "workspaceAccess": "none"
      }
    }
  }
}
```

Apply with:

```bash
# Via gateway tool (config.patch)
# Or edit ~/.openclaw/openclaw.json and restart gateway
openclaw gateway restart
```

---

## Configuration Reference

### `mode` — When to sandbox

| Value        | Behavior                                          |
| ------------ | ------------------------------------------------- |
| `"off"`      | No sandboxing (default)                           |
| `"non-main"` | Sandbox subagents only; main session runs on host |
| `"all"`      | Every session sandboxed                           |

> `"non-main"` is recommended: main chat stays responsive, subagents are isolated.

### `scope` — How many containers

| Value       | Behavior                                            |
| ----------- | --------------------------------------------------- |
| `"session"` | One container per session (default, most isolated)  |
| `"agent"`   | One container per agent ID (shared across sessions) |
| `"shared"`  | Single container for all sandboxed sessions         |

### `workspaceAccess` — Filesystem access

| Value    | Behavior                                                         |
| -------- | ---------------------------------------------------------------- |
| `"none"` | Sandbox has its own isolated workspace (`~/.openclaw/sandboxes`) |
| `"ro"`   | Agent workspace mounted read-only at `/agent`                    |
| `"rw"`   | Agent workspace mounted read-write at `/workspace`               |

---

## Build the Sandbox Image

```bash
cd ~/Desenvolvimento/openclawdev

# Base image (minimal: bash, curl, git, python3, jq, ripgrep)
scripts/sandbox-setup.sh

# Common image (adds node, bun, pnpm, brew, build tools)
scripts/sandbox-common-setup.sh

# Browser image (adds Chromium for browser tool)
scripts/sandbox-browser-setup.sh
```

Use the common image for agents that need Node/Bun:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "docker": {
          "image": "openclaw-sandbox-common:bookworm-slim"
        }
      }
    }
  }
}
```

---

## Network Isolation

By default, containers have **no network** (`docker.network: "none"`). This is the safest default.

To allow outbound access for specific agents:

```json
{
  "agents": {
    "list": [
      {
        "id": "research-agent",
        "sandbox": {
          "docker": {
            "network": "bridge"
          }
        }
      }
    ]
  }
}
```

> **Security note:** Only give network access to agents that genuinely need it (e.g., web research). Keep coding/file agents network-isolated.

---

## Custom Bind Mounts

Mount host directories into the sandbox (read-only recommended):

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "docker": {
          "binds": ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"]
        }
      }
    }
  }
}
```

**Blocked sources** (OpenClaw rejects these automatically):

- `docker.sock`
- `/etc`, `/proc`, `/sys`, `/dev`

---

## One-Time Setup Command

Run commands inside the container after creation (e.g., install packages):

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "docker": {
          "network": "bridge",
          "setupCommand": "apt-get update && apt-get install -y ffmpeg && echo done",
          "readOnlyRoot": false
        }
      }
    }
  }
}
```

> **Pitfalls:**
>
> - Needs `network` ≠ `"none"` to download packages
> - Needs `readOnlyRoot: false` for writes
> - Root user required for apt installs (omit `user` or set `"user": "0:0"`)
> - `setupCommand` runs only once per container lifecycle

---

## Per-Agent Override

Each agent can override the global sandbox config:

```json
{
  "agents": {
    "defaults": {
      "sandbox": { "mode": "non-main" }
    },
    "list": [
      {
        "id": "data-engineer",
        "sandbox": {
          "mode": "all",
          "workspaceAccess": "ro",
          "docker": {
            "image": "openclaw-sandbox-common:bookworm-slim",
            "network": "none"
          }
        }
      }
    ]
  }
}
```

---

## Debugging

```bash
# Inspect effective sandbox config for a session
openclaw sandbox explain

# Check running sandbox containers
docker ps --filter label=openclaw.sandbox=1

# View container logs
docker logs <container-id>

# Remove stale containers (force re-create)
docker rm -f $(docker ps -aq --filter label=openclaw.sandbox=1)
```

**Common issues:**
| Symptom | Cause | Fix |
|---------|-------|-----|
| `exec` blocked | Network=none + apt install | Set `network: "bridge"` during setup |
| File not found | Workspace not mounted | Set `workspaceAccess: "rw"` |
| Package install fails | `readOnlyRoot: true` | Set `readOnlyRoot: false` |
| Skills not readable | `workspaceAccess: "none"` | OpenClaw auto-mirrors skills; check `.../skills` in sandbox |

---

## Recommended Hardening Profile

For most teams (subagents isolated, main session on host):

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "scope": "session",
        "workspaceAccess": "none",
        "docker": {
          "image": "openclaw-sandbox-common:bookworm-slim",
          "network": "none",
          "readOnlyRoot": false
        }
      }
    }
  }
}
```

Apply this config patch via the `gateway` tool (`config.patch`), then restart the gateway.

---

## Related Docs

- `docs/gateway/sandboxing.md` — Full reference
- `docs/tools/multi-agent-sandbox-tools.md` — Per-agent overrides
- `docs/gateway/security.md` — Security model
- `scripts/sandbox-setup.sh` — Build base image
- `scripts/sandbox-common-setup.sh` — Build common image
