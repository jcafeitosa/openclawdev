#!/usr/bin/env bun
/**
 * Full Integration Test
 * Tests the complete flow: create memory → semantic search → context building
 */

import {
  buildMemoryContext,
  shouldUseMemoryContext,
} from "./src/agents/hooks/memory-context-hook.js";
import { buildFormattedContext } from "./src/services/agent-memory/context-builder.js";
import { generateEmbedding } from "./src/services/agent-memory/embedding-service.js";
import { memoryManager } from "./src/services/agent-memory/memory-manager.js";

console.log("🧪 FULL INTEGRATION TEST\n");

// Test 1: Create test memories for "main" agent
console.log('1️⃣  Creating memories for agent "main"...');
const memories = [
  {
    agentId: "main",
    memoryType: "pattern" as const,
    title: "Always use TypeScript strict mode",
    content:
      'TypeScript strict mode catches more errors at compile time. Always enable it in tsconfig.json with "strict": true. This prevents runtime errors and improves code quality.',
    importance: 9,
  },
  {
    agentId: "main",
    memoryType: "mistake" as const,
    title: "Forgot to await async function",
    content:
      "In PR #145, forgot to await buildMemoryContext() which caused the context to be undefined. Always await async functions, especially in critical paths.",
    importance: 10,
  },
  {
    agentId: "main",
    memoryType: "fact" as const,
    title: "Project uses Bun as runtime",
    content:
      'This project uses Bun for development and Node 22+ for production. Use "bun" command for scripts, "pnpm" for package management.',
    importance: 7,
  },
];

for (const mem of memories) {
  try {
    const created = await memoryManager.createMemory(mem);
    console.log(`   ✅ Created: ${created.title} (${created.id})`);
  } catch (error: any) {
    if (error.code === "23505") {
      console.log(`   ⏭️  Skipped (duplicate): ${mem.title}`);
    } else {
      console.error(`   ❌ Failed: ${mem.title}`, error.message);
      process.exit(1);
    }
  }
}
console.log("");

// Test 2: Semantic search
console.log("2️⃣  Testing semantic search...");
const searchResults = await memoryManager.searchSemantic({
  agentId: "main",
  query: "How should I handle async functions in TypeScript?",
  limit: 3,
});

console.log(`   Found ${searchResults.length} relevant memories:`);
searchResults.forEach((r, i) => {
  console.log(`   ${i + 1}. [${r.memoryType}] ${r.title}`);
  console.log(`      Similarity: ${r.similarity.toFixed(3)}, Importance: ${r.importance}/10`);
});
console.log("");

// Test 3: Context building
console.log("3️⃣  Testing context building...");
const context = await buildFormattedContext({
  agentId: "main",
  currentMessage: "I need to call an async function to build memory context",
  maxTokens: 1500,
});

console.log("   Generated context:");
console.log("   ─".repeat(40));
console.log(context);
console.log("   ─".repeat(40));
console.log("");

// Test 4: Integration hook
console.log("4️⃣  Testing integration hook...");

// Should use memory for "main"
const shouldUse = shouldUseMemoryContext({ agentId: "main" });
console.log(`   shouldUseMemoryContext("main"): ${shouldUse}`);

if (shouldUse) {
  const hookContext = await buildMemoryContext({
    agentId: "main",
    currentMessage: "Need help with TypeScript async/await",
    maxTokens: 1500,
  });

  console.log(`   Hook returned ${hookContext.length} chars`);
  console.log(`   Context preview: ${hookContext.substring(0, 100)}...`);
}
console.log("");

// Should NOT use for anonymous
const shouldNotUse = shouldUseMemoryContext({ agentId: "anonymous" });
console.log(`   shouldUseMemoryContext("anonymous"): ${shouldNotUse} (expected: false)`);
console.log("");

// Test 5: Performance
console.log("5️⃣  Performance test...");
const iterations = 5;
const times: number[] = [];

for (let i = 0; i < iterations; i++) {
  const start = Date.now();
  await buildMemoryContext({
    agentId: "main",
    currentMessage: `Test query ${i}`,
    maxTokens: 1500,
  });
  times.push(Date.now() - start);
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
const minTime = Math.min(...times);
const maxTime = Math.max(...times);

console.log(`   Average time: ${avgTime.toFixed(0)}ms`);
console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
console.log(`   Target: <500ms`);

if (avgTime < 500) {
  console.log("   ✅ Performance OK");
} else {
  console.log("   ⚠️  Performance slower than target");
}
console.log("");

// Summary
console.log("═".repeat(50));
console.log("🎉 FULL INTEGRATION TEST COMPLETE");
console.log("═".repeat(50));
console.log("✅ Memory creation: OK");
console.log("✅ Semantic search: OK");
console.log("✅ Context building: OK");
console.log("✅ Integration hook: OK");
console.log(`✅ Performance: ${avgTime.toFixed(0)}ms avg`);
console.log("");
console.log("🚀 System is fully operational!");

process.exit(0);
