CREATE TABLE farmer_google_identities (
  google_subject TEXT PRIMARY KEY,
  farmer_id UUID NOT NULL UNIQUE REFERENCES farmers(farmer_id) ON DELETE CASCADE
);

CREATE TABLE farmer_google_invites (
  farmer_id UUID PRIMARY KEY REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  google_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
