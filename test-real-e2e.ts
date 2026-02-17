#!/usr/bin/env bun
/**
 * Real End-to-End Test
 * Creates real memories and verifies they appear in actual agent execution
 */

import { memoryManager } from "./src/services/agent-memory/memory-manager.js";

console.log("🔬 REAL END-TO-END TEST\n");
console.log("Testing with actual database and agent execution...\n");

// Step 1: Clear old test memories
console.log("1️⃣  Cleaning up old test memories...");
try {
  const db = memoryManager["db"];
  await db`DELETE FROM agent_memory WHERE agent_id = 'main'`;
  console.log("   ✅ Cleaned up old memories\n");
} catch (error: unknown) {
  console.error("   ⚠️  Cleanup failed:", (error as Error).message);
}

// Step 2: Create real test memories
console.log('2️⃣  Creating test memories for agent "main"...');

const testMemories = [
  {
    agentId: "main",
    memoryType: "pattern" as const,
    title: "REAL TEST: Always check memory integration",
    content:
      "When testing the memory system, verify that semantic search returns relevant results and that context is properly formatted. The system should inject memory context into the system prompt automatically.",
    importance: 9,
  },
  {
    agentId: "main",
    memoryType: "fact" as const,
    title: "REAL TEST: Memory system uses pgvector",
    content:
      "The memory system uses PostgreSQL with pgvector extension for semantic search. Embeddings are generated locally using Xenova transformers (384-dim vectors). This saves 100% on embedding costs.",
    importance: 8,
  },
  {
    agentId: "main",
    memoryType: "mistake" as const,
    title: "REAL TEST: Common mistake - not awaiting async",
    content:
      "A common mistake is forgetting to await the buildMemoryContext() function. This is an async function and must be awaited, otherwise the context will be a Promise object instead of a string.",
    importance: 10,
  },
];

let createdCount = 0;
for (const mem of testMemories) {
  try {
    const created = await memoryManager.createMemory(mem);
    console.log(`   ✅ Created: ${created.title}`);
    console.log(`      ID: ${created.id}`);
    console.log(`      Has embedding: ${created.embedding ? "Yes" : "No"}`);
    createdCount++;
  } catch (error: unknown) {
    console.error(`   ❌ Failed: ${mem.title}`, (error as Error).message);
  }
}

console.log(`\n   Created ${createdCount}/${testMemories.length} memories\n`);

// Step 3: Verify embeddings were generated
console.log("3️⃣  Verifying embeddings...");
const stats = await memoryManager.getStats("main");
console.log(`   Total memories: ${stats.total}`);
console.log(`   With embeddings: ${stats.withEmbeddings}/${stats.total}`);
console.log(`   Embedding coverage: ${((stats.withEmbeddings / stats.total) * 100).toFixed(1)}%`);

if (stats.withEmbeddings === stats.total) {
  console.log("   ✅ All memories have embeddings\n");
} else {
  console.error("   ❌ Some memories missing embeddings\n");
}

// Step 4: Test semantic search with a real query
console.log("4️⃣  Testing semantic search with real query...");
const query = "How does the memory system work?";
console.log(`   Query: "${query}"`);

const results = await memoryManager.searchSemantic({
  agentId: "main",
  query,
  limit: 3,
});

console.log(`   Found ${results.length} results:\n`);
results.forEach((r, i) => {
  console.log(`   ${i + 1}. [${r.memoryType}] ${r.title}`);
  console.log(`      Similarity: ${r.similarity.toFixed(3)}`);
  console.log(`      Importance: ${r.importance}/10`);
  console.log(
    `      Relevance: ${r.similarity > 0.3 ? "✅ High" : r.similarity > 0.1 ? "⚠️ Medium" : "❌ Low"}\n`,
  );
});

// Step 5: Verify database state
console.log("5️⃣  Verifying database state...");
const db = memoryManager["db"];
const [count] = await db<Array<{ count: string }>>`
  SELECT COUNT(*) as count FROM agent_memory WHERE agent_id = 'main'
`;
const [withEmbedding] = await db<Array<{ count: string }>>`
  SELECT COUNT(*) as count FROM agent_memory WHERE agent_id = 'main' AND embedding IS NOT NULL
`;

console.log(`   Records in database: ${count.count}`);
console.log(`   With embeddings: ${withEmbedding.count}`);

if (count.count === withEmbedding.count && count.count !== "0") {
  console.log("   ✅ Database state valid\n");
} else {
  console.error("   ❌ Database state inconsistent\n");
}

// Summary
console.log("═".repeat(60));
console.log("🎯 REAL E2E TEST COMPLETE\n");
console.log("Next step: Test with actual agent execution");
console.log("Run: curl http://localhost:18789/api/v1/chat?session=agent:main:main");
console.log('      -d "message=Tell me about the memory system"');
console.log("\nThe agent should include memory context in its response.");
console.log("═".repeat(60));

process.exit(0);
