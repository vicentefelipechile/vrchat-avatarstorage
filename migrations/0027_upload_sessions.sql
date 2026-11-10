-- Durable multipart state; KV cannot coordinate concurrent part acknowledgements.
CREATE TABLE upload_sessions (
	upload_id TEXT PRIMARY KEY,
	r2_key TEXT NOT NULL UNIQUE,
	user_uuid TEXT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
	filename TEXT NOT NULL,
	media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'file')),
	file_size INTEGER NOT NULL CHECK (file_size > 0),
	state TEXT NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading', 'completing', 'complete', 'aborted')),
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE INDEX idx_upload_sessions_created ON upload_sessions(created_at);

CREATE TABLE upload_parts (
	upload_id TEXT NOT NULL REFERENCES upload_sessions(upload_id) ON DELETE CASCADE,
	part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 10000),
	etag TEXT NOT NULL,
	byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 31457280),
	PRIMARY KEY (upload_id, part_number)
);
