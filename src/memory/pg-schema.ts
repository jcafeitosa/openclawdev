/**
 * PostgreSQL query helpers for the memory index backend.
 *
 * All functions are pure async helpers over postgres.js (PgSql).
 * They correspond 1-to-1 with SQLite operations in manager-sync-ops.ts
 * and manager-embedding-ops.ts, translated to pgvector + pg_trgm.
 */

import type { PgSql } from "./pg-client.js";
import type { MemorySource } from "./types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PgMemoryIndexMeta = {
  model: string;
  provider: string;
  providerKey?: string;
  chunkTokens: number;
  chunkOverlap: number;
  vectorDims?: number;
};

export type PgChunkSearchResult = {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  source: MemorySource;
  text: string;
  score: number;
  textScore?: number;
};

// ─── Meta ────────────────────────────────────────────────────────────────────

const META_KEY = "memory_index_meta_v1";

export async function pgReadMeta(sql: PgSql, agentId: string): Promise<PgMemoryIndexMeta | null> {
  const rows = await sql<{ value: string }[]>`
    SELECT value FROM memory_meta
    WHERE agent_id = ${agentId} AND key = ${META_KEY}
    LIMIT 1
  `;
  if (rows.length === 0) {
    return null;
  }
  try {
    return JSON.parse(rows[0].value) as PgMemoryIndexMeta;
  } catch {
    return null;
  }
}

export async function pgWriteMeta(
  sql: PgSql,
  agentId: string,
  meta: PgMemoryIndexMeta,
): Promise<void> {
  const value = JSON.stringify(meta);
  await sql`
    INSERT INTO memory_meta (agent_id, key, value)
    VALUES (${agentId}, ${META_KEY}, ${value})
    ON CONFLICT (agent_id, key) DO UPDATE SET value = EXCLUDED.value
  `;
}

// ─── Files ───────────────────────────────────────────────────────────────────

export async function pgGetFileHash(
  sql: PgSql,
  agentId: string,
  path: string,
): Promise<string | undefined> {
  const rows = await sql<{ hash: string }[]>`
    SELECT hash FROM memory_files
    WHERE agent_id = ${agentId} AND path = ${path}
    LIMIT 1
  `;
  return rows[0]?.hash;
}

export async function pgUpsertFile(
  sql: PgSql,
  agentId: string,
  file: { path: string; source: string; hash: string; mtime: number; size: number },
): Promise<void> {
  await sql`
    INSERT INTO memory_files (agent_id, path, source, hash, mtime, size)
    VALUES (${agentId}, ${file.path}, ${file.source}, ${file.hash}, ${file.mtime}, ${file.size})
    ON CONFLICT (agent_id, path) DO UPDATE SET
      source = EXCLUDED.source,
      hash   = EXCLUDED.hash,
      mtime  = EXCLUDED.mtime,
      size   = EXCLUDED.size
  `;
}

export async function pgDeleteStaleFiles(
  sql: PgSql,
  agentId: string,
  source: string,
  activePaths: Set<string>,
): Promise<void> {
  if (activePaths.size === 0) {
    // Delete all files for this source
    await sql`
      DELETE FROM memory_chunks WHERE agent_id = ${agentId} AND source = ${source}
    `;
    await sql`
      DELETE FROM memory_files WHERE agent_id = ${agentId} AND source = ${source}
    `;
    return;
  }
  const active = [...activePaths];
  // Delete chunks and files not in the active set
  await sql`
    DELETE FROM memory_chunks
    WHERE agent_id = ${agentId} AND source = ${source}
      AND path <> ALL(${sql.array(active)})
  `;
  await sql`
    DELETE FROM memory_files
    WHERE agent_id = ${agentId} AND source = ${source}
      AND path <> ALL(${sql.array(active)})
  `;
}

export async function pgCountFiles(
  sql: PgSql,
  agentId: string,
  sources: MemorySource[],
): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text as count FROM memory_files
    WHERE agent_id = ${agentId}
      AND source = ANY(${sql.array(sources as string[])})
  `;
  return Number(rows[0]?.count ?? 0);
}

// ─── Chunks ──────────────────────────────────────────────────────────────────

export async function pgUpsertChunk(
  sql: PgSql,
  agentId: string,
  chunk: {
    id: string;
    path: string;
    source: string;
    startLine: number;
    endLine: number;
    hash: string;
    model: string;
    text: string;
    embedding: number[];
    updatedAt: number;
  },
): Promise<void> {
  const embeddingStr = chunk.embedding.length > 0 ? `[${chunk.embedding.join(",")}]` : null;
  await sql`
    INSERT INTO memory_chunks (id, agent_id, path, source, start_line, end_line, hash, model, text, embedding, updated_at)
    VALUES (
      ${chunk.id}, ${agentId}, ${chunk.path}, ${chunk.source},
      ${chunk.startLine}, ${chunk.endLine}, ${chunk.hash}, ${chunk.model},
      ${chunk.text}, ${embeddingStr}::vector, ${chunk.updatedAt}
    )
    ON CONFLICT (id, agent_id) DO UPDATE SET
      path       = EXCLUDED.path,
      source     = EXCLUDED.source,
      start_line = EXCLUDED.start_line,
      end_line   = EXCLUDED.end_line,
      hash       = EXCLUDED.hash,
      model      = EXCLUDED.model,
      text       = EXCLUDED.text,
      embedding  = EXCLUDED.embedding,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function pgDeleteChunksByPath(
  sql: PgSql,
  agentId: string,
  path: string,
  source: string,
): Promise<void> {
  await sql`
    DELETE FROM memory_chunks
    WHERE agent_id = ${agentId} AND path = ${path} AND source = ${source}
  `;
}

export async function pgCountChunks(
  sql: PgSql,
  agentId: string,
  sources: MemorySource[],
): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text as count FROM memory_chunks
    WHERE agent_id = ${agentId}
      AND source = ANY(${sql.array(sources as string[])})
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function pgCountSourceBreakdown(
  sql: PgSql,
  agentId: string,
): Promise<Array<{ source: MemorySource; files: number; chunks: number }>> {
  const rows = await sql<
    {
      source: string;
      files: string;
      chunks: string;
    }[]
  >`
    SELECT
      c.source,
      COUNT(DISTINCT c.path)::text   AS chunks,
      COUNT(*)::text                 AS files
    FROM memory_chunks c
    WHERE c.agent_id = ${agentId}
    GROUP BY c.source
  `;
  return rows.map((r) => ({
    source: r.source as MemorySource,
    files: Number(r.files),
    chunks: Number(r.chunks),
  }));
}

// ─── Vector search (pgvector) ─────────────────────────────────────────────────

export async function pgSearchVector(
  sql: PgSql,
  agentId: string,
  params: {
    embedding: number[];
    model: string;
    sources: MemorySource[];
    limit: number;
  },
): Promise<PgChunkSearchResult[]> {
  if (params.embedding.length === 0) {
    return [];
  }
  const embeddingStr = `[${params.embedding.join(",")}]`;
  // cosine similarity: 1 - (embedding <=> query) where <=> is L2 distance for cosine-normalized vectors
  const rows = await sql<
    {
      id: string;
      path: string;
      start_line: number;
      end_line: number;
      source: string;
      text: string;
      score: number;
    }[]
  >`
    SELECT
      id,
      path,
      start_line,
      end_line,
      source,
      text,
      (1 - (embedding <=> ${embeddingStr}::vector))::float AS score
    FROM memory_chunks
    WHERE agent_id = ${agentId}
      AND model = ${params.model}
      AND source = ANY(${sql.array(params.sources as string[])})
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${params.limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    startLine: Number(r.start_line),
    endLine: Number(r.end_line),
    source: r.source as MemorySource,
    text: r.text,
    score: Number(r.score),
  }));
}

// ─── Full-text search (pg_trgm + tsvector) ────────────────────────────────────

export async function pgSearchFts(
  sql: PgSql,
  agentId: string,
  params: {
    query: string;
    model: string | undefined;
    sources: MemorySource[];
    limit: number;
  },
): Promise<PgChunkSearchResult[]> {
  if (!params.query.trim()) {
    return [];
  }

  // Build tsquery — fallback to trigram similarity if plainto_tsquery returns nothing
  const rows = await sql<
    {
      id: string;
      path: string;
      start_line: number;
      end_line: number;
      source: string;
      text: string;
      score: number;
    }[]
  >`
    SELECT
      id,
      path,
      start_line,
      end_line,
      source,
      text,
      ts_rank(to_tsvector('english', text), plainto_tsquery('english', ${params.query}))::float AS score
    FROM memory_chunks
    WHERE agent_id = ${agentId}
      AND source = ANY(${sql.array(params.sources as string[])})
      AND (
        to_tsvector('english', text) @@ plainto_tsquery('english', ${params.query})
        OR text ILIKE ${"%" + params.query.trim().split(/\s+/).slice(0, 3).join("%") + "%"}
      )
    ORDER BY score DESC
    LIMIT ${params.limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    startLine: Number(r.start_line),
    endLine: Number(r.end_line),
    source: r.source as MemorySource,
    text: r.text,
    score: Number(r.score),
    textScore: Number(r.score),
  }));
}

// ─── Embedding cache ──────────────────────────────────────────────────────────

export async function pgLoadEmbeddingCache(
  sql: PgSql,
  _agentId: string,
  params: {
    provider: string;
    model: string;
    providerKey: string | null;
    hashes: string[];
  },
): Promise<Map<string, number[]>> {
  if (params.hashes.length === 0) {
    return new Map();
  }
  const rows = await sql<{ hash: string; embedding: string }[]>`
    SELECT hash, embedding::text
    FROM memory_embedding_cache
    WHERE provider    = ${params.provider}
      AND model       = ${params.model}
      AND provider_key = ${params.providerKey ?? ""}
      AND hash = ANY(${sql.array(params.hashes)})
  `;
  const result = new Map<string, number[]>();
  for (const row of rows) {
    try {
      // Parse pgvector text format: [0.1,0.2,...] or (0.1,0.2,...)
      const cleaned = row.embedding.replace(/^\[|\]$|^\(|\)$/g, "");
      result.set(row.hash, cleaned.split(",").map(Number));
    } catch {
      // ignore malformed
    }
  }
  return result;
}

export async function pgUpsertEmbeddingCache(
  sql: PgSql,
  _agentId: string,
  params: {
    provider: string;
    model: string;
    providerKey: string | null;
    entries: Array<{ hash: string; embedding: number[] }>;
  },
): Promise<void> {
  const now = Date.now();
  const pk = params.providerKey ?? "";
  for (const entry of params.entries) {
    if (entry.embedding.length === 0) {
      continue;
    }
    const embStr = `[${entry.embedding.join(",")}]`;
    await sql`
      INSERT INTO memory_embedding_cache (provider, model, provider_key, hash, embedding, dims, updated_at)
      VALUES (
        ${params.provider}, ${params.model}, ${pk},
        ${entry.hash}, ${embStr}::vector, ${entry.embedding.length}, ${now}
      )
      ON CONFLICT (provider, model, provider_key, hash) DO UPDATE SET
        embedding  = EXCLUDED.embedding,
        dims       = EXCLUDED.dims,
        updated_at = EXCLUDED.updated_at
    `;
  }
}

export async function pgCountEmbeddingCache(
  sql: PgSql,
  _agentId: string,
  params: { provider: string; model: string; providerKey: string | null },
): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM memory_embedding_cache
    WHERE provider     = ${params.provider}
      AND model        = ${params.model}
      AND provider_key = ${params.providerKey ?? ""}
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function pgPruneEmbeddingCache(
  sql: PgSql,
  _agentId: string,
  params: {
    provider: string;
    model: string;
    providerKey: string | null;
    maxEntries: number;
  },
): Promise<void> {
  await sql`
    DELETE FROM memory_embedding_cache
    WHERE (provider, model, provider_key, hash) IN (
      SELECT provider, model, provider_key, hash
      FROM memory_embedding_cache
      WHERE provider     = ${params.provider}
        AND model        = ${params.model}
        AND provider_key = ${params.providerKey ?? ""}
      ORDER BY updated_at ASC
      LIMIT GREATEST(0, (
        SELECT COUNT(*) FROM memory_embedding_cache
        WHERE provider     = ${params.provider}
          AND model        = ${params.model}
          AND provider_key = ${params.providerKey ?? ""}
      ) - ${params.maxEntries})
    )
  `;
}

// ─── Bulk operations ──────────────────────────────────────────────────────────

export async function pgClearAll(sql: PgSql, agentId: string): Promise<void> {
  await sql`DELETE FROM memory_chunks WHERE agent_id = ${agentId}`;
  await sql`DELETE FROM memory_files  WHERE agent_id = ${agentId}`;
  await sql`DELETE FROM memory_meta   WHERE agent_id = ${agentId} AND key = ${META_KEY}`;
}
