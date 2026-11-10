-- =========================================================================================================
-- EMAIL PROXY — Permanent routing metadata; message content lives only in private temporary R2 storage.
-- =========================================================================================================

CREATE TABLE email_conversations (
	uuid TEXT PRIMARY KEY,
	author_email TEXT NOT NULL,
	reply_email TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE TABLE email_deliveries (
	uuid TEXT PRIMARY KEY,
	conversation_uuid TEXT NOT NULL REFERENCES email_conversations(uuid),
	direction TEXT NOT NULL CHECK (direction IN ('admin', 'user')),
	recipient TEXT NOT NULL,
	source_message_id TEXT,
	in_reply_to TEXT,
	reply_token_hash TEXT NOT NULL UNIQUE,
	dedupe_key TEXT NOT NULL UNIQUE,
	content_key TEXT,
	status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'deleted')),
	attempts INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	deadline_at INTEGER NOT NULL,
	next_attempt_at INTEGER NOT NULL,
	lease_until INTEGER NOT NULL DEFAULT 0,
	lease_id TEXT,
	resend_id TEXT,
	last_error TEXT,
	failed_at INTEGER,
	content_expires_at INTEGER
);

CREATE INDEX idx_email_deliveries_due ON email_deliveries(status, next_attempt_at, lease_until);
CREATE INDEX idx_email_deliveries_content ON email_deliveries(status, content_expires_at) WHERE content_key IS NOT NULL;
CREATE INDEX idx_email_deliveries_conversation ON email_deliveries(conversation_uuid);
CREATE INDEX idx_email_deliveries_failed ON email_deliveries(failed_at DESC, uuid) WHERE status = 'failed';
