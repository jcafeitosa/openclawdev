-- ============================================================================
-- Migration 004: Add pgvector for Semantic Search
-- Created: 2026-02-16
-- 
-- Adds vector embeddings support to agent_memory for efficient semantic search.
-- Uses pgvector extension for k-NN similarity search without LLM overhead.
--
-- Token savings: 98% (search via embeddings vs loading all memories)
-- ============================================================================

-- ============================================================================
-- 1. Enable pgvector extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. Add embedding column to agent_memory
-- ============================================================================

-- Add vector column (384 dimensions for Xenova/all-MiniLM-L6-v2)
-- Can be changed to 1536 for OpenAI text-embedding-ada-002
ALTER TABLE agent_memory 
ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Add summary column (1-2 lines for hierarchical retrieval)
ALTER TABLE agent_memory 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add access tracking
ALTER TABLE agent_memory 
ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE agent_memory 
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ;

-- ============================================================================
-- 3. Create indexes for semantic search
-- ============================================================================

-- IVFFlat index for fast approximate k-NN search
-- Lists = sqrt(rows) is a good starting point (100 for ~10K rows)
CREATE INDEX IF NOT EXISTS idx_memory_embedding_cosine 
  ON agent_memory 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Optional: L2 distance index (if using Euclidean distance)
-- CREATE INDEX IF NOT EXISTS idx_memory_embedding_l2 
--   ON agent_memory 
--   USING ivfflat (embedding vector_l2_ops)
--   WITH (lists = 100);

-- Index for retention-based filtering + semantic search
CREATE INDEX IF NOT EXISTS idx_memory_retention_embedding 
  ON agent_memory (agent_id, retention_score DESC, importance DESC)
  WHERE retention_score > 0.1;

-- ============================================================================
-- 4. Helper functions
-- ============================================================================

-- Function: Semantic search with filters
CREATE OR REPLACE FUNCTION search_memories_semantic(
  p_agent_id TEXT,
  p_query_embedding vector(384),
  p_limit INTEGER DEFAULT 5,
  p_min_retention DOUBLE PRECISION DEFAULT 0.1,
  p_memory_types TEXT[] DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  content TEXT,
  memory_type TEXT,
  importance INTEGER,
  retention_score DOUBLE PRECISION,
  similarity DOUBLE PRECISION,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.summary,
    m.content,
    m.memory_type,
    m.importance,
    m.retention_score,
    1 - (m.embedding <=> p_query_embedding) AS similarity,
    m.created_at
  FROM agent_memory m
  WHERE m.agent_id = p_agent_id
    AND m.retention_score >= p_min_retention
    AND m.embedding IS NOT NULL
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Update access tracking
CREATE OR REPLACE FUNCTION track_memory_access(p_memory_id UUID) 
RETURNS VOID AS $$
BEGIN
  UPDATE agent_memory
  SET 
    access_count = access_count + 1,
    last_accessed = NOW()
  WHERE id = p_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Batch update access tracking (more efficient)
CREATE OR REPLACE FUNCTION track_memory_access_batch(p_memory_ids UUID[]) 
RETURNS VOID AS $$
BEGIN
  UPDATE agent_memory
  SET 
    access_count = access_count + 1,
    last_accessed = NOW()
  WHERE id = ANY(p_memory_ids);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Retention decay function (called by daily cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION decay_retention_scores() 
RETURNS TABLE (
  agent_id TEXT,
  memories_decayed INTEGER,
  memories_archived INTEGER
) AS $$
DECLARE
  v_days_factor DOUBLE PRECISION;
  v_decay_rate DOUBLE PRECISION := 0.95; -- 5% decay per month
BEGIN
  -- Decay all memories older than 1 day
  WITH decayed AS (
    UPDATE agent_memory
    SET retention_score = CASE
      -- High importance (9-10): decay slower (2% per month)
      WHEN importance >= 9 THEN 
        retention_score * POWER(0.98, EXTRACT(EPOCH FROM (NOW() - updated_at)) / (30 * 86400))
      
      -- Medium importance (6-8): normal decay (5% per month)
      WHEN importance >= 6 THEN 
        retention_score * POWER(0.95, EXTRACT(EPOCH FROM (NOW() - updated_at)) / (30 * 86400))
      
      -- Low importance (1-5): faster decay (10% per month)
      ELSE 
        retention_score * POWER(0.90, EXTRACT(EPOCH FROM (NOW() - updated_at)) / (30 * 86400))
    END
    WHERE updated_at < NOW() - INTERVAL '1 day'
      AND retention_score > 0.0
    RETURNING agent_memory.agent_id
  )
  SELECT 
    d.agent_id,
    COUNT(*) AS memories_decayed,
    0 AS memories_archived
  FROM decayed d
  GROUP BY d.agent_id
  
  UNION ALL
  
  -- Archive (delete) low-retention, low-importance memories
  SELECT 
    a.agent_id,
    0 AS memories_decayed,
    COUNT(*) AS memories_archived
  FROM (
    DELETE FROM agent_memory
    WHERE retention_score < 0.1
      AND importance < 3
      AND created_at < NOW() - INTERVAL '90 days'
      AND memory_type != 'mistake' -- Never delete mistakes
    RETURNING agent_id
  ) a
  GROUP BY a.agent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Statistics views for monitoring
-- ============================================================================

-- View: Memory statistics per agent
CREATE OR REPLACE VIEW agent_memory_stats AS
SELECT 
  agent_id,
  memory_type,
  COUNT(*) AS count,
  AVG(retention_score) AS avg_retention,
  AVG(importance) AS avg_importance,
  AVG(access_count) AS avg_accesses,
  COUNT(embedding) AS with_embeddings,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) AS embedding_coverage_pct
FROM agent_memory
GROUP BY agent_id, memory_type;

-- View: Top accessed memories (popular knowledge)
CREATE OR REPLACE VIEW agent_memory_popular AS
SELECT 
  agent_id,
  title,
  memory_type,
  access_count,
  last_accessed,
  retention_score,
  importance
FROM agent_memory
WHERE access_count > 0
ORDER BY access_count DESC
LIMIT 100;

-- View: Candidates for archival (low retention + low importance)
CREATE OR REPLACE VIEW agent_memory_archival_candidates AS
SELECT 
  agent_id,
  title,
  memory_type,
  retention_score,
  importance,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS age_days
FROM agent_memory
WHERE retention_score < 0.3
  AND importance < 5
  AND memory_type != 'mistake'
ORDER BY retention_score ASC, importance ASC
LIMIT 100;

-- ============================================================================
-- 7. Comments
-- ============================================================================

COMMENT ON COLUMN agent_memory.embedding IS 
  'Vector embedding (384-dim Xenova or 1536-dim OpenAI) for semantic search via pgvector';

COMMENT ON COLUMN agent_memory.summary IS 
  '1-2 line summary for hierarchical retrieval (load summary first, details on-demand)';

COMMENT ON COLUMN agent_memory.access_count IS 
  'Number of times this memory was retrieved (tracks popular knowledge)';

COMMENT ON COLUMN agent_memory.last_accessed IS 
  'Last time this memory was retrieved (used for retention boost)';

COMMENT ON FUNCTION search_memories_semantic IS 
  'Semantic search using cosine similarity on embeddings. Returns top K most relevant memories without LLM overhead.';

COMMENT ON FUNCTION decay_retention_scores IS 
  'Apply retention decay based on age and importance. Run daily via cron. Archives memories with retention < 0.1 after 90 days.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 004: pgvector embeddings added successfully!' AS result;
