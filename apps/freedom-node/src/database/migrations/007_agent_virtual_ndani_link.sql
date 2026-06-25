ALTER TABLE virtual_ndani_readings
  ADD COLUMN IF NOT EXISTS manual_observation_id TEXT
    REFERENCES manual_observations(observation_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS context_json TEXT NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_readings_conversation
  ON virtual_ndani_readings(conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_readings_manual_observation
  ON virtual_ndani_readings(manual_observation_id)
  WHERE manual_observation_id IS NOT NULL;
