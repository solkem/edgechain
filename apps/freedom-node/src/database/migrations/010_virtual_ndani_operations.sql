ALTER TABLE virtual_ndani_devices
  ADD COLUMN IF NOT EXISTS schedule_hour_local INTEGER NOT NULL DEFAULT 7
    CHECK (schedule_hour_local BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT NOT NULL DEFAULT 'Africa/Harare',
  ADD COLUMN IF NOT EXISTS grace_minutes INTEGER NOT NULL DEFAULT 720
    CHECK (grace_minutes BETWEEN 30 AND 2880),
  ADD COLUMN IF NOT EXISTS manual_minutes_target INTEGER NOT NULL DEFAULT 8
    CHECK (manual_minutes_target BETWEEN 1 AND 120);

ALTER TABLE virtual_ndani_cycles
  ADD COLUMN IF NOT EXISTS due_at BIGINT,
  ADD COLUMN IF NOT EXISTS manual_duration_seconds INTEGER
    CHECK (manual_duration_seconds IS NULL OR manual_duration_seconds >= 0),
  ADD COLUMN IF NOT EXISTS coordinator_duration_seconds INTEGER
    CHECK (coordinator_duration_seconds IS NULL OR coordinator_duration_seconds >= 0);

UPDATE virtual_ndani_cycles
SET due_at = scheduled_for
WHERE due_at IS NULL;

ALTER TABLE virtual_ndani_cycles
  ALTER COLUMN due_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_cycles_due_status
  ON virtual_ndani_cycles(status, due_at);
