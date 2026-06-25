ALTER TABLE agent_conversations
  ADD COLUMN IF NOT EXISTS pending_value TEXT;
