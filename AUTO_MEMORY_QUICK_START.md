# Auto Memory Quick Start Guide

## What is Auto Memory?

Auto Memory is an automatic learning system for OpenClaw agents. After each agent run, it:

- Captures what happened (success or failure)
- Records errors and patterns
- Tracks tool usage
- Saves insights for future reference

This helps agents learn from experience, similar to Claude Code CLI's auto memory.

## Quick Examples

### See what your agent has learned

```typescript
import { getLearningStats, getErrorPatterns, getSuccessPatterns } from "src/memory/auto-memory";

// Get statistics
const stats = getLearningStats("my-agent");
console.log(`Total learnings: ${stats.totalLearnings}`);
console.log(`Errors: ${stats.errorPatterns}`);

// View error patterns
const errors = getErrorPatterns("my-agent");
errors.forEach((e) => console.log(`❌ ${e.summary}`));

// View successes
const successes = getSuccessPatterns("my-agent");
successes.forEach((s) => console.log(`✅ ${s.summary}`));
```

### Extract insights from a conversation

```typescript
import { extractLearningsFromTranscript, recordLearning } from "src/memory/auto-memory";

const learnings = extractLearningsFromTranscript({
  agentId: "my-agent",
  sessionKey: "session-123",
  messages: [
    { role: "user", content: "Fix this bug" },
    { role: "assistant", content: "Found it! The error was in the validation logic." },
  ],
});

// Save the learnings
learnings.forEach(recordLearning);
```

### Inject learnings into agent prompt

```typescript
import { buildAutoMemoryContext } from "src/memory/auto-memory";

const context = buildAutoMemoryContext("my-agent");
const systemPrompt = `You are a helpful AI assistant.${context || ""}`;

// Now the agent knows about its past experiences!
```

### Search learnings

```typescript
import { searchLearnings } from "src/memory/auto-memory";

// Find all learnings about performance
const results = searchLearnings("performance", { agentId: "my-agent" });
results.forEach((r) => console.log(r.summary));
```

## Where is Auto Memory Stored?

All learnings are saved in:

```
~/.openclaw/auto-memory/learnings.jsonl
```

Each line is a JSON object containing one learning.

## Learning Categories

Auto Memory tracks 8 types of learnings:

| Icon | Category         | What It Captures            |
| ---- | ---------------- | --------------------------- |
| 🐛   | error-pattern    | Errors that keep happening  |
| ✅   | success-pattern  | What works well             |
| 🔧   | tool-usage       | Which tools are most useful |
| 📚   | codebase-insight | Facts about the codebase    |
| 👤   | user-preference  | How the user likes things   |
| ⚡   | optimization     | Ways to improve performance |
| ⚠️   | pitfall          | Gotchas and traps           |
| 🔄   | workaround       | Solutions to known problems |

## How Auto Memory Works

1. **During Agent Run**: Agent processes tasks using tools
2. **After Run Completes**: Post-run hook fires
3. **Learning Extraction**: Hook records:
   - Whether run succeeded or failed
   - Which tools were used
   - Any errors that occurred
   - Performance metrics
4. **Storage**: All learnings saved to `~/.openclaw/auto-memory/learnings.jsonl`
5. **Reuse**: Next time agent runs, context can be injected to help avoid past mistakes

## Common Tasks

### Count how many errors of a certain type

```typescript
import { getErrorPatterns } from "src/memory/auto-memory";

const errors = getErrorPatterns("my-agent");
const contextErrors = errors.filter((e) => e.summary.includes("context"));
console.log(`${contextErrors.length} context errors in past runs`);
```

### Find the most recent learning

```typescript
import { loadRecentLearnings } from "src/memory/auto-memory";

const recent = loadRecentLearnings({ agentId: "my-agent", limit: 1 });
if (recent.length > 0) {
  console.log(`Latest: ${recent[0].summary} (${recent[0].timestamp})`);
}
```

### Get all learnings about a topic

```typescript
import { searchLearnings } from "src/memory/auto-memory";

const fileErrors = searchLearnings("file", { agentId: "my-agent" });
console.log(`${fileErrors.length} learnings about files`);
```

### Clear all learnings (for testing)

```typescript
import { clearAutoMemory } from "src/memory/auto-memory";

clearAutoMemory(); // Starts fresh!
```

## Integration with Post-Run Hook

Auto Memory is automatically integrated into the post-run hook system. Every time an agent completes a run:

```
postRunHook() called
  ↓
  ├─ Records energy/reputation (existing)
  ├─ Detects patterns (existing)
  └─ Records auto-memory ← NEW
       ├─ Outcome (success/failure)
       ├─ Tool usage
       ├─ Errors
       └─ Performance
```

You can pass full transcript to capture more context:

```typescript
postRunHook({
  agentId: "my-agent",
  sessionKey: "session-123",
  durationMs: 1234,
  transcript: messages, // Add full conversation
  // ... other params
});
```

## Best Practices

✅ **DO**:

- Review error patterns regularly
- Use learnings to improve prompts
- Batch similar learnings together
- Export learnings for analysis

❌ **DON'T**:

- Store API keys in learnings
- Record sensitive information
- Ignore patterns that repeat 3+ times
- Let the learning store grow beyond 1000 entries

## Troubleshooting

### "I don't see my learnings"

Check:

1. Agent ID matches: `getLearningStats("correct-agent-id")`
2. File exists: `ls ~/.openclaw/auto-memory/learnings.jsonl`
3. Something was recorded: `getLearningStats().totalLearnings > 0`

### "Context is empty when I build it"

This is normal! It means:

- No learnings yet (new agent)
- Only one type (need both errors AND successes)

### "File is too large"

Auto Memory automatically keeps only 1000 recent entries. Older ones are deleted.

To start fresh:

```typescript
import { clearAutoMemory } from "src/memory/auto-memory";
clearAutoMemory();
```

## Examples

### Example 1: Monitor Agent Health

```typescript
import { getLearningStats, getErrorPatterns } from "src/memory/auto-memory";

function checkAgentHealth(agentId: string) {
  const stats = getLearningStats(agentId);
  const errors = getErrorPatterns(agentId);

  const errorRate = stats.totalLearnings > 0 ? stats.errorPatterns / stats.totalLearnings : 0;

  if (errorRate > 0.3) {
    console.warn(`⚠️ ${agentId} has high error rate (${Math.round(errorRate * 100)}%)`);
    console.log("Recent errors:");
    errors.slice(-3).forEach((e) => console.log(`  - ${e.summary}`));
  } else {
    console.log(`✅ ${agentId} is healthy (${stats.totalLearnings} learnings)`);
  }
}
```

### Example 2: Learn from Successful Runs

```typescript
import { getSuccessPatterns } from "src/memory/auto-memory";

function getWinningStrategy(agentId: string) {
  const successes = getSuccessPatterns(agentId);

  if (successes.length === 0) {
    return "No successful patterns yet";
  }

  // Count which approach works best
  const approachCounts = {};
  successes.forEach((s) => {
    const approach = s.summary.split(" ").slice(0, 3).join(" ");
    approachCounts[approach] = (approachCounts[approach] || 0) + 1;
  });

  const [bestApproach] = Object.entries(approachCounts).sort(([, a], [, b]) => b - a)[0];

  return `Best approach: ${bestApproach}`;
}
```

### Example 3: Smart Prompt Injection

```typescript
import { buildAutoMemoryContext, getErrorPatterns } from "src/memory/auto-memory";

function buildSmartPrompt(agentId: string) {
  let prompt = "You are a helpful AI assistant.\n";

  // Add what to avoid
  const errors = getErrorPatterns(agentId);
  if (errors.length > 0) {
    prompt += "\nDO NOT:\n";
    errors.slice(-3).forEach((e) => {
      prompt += `- ${e.summary}\n`;
    });
  }

  // Add context
  const context = buildAutoMemoryContext(agentId);
  if (context) {
    prompt += context;
  }

  return prompt;
}
```

## What's Next?

1. **Run agents** - Auto Memory captures learnings automatically
2. **Monitor learnings** - Use `getLearningStats()` to track progress
3. **Analyze patterns** - Review errors to find issues
4. **Improve prompts** - Use `buildAutoMemoryContext()` to inject learnings
5. **Iterate** - As agents learn, performance improves!

## API Reference

For complete API documentation, see: `docs/auto-memory.md`

Key functions:

- `recordLearning()` - Save a learning
- `loadRecentLearnings()` - Retrieve learnings
- `extractLearningsFromTranscript()` - Extract from conversation
- `buildAutoMemoryContext()` - Generate prompt context
- `getErrorPatterns()` - Get errors
- `getSuccessPatterns()` - Get successes
- `searchLearnings()` - Search by keyword
- `getLearningStats()` - Get statistics
- `clearAutoMemory()` - Reset for testing

## Questions?

See the full documentation at: `docs/auto-memory.md`
