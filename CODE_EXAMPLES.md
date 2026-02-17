# OpenClaw Reference Implementation Examples

## Detailed Code Patterns from Claude Code Repository

---

## 1. PARALLEL AGENT ORCHESTRATION EXAMPLE

### From: `/plugins/code-review/commands/code-review.md`

```markdown
## Step 4: Launch 4 agents in parallel to independently review changes

Agents 1 + 2: CLAUDE.md compliance (sonnet agents)

- Audit changes for CLAUDE.md compliance in parallel
- Note: When evaluating CLAUDE.md compliance for a file, you should
  only consider CLAUDE.md files that share a file path with the file
  or parents

Agent 3: Opus bug agent (parallel with agent 4)

- Scan for obvious bugs
- Focus only on the diff itself without reading extra context
- Flag only significant bugs; ignore nitpicks and likely false positives
- Do not flag issues that you cannot validate without looking at
  context outside of the git diff

Agent 4: Opus bug agent (parallel with agent 3)

- Look for problems that exist in the introduced code
- Could be security issues, incorrect logic, etc.
- Only look for issues that fall within the changed code

CRITICAL: We only want HIGH SIGNAL issues. Flag issues where:

- The code will fail to compile or parse (syntax errors, type errors,
  missing imports, unresolved references)
- The code will definitely produce wrong results regardless of inputs
  (clear logic errors)
- Clear, unambiguous CLAUDE.md violations where you can quote the
  exact rule being broken

Do NOT flag:

- Code style or quality concerns
- Potential issues that depend on specific inputs or state
- Subjective suggestions or improvements

## Step 5: For each issue found, launch parallel subagents to validate

Launch parallel subagents to review and validate each issue:

- Use Opus subagents for bugs and logic issues
- Use Sonnet agents for CLAUDE.md violations
- The agent's job is to validate that the stated issue is truly an issue
  with high confidence

## Step 6: Filter out any issues that were not validated in step 5

This step will give us our list of high signal issues for our review.
```

**Key Pattern Elements**:

- Explicit numbered steps
- Clear parallel execution boundaries (steps 4-5)
- High signal filtering with specific criteria
- Validation subagents for each finding

---

## 2. PHASED WORKFLOW EXAMPLE

### From: `/plugins/feature-dev/commands/feature-dev.md`

```markdown
## Phase 2: Codebase Exploration

Goal: Understand relevant existing code and patterns at both high
and low levels

Actions:

1. Launch 2-3 code-explorer agents in parallel. Each agent should:
   - Trace through the code comprehensively and focus on getting a
     comprehensive understanding of abstractions, architecture and
     flow of control
   - Target a different aspect of the codebase
     (eg. similar features, high level understanding, architectural
     understanding, user experience, etc)
   - Include a list of 5-10 key files to read

   Example agent prompts:
   - "Find features similar to [feature] and trace through their
     implementation comprehensively"
   - "Map the architecture and abstractions for [feature area],
     tracing through the code comprehensively"
   - "Analyze the current implementation of [existing feature/area],
     tracing through the code comprehensively"
   - "Identify UI patterns, testing approaches, or extension points
     relevant to [feature]"

2. Once the agents return, please read all files identified by agents
   to build deep understanding

3. Present comprehensive summary of findings and patterns discovered

---

## Phase 3: Clarifying Questions

Goal: Fill in gaps and resolve all ambiguities before designing

CRITICAL: This is one of the most important phases. DO NOT SKIP.

Actions:

1. Review the codebase findings and original feature request
2. Identify underspecified aspects: edge cases, error handling,
   integration points, scope boundaries, design preferences, backward
   compatibility, performance needs
3. Present all questions to the user in a clear, organized list
4. Wait for answers before proceeding to architecture design

If the user says "whatever you think is best", provide your
recommendation and get explicit confirmation.

---

## Phase 4: Architecture Design

Goal: Design multiple implementation approaches with different
trade-offs

Actions:

1. Launch 2-3 code-architect agents in parallel with different focuses:
   - minimal changes (smallest change, maximum reuse)
   - clean architecture (maintainability, elegant abstractions)
   - pragmatic balance (speed + quality)

2. Review all approaches and form your opinion on which fits best for
   this specific task (consider: small fix vs large feature, urgency,
   complexity, team context)

3. Present to user:
   - brief summary of each approach
   - trade-offs comparison
   - your recommendation with reasoning
   - concrete implementation differences

4. Ask user which approach they prefer
```

**Key Pattern Elements**:

- Clear goal for each phase
- Numbered sequential actions
- Explicit parallel launch points
- User gates (wait for input/approval)
- Consolidation steps after parallel work

---

## 3. AGENT SYSTEM PROMPT EXAMPLE

### From: `/plugins/feature-dev/agents/code-explorer.md`

```yaml
---
name: code-explorer
description: Deeply analyzes existing codebase features by tracing
  execution paths, mapping architecture layers, understanding patterns
  and abstractions, and documenting dependencies to inform new
  development
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite,
  WebSearch, KillShell, BashOutput
model: sonnet
color: yellow
---

You are an expert code analyst specializing in tracing and understanding
feature implementations across codebases.

## Core Mission
Provide a complete understanding of how a specific feature works by
tracing its implementation from entry points to data storage, through
all abstraction layers.

## Analysis Approach

**1. Feature Discovery**
- Find entry points (APIs, UI components, CLI commands)
- Locate core implementation files
- Map feature boundaries and configuration

**2. Code Flow Tracing**
- Follow call chains from entry to output
- Trace data transformations at each step
- Identify all dependencies and integrations
- Document state changes and side effects

**3. Architecture Analysis**
- Map abstraction layers (presentation → business logic → data)
- Identify design patterns and architectural decisions
- Document interfaces between components
- Note cross-cutting concerns (auth, logging, caching)

**4. Implementation Details**
- Key algorithms and data structures
- Error handling and edge cases
- Performance considerations
- Technical debt or improvement areas

## Output Guidance

Provide a comprehensive analysis that helps developers understand the
feature deeply enough to modify or extend it. Include:

- Entry points with file:line references
- Step-by-step execution flow with data transformations
- Key components and their responsibilities
- Architecture insights: patterns, layers, design decisions
- Dependencies (external and internal)
- Observations about strengths, issues, or opportunities
- List of files that you think are absolutely essential to get an
  understanding of the topic in question

Structure your response for maximum clarity and usefulness. Always
include specific file paths and line numbers.
```

**Key Pattern Elements**:

- YAML frontmatter with metadata
- "Core Mission" section
- "Analysis Approach" with numbered steps
- "Output Guidance" with specific expectations
- Model and tool declarations

---

## 4. CONFIDENCE SCORING PATTERN

### From: `/plugins/code-review/README.md`

```markdown
## Scoring system

Each issue independently scored 0-100:

- **0-25**: Not confident, false positive
- **26-50**: Somewhat confident, might be real
- **51-75**: Moderately confident, real but minor
- **76-90**: Highly confident, real and important
- **91-100**: Absolutely certain, definitely real

**Only report issues with confidence ≥ 80**

## Issues filtered (false positives):

- Pre-existing issues not introduced in PR
- Code that looks like a bug but isn't
- Pedantic nitpicks
- Issues linters will catch
- General quality issues (unless in CLAUDE.md)
- Issues with lint ignore comments
```

**Key Pattern Elements**:

- Explicit numerical scale
- Clear descriptions for each level
- Threshold definition (≥80)
- False positive categories

---

## 5. SELF-REFERENTIAL LOOP PATTERN

### From: `/plugins/ralph-wiggum/commands/ralph-loop.md`

````markdown
---
description: "Start Ralph Wiggum loop in current session"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh:*)"]
hide-from-slash-command-tool: "true"
---

# Ralph Loop Command

Execute the setup script to initialize the Ralph loop:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" $ARGUMENTS
```
````

Please work on the task. When you try to exit, the Ralph loop will
feed the SAME PROMPT back to you for the next iteration. You'll see
your previous work in files and git history, allowing you to iterate
and improve.

CRITICAL RULE: If a completion promise is set, you may ONLY output
it when the statement is completely and unequivocally TRUE. Do not
output false promises to escape the loop, even if you think you're
stuck or should exit for other reasons. The loop is designed to
continue until genuine completion.

````

**Key Pattern Elements**:
- Command frontmatter with argument hints
- Setup script invocation
- User instruction for self-iteration
- Critical safety rule about completion promise

---

## 6. MULTI-PERSPECTIVE ANALYSIS PATTERN
### From: `/plugins/pr-review-toolkit/README.md`

```markdown
# 6 Specialized Review Agents

### 1. comment-analyzer
Focus: Code comment accuracy and maintainability

Analyzes:
- Comment accuracy vs actual code
- Documentation completeness
- Comment rot and technical debt
- Misleading or outdated comments

### 2. pr-test-analyzer
Focus: Test coverage quality and completeness

Analyzes:
- Behavioral vs line coverage
- Critical gaps in test coverage
- Test quality and resilience
- Edge cases and error conditions

### 3. silent-failure-hunter
Focus: Error handling and silent failures

Analyzes:
- Silent failures in catch blocks
- Inadequate error handling
- Inappropriate fallback behavior
- Missing error logging

### 4. type-design-analyzer
Focus: Type design quality and invariants

Analyzes:
- Type encapsulation (rated 1-10)
- Invariant expression (rated 1-10)
- Type usefulness (rated 1-10)
- Invariant enforcement (rated 1-10)

### 5. code-reviewer
Focus: General code review for project guidelines

Analyzes:
- CLAUDE.md compliance
- Style violations
- Bug detection
- Code quality issues

### 6. code-simplifier
Focus: Code simplification and refactoring

Analyzes:
- Code clarity and readability
- Unnecessary complexity and nesting
- Redundant code and abstractions
- Consistency with project standards
- Overly compact or clever code
````

**Key Pattern Elements**:

- Numbered agents with clear names
- Dedicated focus area per agent
- Specific analysis points
- Independent scoring scales

---

## 7. PLUGIN STRUCTURE TEMPLATE

### From: `/plugins/code-review/`

```
code-review/
├── .claude-plugin/
│   └── plugin.json
│       {
│         "name": "code-review",
│         "version": "1.0.0",
│         "description": "Automated code review for pull requests
│                        using multiple specialized agents with
│                        confidence-based scoring",
│         "author": {
│           "name": "Boris Cherny",
│           "email": "boris@anthropic.com"
│         }
│       }
├── commands/
│   └── code-review.md
│       (76 line orchestration with 9 steps)
├── hooks/
│   (GitHub integration hooks)
└── README.md
    (Comprehensive documentation with best practices)
```

**Key Pattern Elements**:

- Minimal plugin.json (name, version, description, author)
- Single command file for orchestration
- Rich README documentation
- Hook integrations as needed

---

## 8. EXAMPLE: FEATURE-DEV WORKFLOW IN PRACTICE

**Workflow Initiation**:

```bash
/feature-dev Add user authentication with OAuth
```

**Phase 2 Execution** (what happens internally):

```
1. Launch 3 parallel code-explorer agents:
   - Agent 1: "Find features similar to OAuth authentication and trace
              through their implementation comprehensively"
   - Agent 2: "Map the architecture and abstractions for authentication
              systems, tracing through the code comprehensively"
   - Agent 3: "Analyze the current implementation of user management,
              tracing through the code comprehensively"

2. Wait for all 3 agents to complete in parallel

3. Consolidate findings:
   - Identified similar features: User login, Session management, API auth
   - Mapped layers: Routes → Middleware → Services → Models
   - Found key files to read: src/auth/index.ts, src/middleware/auth.ts, etc.

4. Read all identified files (sequential)

5. Present comprehensive summary to user
```

**Phase 3 Execution** (Sequential Gate):

```
Present clarifying questions:
1. OAuth provider: Which providers? (Google, GitHub, custom?)
2. Token storage: Store OAuth tokens or just profile?
3. Existing auth: Replace or add alongside?
4. Sessions: Integrate with existing session management?
5. Error handling: How to handle OAuth failures?

Wait for user answers before proceeding
```

**Phase 4 Execution**:

```
Launch 3 parallel code-architect agents:
- Agent 1: "Design minimal changes approach for OAuth"
- Agent 2: "Design clean architecture approach for OAuth"
- Agent 3: "Design pragmatic balance approach for OAuth"

Consolidate and present 3 options to user
Ask: Which approach do you prefer?

Wait for user choice
```

**Phase 5-7**: Implementation, review, and summary

---

## 9. TOOL ALLOWLIST PATTERNS

**Comprehensive Agent Tools** (code exploration/architecture):

```
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite,
       WebSearch, KillShell, BashOutput
```

**Review-Only Tools** (code review agents):

```
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite,
       WebSearch, KillShell, BashOutput
```

**GitHub Integration Tools** (PR review command):

```
allowed-tools: Bash(gh issue view:*),
               Bash(gh search:*),
               Bash(gh issue list:*),
               Bash(gh pr comment:*),
               Bash(gh pr diff:*),
               Bash(gh pr view:*),
               Bash(gh pr list:*),
               mcp__github_inline_comment__create_inline_comment
```

**Pattern**: Explicit allowlist prevents tool sprawl

---

## Key Implementation Principles

### 1. Parallel Boundaries

- Clearly mark where agents launch in parallel
- Consolidate findings before proceeding
- Use "Launch N agents in parallel" language

### 2. Sequential Gates

- Require user input at decision points
- Wait for approval before implementation
- Clarify ambiguities early

### 3. Confidence Filtering

- Every issue scored on 0-100 scale
- Only report ≥80 confidence
- Document why something is filtered

### 4. Output Specificity

- Always include file:line references
- Provide concrete examples
- Be actionable, not abstract

### 5. Agent Specialization

- One agent per distinct focus area
- Agents independent but complementary
- Scoring/findings specific to focus

---
