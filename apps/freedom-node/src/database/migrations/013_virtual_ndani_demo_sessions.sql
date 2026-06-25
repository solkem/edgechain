CREATE TABLE IF NOT EXISTS virtual_ndani_demo_sessions (
  demo_session_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  started_by UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'complete'
    CHECK (status IN ('complete', 'expired', 'deleted')),
  demo_version TEXT NOT NULL,
  disclaimer_version TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_demo_sessions_expiry
  ON virtual_ndani_demo_sessions(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_demo_sessions_device
  ON virtual_ndani_demo_sessions(virtual_device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS virtual_ndani_demo_events (
  demo_event_id UUID PRIMARY KEY,
  demo_session_id UUID NOT NULL
    REFERENCES virtual_ndani_demo_sessions(demo_session_id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  stage TEXT NOT NULL,
  execution_kind TEXT NOT NULL DEFAULT 'simulated'
    CHECK (execution_kind = 'simulated'),
  status TEXT NOT NULL,
  synthetic_values_json TEXT NOT NULL DEFAULT '{}',
  explanation TEXT NOT NULL,
  offset_seconds INTEGER NOT NULL CHECK (offset_seconds >= 0),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (demo_session_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_demo_events_session
  ON virtual_ndani_demo_events(demo_session_id, sequence_number);
