#!/usr/bin/env bun
/**
 * Demo: System Prompt with Memory Context
 * Shows what the final system prompt looks like with memory integrated
 */

import { buildMemoryContext } from "./src/agents/hooks/memory-context-hook.js";

console.log("🎯 SYSTEM PROMPT DEMO - With Memory Integration\n");
console.log("═".repeat(80));

// Simulate building memory context for agent "main"
const agentId = "main";
const userMessage = "I need help with async/await in TypeScript";

console.log(`Agent: ${agentId}`);
console.log(`User Message: "${userMessage}"`);
console.log("");

// Build memory context (this is what happens in attempt.ts)
const memoryContext = await buildMemoryContext({
  agentId,
  currentMessage: userMessage,
  maxTokens: 1500,
});

// Simulate base system prompt
const basePrompt = `You are a personal assistant running inside OpenClaw.

## Tooling
Tool availability (filtered by policy):
- read: Read file contents
- write: Create or overwrite files
- exec: Run shell commands
[... more tools ...]

## Skills (mandatory)
Before replying: scan <available_skills> <description> entries.
[... skills section ...]

## Memory Recall
Before answering anything about prior work, decisions, dates, people:
run memory_search on MEMORY.md + memory/*.md
[... memory recall section ...]`;

// This is where the magic happens - memory context is injected
const finalPrompt =
  basePrompt +
  "\n\n" +
  memoryContext +
  "\n\n" +
  `## Runtime
Runtime: agent=main | host=MacBook Pro | model=claude-sonnet-4-5
[... runtime section ...]`;

console.log("FINAL SYSTEM PROMPT:");
console.log("─".repeat(80));
console.log(finalPrompt);
console.log("─".repeat(80));
console.log("");

// Calculate token savings
const baseTokens = Math.ceil(basePrompt.length / 4); // rough estimate
const memoryTokens = Math.ceil(memoryContext.length / 4);
const naiveContextTokens = 5000; // what it would be without semantic search

console.log("📊 TOKEN ANALYSIS:");
console.log(`   Base prompt: ~${baseTokens} tokens`);
console.log(`   Memory context: ~${memoryTokens} tokens`);
console.log(`   Total: ~${baseTokens + memoryTokens} tokens`);
console.log("");
console.log("   VS Naive approach:");
console.log(`   Base + Full workspace: ~${baseTokens + naiveContextTokens} tokens`);
console.log("");
console.log(
  `   💰 SAVINGS: ${naiveContextTokens - memoryTokens} tokens (${Math.round((1 - memoryTokens / naiveContextTokens) * 100)}%)`,
);
console.log("");
console.log("🚀 This is what the LLM receives in production!");

process.exit(0);
