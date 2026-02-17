# CLAUDE.md Memory File System Implementation

## Overview

This implementation adds persistent memory instructions from CLAUDE.md files into OpenClaw agent context at runtime, similar to the Claude Code CLI memory system.

## Files Created

### 1. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/memory/claude-md-loader.ts`

**Purpose**: Core CLAUDE.md file loading and caching system

**Key Features**:

- Loads CLAUDE.md files from hierarchical locations:
  1. Global user memory: `~/.openclaw/CLAUDE.md`
  2. Project memory: `{workspaceDir}/CLAUDE.md`
  3. Local project memory: `{workspaceDir}/CLAUDE.local.md` (gitignored)
  4. Directory-specific memory: Walks up from current directory to workspace root
- Implements caching with file modification time checking to avoid redundant file reads
- Deduplicates content from multiple files using section headers
- Concatenates sections with markdown separators for clarity

**Exports**:

- `loadClaudeMdMemory(params)`: Returns concatenated memory string or null if no files exist
- `clearClaudeMdCache()`: Utility to clear the in-memory cache

### 2. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/memory/claude-md-loader.test.ts`

**Purpose**: Comprehensive unit tests for the CLAUDE.md loader

**Test Coverage**:

- Returns null when no CLAUDE.md files exist
- Loads project-level CLAUDE.md
- Loads local project memory
- Combines multiple files with proper separators
- Loads directory-specific memory with upward traversal
- Implements proper caching behavior
- Detects file changes and invalidates cache

### 3. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/auto-reply/reply/commands-init.ts`

**Purpose**: Command handler for `/init` command

**Features**:

- Creates a CLAUDE.md template file in the workspace
- Provides helpful template with structure and examples
- Returns user-friendly success/error messages
- Follows OpenClaw command handler conventions

**Command**: `/init`

- Description: "Initialize CLAUDE.md memory file in the workspace."
- Category: "session"
- No arguments required

## Files Modified

### 1. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/auto-reply/reply/get-reply-run.ts`

**Changes**:

- Added import: `import { loadClaudeMdMemory } from "../../memory/claude-md-loader.js";`
- Injected CLAUDE.md memory into `extraSystemPrompt`:
  ```typescript
  const claudeMdMemory = loadClaudeMdMemory({
    workspaceDir: workspaceDir,
    currentDir: workspaceDir,
  });
  const extraSystemPrompt = [
    inboundMetaPrompt,
    groupChatContext,
    groupIntro,
    groupSystemPrompt,
    claudeMdMemory,
  ]
    .filter(Boolean)
    .join("\n\n");
  ```

**Impact**: All inline message replies now include CLAUDE.md memory in the system prompt

### 2. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/agents/pi-embedded-runner/compact.ts`

**Changes**:

- Added import: `import { loadClaudeMdMemory } from "../../memory/claude-md-loader.js";`
- Injected CLAUDE.md memory before `buildEmbeddedSystemPrompt`:
  ```typescript
  const claudeMdMemory = loadClaudeMdMemory({
    workspaceDir: effectiveWorkspace,
    currentDir: effectiveWorkspace,
  });
  const combinedExtraPrompt =
    [params.extraSystemPrompt, claudeMdMemory].filter(Boolean).join("\n\n") || undefined;
  ```

**Impact**: Session compaction operations now include CLAUDE.md memory in the system prompt

### 3. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/agents/pi-embedded-runner/run/attempt.ts`

**Changes**:

- Added import: `import { loadClaudeMdMemory } from "../../../memory/claude-md-loader.js";`
- Injected CLAUDE.md memory before `buildEmbeddedSystemPrompt`:
  ```typescript
  const claudeMdMemory = loadClaudeMdMemory({
    workspaceDir: effectiveWorkspace,
    currentDir: effectiveWorkspace,
  });
  const combinedExtraPrompt =
    [params.extraSystemPrompt, claudeMdMemory].filter(Boolean).join("\n\n") || undefined;
  ```

**Impact**: All embedded PI agent runs now include CLAUDE.md memory in the system prompt

### 4. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/auto-reply/commands-registry.data.ts`

**Changes**:

- Added `/init` command definition:
  ```typescript
  defineChatCommand({
    key: "init",
    description: "Initialize CLAUDE.md memory file in the workspace.",
    textAlias: "/init",
    category: "session",
  }),
  ```

**Impact**: `/init` command is now available to users

### 5. `/sessions/friendly-determined-babbage/mnt/openclawdev/src/auto-reply/reply/commands-core.ts`

**Changes**:

- Added import: `import { handleInitCommand } from "./commands-init.js";`
- Added handler to HANDLERS array: `handleInitCommand`

**Impact**: `/init` command is now properly dispatched and executed

## Usage

### For Users

1. **Initialize CLAUDE.md in workspace**:

   ```
   /init
   ```

   This creates a template CLAUDE.md file with examples and guidelines.

2. **Edit CLAUDE.md**:
   - Open `{workspace}/CLAUDE.md` in your text editor
   - Add persistent instructions following the template format
   - Save the file

3. **Optional: Create local memory**:
   - Create `{workspace}/CLAUDE.local.md` for machine-specific or sensitive instructions
   - This file is automatically gitignored and only loaded locally

4. **Optional: Set global memory**:
   - Create `~/.openclaw/CLAUDE.md` for global instructions used across all workspaces
   - Example: preferred communication style, common preferences, etc.

### Memory Hierarchy

The system loads memory in this priority order:

1. Global user memory (`~/.openclaw/CLAUDE.md`)
2. Project memory (`{workspace}/CLAUDE.md`)
3. Local project memory (`{workspace}/CLAUDE.local.md`)
4. Directory-specific memory (walk up from current directory to workspace root)

All loaded content is concatenated with markdown separators and automatically injected into agent system prompts.

## Architecture

### Integration Points

The CLAUDE.md memory is injected at three key locations where system prompts are built:

1. **`get-reply-run.ts`**: Regular message replies in channels (Discord, Slack, Telegram, etc.)
2. **`compact.ts`**: Session compaction operations
3. **`attempt.ts`**: Embedded PI agent runs

All three integration points follow the same pattern:

1. Load CLAUDE.md memory using `loadClaudeMdMemory()`
2. Combine with existing `extraSystemPrompt` parameter
3. Pass combined prompt to `buildEmbeddedSystemPrompt()`

### Caching Strategy

- File modification times (mtime) are used to track cache validity
- Cache is stored per-file in memory
- When a file is modified, the cache is automatically invalidated
- `clearClaudeMdCache()` utility function available for manual cache clearing

### Error Handling

- File read errors are silently caught and ignored
- Missing files return null (no memory loaded)
- Empty files are treated as missing
- The system gracefully handles permission errors

## Testing

Run the test suite:

```bash
npm test src/memory/claude-md-loader.test.ts
```

Tests verify:

- File loading behavior
- Hierarchical precedence
- Caching mechanism
- File change detection
- Content combination with separators

## Performance Considerations

- Lazy loading: Files are only read when memory is requested
- Caching: Once a file is read, it's cached until the file is modified
- Fast path: Missing files don't cause disk access on subsequent calls
- Minimal overhead: String operations are only performed when files exist

## Future Enhancements

Potential improvements:

1. Add support for CLAUDE.md.local variants for different environments
2. Implement memory exclusions (files to skip)
3. Add memory prioritization/ordering
4. Support for macro expansion in CLAUDE.md
5. Memory analytics/usage tracking
6. Integration with memory management dashboard
