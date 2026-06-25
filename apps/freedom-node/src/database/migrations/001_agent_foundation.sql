CREATE TABLE IF NOT EXISTS farmers (
  farmer_id UUID PRIMARY KEY,
  pilot_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'withdrawn')),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE TABLE IF NOT EXISTS farmer_credentials (
  credential_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('pin')),
  secret_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until BIGINT,
  last_used_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (farmer_id, credential_type)
);

CREATE TABLE IF NOT EXISTS farmer_sessions (
  session_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  revoked_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_farmer_sessions_farmer ON farmer_sessions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_sessions_expiry ON farmer_sessions(expires_at);

CREATE TABLE IF NOT EXISTS farms (
  farm_id UUID PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  district TEXT,
  ward TEXT,
  coarse_location TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'withdrawn')),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE TABLE IF NOT EXISTS farm_memberships (
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'manager', 'observer')),
  valid_from BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  valid_to BIGINT,
  PRIMARY KEY (farmer_id, farm_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_memberships_farm ON farm_memberships(farm_id);

CREATE TABLE IF NOT EXISTS agent_conversations (
  conversation_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp', 'coordinator', 'api')),
  state TEXT NOT NULL DEFAULT 'idle',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'submitted', 'flagged', 'cancelled', 'closed')),
  version INTEGER NOT NULL DEFAULT 1,
  last_message_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_farmer_farm
  ON agent_conversations(farmer_id, farm_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_messages (
  message_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES agent_conversations(conversation_id) ON DELETE CASCADE,
  external_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'photo', 'voice', 'system')),
  normalized_text TEXT,
  language TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (conversation_id, external_message_id)
);

CREATE TABLE IF NOT EXISTS agent_state_transitions (
  transition_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES agent_conversations(conversation_id) ON DELETE CASCADE,
  previous_state TEXT NOT NULL,
  event TEXT NOT NULL,
  next_state TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_agent_transitions_conversation
  ON agent_state_transitions(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  audit_event_id UUID PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  event_type TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  correlation_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_audit_events_subject
  ON audit_events(subject_type, subject_id, created_at DESC);
