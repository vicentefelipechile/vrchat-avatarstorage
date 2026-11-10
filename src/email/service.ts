// =========================================================================================================
// EMAIL PROXY SERVICE
// =========================================================================================================
// Contact routing, durable admission, bounded retries and private-content retention.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { GoneError, NotFoundError, ValidationError } from '../domain/errors';
import { EmailConversationRepository } from './conversation-repository';
import { EmailDeliveryRepository } from './delivery-repository';
import { authenticatedAdmin, automatedEmail, emailAddress, hashEmailValue, messageId, replyToken, singleMailbox } from './message';
import { EmailSendError, sendEmail } from './resend';
import { DELIVERY_LEASE_MS, EMAIL_ADDRESS, EMAIL_DOMAIN, EMAIL_PAGE_SIZE, MAX_EMAIL_BYTES, RETRY_WINDOW_MS, type EmailCollaborators, type EmailConversation, type EmailDelivery, type IncomingEmail } from './types';

// =========================================================================================================
// Service
// =========================================================================================================

export class EmailService {
	private readonly conversations: EmailConversationRepository;
	private readonly deliveries: EmailDeliveryRepository;

	constructor(db: DB) {
		this.conversations = new EmailConversationRepository(db);
		this.deliveries = new EmailDeliveryRepository(db);
	}

	async receive(message: IncomingEmail, collaborators: EmailCollaborators): Promise<string> {
		if (message.rawSize <= 0 || message.rawSize > MAX_EMAIL_BYTES) throw new ValidationError('Email exceeds the 25 MiB message limit');
		let admin: string;
		try {
			admin = emailAddress(collaborators.adminEmail);
			if (admin.endsWith(`@${EMAIL_DOMAIN}`)) throw new Error('Administrator mailbox cannot route back to the proxy');
		} catch {
			// A deployment error must not become a permanent SMTP rejection of the sender's message.
			throw new Error('Email administrator is not configured correctly');
		}
		const to = emailAddress(message.to);
		const token = replyToken(to);
		if (to !== EMAIL_ADDRESS && !token) throw new ValidationError('Unknown contact address');
		if (automatedEmail(message.headers, message.from) || message.headers.has('X-VRCStorage-Proxy')) throw new ValidationError('Automated messages and proxy loops are not accepted');
		const author = singleMailbox(message.headers.get('From'));
		if (author.endsWith(`@${EMAIL_DOMAIN}`)) throw new ValidationError('Proxy sender cannot contact itself');
		const replyTo = message.headers.has('Reply-To') ? singleMailbox(message.headers.get('Reply-To')) : author;
		if (author !== admin && (replyTo.endsWith(`@${EMAIL_DOMAIN}`) || replyTo === admin)) throw new ValidationError('Invalid contact Reply-To');
		let parent: EmailDelivery | null = null;
		let conversation: EmailConversation;
		let isNew = false;
		if (token) {
			parent = await this.deliveries.findReply(await hashEmailValue(token));
			if (!parent) throw new ValidationError('Invalid reply address');
			const existing = await this.conversations.find(parent.conversation_uuid);
			if (!existing) throw new ValidationError('Unknown conversation');
			conversation = existing;
			if (parent.direction === 'admin') {
				if (author !== admin || !authenticatedAdmin(message.headers)) throw new ValidationError('Administrator reply is not authenticated');
			} else if (author !== conversation.author_email && author !== conversation.reply_email) {
				throw new ValidationError('Reply sender does not belong to this conversation');
			}
		} else {
			if (author === admin) throw new ValidationError('Administrator replies must use a conversation address');
			conversation = { uuid: crypto.randomUUID(), author_email: author, reply_email: replyTo, created_at: Date.now() };
			isNew = true;
		}
		const sourceId = messageId(message.headers.get('Message-ID'));
		const dedupeKey = await hashEmailValue(JSON.stringify([author, to, sourceId ?? crypto.randomUUID()]));
		const duplicate = await this.deliveries.findDuplicate(dedupeKey);
		if (duplicate) return duplicate.uuid;
		const uuid = crypto.randomUUID();
		const outgoingToken = crypto.randomUUID().replaceAll('-', '');
		const now = Date.now();
		const direction = parent?.direction === 'admin' ? 'user' : 'admin';
		const row: EmailDelivery = {
			uuid,
			conversation_uuid: conversation.uuid,
			direction,
			recipient: direction === 'admin' ? admin : conversation.reply_email,
			source_message_id: sourceId,
			in_reply_to: parent?.source_message_id ?? null,
			reply_token_hash: await hashEmailValue(outgoingToken),
			dedupe_key: dedupeKey,
			content_key: `raw/${uuid}.eml`,
			status: 'pending',
			attempts: 0,
			created_at: now,
			deadline_at: now + RETRY_WINDOW_MS,
			next_attempt_at: now,
			lease_until: 0,
			lease_id: null,
			resend_id: null,
			last_error: null,
			failed_at: null,
			content_expires_at: null,
		};
		const stored = await collaborators.bucket.put(row.content_key!, message.raw, { httpMetadata: { contentType: 'message/rfc822' }, customMetadata: { reply_token: outgoingToken } });
		if (stored.size > MAX_EMAIL_BYTES) {
			await collaborators.bucket.delete(row.content_key!);
			throw new ValidationError('Email exceeds the 25 MiB message limit');
		}
		try {
			await this.deliveries.insert(row, isNew ? this.conversations.buildInsert(conversation) : undefined);
		} catch (error) {
			// Concurrent SMTP redelivery can race the unique dedupe key; never overwrite its content.
			const raced = await this.deliveries.findDuplicate(dedupeKey);
			if (!raced) throw error;
			await collaborators.bucket.delete(row.content_key!);
			return raced.uuid;
		}
		try {
			await collaborators.queue.send({ delivery_uuid: uuid });
		} catch {
			// D1 is the outbox: maintenance will enqueue this accepted message again.
			console.error(`[EMAIL] Queue admission failed for ${uuid}; retained in outbox`);
		}
		return uuid;
	}

	async deliver(uuid: string, collaborators: EmailCollaborators): Promise<number | null> {
		const now = Date.now();
		const leaseId = crypto.randomUUID();
		const row = await this.deliveries.claim(uuid, now, leaseId, now + DELIVERY_LEASE_MS);
		if (!row) return null;
		if (now >= row.deadline_at) {
			await this.deliveries.fail(uuid, now, 'Delivery retry window expired; outcome may be unknown', leaseId);
			return null;
		}
		try {
			const conversation = await this.conversations.find(row.conversation_uuid);
			const original = row.content_key ? await collaborators.bucket.get(row.content_key) : null;
			if (!conversation || !original) throw new EmailSendError('Original email is unavailable', false);
			if (original.size > MAX_EMAIL_BYTES) throw new EmailSendError('Original email exceeds the message limit', false);
			const token = original.customMetadata?.reply_token;
			if (!token || (await hashEmailValue(token)) !== row.reply_token_hash) throw new EmailSendError('Reply token metadata is unavailable', false);
			if (!collaborators.apiKey) throw new EmailSendError('Resend API key is not configured', true);
			const resendId = await sendEmail(original.body, row, conversation, token, collaborators.apiKey);
			if (!(await this.deliveries.sent(uuid, leaseId, resendId))) return null;
		} catch (error) {
			if (!(error instanceof EmailSendError)) throw error;
			const delay = Math.max(Math.min(3600, 60 * 2 ** Math.min(row.attempts - 1, 6)), error.retryAfterSeconds);
			if (!error.retryable || Date.now() >= row.deadline_at) {
				await this.deliveries.fail(uuid, Date.now(), error.message, leaseId);
				return null;
			}
			const next = Math.min(row.deadline_at, Date.now() + delay * 1000);
			await this.deliveries.retry(uuid, leaseId, next, error.message);
			return Math.max(1, Math.ceil((next - Date.now()) / 1000));
		}
		// A cleanup failure must not turn an accepted Resend delivery into another send.
		try {
			await this.removeContent(row, collaborators.bucket);
		} catch {
			console.error(`[EMAIL] Sent-message cleanup deferred for ${uuid}`);
		}
		return null;
	}

	async maintain(collaborators: EmailCollaborators): Promise<void> {
		const now = Date.now();
		for (const row of await this.deliveries.due(now)) {
			try {
				if (now >= row.deadline_at) await this.deliveries.fail(row.uuid, now, 'Delivery retry window expired; outcome may be unknown');
				else await collaborators.queue.send({ delivery_uuid: row.uuid });
			} catch {
				console.error(`[EMAIL] Outbox recovery deferred for ${row.uuid}`);
			}
		}
		for (const row of await this.deliveries.cleanupDue(now)) {
			try {
				await this.removeContent(row, collaborators.bucket);
			} catch {
				console.error(`[EMAIL] Content cleanup deferred for ${row.uuid}`);
			}
		}
	}

	async failures(page: number) {
		const { deliveries, total } = await this.deliveries.failures(page);
		return {
			deliveries: deliveries.map((row) => ({
				uuid: row.uuid,
				recipient: row.recipient,
				direction: row.direction,
				attempts: row.attempts,
				created_at: row.created_at,
				failed_at: row.failed_at,
				last_error: row.last_error,
				content_expires_at: row.content_expires_at,
				content_available: Boolean(row.content_key && row.content_expires_at && row.content_expires_at > Date.now()),
			})),
			pagination: { page, limit: EMAIL_PAGE_SIZE, total, hasNextPage: page * EMAIL_PAGE_SIZE < total, hasPrevPage: page > 1 },
		};
	}

	async original(uuid: string, bucket: R2Bucket): Promise<R2ObjectBody> {
		const row = await this.deliveries.find(uuid);
		if (!row || row.status !== 'failed') throw new NotFoundError('Failed email not found');
		if (!row.content_key || !row.content_expires_at || row.content_expires_at <= Date.now()) throw new GoneError('Original email retention has expired');
		const object = await bucket.get(row.content_key);
		if (!object) throw new GoneError('Original email is unavailable');
		return object;
	}

	async deleteFailure(uuid: string, bucket: R2Bucket): Promise<void> {
		const row = await this.deliveries.deleteFailed(uuid);
		if (!row) {
			const existing = await this.deliveries.find(uuid);
			if (existing?.status === 'deleted') return this.removeContent(existing, bucket);
			throw new NotFoundError('Failed email not found');
		}
		await this.removeContent(row, bucket);
	}

	private async removeContent(row: EmailDelivery, bucket: R2Bucket): Promise<void> {
		if (!row.content_key) return;
		await bucket.delete(row.content_key);
		await this.deliveries.clearContent(row.uuid);
	}
}
