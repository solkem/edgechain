ALTER TABLE agent_messages
  ADD COLUMN IF NOT EXISTS message_sequence BIGSERIAL;

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_sequence
  ON agent_messages(conversation_id, message_sequence);
