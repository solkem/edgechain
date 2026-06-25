CREATE TABLE IF NOT EXISTS virtual_ndani_devices (
  virtual_device_id UUID PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE,
  farm_id UUID NOT NULL UNIQUE REFERENCES farms(farm_id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'human_assisted_pilot'
    CHECK (mode IN ('human_assisted_pilot', 'physical_bound')),
  status TEXT NOT NULL DEFAULT 'reading_due'
    CHECK (status IN (
      'provisioned',
      'ready',
      'reading_due',
      'collecting_manual',
      'collecting_physical',
      'validating',
      'needs_clarification',
      'needs_coordinator_review',
      'reading_accepted',
      'batch_preparing',
      'batch_ready',
      'contribution_recorded',
      'offline',
      'suspended'
    )),
  firmware_profile TEXT NOT NULL DEFAULT 'esp32-ndani-v1',
  physical_device_pubkey TEXT,
  expected_interval_minutes INTEGER NOT NULL DEFAULT 1440
    CHECK (expected_interval_minutes > 0),
  future_physical_interval_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (future_physical_interval_minutes > 0),
  provisioned_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  activated_at BIGINT,
  suspended_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_devices_farm
  ON virtual_ndani_devices(farm_id);

CREATE TABLE IF NOT EXISTS virtual_ndani_channels (
  channel_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  channel_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  pilot_source_policy TEXT NOT NULL,
  future_sensor_type TEXT,
  future_unit TEXT,
  display_order INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (virtual_device_id, channel_key)
);

CREATE TABLE IF NOT EXISTS virtual_ndani_cycles (
  cycle_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  scheduled_for BIGINT NOT NULL,
  started_at BIGINT,
  completed_at BIGINT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN (
      'scheduled',
      'started',
      'capturing',
      'awaiting_confirmation',
      'validated',
      'flagged',
      'accepted',
      'batched',
      'cancelled',
      'missed'
    )),
  collection_mode TEXT
    CHECK (collection_mode IS NULL OR collection_mode IN (
      'manual_guided',
      'manual_agent',
      'coordinator_assisted',
      'external_context',
      'physical_auto',
      'synthetic_demo'
    )),
  missed_reason TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_cycles_device_schedule
  ON virtual_ndani_cycles(virtual_device_id, scheduled_for DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_one_open_cycle
  ON virtual_ndani_cycles(virtual_device_id)
  WHERE status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation');

CREATE TABLE IF NOT EXISTS virtual_ndani_pipeline_events (
  pipeline_event_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES virtual_ndani_cycles(cycle_id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  execution_kind TEXT NOT NULL
    CHECK (execution_kind IN ('real', 'simulated', 'pending', 'not_applicable')),
  status TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_events_device
  ON virtual_ndani_pipeline_events(virtual_device_id, created_at DESC);

INSERT INTO virtual_ndani_devices (
  virtual_device_id,
  device_code,
  farm_id,
  site_id,
  status,
  activated_at
)
SELECT
  (
    SUBSTR(MD5(farm_id::text || ':virtual-ndani'), 1, 8) || '-' ||
    SUBSTR(MD5(farm_id::text || ':virtual-ndani'), 9, 4) || '-' ||
    SUBSTR(MD5(farm_id::text || ':virtual-ndani'), 13, 4) || '-' ||
    SUBSTR(MD5(farm_id::text || ':virtual-ndani'), 17, 4) || '-' ||
    SUBSTR(MD5(farm_id::text || ':virtual-ndani'), 21, 12)
  )::UUID,
  'NDANI-' || UPPER(REPLACE(site_id, 'site-', 'ODZI-')),
  farm_id,
  site_id,
  'reading_due',
  EXTRACT(EPOCH FROM NOW())::BIGINT
FROM farms
ON CONFLICT (farm_id) DO NOTHING;

WITH channel_definitions (
  channel_key,
  display_name,
  pilot_source_policy,
  future_sensor_type,
  future_unit,
  display_order
) AS (
  VALUES
    ('temperature', 'Temperature', 'hardware_or_approved_external_only', 'BME280', '°C', 1),
    ('humidity', 'Humidity', 'hardware_or_approved_external_only', 'BME280', '%', 2),
    ('pressure', 'Atmospheric pressure', 'hardware_or_approved_external_only', 'BME280', 'hPa', 3),
    ('soil_moisture', 'Soil moisture', 'manual_category_allowed', 'capacitive_soil_sensor', '%', 4),
    ('rain_condition', 'Rain condition', 'manual_category_or_external', 'future_rain_sensor', NULL, 5),
    ('plant_condition', 'Plant condition', 'human_observation_only', NULL, NULL, 6),
    ('pest_disease_signs', 'Pest or disease signs', 'human_observation_only', NULL, NULL, 7),
    ('irrigation', 'Irrigation', 'manual_event_allowed', 'future_irrigation_integration', NULL, 8)
)
INSERT INTO virtual_ndani_channels (
  channel_id,
  virtual_device_id,
  channel_key,
  display_name,
  pilot_source_policy,
  future_sensor_type,
  future_unit,
  display_order
)
SELECT
  (
    SUBSTR(MD5(device.virtual_device_id::text || ':' || definition.channel_key), 1, 8) || '-' ||
    SUBSTR(MD5(device.virtual_device_id::text || ':' || definition.channel_key), 9, 4) || '-' ||
    SUBSTR(MD5(device.virtual_device_id::text || ':' || definition.channel_key), 13, 4) || '-' ||
    SUBSTR(MD5(device.virtual_device_id::text || ':' || definition.channel_key), 17, 4) || '-' ||
    SUBSTR(MD5(device.virtual_device_id::text || ':' || definition.channel_key), 21, 12)
  )::UUID,
  device.virtual_device_id,
  definition.channel_key,
  definition.display_name,
  definition.pilot_source_policy,
  definition.future_sensor_type,
  definition.future_unit,
  definition.display_order
FROM virtual_ndani_devices device
CROSS JOIN channel_definitions definition
ON CONFLICT (virtual_device_id, channel_key) DO NOTHING;
