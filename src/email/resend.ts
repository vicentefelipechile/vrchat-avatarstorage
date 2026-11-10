// =========================================================================================================
// RESEND TRANSPORT
// =========================================================================================================
// Streams JSON attachments instead of constructing another full-size serialized copy of the email.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import PostalMime, { type Attachment, type Email } from 'postal-mime';

import { cleanProxyBlocks, proxyBodies, replyAddress } from './message';
import { EMAIL_ADDRESS, type EmailConversation, type EmailDelivery } from './types';

// =========================================================================================================
// Constants
// =========================================================================================================

const RESEND_URL = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 30_000;
const JSON_CHUNK_SIZE = 64 * 1024;

// =========================================================================================================
// Types
// =========================================================================================================

interface ResendResponse {
	id?: string;
	name?: string;
}

export class EmailSendError extends Error {
	constructor(
		message: string,
		readonly retryable: boolean,
		readonly retryAfterSeconds = 0,
	) {
		super(message);
	}
}

// =========================================================================================================
// Helpers
// =========================================================================================================

function* attachmentJson(attachment: Attachment, index: number): Generator<string> {
	if (typeof attachment.content !== 'string' || attachment.encoding !== 'base64') throw new EmailSendError('Invalid attachment encoding', false);
	const cid = attachment.contentId?.replace(/^<|>$/g, '');
	if (cid && (cid.length >= 128 || /[\r\n]/.test(cid))) throw new EmailSendError('Unsupported attachment Content-ID', false);
	const metadata = { filename: attachment.filename || `attachment-${index + 1}`, content_type: attachment.mimeType, ...(cid ? { content_id: cid } : {}) };
	yield `${JSON.stringify(metadata).slice(0, -1)},"content":"`;
	for (let offset = 0; offset < attachment.content.length; offset += JSON_CHUNK_SIZE) yield attachment.content.slice(offset, offset + JSON_CHUNK_SIZE);
	yield '"}';
}

function* payloadJson(parsed: Email, delivery: EmailDelivery, conversation: EmailConversation, token: string): Generator<string> {
	const bodies =
		delivery.direction === 'admin' ? proxyBodies(delivery.uuid, conversation.author_email, parsed.text ?? '', parsed.html) : { text: cleanProxyBlocks(parsed.text ?? ''), html: parsed.html ? cleanProxyBlocks(parsed.html) : undefined };
	const fields = {
		from: `VRCStorage <${EMAIL_ADDRESS}>`,
		to: [delivery.recipient],
		reply_to: replyAddress(token),
		subject: (parsed.subject ?? '(no subject)').replace(/[\r\n]/g, ' ').slice(0, 998),
		text: bodies.text || ' ',
		...(bodies.html ? { html: bodies.html } : {}),
		headers: {
			'X-VRCStorage-Proxy': 'contact',
			...(delivery.in_reply_to ? { 'In-Reply-To': delivery.in_reply_to, References: delivery.in_reply_to } : {}),
		},
	};
	yield '{';
	let first = true;
	for (const [key, value] of Object.entries(fields)) {
		if (!first) yield ',';
		first = false;
		yield `${JSON.stringify(key)}:${JSON.stringify(value)}`;
	}
	yield ',"attachments":[';
	for (const [index, attachment] of parsed.attachments.entries()) {
		if (index) yield ',';
		yield* attachmentJson(attachment, index);
	}
	yield ']}';
}

function jsonStream(parts: Generator<string>): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		pull(controller) {
			const part = parts.next();
			if (part.done) controller.close();
			else controller.enqueue(encoder.encode(part.value));
		},
		cancel() {
			parts.return(undefined);
		},
	});
}

// =========================================================================================================
// Sending
// =========================================================================================================

export async function sendEmail(raw: ReadableStream<Uint8Array>, delivery: EmailDelivery, conversation: EmailConversation, token: string, apiKey: string): Promise<string> {
	let parsed: Email;
	try {
		parsed = await PostalMime.parse(raw, { attachmentEncoding: 'base64', forceRfc822Attachments: true, maxNestingDepth: 32, maxHeadersSize: 256 * 1024, maxPartCount: 1000 });
	} catch (error) {
		const safetyLimit = error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('EMAX');
		throw new EmailSendError(safetyLimit ? 'MIME parser safety limit exceeded' : 'Original read or MIME parse failed', !safetyLimit);
	}
	// Validate every attachment before making a request; never send a partially stripped message.
	for (const [index, attachment] of parsed.attachments.entries()) attachmentJson(attachment, index).next();
	let response: Response;
	try {
		response = await fetch(RESEND_URL, {
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `contact/${delivery.uuid}` },
			body: jsonStream(payloadJson(parsed, delivery, conversation, token)),
			signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
		});
	} catch {
		throw new EmailSendError('Resend network failure; delivery outcome may be unknown', true);
	}
	const result = await response.json<ResendResponse>().catch(() => ({}) as ResendResponse);
	if (response.ok && result.id) return result.id;
	const code = typeof result.name === 'string' && /^[a-z_]{1,80}$/.test(result.name) ? result.name : 'unknown_error';
	const retryable = response.ok || response.status === 408 || response.status === 429 || response.status >= 500 || (response.status === 409 && code !== 'invalid_idempotent_request');
	const retryHeader = response.headers.get('Retry-After');
	let retryAfterSeconds = retryHeader ? (/^\d+$/.test(retryHeader) ? Number(retryHeader) : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000)) : 0;
	if (code === 'daily_quota_exceeded') {
		const tomorrow = new Date();
		tomorrow.setUTCHours(24, 0, 5, 0);
		retryAfterSeconds = Math.max(retryAfterSeconds || 0, Math.ceil((tomorrow.getTime() - Date.now()) / 1000));
	}
	throw new EmailSendError(`Resend HTTP ${response.status}: ${code}`, retryable, Number.isFinite(retryAfterSeconds) ? Math.max(0, retryAfterSeconds) : 0);
}
