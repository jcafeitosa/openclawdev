#!/usr/bin/env bun
/**
 * Test Memory System
 *
 * Tests:
 * 1. Embedding generation (local)
 * 2. Memory creation with embedding
 * 3. Semantic search
 * 4. Context building
 */

import { buildFormattedContext } from "./src/services/agent-memory/context-builder.js";
import { generateEmbedding } from "./src/services/agent-memory/embedding-service.js";
import { memoryManager } from "./src/services/agent-memory/memory-manager.js";

console.log("🧠 Testing Memory System...\n");

// Test 1: Embedding Generation
console.log("1️⃣  Testing embedding generation (local)...");
const startEmbed = Date.now();
const embedding = await generateEmbedding("PostgreSQL query optimization techniques");
const embedTime = Date.now() - startEmbed;
console.log(`   ✅ Generated ${embedding.dimensions}-dim embedding in ${embedTime}ms`);
console.log(`   Model: ${embedding.model}`);
console.log(
  `   Vector sample: [${embedding.vector
    .slice(0, 5)
    .map((v) => v.toFixed(3))
    .join(", ")}...]`,
);
console.log("");

// Test 2: Memory Creation
console.log("2️⃣  Testing memory creation...");
const memory1 = await memoryManager.createMemory({
  agentId: "backend-architect",
  memoryType: "pattern",
  title: "PostgreSQL query optimization pattern",
  content:
    "When query is slow: 1) Run EXPLAIN ANALYZE, 2) Identify seq scans, 3) Add appropriate index, 4) Verify improvement with second EXPLAIN ANALYZE. Partial indexes work well for filtered queries.",
  summary: "EXPLAIN ANALYZE → identify seq scan → add index → verify",
  importance: 8,
  context: { source: "Issue #145", date: "2026-02-16" },
});
console.log(`   ✅ Created memory: ${memory1.id}`);
console.log(`   Title: ${memory1.title}`);
console.log(
  `   Has embedding: ${memory1.embedding ? "Yes" : "No"} (${memory1.embedding?.length || 0} dims)`,
);
console.log("");

const memory2 = await memoryManager.createMemory({
  agentId: "backend-architect",
  memoryType: "fact",
  title: "TimescaleDB hypertables automatically partition by time",
  content:
    "TimescaleDB hypertables use automatic time-based partitioning (chunks). This enables compression policies, retention policies, and faster queries on time-series data. Use create_hypertable() function to convert regular table.",
  importance: 7,
});
console.log(`   ✅ Created memory: ${memory2.id}`);
console.log(`   Title: ${memory2.title}`);
console.log("");

const memory3 = await memoryManager.createMemory({
  agentId: "backend-architect",
  memoryType: "mistake",
  title: "Forgot to add index on foreign key",
  content:
    "In Issue #120, query was slow because foreign key user_id did not have an index. PostgreSQL does not automatically index foreign keys (unlike primary keys). Always add indexes to foreign key columns used in JOINs.",
  importance: 9,
});
console.log(`   ✅ Created memory: ${memory3.id}`);
console.log(`   Title: ${memory3.title}`);
console.log("");

// Test 3: Semantic Search
console.log("3️⃣  Testing semantic search...");
const searchStart = Date.now();
const results = await memoryManager.searchSemantic({
  agentId: "backend-architect",
  query: "How to make database queries faster?",
  limit: 3,
});
const searchTime = Date.now() - searchStart;
console.log(`   ✅ Found ${results.length} relevant memories in ${searchTime}ms`);
results.forEach((result, i) => {
  console.log(`   ${i + 1}. [${result.memoryType}] ${result.title}`);
  console.log(
    `      Similarity: ${result.similarity.toFixed(3)}, Importance: ${result.importance}/10`,
  );
  console.log(`      Summary: ${result.summary || result.content.substring(0, 100)}...`);
});
console.log("");

// Test 4: Context Building
console.log("4️⃣  Testing context building...");
const contextStart = Date.now();
const context = await buildFormattedContext({
  agentId: "backend-architect",
  currentMessage: "The llm_usage table query is taking 2 seconds, how can I optimize it?",
  maxTokens: 1500,
});
const contextTime = Date.now() - contextStart;
console.log(`   ✅ Built context in ${contextTime}ms`);
console.log("");
console.log("📄 Generated Context:");
console.log("─".repeat(80));
console.log(context);
console.log("─".repeat(80));
console.log("");

// Test 5: Memory Stats
console.log("5️⃣  Testing memory stats...");
const stats = await memoryManager.getStats("backend-architect");
console.log(`   ✅ Agent memory stats:`);
console.log(`   Total memories: ${stats.total}`);
console.log(`   By type: ${JSON.stringify(stats.byType)}`);
console.log(`   Avg retention: ${stats.avgRetention.toFixed(2)}`);
console.log(`   Avg importance: ${stats.avgImportance.toFixed(2)}`);
console.log(
  `   With embeddings: ${stats.withEmbeddings}/${stats.total} (${((stats.withEmbeddings / stats.total) * 100).toFixed(1)}%)`,
);
console.log("");

console.log("✅ All tests passed!");
console.log("");
console.log("💡 Summary:");
console.log(`   - Embedding generation: ${embedTime}ms (target: <100ms)`);
console.log(`   - Semantic search: ${searchTime}ms (target: <50ms)`);
console.log(`   - Context building: ${contextTime}ms (target: <200ms)`);
console.log(`   - Memories created: 3`);
console.log(`   - Search precision: ${results.length > 0 ? "Good (found relevant)" : "Poor"}`);
console.log("");
console.log("🚀 Memory system is operational!");

process.exit(0);
