-- Migration 004: Memory Index tables for PostgreSQL + pgvector backend
-- Replaces the SQLite-based memory index with PostgreSQL tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Meta table (replaces SQLite meta)
CREATE TABLE IF NOT EXISTS memory_meta (
  agent_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (agent_id, key)
);

-- Files table (replaces SQLite files)
CREATE TABLE IF NOT EXISTS memory_files (
  agent_id TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'memory',
  hash TEXT NOT NULL,
  mtime BIGINT NOT NULL,
  size BIGINT NOT NULL,
  PRIMARY KEY (agent_id, path)
);

-- Chunks table with pgvector (replaces SQLite chunks + chunks_vec)
CREATE TABLE IF NOT EXISTS memory_chunks (
  id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'memory',
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  hash TEXT NOT NULL,
  model TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding vector(1024),
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_path ON memory_chunks(agent_id, path);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_model ON memory_chunks(agent_id, model);

-- Full-text search indexes with pg_trgm (replaces SQLite FTS5)
CREATE INDEX IF NOT EXISTS idx_memory_chunks_text_trgm ON memory_chunks USING gin(text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_text_fts ON memory_chunks USING gin(to_tsvector('english', text));

-- Embedding cache (replaces SQLite embedding_cache)
CREATE TABLE IF NOT EXISTS memory_embedding_cache (
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  hash TEXT NOT NULL,
  embedding vector(1024),
  dims INTEGER,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (provider, model, provider_key, hash)
);

CREATE INDEX IF NOT EXISTS idx_memory_embedding_cache_updated_at ON memory_embedding_cache(updated_at);
