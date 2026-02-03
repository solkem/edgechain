-- M1 FIX: Migrate from signature_r/signature_s to single signature column
-- Run this migration once per database

-- Step 1: Add new signature column to sensor_readings
ALTER TABLE sensor_readings ADD COLUMN signature TEXT;

-- Step 2: Migrate existing data (full signature is in signature_r)
UPDATE sensor_readings SET signature = signature_r WHERE signature IS NULL;

-- Note: In a future major version, remove signature_r and signature_s columns:
-- ALTER TABLE sensor_readings DROP COLUMN signature_r;
-- ALTER TABLE sensor_readings DROP COLUMN signature_s;
-- SQLite doesn't support DROP COLUMN directly, would require table recreation

-- Log migration
INSERT INTO transaction_log (tx_hash, tx_type, status, metadata)
VALUES ('migration_m1', 'schema_migration', 'completed', 
        '{"migration": "signature_consolidation", "date": "2026-02-03"}');
