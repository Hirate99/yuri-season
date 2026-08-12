ALTER TABLE update_jobs ADD COLUMN lease_owner TEXT;
ALTER TABLE update_jobs ADD COLUMN lease_token_hash TEXT;
ALTER TABLE update_jobs ADD COLUMN last_heartbeat_at TEXT;
ALTER TABLE update_jobs ADD COLUMN completion_key TEXT;
ALTER TABLE update_jobs ADD COLUMN result_json TEXT;

CREATE INDEX idx_jobs_local_lease
  ON update_jobs(execution_target, status, lease_until, priority DESC);

CREATE INDEX idx_jobs_completion_key
  ON update_jobs(id, completion_key);
