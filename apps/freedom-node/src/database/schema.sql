-- EdgeChain PostgreSQL Schema
-- Production-grade persistent storage for Sensor Node, FL, MARS, and manual observation data.

CREATE TABLE IF NOT EXISTS devices (
  device_pubkey TEXT PRIMARY KEY,
  owner_wallet TEXT NOT NULL,
  registration_epoch BIGINT NOT NULL,
  expiry_epoch BIGINT NOT NULL,
  device_id TEXT,
  metadata TEXT,
  merkle_leaf_hash TEXT NOT NULL,
  authorization_reward_paid BOOLEAN DEFAULT FALSE,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_devices_expiry ON devices(expiry_epoch);
CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_wallet);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_pubkey TEXT NOT NULL REFERENCES devices(device_pubkey),
  reading_json TEXT NOT NULL,
  temperature DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  timestamp_device BIGINT NOT NULL,
  signature TEXT,
  batch_id TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_readings_device ON sensor_readings(device_pubkey);
CREATE INDEX IF NOT EXISTS idx_readings_batch ON sensor_readings(batch_id);
CREATE INDEX IF NOT EXISTS idx_readings_created ON sensor_readings(created_at);

CREATE TABLE IF NOT EXISTS batch_proofs (
  batch_id TEXT PRIMARY KEY,
  device_pubkey TEXT NOT NULL REFERENCES devices(device_pubkey),
  collection_mode TEXT,
  readings_count INTEGER NOT NULL,
  proof_data TEXT,
  public_inputs TEXT,
  merkle_root TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at BIGINT,
  tx_hash TEXT,
  block_number BIGINT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_batch_proofs_device ON batch_proofs(device_pubkey);
CREATE INDEX IF NOT EXISTS idx_batch_proofs_verified ON batch_proofs(verified);
CREATE INDEX IF NOT EXISTS idx_batch_proofs_tx ON batch_proofs(tx_hash);

CREATE TABLE IF NOT EXISTS rewards (
  id BIGSERIAL PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES batch_proofs(batch_id),
  farmer_address TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  tx_hash TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  paid_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_rewards_farmer ON rewards(farmer_address);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_tx ON rewards(tx_hash);

CREATE TABLE IF NOT EXISTS nullifiers (
  claim_nullifier TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES batch_proofs(batch_id),
  spent_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_nullifiers_batch ON nullifiers(batch_id);

CREATE TABLE IF NOT EXISTS merkle_roots (
  root_hash TEXT PRIMARY KEY,
  collection_mode TEXT,
  device_count INTEGER NOT NULL,
  published_to_chain BOOLEAN DEFAULT FALSE,
  tx_hash TEXT,
  block_number BIGINT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_merkle_roots_published ON merkle_roots(published_to_chain);

CREATE TABLE IF NOT EXISTS transaction_log (
  id BIGSERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  tx_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  block_number BIGINT,
  related_id TEXT,
  metadata TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  confirmed_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tx_log_hash ON transaction_log(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_log_type ON transaction_log(tx_type);
CREATE INDEX IF NOT EXISTS idx_tx_log_status ON transaction_log(status);

CREATE TABLE IF NOT EXISTS spent_nullifiers (
  nullifier TEXT NOT NULL,
  epoch BIGINT NOT NULL,
  data_hash TEXT NOT NULL,
  reward DOUBLE PRECISION NOT NULL,
  mars_action TEXT,
  mars_composite DOUBLE PRECISION,
  mars_score_json TEXT,
  spent_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  PRIMARY KEY (nullifier, epoch)
);

CREATE INDEX IF NOT EXISTS idx_spent_nullifiers_epoch ON spent_nullifiers(epoch);

CREATE TABLE IF NOT EXISTS zk_proof_submissions (
  id BIGSERIAL PRIMARY KEY,
  nullifier TEXT NOT NULL,
  epoch BIGINT NOT NULL,
  proof_data TEXT NOT NULL,
  public_inputs TEXT NOT NULL,
  temperature DOUBLE PRECISION NOT NULL,
  humidity DOUBLE PRECISION NOT NULL,
  timestamp_device BIGINT NOT NULL,
  collection_mode TEXT,
  reward DOUBLE PRECISION NOT NULL,
  mars_action TEXT,
  mars_composite DOUBLE PRECISION,
  mars_score_json TEXT,
  ipfs_cid TEXT,
  verified BOOLEAN DEFAULT TRUE,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE(nullifier, epoch)
);

CREATE INDEX IF NOT EXISTS idx_zk_submissions_epoch ON zk_proof_submissions(epoch);
CREATE INDEX IF NOT EXISTS idx_zk_submissions_ipfs ON zk_proof_submissions(ipfs_cid);

CREATE TABLE IF NOT EXISTS manual_observation_sessions (
  session_id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'coordinator', 'api')),
  participant_phone_hash TEXT,
  current_step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'cancelled')),
  draft_json TEXT NOT NULL,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_manual_sessions_channel ON manual_observation_sessions(channel);
CREATE INDEX IF NOT EXISTS idx_manual_sessions_phone_hash ON manual_observation_sessions(participant_phone_hash);
CREATE INDEX IF NOT EXISTS idx_manual_sessions_status ON manual_observation_sessions(status);

CREATE TABLE IF NOT EXISTS manual_observations (
  observation_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES manual_observation_sessions(session_id),
  site_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'coordinator', 'api')),
  participant_phone_hash TEXT,
  observation_date TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'flagged', 'invalid')),
  validation_errors_json TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'needs_followup')),
  submitted_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_manual_observations_site ON manual_observations(site_id);
CREATE INDEX IF NOT EXISTS idx_manual_observations_date ON manual_observations(observation_date);
CREATE INDEX IF NOT EXISTS idx_manual_observations_validation ON manual_observations(validation_status);
CREATE INDEX IF NOT EXISTS idx_manual_observations_review ON manual_observations(review_status);

CREATE TABLE IF NOT EXISTS manual_observation_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT REFERENCES manual_observation_sessions(session_id),
  channel TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  participant_phone_hash TEXT,
  raw_payload_json TEXT NOT NULL,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_manual_messages_session ON manual_observation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_manual_messages_phone_hash ON manual_observation_messages(participant_phone_hash);
