CREATE TABLE IF NOT EXISTS virtual_ndani_batches (
  batch_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  status TEXT NOT NULL
    CHECK (status IN (
      'open', 'quality_checked', 'ready_for_pipeline',
      'privacy_demo_complete', 'proof_pending', 'proof_verified',
      'model_ready', 'excluded', 'archived'
    )),
  execution_kind TEXT NOT NULL DEFAULT 'real'
    CHECK (execution_kind IN ('real', 'simulated', 'pending', 'not_applicable')),
  reading_count INTEGER NOT NULL DEFAULT 0 CHECK (reading_count >= 0),
  eligible_feature_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_feature_count >= 0),
  excluded_feature_count INTEGER NOT NULL DEFAULT 0 CHECK (excluded_feature_count >= 0),
  quality_summary_json TEXT NOT NULL DEFAULT '{}',
  policy_version TEXT NOT NULL DEFAULT 'virtual-ndani-contribution-v1',
  opened_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  closed_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_batches_device
  ON virtual_ndani_batches(virtual_device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS virtual_ndani_batch_readings (
  batch_id UUID NOT NULL REFERENCES virtual_ndani_batches(batch_id) ON DELETE CASCADE,
  reading_id UUID NOT NULL UNIQUE REFERENCES virtual_ndani_readings(reading_id) ON DELETE CASCADE,
  inclusion_status TEXT NOT NULL
    CHECK (inclusion_status IN ('included', 'excluded', 'pending_review')),
  exclusion_reason TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  PRIMARY KEY (batch_id, reading_id)
);

CREATE TABLE IF NOT EXISTS virtual_ndani_feature_decisions (
  feature_decision_id UUID PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES virtual_ndani_batches(batch_id) ON DELETE CASCADE,
  reading_id UUID NOT NULL REFERENCES virtual_ndani_readings(reading_id) ON DELETE CASCADE,
  reading_field_id UUID NOT NULL
    REFERENCES virtual_ndani_reading_fields(reading_field_id) ON DELETE CASCADE,
  channel_key TEXT NOT NULL,
  feature_key TEXT,
  source_class TEXT,
  measurement_kind TEXT NOT NULL,
  confidence DOUBLE PRECISION,
  decision TEXT NOT NULL CHECK (decision IN ('eligible', 'excluded')),
  reason TEXT NOT NULL,
  transformation_version TEXT,
  training_run_id TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (batch_id, reading_field_id)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_feature_decisions_batch
  ON virtual_ndani_feature_decisions(batch_id, decision);

ALTER TABLE virtual_ndani_pipeline_events
  ADD COLUMN IF NOT EXISTS reading_id UUID
    REFERENCES virtual_ndani_readings(reading_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id UUID
    REFERENCES virtual_ndani_batches(batch_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_events_reading
  ON virtual_ndani_pipeline_events(reading_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_events_batch
  ON virtual_ndani_pipeline_events(batch_id, created_at DESC);
