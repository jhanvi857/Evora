CREATE TABLE IF NOT EXISTS jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   TEXT UNIQUE NOT NULL,
  queue             TEXT NOT NULL DEFAULT 'default',
  priority          INT NOT NULL DEFAULT 5,
  payload           JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count     INT NOT NULL DEFAULT 0,
  max_attempts      INT NOT NULL DEFAULT 3,
  worker_id         TEXT,
  locked_until      TIMESTAMPTZ,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_poll 
  ON jobs (queue, priority ASC, scheduled_at ASC) 
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_jobs_expired_locks 
  ON jobs (locked_until) 
  WHERE status = 'RUNNING';

CREATE TABLE IF NOT EXISTS job_events (
  id           BIGSERIAL PRIMARY KEY,
  job_id       UUID NOT NULL,
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
