-- ============================================================================
-- COREX: Job Queue Schema Migration
-- Description: Database tables and functions for the job queue system
-- 
-- This migration creates:
-- 1. jobs table - Main job storage
-- 2. job_unique_keys table - For job deduplication
-- 3. pop_job function - Atomic job reservation with FOR UPDATE SKIP LOCKED
-- 4. cleanup_old_jobs function - Maintenance function
-- 5. Indexes for performance
-- ============================================================================

-- ============================================================================
-- JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job identification
  name VARCHAR(255) NOT NULL,
  
  -- Job data
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Queue configuration
  queue VARCHAR(100) NOT NULL DEFAULT 'default',
  priority INTEGER NOT NULL DEFAULT 10,
  
  -- Attempt tracking
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reserved_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Error information
  error TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Add comments
COMMENT ON TABLE jobs IS 'Background job queue for async processing';
COMMENT ON COLUMN jobs.name IS 'Job type identifier (e.g., email:send)';
COMMENT ON COLUMN jobs.payload IS 'JSON payload passed to job handler';
COMMENT ON COLUMN jobs.queue IS 'Queue name for job routing';
COMMENT ON COLUMN jobs.priority IS 'Higher number = higher priority';
COMMENT ON COLUMN jobs.available_at IS 'When job becomes available for processing';
COMMENT ON COLUMN jobs.reserved_at IS 'When job was reserved by a worker';

-- ============================================================================
-- UNIQUE KEYS TABLE (for job deduplication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_unique_keys (
  key VARCHAR(255) PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE job_unique_keys IS 'Tracks unique keys to prevent duplicate job dispatching';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fetching available jobs (used by pop_job)
CREATE INDEX IF NOT EXISTS idx_jobs_queue_available ON jobs (
  queue,
  priority DESC,
  available_at
) WHERE completed_at IS NULL AND failed_at IS NULL AND reserved_at IS NULL;

-- Index for finding jobs by status
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (
  queue,
  CASE 
    WHEN completed_at IS NOT NULL THEN 'completed'
    WHEN failed_at IS NOT NULL THEN 'failed'
    WHEN reserved_at IS NOT NULL THEN 'processing'
    ELSE 'pending'
  END
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_jobs_cleanup ON jobs (completed_at, failed_at);

-- Index for unique key expiration
CREATE INDEX IF NOT EXISTS idx_job_unique_keys_expires ON job_unique_keys (expires_at);

-- ============================================================================
-- POP JOB FUNCTION
-- Atomically reserves the next available job using FOR UPDATE SKIP LOCKED
-- ============================================================================

CREATE OR REPLACE FUNCTION pop_job(p_queue VARCHAR(100))
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  payload JSONB,
  queue VARCHAR(100),
  priority INTEGER,
  attempts INTEGER,
  max_attempts INTEGER,
  created_at TIMESTAMPTZ,
  available_at TIMESTAMPTZ,
  reserved_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Find and lock the next available job
  SELECT j.id INTO v_job_id
  FROM jobs j
  WHERE j.queue = p_queue
    AND j.available_at <= NOW()
    AND j.reserved_at IS NULL
    AND j.completed_at IS NULL
    AND j.failed_at IS NULL
  ORDER BY j.priority DESC, j.available_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If no job found, return empty
  IF v_job_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Reserve the job
  UPDATE jobs j
  SET 
    reserved_at = NOW(),
    attempts = j.attempts + 1
  WHERE j.id = v_job_id;
  
  -- Return the reserved job
  RETURN QUERY
  SELECT 
    j.id,
    j.name,
    j.payload,
    j.queue,
    j.priority,
    j.attempts,
    j.max_attempts,
    j.created_at,
    j.available_at,
    j.reserved_at,
    j.failed_at,
    j.completed_at,
    j.error,
    j.metadata
  FROM jobs j
  WHERE j.id = v_job_id;
END;
$$;

COMMENT ON FUNCTION pop_job IS 'Atomically reserves and returns the next available job from a queue';

-- ============================================================================
-- CLEANUP FUNCTION
-- Removes old completed/failed jobs to prevent table bloat
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_jobs(
  p_completed_days INTEGER DEFAULT 7,
  p_failed_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  deleted_completed BIGINT,
  deleted_failed BIGINT,
  deleted_unique_keys BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_completed BIGINT;
  v_deleted_failed BIGINT;
  v_deleted_unique_keys BIGINT;
BEGIN
  -- Delete old completed jobs
  WITH deleted AS (
    DELETE FROM jobs
    WHERE completed_at IS NOT NULL
      AND completed_at < NOW() - (p_completed_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_completed FROM deleted;
  
  -- Delete old failed jobs
  WITH deleted AS (
    DELETE FROM jobs
    WHERE failed_at IS NOT NULL
      AND failed_at < NOW() - (p_failed_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_failed FROM deleted;
  
  -- Delete expired unique keys
  WITH deleted AS (
    DELETE FROM job_unique_keys
    WHERE expires_at < NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_unique_keys FROM deleted;
  
  -- Return results
  deleted_completed := v_deleted_completed;
  deleted_failed := v_deleted_failed;
  deleted_unique_keys := v_deleted_unique_keys;
  
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION cleanup_old_jobs IS 'Removes old completed and failed jobs to prevent table bloat';

-- ============================================================================
-- ROW LEVEL SECURITY (if using Supabase)
-- ============================================================================

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_unique_keys ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY jobs_service_policy ON jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY job_unique_keys_service_policy ON job_unique_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- NOTIFY TRIGGER (optional - for real-time job notifications)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_job_created()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'job_created',
    json_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'queue', NEW.queue,
      'priority', NEW.priority
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER job_created_trigger
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_job_created();

COMMENT ON TRIGGER job_created_trigger ON jobs IS 'Notifies listeners when a new job is created';
