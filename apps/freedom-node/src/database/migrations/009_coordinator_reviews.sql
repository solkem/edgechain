ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS system_role TEXT NOT NULL DEFAULT 'farmer'
    CHECK (system_role IN ('farmer', 'coordinator'));

ALTER TABLE virtual_ndani_readings
  DROP CONSTRAINT IF EXISTS virtual_ndani_readings_quality_status_check;

ALTER TABLE virtual_ndani_readings
  ADD CONSTRAINT virtual_ndani_readings_quality_status_check
    CHECK (quality_status IN (
      'awaiting_confirmation', 'accepted', 'flagged', 'excluded', 'cancelled'
    ));

CREATE TABLE IF NOT EXISTS virtual_ndani_reading_reviews (
  review_id UUID PRIMARY KEY,
  reading_id UUID NOT NULL UNIQUE
    REFERENCES virtual_ndani_readings(reading_id) ON DELETE CASCADE,
  coordinator_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'excluded')),
  reason TEXT NOT NULL,
  previous_quality_status TEXT NOT NULL,
  resulting_quality_status TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_reviews_coordinator
  ON virtual_ndani_reading_reviews(coordinator_id, created_at DESC);
