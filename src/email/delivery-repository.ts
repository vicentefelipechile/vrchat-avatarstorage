// =========================================================================================================
// EMAIL DELIVERY REPOSITORY
// =========================================================================================================
// Durable outbox, hashed reply capabilities, deduplication and leased delivery state transitions.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { batch, execute, queryAll, queryOne, type DB } from '../db/client';
import { EMAIL_MAINTENANCE_BATCH_SIZE, EMAIL_PAGE_SIZE, FAILED_RETENTION_MS, type EmailDelivery } from './types';

// =========================================================================================================
// Repository
// =========================================================================================================

export class EmailDeliveryRepository {
	constructor(private readonly db: DB) {}

	find(uuid: string): Promise<EmailDelivery | null> {
		return queryOne(this.db, 'SELECT * FROM email_deliveries WHERE uuid = ?', [uuid]);
	}

	findDuplicate(key: string): Promise<EmailDelivery | null> {
		return queryOne(this.db, 'SELECT * FROM email_deliveries WHERE dedupe_key = ?', [key]);
	}

	findReply(hash: string): Promise<EmailDelivery | null> {
		// A recipient can reply before the Resend acceptance has been committed locally.
		return queryOne(this.db, "SELECT * FROM email_deliveries WHERE reply_token_hash = ? AND status <> 'deleted'", [hash]);
	}

	async insert(row: EmailDelivery, conversation?: D1PreparedStatement): Promise<void> {
		const insert = this.db
			.prepare(
				`INSERT INTO email_deliveries
			(uuid, conversation_uuid, direction, recipient, source_message_id, in_reply_to, reply_token_hash, dedupe_key, content_key, status, created_at, deadline_at, next_attempt_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
			)
			.bind(row.uuid, row.conversation_uuid, row.direction, row.recipient, row.source_message_id, row.in_reply_to, row.reply_token_hash, row.dedupe_key, row.content_key, row.created_at, row.deadline_at, row.next_attempt_at);
		await batch(this.db, conversation ? [conversation, insert] : [insert]);
	}

	claim(uuid: string, now: number, leaseId: string, leaseUntil: number): Promise<EmailDelivery | null> {
		return queryOne(
			this.db,
			`UPDATE email_deliveries SET status = 'sending', lease_id = ?, lease_until = ?, attempts = attempts + 1
			WHERE uuid = ? AND status IN ('pending', 'sending') AND next_attempt_at <= ? AND lease_until <= ? RETURNING *`,
			[leaseId, leaseUntil, uuid, now, now],
		);
	}

	async sent(uuid: string, leaseId: string, resendId: string): Promise<boolean> {
		const result = await execute(this.db, "UPDATE email_deliveries SET status = 'sent', resend_id = ?, last_error = NULL, lease_until = 0, lease_id = NULL WHERE uuid = ? AND lease_id = ?", [resendId, uuid, leaseId]);
		return result.meta.changes > 0;
	}

	async retry(uuid: string, leaseId: string, nextAttempt: number, error: string): Promise<void> {
		await execute(this.db, "UPDATE email_deliveries SET status = 'pending', next_attempt_at = ?, last_error = ?, lease_until = 0, lease_id = NULL WHERE uuid = ? AND lease_id = ?", [nextAttempt, error, uuid, leaseId]);
	}

	async fail(uuid: string, now: number, error: string, leaseId?: string): Promise<void> {
		await execute(
			this.db,
			`UPDATE email_deliveries SET status = 'failed', last_error = ?, failed_at = ?, content_expires_at = ?, lease_until = 0, lease_id = NULL
			WHERE uuid = ? AND status IN ('pending', 'sending') AND ${leaseId ? 'lease_id = ?' : 'lease_until <= ?'}`,
			[error, now, now + FAILED_RETENTION_MS, uuid, leaseId ?? now],
		);
	}

	due(now: number): Promise<EmailDelivery[]> {
		return queryAll(this.db, "SELECT * FROM email_deliveries WHERE status IN ('pending', 'sending') AND next_attempt_at <= ? AND lease_until <= ? ORDER BY next_attempt_at LIMIT ?", [now, now, EMAIL_MAINTENANCE_BATCH_SIZE]);
	}

	cleanupDue(now: number): Promise<EmailDelivery[]> {
		return queryAll(this.db, "SELECT * FROM email_deliveries WHERE content_key IS NOT NULL AND (status IN ('sent', 'deleted') OR (status = 'failed' AND content_expires_at <= ?)) LIMIT ?", [now, EMAIL_MAINTENANCE_BATCH_SIZE]);
	}

	async clearContent(uuid: string): Promise<void> {
		await execute(this.db, 'UPDATE email_deliveries SET content_key = NULL WHERE uuid = ?', [uuid]);
	}

	async deleteFailed(uuid: string): Promise<EmailDelivery | null> {
		return queryOne(this.db, "UPDATE email_deliveries SET status = 'deleted' WHERE uuid = ? AND status = 'failed' RETURNING *", [uuid]);
	}

	async failures(page: number): Promise<{ deliveries: EmailDelivery[]; total: number }> {
		const [deliveries, count] = await Promise.all([
			queryAll<EmailDelivery>(this.db, "SELECT * FROM email_deliveries WHERE status = 'failed' ORDER BY failed_at DESC, uuid LIMIT ? OFFSET ?", [EMAIL_PAGE_SIZE, (page - 1) * EMAIL_PAGE_SIZE]),
			queryOne<{ total: number }>(this.db, "SELECT COUNT(*) AS total FROM email_deliveries WHERE status = 'failed'"),
		]);
		return { deliveries, total: count?.total ?? 0 };
	}
}
