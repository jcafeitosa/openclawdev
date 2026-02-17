# Auto Memory System

The Auto Memory system automatically records agent learnings and insights after each run, similar to Claude Code CLI's auto memory feature. This system helps agents learn from their experiences and improve over time.

## Overview

Auto Memory captures and persists:

- **Error patterns**: Recurring errors and failure modes
- **Success patterns**: Successful approaches and strategies
- **Tool usage**: Which tools work best in different contexts
- **Performance insights**: Optimization opportunities
- **Workarounds**: Known gotchas and workarounds
- **Codebase insights**: Learnings about specific codebases

## Architecture

### Core Components

#### `src/memory/auto-memory.ts`

The main Auto Memory module providing:

- **Learning storage**: Persistent JSON-line file at `~/.openclaw/auto-memory/learnings.jsonl`
- **Extraction**: Automatic extraction of learnings from session transcripts
- **Querying**: Search and filter learnings by agent, category, and keywords
- **Context building**: Generate context summaries for agent prompts

#### Integration with Post-Run Hook

The post-run hook (`src/services/agent-humanization/hooks/post-run-hook.ts`) automatically:

- Records run outcomes as learnings
- Captures tool usage patterns
- Documents errors and failures
- Tracks performance metrics

## API Reference

### Recording Learnings

#### `recordLearning(entry: AutoMemoryEntry): void`

Record a single learning entry to persistent storage.

```typescript
import { recordLearning } from "src/memory/auto-memory";

recordLearning({
  timestamp: new Date().toISOString(),
  agentId: "my-agent",
  sessionKey: "session-123",
  category: "error-pattern",
  summary: "Context overflow on large documents",
  detail: "Occurs when input exceeds 32k tokens",
  relatedFiles: ["src/agents/handler.ts"],
});
```

### Loading Learnings

#### `loadRecentLearnings(params?: {...}): AutoMemoryEntry[]`

Load recent learnings with optional filtering.

```typescript
import { loadRecentLearnings } from "src/memory/auto-memory";

// Get last 50 learnings for an agent
const learnings = loadRecentLearnings({ agentId: "my-agent" });

// Filter by category
const errors = loadRecentLearnings({
  agentId: "my-agent",
  category: "error-pattern",
  limit: 10,
});
```

#### `searchLearnings(query: string, params?: {...}): AutoMemoryEntry[]`

Search learnings by keywords.

```typescript
import { searchLearnings } from "src/memory/auto-memory";

const results = searchLearnings("performance", { agentId: "my-agent" });
```

#### `getErrorPatterns(agentId: string): AutoMemoryEntry[]`

Get all error patterns for an agent.

```typescript
import { getErrorPatterns } from "src/memory/auto-memory";

const errors = getErrorPatterns("my-agent");
errors.forEach((error) => {
  console.log(`${error.summary}: ${error.detail}`);
});
```

#### `getSuccessPatterns(agentId: string): AutoMemoryEntry[]`

Get all successful approaches for an agent.

```typescript
import { getSuccessPatterns } from "src/memory/auto-memory";

const successes = getSuccessPatterns("my-agent");
```

### Extracting from Transcripts

#### `extractLearningsFromTranscript(params): AutoMemoryEntry[]`

Automatically extract learnings from a session transcript.

```typescript
import { extractLearningsFromTranscript } from "src/memory/auto-memory";

const learnings = extractLearningsFromTranscript({
  agentId: "my-agent",
  sessionKey: "session-456",
  messages: [
    { role: "user", content: "Help with this bug" },
    {
      role: "assistant",
      content: "I found the error: ...",
    },
  ],
});

learnings.forEach((learning) => recordLearning(learning));
```

### Building Agent Context

#### `buildAutoMemoryContext(agentId: string): string | null`

Generate a formatted context snippet for injection into agent prompts.

```typescript
import { buildAutoMemoryContext } from "src/memory/auto-memory";

const context = buildAutoMemoryContext("my-agent");
if (context) {
  const systemPrompt = `${basePrompt}\n${context}`;
}
```

Output format:

```
## Recent Error Patterns to Avoid
- Context overflow detected
- Timeout on large files
- Type mismatch in arguments

## Successful Approaches
- Tool orchestration with search and file reading
- Iterative refinement approach
- Documentation generation workflow
```

### Statistics and Analysis

#### `getLearningStats(agentId: string)`

Get learning statistics for an agent.

```typescript
import { getLearningStats } from "src/memory/auto-memory";

const stats = getLearningStats("my-agent");
console.log(`Total learnings: ${stats.totalLearnings}`);
console.log(`Error patterns: ${stats.errorPatterns}`);
console.log(`Success patterns: ${stats.successPatterns}`);
```

## Learning Categories

Auto Memory supports the following learning categories:

| Category           | Description                        | Example                                     |
| ------------------ | ---------------------------------- | ------------------------------------------- |
| `error-pattern`    | Recurring errors and failures      | "Context overflow on inputs > 32k tokens"   |
| `success-pattern`  | Successful approaches              | "Multi-tool orchestration works best"       |
| `tool-usage`       | Tool effectiveness patterns        | "Search tool + file reading combination"    |
| `codebase-insight` | Learnings about specific codebases | "Repo uses TypeScript with strict mode"     |
| `user-preference`  | User preferences and patterns      | "Prefers concise responses"                 |
| `optimization`     | Performance opportunities          | "Batch queries instead of individual calls" |
| `pitfall`          | Known issues and gotchas           | "Library requires config before import"     |
| `workaround`       | Solutions to known problems        | "Use environment variable for auth"         |

## Integration with Post-Run Hook

The post-run hook automatically records learnings after each agent run:

```typescript
export interface PostRunHookParams {
  agentId: string;
  sessionKey?: string;
  durationMs: number;
  usage?: { input?: number; output?: number; total?: number };
  toolCallCount?: number;
  hasToolErrors?: boolean;
  assistantText?: string;
  aborted?: boolean;
  isError?: boolean;
  errorKind?: string;
  // Optional: full transcript for learning extraction
  transcript?: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>;
}
```

When the hook runs, it automatically:

1. Records the run outcome (success/failure/partial)
2. Captures tool usage patterns
3. Documents any errors
4. Tracks performance metrics

## Storage

Learnings are stored in a JSONL file (one JSON object per line):

**Location**: `~/.openclaw/auto-memory/learnings.jsonl`

**Format**:

```json
{"timestamp":"2025-02-16T10:30:45.123Z","agentId":"my-agent","sessionKey":"session-1","category":"error-pattern","summary":"Context overflow detected"}
{"timestamp":"2025-02-16T10:35:22.456Z","agentId":"my-agent","sessionKey":"session-2","category":"success-pattern","summary":"Successfully completed task using 3 tools"}
```

**Maintenance**:

- Maximum 1000 entries per file
- Old entries are automatically pruned when limit is exceeded
- Use `clearAutoMemory()` to reset all learnings

## Usage Examples

### Example 1: Track Common Errors

```typescript
import { getErrorPatterns, recordLearning } from "src/memory/auto-memory";

// After detecting an error pattern
const patterns = getErrorPatterns("my-agent");
const contextErrors = patterns.filter((p) => p.summary.includes("context"));

if (contextErrors.length >= 3) {
  console.warn("Agent frequently hits context limits");
  // Adjust agent configuration
}
```

### Example 2: Improve Agent Prompts

```typescript
import { buildAutoMemoryContext } from "src/memory/auto-memory";

function buildSystemPrompt(agentId: string): string {
  const basePrompt = `You are a helpful AI assistant...`;

  const context = buildAutoMemoryContext(agentId);
  return context ? `${basePrompt}\n${context}` : basePrompt;
}
```

### Example 3: Extract and Save Learnings

```typescript
import { extractLearningsFromTranscript, recordLearning } from "src/memory/auto-memory";

async function processSessionTranscript(agentId: string, sessionKey: string, messages: any[]) {
  const learnings = extractLearningsFromTranscript({
    agentId,
    sessionKey,
    messages,
  });

  learnings.forEach((learning) => recordLearning(learning));
  console.log(`Recorded ${learnings.length} learnings`);
}
```

## Best Practices

1. **Regular Analysis**: Periodically review error patterns to identify systemic issues
2. **Act on Patterns**: When error patterns repeat 3+ times, investigate and fix the root cause
3. **Feedback Loop**: Use success patterns to reinforce effective approaches
4. **Context Quality**: Ensure learnings have clear summaries for easy recall
5. **Categories**: Use appropriate categories for better filtering and analysis
6. **Cleanup**: Archive old learnings periodically to keep the store manageable

## Testing

The Auto Memory system includes comprehensive tests in `src/memory/auto-memory.test.ts`:

```bash
npm test -- src/memory/auto-memory.test.ts
```

Tests cover:

- Recording and retrieving learnings
- Filtering by agent, category, and time range
- Searching learnings
- Extracting from transcripts
- Building context snippets
- Statistics calculation

## Troubleshooting

### Learnings Not Being Recorded

- Check that the agent ID is being passed correctly
- Verify that `~/.openclaw/auto-memory/` directory exists and is writable
- Check logs for JSON parsing errors

### Context Not Being Generated

- Ensure learnings exist for the agent: `getLearningStats(agentId)`
- Both error and success patterns must exist for full context
- Check that `buildAutoMemoryContext()` returns non-null

### Storage Growing Too Large

- The system automatically prunes entries over 1000
- Use `clearAutoMemory()` to reset if needed
- Consider archiving old learnings periodically

## Future Enhancements

Potential improvements to the Auto Memory system:

- Vector embeddings for semantic search
- Clustering similar error patterns
- Automatic root cause analysis
- Time-series analysis of learning patterns
- Export/import functionality for sharing insights
- Integration with feedback systems
- Automatic suggestion generation based on learnings
