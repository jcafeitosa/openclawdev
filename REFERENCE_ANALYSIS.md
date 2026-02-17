# OpenClaw Reference Repository Analysis

## Repository: jcafeitosa/openclawdevcode

### Overview

This is the **Claude Code repository** - Anthropic's agentic coding tool. It contains reference implementations of sophisticated agent orchestration patterns, multi-agent coordination, and advanced workflow systems. This is the primary reference for OpenClaw's agent architecture.

---

## Key Agent Orchestration Patterns Found

### 1. PARALLEL AGENT EXECUTION PATTERN

**Primary Examples:** `code-review`, `feature-dev`, `pr-review-toolkit`

#### Code Review Plugin (`/plugins/code-review/`)

- **Pattern**: Multi-agent parallel review with confidence scoring
- **Architecture**:
  - Launches 4 independent agents in parallel
  - Agents 1-2: CLAUDE.md compliance (sonnet model)
  - Agent 3: Bug detection (opus model)
  - Agent 4: Historical analysis via git blame (opus model)
  - Each independently scores issues 0-100
  - Filters issues below confidence threshold (default: 80)
  - Validates flagged issues with additional parallel subagents

**Key Implementation Details:**

- Uses explicit parallel orchestration in commands/code-review.md (steps 4-5)
- Confidence-based filtering reduces false positives
- Independent agent perspectives prevent groupthink
- Validation subagents verify discovered issues

**Reference Files:**

- `/plugins/code-review/commands/code-review.md` - Orchestration logic
- `/plugins/code-review/README.md` - Architecture documentation

#### Feature Development Plugin (`/plugins/feature-dev/`)

- **Pattern**: Phased workflow with strategic parallelization
- **7-Phase Workflow**:
  1. **Discovery** - Clarify requirements
  2. **Codebase Exploration** - Launch 2-3 code-explorer agents in parallel
  3. **Clarifying Questions** - Wait for user input (sequential gate)
  4. **Architecture Design** - Launch 2-3 code-architect agents with different focuses
  5. **Implementation** - Wait for approval (sequential gate)
  6. **Quality Review** - Launch 3 code-reviewer agents in parallel
  7. **Summary** - Document results

**Key Orchestration Points:**

- Phase 2: Parallel code-explorer agents each analyzing different aspects
  - "Find features similar to [feature]"
  - "Map architecture and abstractions"
  - "Analyze implementation patterns"
- Phase 4: Parallel code-architect agents with different approaches
  - Minimal changes approach
  - Clean architecture approach
  - Pragmatic balance approach
- Phase 6: Parallel code-reviewer agents with different focuses
  - Simplicity/DRY/Elegance
  - Bugs/Correctness
  - Conventions/Abstractions
- Sequential gates between phases (user approval/input)

**Key Pattern**: Parallel exploration → Sequential decision → Parallel implementation verification

**Reference Files:**

- `/plugins/feature-dev/commands/feature-dev.md` - Full workflow (126 lines)
- `/plugins/feature-dev/agents/code-explorer.md` - Agent system prompt
- `/plugins/feature-dev/agents/code-architect.md` - Agent system prompt
- `/plugins/feature-dev/agents/code-reviewer.md` - Agent system prompt
- `/plugins/feature-dev/README.md` - Comprehensive documentation

#### PR Review Toolkit (`/plugins/pr-review-toolkit/`)

- **Pattern**: Multiple specialized agents with automatic triggering
- **6 Specialized Agents**:
  1. `comment-analyzer` - Comment accuracy (sonnet)
  2. `pr-test-analyzer` - Test coverage (sonnet)
  3. `silent-failure-hunter` - Error handling (opus)
  4. `type-design-analyzer` - Type design quality (sonnet)
  5. `code-reviewer` - General review (opus)
  6. `code-simplifier` - Code simplification (opus)

**Key Pattern**: Agent triggering via natural language recognition

- Proactive use based on context (after code write, before PR creation)
- Can run sequentially or in parallel based on dependencies
- Confidence-based scoring (1-10 scales) for prioritization

**Reference Files:**

- `/plugins/pr-review-toolkit/README.md` - Full documentation
- Individual agent files in `agents/` directory

---

### 2. SELF-REFERENTIAL ITERATION PATTERN

**Primary Example:** `ralph-wiggum` plugin

#### Ralph Loop Pattern (`/plugins/ralph-wiggum/`)

- **Core Concept**: Persistent AI loops using Stop hooks
- **Implementation**:
  - Command `/ralph-loop` starts iterative task
  - Claude works on task in current session
  - Tries to exit → Stop hook intercepts
  - Stop hook re-feeds SAME prompt
  - Previous work visible in files + git history
  - Loop continues until completion promise output

**Key Features**:

- `--max-iterations` safety net (prevents infinite loops)
- `--completion-promise` - exact string match for completion
- Self-contained within single session (no external bash loops)
- Deterministic feedback: failures visible in file changes
- Real-world results: $50k contracts for $297 API cost

**Hook Pattern**:

```
Stop hook (in plugins/ralph-wiggum/hooks/)
  → Blocks session exit
  → Re-injects same prompt
  → Loop continues
```

**Reference Files:**

- `/plugins/ralph-wiggum/README.md` - Full documentation
- `/plugins/ralph-wiggum/commands/ralph-loop.md` - Command definition
- `/plugins/ralph-wiggum/hooks/stop-hook.sh` - Hook implementation

---

### 3. AGENT SYSTEM PROMPT PATTERNS

All agents follow consistent structure:

```yaml
---
name: agent-name
description: What the agent does
tools: [List, Of, Available, Tools]
model: sonnet|opus|haiku
color: yellow|green|blue
---

# Core Mission
[Executive summary of purpose]

## Analysis Approach
[Numbered steps for systematic analysis]

## Output Guidance
[Specific format and structure expectations]
```

**Key Patterns**:

- **Model Selection**: Sonnet for focused tasks, Opus for complex analysis
- **Tool Declarations**: Explicit tool allowlist (Glob, Grep, LS, Read, etc.)
- **Structured Output**: Clear section headers, specific file:line references
- **Confidence Scoring**: Used throughout for filtering false positives

**Examples**:

- `code-explorer.md` - Tracing execution paths
- `code-architect.md` - Designing architectures
- `code-reviewer.md` - Reviewing code against standards

---

### 4. PHASED WORKFLOW PATTERN

**Principle**: Break complex tasks into clear phases with explicit gates

**Pattern Elements**:

1. **Phase Header**: Goal + numbered actions
2. **Parallel vs Sequential**: Explicit about which agents run together
3. **User Gates**: Clarifying questions, approval before implementation
4. **Progress Tracking**: TodoWrite used throughout phases
5. **Consolidation**: Combine findings from parallel agents

**Example from Feature Dev (7 Phases)**:

```
Phase 1: Discovery → Sequential
Phase 2: Codebase Exploration → Parallel (2-3 agents)
Phase 3: Clarifying Questions → Sequential + User Input Gate
Phase 4: Architecture Design → Parallel (2-3 agents)
Phase 5: Implementation → Sequential + User Approval Gate
Phase 6: Quality Review → Parallel (3 agents)
Phase 7: Summary → Sequential
```

---

### 5. TOOL ORCHESTRATION PATTERNS

**Allowed Tools by Plugin**:

- **code-explorer**: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput
- **code-architect**: Same as code-explorer
- **code-reviewer**: Focused set for code review
- **code-review (PR)**: Limited GitHub tools + inline comment creation

**Pattern**: Explicit tool declarations in agent frontmatter restrict tool access.

---

## Configuration & Architecture Files

### Plugin Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json              # Metadata (name, version, author)
├── commands/                    # Slash commands (.md files)
├── agents/                      # Specialized agents (.md files)
├── skills/                      # Agent skills (optional)
├── hooks/                       # Event handlers (bash scripts + JSON)
├── .mcp.json                    # External MCP server config (optional)
└── README.md                    # Plugin documentation
```

### plugin.json Format

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "What the plugin does",
  "author": {
    "name": "Author Name",
    "email": "email@example.com"
  }
}
```

### Command Frontmatter

```yaml
---
description: What the command does
argument-hint: Optional argument format
allowed-tools: [Tool1, Tool2, ...]
---
# Command implementation in markdown
```

### Agent Frontmatter

```yaml
---
name: agent-name
description: What the agent specializes in
tools: [List, Of, Tools]
model: sonnet|opus|haiku
color: yellow|green|blue
---
# System prompt content
```

---

## Key Orchestration Concepts

### 1. Confidence Scoring

**Used in**: code-review, pr-review-toolkit

- **Range**: 0-100
- **Threshold**: 80 (only report high-confidence issues)
- **Purpose**: Filter false positives from agent analysis
- **Levels**:
  - 0-25: Not confident
  - 26-50: Minor nitpick
  - 51-75: Valid but low-impact
  - 76-90: Important issue
  - 91-100: Critical issue

### 2. Multi-Perspective Analysis

**Used in**: code-review, feature-dev, pr-review-toolkit

- Launch multiple agents analyzing SAME code from different angles
- Independent scoring/findings prevent groupthink
- Consolidate results → identify highest severity issues
- Validation agents verify findings before reporting

### 3. Sequential Gates

**Used in**: feature-dev

- Require user input/approval between major phases
- Clarifying questions phase prevents ambiguity
- Approval gate prevents unnecessary implementation
- Ensures stakeholder alignment

### 4. Progressive Specialization

**Used in**: pr-review-toolkit

- 6 agents, each specializing in ONE aspect
- comment-analyzer: Comments only
- pr-test-analyzer: Tests only
- silent-failure-hunter: Error handling only
- type-design-analyzer: Type design only
- code-reviewer: General quality
- code-simplifier: Simplification only

### 5. Self-Contained Sessions

**Used in**: ralph-wiggum

- Loop exists within single session (no external bash)
- Stop hook architecture enables self-referential feedback
- Previous work visible in files + git history
- Deterministic: failures produce visible artifacts

---

## Team Coordination Patterns

### Agent Collaboration in Feature Dev

```
Phase 2: 3 code-explorer agents analyze in parallel
  ↓ (Sequential consolidation)
Human reads identified files
  ↓
Phase 3: User answers clarifying questions
  ↓
Phase 4: 3 code-architect agents design in parallel
  ↓ (Sequential consolidation)
Human chooses architecture
  ↓
Phase 5: Implementation (single agent)
  ↓
Phase 6: 3 code-reviewer agents review in parallel
  ↓ (Sequential consolidation)
Human decides on fixes
  ↓
Phase 7: Summary
```

### Agent Collaboration in Code Review

```
PR Submitted
  ↓
4 agents launch in parallel:
  - Agent 1: CLAUDE.md compliance
  - Agent 2: CLAUDE.md compliance (redundancy)
  - Agent 3: Bug detection
  - Agent 4: Historical analysis
  ↓
For each issue found: validation subagent (parallel)
  ↓
Filter issues < 80 confidence
  ↓
Output review or post as PR comment
```

---

## Best Practices Extracted

### 1. Agent Design

- **Use system prompts** for consistent behavior
- **Declare tools explicitly** to limit access
- **Use appropriate models** (Sonnet for focused, Opus for complex)
- **Include color coding** for visual organization
- **Provide structured output guidance** with specific formats

### 2. Workflow Design

- **Use phases** to break complex tasks into digestible steps
- **Parallelize when independent**, serialize when dependent
- **Gate with user input** before major decisions
- **Track progress** with TodoWrite throughout
- **Consolidate findings** from parallel agents

### 3. Quality Assurance

- **Use multiple agents** for different perspectives
- **Implement confidence scoring** to filter false positives
- **Validate findings** with additional agents
- **Only report high-confidence issues** (≥80)
- **Provide specific file:line references**

### 4. Completion & Iteration

- **Define clear completion criteria** before starting
- **Use self-referential loops** for iterative improvement
- **Make failures visible** (test output, file changes)
- **Set iteration limits** as safety nets
- **Document decisions** and reasoning

---

## File Locations Summary

**Core Plugin Documentation**:

- `/plugins/README.md` - Plugins overview
- `/plugins/feature-dev/README.md` - Feature workflow (12KB)
- `/plugins/code-review/README.md` - PR review workflow (8KB)
- `/plugins/pr-review-toolkit/README.md` - Individual agents (11KB)
- `/plugins/ralph-wiggum/README.md` - Iteration pattern (7KB)
- `/plugins/plugin-dev/README.md` - Plugin development (14KB)

**Command Implementations**:

- `/plugins/feature-dev/commands/feature-dev.md` - Main workflow
- `/plugins/code-review/commands/code-review.md` - PR review orchestration
- `/plugins/ralph-wiggum/commands/ralph-loop.md` - Iteration command

**Agent Definitions**:

- `/plugins/feature-dev/agents/code-explorer.md`
- `/plugins/feature-dev/agents/code-architect.md`
- `/plugins/feature-dev/agents/code-reviewer.md`
- `/plugins/pr-review-toolkit/agents/` - 6 agent files
- (And many more specialized agents)

**Configuration**:

- `/plugins/*/claude-plugin/plugin.json` - Plugin metadata files

---

## Recommendations for OpenClaw

### Adopt These Patterns:

1. **Parallel agent execution** with confidence scoring (from code-review)
2. **Phased workflows** with user gates (from feature-dev)
3. **Multi-perspective analysis** for quality (from pr-review-toolkit)
4. **Self-referential loops** for iteration (from ralph-wiggum)
5. **Explicit tool declarations** in agent definitions
6. **Structured agent system prompts** with clear output guidance

### Implement These Components:

1. **Plugin structure** with commands, agents, skills, hooks
2. **Confidence scoring system** (0-100 with configurable threshold)
3. **TodoWrite integration** for progress tracking in workflows
4. **Hook-based extensibility** for event-driven behavior
5. **Progressive specialization** with focused agents

### Key Metrics:

- **Agent count per workflow**: 2-6 agents optimal
- **Parallel agents**: When independent, sequence when dependent
- **Confidence threshold**: 80 recommended for false positive filtering
- **Phase count**: 5-7 phases for complex workflows
- **User gates**: Between major decisions (clarifying, approval)

---
