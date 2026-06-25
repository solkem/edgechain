CREATE TABLE IF NOT EXISTS virtual_ndani_readings (
  reading_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL UNIQUE
    REFERENCES virtual_ndani_cycles(cycle_id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES agent_conversations(conversation_id) ON DELETE SET NULL,
  collection_mode TEXT NOT NULL
    CHECK (collection_mode IN (
      'manual_guided',
      'manual_agent',
      'coordinator_assisted',
      'external_context',
      'physical_auto'
    )),
  observed_at BIGINT NOT NULL,
  recorded_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  confirmed_at BIGINT,
  quality_status TEXT NOT NULL DEFAULT 'awaiting_confirmation'
    CHECK (quality_status IN (
      'awaiting_confirmation',
      'accepted',
      'flagged',
      'cancelled'
    )),
  risk_flags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  schema_version TEXT NOT NULL DEFAULT 'virtual-ndani-reading-v1',
  policy_version TEXT NOT NULL DEFAULT 'human-assisted-pilot-v1',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_readings_device
  ON virtual_ndani_readings(virtual_device_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS virtual_ndani_reading_fields (
  reading_field_id UUID PRIMARY KEY,
  reading_id UUID NOT NULL
    REFERENCES virtual_ndani_readings(reading_id) ON DELETE CASCADE,
  channel_key TEXT NOT NULL,
  value_json TEXT,
  unit TEXT,
  measurement_kind TEXT NOT NULL
    CHECK (measurement_kind IN ('measured', 'observed', 'derived', 'unavailable')),
  source_class TEXT
    CHECK (source_class IS NULL OR source_class IN (
      'physical_sensor',
      'manual_proxy',
      'external_context',
      'derived'
    )),
  source_reference TEXT,
  confidence DOUBLE PRECISION
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  evidence TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'accepted', 'needs_followup')),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (reading_id, channel_key),
  CHECK (
    (measurement_kind = 'unavailable' AND value_json IS NULL AND source_class IS NULL)
    OR
    (measurement_kind <> 'unavailable' AND value_json IS NOT NULL AND source_class IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_fields_reading
  ON virtual_ndani_reading_fields(reading_id);
