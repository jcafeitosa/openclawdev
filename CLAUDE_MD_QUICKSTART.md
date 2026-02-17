# CLAUDE.md Memory System - Quick Start

## What is CLAUDE.md?

CLAUDE.md is a file in your workspace that contains persistent memory instructions. These instructions are automatically injected into your agent's system prompt on every run, similar to the Claude Code CLI memory system.

## Getting Started

### Step 1: Initialize CLAUDE.md

Type `/init` in any OpenClaw chat:

```
/init
```

This creates a template `CLAUDE.md` file in your workspace with helpful examples and guidelines.

### Step 2: Edit Your Memory

Open `CLAUDE.md` in your text editor and add your custom instructions:

```markdown
# CLAUDE.md - OpenClaw Persistent Memory

## My Agent's Personality

You are a thoughtful assistant that:

- Explains concepts clearly and concisely
- Provides code examples when helpful
- Asks clarifying questions when unsure

## Preferences

- Use markdown formatting
- Include code blocks with language specifiers
- Provide step-by-step explanations for complex topics

## Important Context

This is a TypeScript project using:

- Node.js runtime
- React for UI components
- Express.js for backend
```

### Step 3: Use It!

Your instructions are now automatically loaded in every agent run. Start chatting and your agent will follow your custom instructions.

## Memory Hierarchy

The system loads memory from multiple locations in this order:

1. **Global** (`~/.openclaw/CLAUDE.md`)
   - Instructions used across all workspaces
   - Example: Your communication preferences

2. **Project** (`{workspace}/CLAUDE.md`)
   - Instructions for this specific project
   - Example: Project-specific coding standards

3. **Local** (`{workspace}/CLAUDE.local.md`)
   - Machine-specific or sensitive instructions
   - Not committed to git (automatically gitignored)
   - Example: API keys, local paths, personal notes

4. **Directory-specific** (`{workspace}/src/CLAUDE.md`, etc.)
   - Instructions for specific subdirectories
   - Walks up from current directory to workspace root
   - Example: Backend-specific rules in `src/backend/CLAUDE.md`

## Examples

### Example 1: Coding Standards

```markdown
## Code Style

Always:

- Use TypeScript with strict mode
- Write JSDoc comments for public functions
- Follow the existing code patterns in this project
- Run `npm test` before suggesting changes
```

### Example 2: Communication Style

```markdown
## How to Respond

- Be concise but complete
- Use bullet points for lists
- Explain the "why" not just the "what"
- Provide code examples for technical topics
```

### Example 3: Project Context

```markdown
## Project Setup

This is a Node.js + React application with:

- Backend: Express.js in `src/backend/`
- Frontend: React in `src/frontend/`
- Tests: Vitest in `src/**/*.test.ts`
- Database: PostgreSQL with migrations in `db/migrations/`

Key commands:

- `npm start` - Start both backend and frontend
- `npm test` - Run test suite
- `npm build` - Build for production
```

### Example 4: Local Machine Setup

```markdown
# CLAUDE.local.md - Local Configuration

## Local Environment

- Python interpreter: /usr/local/bin/python3.11
- Node version: v20.10.0
- Working directory: /home/user/projects/myapp

## Sensitive Information

- API key for service X: stored in .env (already configured)
- Database URL: postgresql://localhost/devdb
```

## Tips & Best Practices

### Do's

- Keep instructions focused and actionable
- Update memory when project context changes
- Use clear markdown formatting
- Include concrete examples
- Document assumptions

### Don'ts

- Don't store sensitive API keys in project CLAUDE.md
- Don't make instructions too long (keep to essentials)
- Don't duplicate information that's in comments/docs
- Don't use machine-specific paths in shared CLAUDE.md

## Troubleshooting

### Memory Not Loading

1. Check file exists: `{workspace}/CLAUDE.md`
2. Check file is not empty
3. Verify file encoding is UTF-8
4. Check file permissions (should be readable)

### Stale Memory

If you edited CLAUDE.md and changes aren't reflected:

1. The system automatically detects file changes
2. If caching seems stuck, restart your OpenClaw session
3. Try typing `/help` to refresh the system

### Too Much Memory

If CLAUDE.md is getting too long:

1. Keep only the most important instructions
2. Create `CLAUDE.local.md` for machine-specific settings
3. Use `~/.openclaw/CLAUDE.md` for global preferences
4. Use subdirectory CLAUDE.md files for context-specific rules

## Advanced: Multiple Memory Files

Create CLAUDE.md in subdirectories for context-specific rules:

```
workspace/
├── CLAUDE.md                  # Overall project
├── src/
│   ├── CLAUDE.md             # Source code rules
│   ├── backend/
│   │   └── CLAUDE.md         # Backend-specific
│   └── frontend/
│       └── CLAUDE.md         # Frontend-specific
└── docs/
    └── CLAUDE.md             # Documentation rules
```

When working in `src/backend/`, the system loads:

1. Global memory
2. Project memory
3. Local memory
4. Source code memory
5. Backend memory

Each layer adds to the previous one.

## CLI Integration

### Create CLAUDE.md Template

```bash
# In your workspace
/init
```

### View Loaded Memory

Check the agent's system prompt to see what memory is loaded (visible in debug logs).

### Clear Cache

The system automatically manages caching, but to manually clear:

```typescript
// In code
import { clearClaudeMdCache } from "./src/memory/claude-md-loader.js";
clearClaudeMdCache();
```

## Examples Gallery

See `CLAUDE_MD_IMPLEMENTATION.md` for more detailed examples and advanced usage patterns.

## Getting Help

- **User Guide**: See `CLAUDE_MD_IMPLEMENTATION.md`
- **Developer Guide**: See `CLAUDE_MD_DEVELOPER_GUIDE.md`
- **Issues**: Create a GitHub issue with `[CLAUDE.md]` tag

## Quick Reference

| File                             | Purpose           | Scope                  |
| -------------------------------- | ----------------- | ---------------------- |
| `~/.openclaw/CLAUDE.md`          | Global memory     | All workspaces         |
| `{workspace}/CLAUDE.md`          | Project memory    | All runs in workspace  |
| `{workspace}/CLAUDE.local.md`    | Local-only memory | Local machine only     |
| `{workspace}/{subdir}/CLAUDE.md` | Context-specific  | When in that directory |

## What's Next?

1. Run `/init` to create your first CLAUDE.md
2. Add your custom instructions
3. Start chatting and watch your agent follow your instructions!

Enjoy customizing your agent's behavior!
