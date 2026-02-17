-- Fix decay_retention_scores function (agent_id ambiguity)

DROP FUNCTION IF EXISTS decay_retention_scores();

CREATE OR REPLACE FUNCTION decay_retention_scores() 
RETURNS TABLE (
  agent_id_out TEXT,
  memories_decayed INTEGER,
  memories_archived INTEGER
) AS $$
BEGIN
  -- First, decay all memories
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
    AND retention_score > 0.0;
  
  -- Return decay stats
  RETURN QUERY
  WITH decay_stats AS (
    SELECT 
      m.agent_id AS aid,
      COUNT(*) AS decayed
    FROM agent_memory m
    WHERE m.updated_at < NOW() - INTERVAL '1 day'
    GROUP BY m.agent_id
  ),
  archive_stats AS (
    DELETE FROM agent_memory
    WHERE retention_score < 0.1
      AND importance < 3
      AND created_at < NOW() - INTERVAL '90 days'
      AND memory_type != 'mistake'
    RETURNING agent_memory.agent_id AS aid
  ),
  archive_counts AS (
    SELECT 
      aid,
      COUNT(*) AS archived
    FROM archive_stats
    GROUP BY aid
  )
  SELECT 
    COALESCE(d.aid, a.aid) AS agent_id_out,
    COALESCE(d.decayed, 0)::INTEGER AS memories_decayed,
    COALESCE(a.archived, 0)::INTEGER AS memories_archived
  FROM decay_stats d
  FULL OUTER JOIN archive_counts a ON d.aid = a.aid;
END;
$$ LANGUAGE plpgsql;

SELECT 'Function decay_retention_scores fixed (ambiguity resolved)!' AS result;
