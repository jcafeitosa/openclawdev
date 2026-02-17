# Auto Memory Implementation - OpenClaw

## Summary

Successfully implemented the Auto Memory system for OpenClaw, which automatically records agent learnings and insights after each run, similar to Claude Code CLI's auto memory feature.

## Files Created

### 1. Core Implementation

**File**: `/sessions/friendly-determined-babbage/mnt/openclawdev/src/memory/auto-memory.ts`

The main Auto Memory module providing:

- **Data Types**: `AutoMemoryEntry` type with 8 learning categories
- **Storage Management**: JSONL-based persistent storage at `~/.openclaw/auto-memory/learnings.jsonl`
- **Recording**: `recordLearning()` function to persist learnings
- **Querying**: Functions to load, search, and filter learnings:
  - `loadRecentLearnings()` - Load with filtering
  - `searchLearnings()` - Keyword search
  - `getErrorPatterns()` - Retrieve error patterns
  - `getSuccessPatterns()` - Retrieve success patterns
- **Extraction**: `extractLearningsFromTranscript()` to automatically extract insights from conversations
- **Context Building**: `buildAutoMemoryContext()` to generate formatted context for agent prompts
- **Statistics**: `getLearningStats()` for learning analytics
- **Maintenance**: `clearAutoMemory()` for testing and reset
- **Size Management**: Automatic pruning when exceeding 1000 entries

**Key Features**:

- Supports 8 learning categories: error-pattern, success-pattern, tool-usage, codebase-insight, user-preference, optimization, pitfall, workaround
- Automatic extraction of tool names and error types from transcripts
- Deduplication of similar learnings
- Optional file references and occurrence counts
- Full TypeScript support with proper typing

### 2. Test Suite

**File**: `/sessions/friendly-determined-babbage/mnt/openclawdev/src/memory/auto-memory.test.ts`

Comprehensive test coverage including:

- Recording and retrieving learnings
- Filtering by agent ID and category
- Keyword-based search functionality
- Error pattern detection and retrieval
- Success pattern tracking
- Transcript analysis and learning extraction
- Context building for prompts
- Statistics calculation
- Memory cleanup

**Test Count**: 15+ test cases covering all major functionality

### 3. Documentation

**File**: `/sessions/friendly-determined-babbage/mnt/openclawdev/docs/auto-memory.md`

Complete documentation covering:

- System overview and architecture
- API reference with examples
- Learning categories and their use cases
- Integration details with post-run hook
- Storage format and maintenance
- Usage examples and best practices
- Troubleshooting guide
- Future enhancement ideas

## Files Modified

### 1. Post-Run Hook Integration

**File**: `/sessions/friendly-determined-babbage/mnt/openclawdev/src/services/agent-humanization/hooks/post-run-hook.ts`

**Changes Made**:

1. **Added Imports**:

   ```typescript
   import { recordLearning } from "../../../memory/auto-memory.js";
   import type { AutoMemoryEntry } from "../../../memory/auto-memory.js";
   ```

2. **Extended PostRunHookParams Interface**:
   - Added optional `transcript` field to capture full session messages
   - This allows the hook to extract learnings from complete conversations

3. **Added Auto-Memory Recording in Main Hook** (lines 140-146):

   ```typescript
   // Record learnings to auto-memory for future reference
   if (params.sessionKey) {
     fireAndForget("post-run:auto-memory", () => {
       recordAutoMemoryLearnings(params, outcome);
       return Promise.resolve();
     });
   }
   ```

4. **New Functions Added**:
   - `recordAutoMemoryLearnings()` - Main integration point that records:
     - Run outcome as success/error pattern
     - Tool usage patterns
     - Error details and error kinds
     - Performance metrics

   - `buildOutcomeSummary()` - Generates human-readable summaries of run outcomes

   - `buildErrorDetail()` - Constructs detailed error information

**Design Decisions**:

- Uses fire-and-forget pattern (via `fireAndForget()`) to avoid blocking the agent pipeline
- Records multiple learning entries per run to capture different aspects
- Integrates seamlessly with existing humanization service patterns
- Follows existing code style and conventions

## Architecture

### Data Flow

```
Agent Run Completes
        ↓
postRunHook(params) called
        ↓
Record outcome/energy ← Synchronous path
        ↓
Determine outcome (success/failure/partial)
        ↓
Schedule auto-memory recording (fire-and-forget)
        ↓
recordAutoMemoryLearnings() executes asynchronously
        ↓
Create 3-5 learning entries based on run details:
   • Outcome entry (success-pattern or error-pattern)
   • Tool usage entry (if tools were called)
   • Error detail entry (if failure)
   • Performance entry (if metrics available)
        ↓
Each entry recorded via recordLearning()
        ↓
Entry appended to learnings.jsonl
        ↓
Auto-prune if exceeds 1000 entries
```

### Storage Structure

```
~/.openclaw/auto-memory/
├── learnings.jsonl (JSONL format - one entry per line)
```

Example entry:

```json
{
  "timestamp": "2025-02-16T10:30:45.123Z",
  "agentId": "code-analyzer",
  "sessionKey": "session-abc123",
  "category": "error-pattern",
  "summary": "Context overflow detected",
  "detail": "Occurs when input exceeds 32k tokens",
  "relatedFiles": ["src/handlers/large-file.ts"],
  "occurrenceCount": 1
}
```

## Integration Points

### Post-Run Hook

- **Location**: `src/services/agent-humanization/hooks/post-run-hook.ts`
- **Timing**: Executes after every LLM turn (asynchronously)
- **Data Captured**: Run outcome, tool usage, errors, performance metrics
- **Non-Blocking**: Uses fire-and-forget pattern to avoid pipeline delays

### System Prompt Injection (Future)

The `buildAutoMemoryContext()` function can be used to inject recent learnings into agent system prompts:

```typescript
const context = buildAutoMemoryContext(agentId);
if (context) {
  systemPrompt = `${basePrompt}\n${context}`;
}
```

### Learning Extraction

The `extractLearningsFromTranscript()` function can analyze full conversation histories to identify:

- Error patterns and failure modes
- Successful approaches and strategies
- Tool usage patterns
- Performance insights
- Workarounds and gotchas

## Key Design Features

### 1. Fire-and-Forget Pattern

Auto-memory recording uses the same fire-and-forget pattern as the humanization service:

- Non-blocking to the main agent pipeline
- Errors are logged but don't crash the system
- Uses `setImmediate` for proper event loop yielding

### 2. Automatic Extraction

The system automatically extracts learnings from transcripts by detecting:

- Keywords like "error", "failed", "bug", "fix"
- Tool invocations (tool_use, function_call)
- Performance/optimization keywords
- Workaround patterns
- User preferences

### 3. Smart Deduplication

Identical learnings are deduplicated based on summary + category combination

### 4. Flexible Categories

8 learning categories to cover different types of insights:

- **error-pattern**: Recurring failures and errors
- **success-pattern**: Successful approaches
- **tool-usage**: Tool effectiveness
- **codebase-insight**: Repository-specific learnings
- **user-preference**: User habits and preferences
- **optimization**: Performance opportunities
- **pitfall**: Known gotchas
- **workaround**: Solutions to known problems

### 5. Maintenance

- Automatic pruning when exceeding 1000 entries
- Simple JSONL format for easy inspection and backup
- Optional test reset via `clearAutoMemory()`

## Testing

All functionality is tested via comprehensive test suite:

```bash
npm test -- src/memory/auto-memory.test.ts
```

**Test Coverage**:

- ✓ Recording and retrieval
- ✓ Filtering by agent/category
- ✓ Searching learnings
- ✓ Extracting from transcripts
- ✓ Building context
- ✓ Statistics calculation
- ✓ Error pattern detection
- ✓ Success pattern tracking
- ✓ Deduplication
- ✓ Memory cleanup

## Usage Examples

### Basic Recording

```typescript
recordLearning({
  timestamp: new Date().toISOString(),
  agentId: "my-agent",
  sessionKey: "session-123",
  category: "error-pattern",
  summary: "Context overflow on large inputs",
});
```

### Extracting from Transcripts

```typescript
const learnings = extractLearningsFromTranscript({
  agentId: "my-agent",
  sessionKey: "session-456",
  messages: [...],
});
learnings.forEach(recordLearning);
```

### Building Agent Context

```typescript
const context = buildAutoMemoryContext("my-agent");
const systemPrompt = basePrompt + (context || "");
```

### Analyzing Patterns

```typescript
const stats = getLearningStats("my-agent");
const errors = getErrorPatterns("my-agent");
const successes = getSuccessPatterns("my-agent");
```

## Future Enhancements

Potential improvements (outside scope of current implementation):

1. **Vector Embeddings**: Semantic search using embeddings
2. **Pattern Clustering**: Automatically group similar errors
3. **Root Cause Analysis**: Analyze patterns to identify underlying issues
4. **Time-Series Analysis**: Track how learnings change over time
5. **Export/Import**: Share insights across agents or teams
6. **Automatic Suggestions**: Generate fixes based on patterns
7. **Integration with Feedback**: Tie learnings to human feedback
8. **Persistence Query**: SQL-based queries against learning store

## Compatibility

- **TypeScript**: Full TS support with proper types
- **Node.js**: Uses standard fs/path modules
- **Async Pattern**: Compatible with fire-and-forget system
- **JSONL Format**: Human-readable, line-based format
- **No External Dependencies**: Uses only Node.js built-ins

## Performance Characteristics

- **Recording**: O(1) append operation (file write)
- **Loading**: O(n) linear scan of JSONL file (acceptable for up to 1000 entries)
- **Search**: O(n) linear search (full text matching)
- **Pruning**: O(n) file rewrite (happens at most once per 1000 entries)

**Recommendation**: For high-volume scenarios, consider migrating to SQLite or vector database.

## Security Considerations

- **File Permissions**: Stored in user's home directory (`~/.openclaw/`)
- **No Sensitive Data**: Should not record API keys or credentials
- **Plaintext Storage**: JSONL is human-readable for debugging

## Files Summary

| File                                                   | Lines    | Purpose             |
| ------------------------------------------------------ | -------- | ------------------- |
| src/memory/auto-memory.ts                              | 400+     | Core implementation |
| src/memory/auto-memory.test.ts                         | 350+     | Test suite          |
| src/services/agent-humanization/hooks/post-run-hook.ts | Modified | Hook integration    |
| docs/auto-memory.md                                    | 400+     | Documentation       |

## Next Steps for Integration

To fully integrate Auto Memory into the agent pipeline:

1. **Update post-run hook calls** to include transcript data:

   ```typescript
   postRunHook({
     agentId,
     sessionKey,
     durationMs,
     usage,
     toolCallCount,
     hasToolErrors,
     assistantText,
     transcript: messages,
   });
   ```

2. **Inject auto-memory context** into system prompts:

   ```typescript
   const context = buildAutoMemoryContext(agentId);
   systemPrompt += context || "";
   ```

3. **Monitor learnings** in agent dashboards:

   ```typescript
   const stats = getLearningStats(agentId);
   // Display error patterns, success rate, etc.
   ```

4. **Create management commands** for learning analysis:
   ```
   openclaw memory list --agent <id>
   openclaw memory search "error pattern"
   openclaw memory stats
   ```
