ALTER TABLE virtual_ndani_devices
  ADD COLUMN IF NOT EXISTS physical_bound_at BIGINT,
  ADD COLUMN IF NOT EXISTS physical_binding_version TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_unique_physical_pubkey
  ON virtual_ndani_devices(physical_device_pubkey)
  WHERE physical_device_pubkey IS NOT NULL;

ALTER TABLE virtual_ndani_channels
  ADD COLUMN IF NOT EXISTS physical_collection_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS virtual_ndani_physical_binding_challenges (
  challenge_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  device_pubkey TEXT NOT NULL,
  challenge_hex TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'expired', 'revoked', 'failed')),
  expires_at BIGINT NOT NULL,
  consumed_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_one_pending_binding
  ON virtual_ndani_physical_binding_challenges(virtual_device_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_virtual_ndani_binding_challenge_expiry
  ON virtual_ndani_physical_binding_challenges(status, expires_at);

CREATE TABLE IF NOT EXISTS virtual_ndani_physical_bindings (
  binding_id UUID PRIMARY KEY,
  virtual_device_id UUID NOT NULL
    REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE CASCADE,
  device_pubkey TEXT NOT NULL,
  registry_device_id TEXT,
  bound_by UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE RESTRICT,
  binding_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'replaced', 'revoked')),
  bound_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  ended_at BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_one_active_binding
  ON virtual_ndani_physical_bindings(virtual_device_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_ndani_one_device_binding
  ON virtual_ndani_physical_bindings(device_pubkey)
  WHERE status = 'active';
