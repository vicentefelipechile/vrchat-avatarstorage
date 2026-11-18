// =========================================================================================================
// EMAIL PROXY CONTRACTS
// =========================================================================================================
// Routing and delivery metadata only; email bodies and attachments never enter D1.
// =========================================================================================================

// =========================================================================================================
// Constants
// =========================================================================================================

export const EMAIL_ADDRESS = 'contact@vrcstorage.lat';
export const EMAIL_DOMAIN = 'vrcstorage.lat';
export const EMAIL_QUEUE_NAME = 'vrcstorage-email';
export const EMAIL_CRON = '*/5 * * * *';
export const MAX_EMAIL_BYTES = 25 * 1024 * 1024;
export const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
export const FAILED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const DELIVERY_LEASE_MS = 5 * 60 * 1000;
export const EMAIL_PAGE_SIZE = 25;
export const EMAIL_BODY_TEMPLATE = 'branded-v1';
// Keep the worst-case maintenance pass below the Workers Free subrequest budget.
export const EMAIL_MAINTENANCE_BATCH_SIZE = 15;

// =========================================================================================================
// Types
// =========================================================================================================

export interface EmailConversation {
	uuid: string;
	author_email: string;
	reply_email: string;
	created_at: number;
}

export interface EmailDelivery {
	uuid: string;
	conversation_uuid: string;
	direction: 'admin' | 'user';
	recipient: string;
	source_message_id: string | null;
	in_reply_to: string | null;
	reply_token_hash: string;
	dedupe_key: string;
	content_key: string | null;
	status: 'pending' | 'sending' | 'sent' | 'failed' | 'deleted';
	attempts: number;
	created_at: number;
	deadline_at: number;
	next_attempt_at: number;
	lease_until: number;
	lease_id: string | null;
	resend_id: string | null;
	last_error: string | null;
	failed_at: number | null;
	content_expires_at: number | null;
}

export interface EmailQueueMessage {
	delivery_uuid: string;
}

export interface IncomingEmail {
	from: string;
	to: string;
	headers: Headers;
	raw: ReadableStream<Uint8Array>;
	rawSize: number;
}

export interface EmailCollaborators {
	bucket: R2Bucket;
	queue: Queue<EmailQueueMessage>;
	adminEmail: string;
	apiKey: string;
}
