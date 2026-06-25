ALTER TABLE virtual_ndani_readings
  ALTER COLUMN farmer_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS physical_packet_hash TEXT,
  ADD COLUMN IF NOT EXISTS device_timestamp BIGINT,
  ADD COLUMN IF NOT EXISTS received_at BIGINT,
  ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_physical_packet_hash
  ON virtual_ndani_readings(physical_packet_hash)
  WHERE physical_packet_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS virtual_ndani_physical_packets (
  packet_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  reading_id UUID NOT NULL UNIQUE
    REFERENCES virtual_ndani_readings(reading_id) ON DELETE CASCADE,
  device_pubkey TEXT NOT NULL,
  packet_version TEXT NOT NULL,
  packet_hash TEXT NOT NULL UNIQUE,
  commitment_hex TEXT NOT NULL,
  nullifier_hex TEXT NOT NULL,
  signature_hex TEXT NOT NULL,
  device_timestamp BIGINT NOT NULL,
  received_at BIGINT NOT NULL,
  signature_verified BOOLEAN NOT NULL,
  transport TEXT NOT NULL DEFAULT 'freedom_node_adapter',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_physical_packets_device
  ON virtual_ndani_physical_packets(virtual_device_id, received_at DESC);
