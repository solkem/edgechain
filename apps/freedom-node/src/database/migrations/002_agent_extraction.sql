ALTER TABLE agent_conversations
  ADD COLUMN IF NOT EXISTS observation_draft_json TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS field_confidence_json TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pending_field TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

CREATE TABLE IF NOT EXISTS agent_extraction_events (
  extraction_event_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES agent_conversations(conversation_id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES agent_messages(message_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  output_json TEXT NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'rejected', 'fallback')),
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER NOT NULL,
  estimated_cost_usd DOUBLE PRECISION,
  error_code TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_agent_extractions_conversation
  ON agent_extraction_events(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_rule_decisions (
  rule_decision_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES agent_conversations(conversation_id) ON DELETE CASCADE,
  extraction_event_id UUID REFERENCES agent_extraction_events(extraction_event_id) ON DELETE SET NULL,
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  inputs_json TEXT NOT NULL,
  result TEXT NOT NULL,
  selected_field TEXT,
  explanation_key TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_agent_rule_decisions_conversation
  ON agent_rule_decisions(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_cost_events (
  cost_event_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES agent_conversations(conversation_id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_agent_cost_farmer_month
  ON agent_cost_events(farmer_id, created_at DESC);
