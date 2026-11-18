// =========================================================================================================
// EMAIL PROXY INTEGRATION TESTS
// =========================================================================================================
// Local D1/R2 and a mocked Resend endpoint; no real mail or provider credentials.
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';
import { createExecutionContext, createMessageBatch, getQueueResult } from 'cloudflare:test';

import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from '../../../src/index';
import { EmailDeliveryRepository } from '../../../src/email/delivery-repository';
import { authenticatedAdmin, cleanProxyBlocks, proxyBodies, replyToken, singleMailbox } from '../../../src/email/message';
import { EmailService } from '../../../src/email/service';
import { sendEmail } from '../../../src/email/resend';
import { renderEmail } from '../../../src/email/template';
import { FAILED_RETENTION_MS, MAX_EMAIL_BYTES, type EmailCollaborators, type EmailDelivery, type IncomingEmail } from '../../../src/email/types';
import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Types
// =========================================================================================================

interface SentPayload {
	from: string;
	to: string[];
	reply_to: string;
	subject: string;
	text: string;
	html?: string;
	headers: Record<string, string>;
	attachments: { filename: string; content: string; content_id?: string }[];
}

// =========================================================================================================
// Helpers
// =========================================================================================================

function collaborators(): EmailCollaborators {
	return { bucket: env.EMAIL_BUCKET, queue: env.EMAIL_QUEUE, adminEmail: 'admin@gmail.com', apiKey: 're_tests_only' };
}

// Response(string).body has native length metadata that would hide the Email Routing failure.
function emailStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
	let offset = 0;
	return new ReadableStream({
		pull(controller) {
			if (offset === bytes.length) return controller.close();
			const end = Math.min(offset + 97, bytes.length);
			controller.enqueue(bytes.slice(offset, end));
			offset = end;
		},
	});
}

function incoming(from = 'person@example.com', to = 'contact@vrcstorage.lat', extra: Record<string, string> = {}, text = 'Hello', html = '<p>Hello <img src="cid:picture"></p>'): IncomingEmail {
	const headers = new Headers({ From: from, To: to, Subject: 'Contact question', 'Message-ID': `<${crypto.randomUUID()}@example.com>`, ...extra });
	const lines = [...headers].map(([key, value]) => `${key}: ${value}`);
	const raw = [
		...lines,
		'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary=mixed', '',
		'--mixed', 'Content-Type: multipart/alternative; boundary=alternative', '',
		'--alternative', 'Content-Type: text/plain; charset=utf-8', '', text,
		'--alternative', 'Content-Type: text/html; charset=utf-8', '', html, '--alternative--',
		'--mixed', 'Content-Type: image/png', 'Content-Disposition: inline; filename="picture.png"', 'Content-ID: <picture>', 'Content-Transfer-Encoding: base64', '', 'aGVsbG8=',
		'--mixed', 'Content-Type: application/pdf', 'Content-Disposition: attachment; filename="document.pdf"', 'Content-Transfer-Encoding: base64', '', 'cGRm', '--mixed--', '',
	].join('\r\n');
	const bytes = new TextEncoder().encode(raw);
	return { from, to, headers, raw: emailStream(bytes), rawSize: bytes.length };
}

function mockResend(status = 200, name?: string) {
	const payloads: SentPayload[] = [];
	const keys: string[] = [];
	const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		expect(String(input)).toBe('https://api.resend.com/emails');
		keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
		payloads.push(await new Response(init?.body).json<SentPayload>());
		return Response.json(status === 200 ? { id: `resend-${payloads.length}` } : { name }, { status });
	});
	return { fetch, payloads, keys };
}

async function delivery(uuid: string): Promise<EmailDelivery> {
	return (await env.DB.prepare('SELECT * FROM email_deliveries WHERE uuid = ?').bind(uuid).first<EmailDelivery>())!;
}

async function failedEmail(): Promise<{ uuid: string; contentKey: string }> {
	const service = new EmailService(env.DB);
	const uuid = (await service.receive(incoming(), collaborators()))!;
	mockResend(422, 'invalid_attachment');
	await service.deliver(uuid, collaborators());
	return { uuid, contentKey: (await delivery(uuid)).content_key! };
}

// =========================================================================================================
// Tests
// =========================================================================================================

afterEach(() => vi.restoreAllMocks());

describe('email proxy routing', () => {
	it('sends a branded HTML alternative even when the original contains only plain text', async () => {
		const service = new EmailService(env.DB);
		const resend = mockResend();
		const uuid = await service.receive(incoming(undefined, undefined, {}, 'Solo texto\n<sin HTML>', ''), collaborators());
		await service.deliver(uuid, collaborators());
		expect(resend.payloads[0].html).toContain('VRCStorage');
		expect(resend.payloads[0].html).toContain('Solo texto<br>&lt;sin HTML&gt;');
		expect(resend.payloads[0].text).not.toContain('[VRCStorage proxy');
	});

	it('stores unknown-length email streams byte-for-byte before admitting the delivery', async () => {
		const input = incoming(undefined, undefined, {}, 'Mensaje con acentos: áéíóú. 日本語');
		const bytes = new Uint8Array(await new Response(input.raw).arrayBuffer());
		const queue = { send: vi.fn(), sendBatch: vi.fn(), metrics: vi.fn() };
		const uuid = await new EmailService(env.DB).receive({ ...input, raw: emailStream(bytes) }, { ...collaborators(), queue });
		const row = await delivery(uuid);
		const stored = await env.EMAIL_BUCKET.get(row.content_key!);
		expect(new Uint8Array(await stored!.arrayBuffer())).toEqual(bytes);
		expect(stored!.size).toBe(input.rawSize);
		expect(row.status).toBe('pending');
		expect(queue.send).toHaveBeenCalledWith({ delivery_uuid: uuid });
	});

	it.each([-1, 1])('does not admit a message whose declared length differs by %s bytes', async (difference) => {
		const input = incoming();
		const queue = { send: vi.fn(), sendBatch: vi.fn(), metrics: vi.fn() };
		await expect(new EmailService(env.DB).receive({ ...input, rawSize: input.rawSize + difference }, { ...collaborators(), queue })).rejects.toThrow();
		expect(queue.send).not.toHaveBeenCalled();
		expect(await env.DB.prepare('SELECT uuid FROM email_deliveries').first()).toBeNull();
		expect((await env.EMAIL_BUCKET.list()).objects).toHaveLength(0);
	});

	it('cancels the incoming stream when R2 rejects the write', async () => {
		const cancel = vi.fn();
		const raw = new ReadableStream<Uint8Array>({
			pull(controller) { controller.enqueue(new Uint8Array(64)); },
			cancel,
		});
		const put = vi.fn().mockRejectedValue(new Error('R2 unavailable'));
		const bucket = new Proxy(env.EMAIL_BUCKET, {
			get(target, property) {
				if (property === 'put') return put;
				const value = Reflect.get(target, property);
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});
		await expect(new EmailService(env.DB).receive({ ...incoming(), raw }, { ...collaborators(), bucket })).rejects.toThrow('R2 unavailable');
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(await env.DB.prepare('SELECT uuid FROM email_deliveries').first()).toBeNull();
	});

	it('preserves HTML, attachments and CID images through a full conversation without exposing the admin address', async () => {
		const service = new EmailService(env.DB);
		const resend = mockResend();
		const initial = incoming('person@example.com', undefined, { 'Reply-To': 'answer@example.net' });
		const sourceId = initial.headers.get('Message-ID');
		const first = (await service.receive(initial, collaborators()))!;
		expect(await service.deliver(first, collaborators())).toBeNull();
		const adminCopy = resend.payloads[0];
		expect(adminCopy.to).toEqual(['admin@gmail.com']);
		expect(adminCopy.html).toContain('VRCStorage');
		expect(adminCopy.html).toContain('person@example.com');
		expect(adminCopy.text).not.toContain('[VRCStorage proxy');
		expect(adminCopy.html).not.toContain('[VRCStorage proxy');
		expect(adminCopy.html).toContain('cid:picture');
		expect(adminCopy.attachments).toEqual(expect.arrayContaining([
			expect.objectContaining({ filename: 'picture.png', content: 'aGVsbG8=', content_id: 'picture' }),
			expect.objectContaining({ filename: 'document.pdf', content: 'cGRm' }),
		]));
		expect(adminCopy.reply_to.split('@')[0].length).toBeLessThanOrEqual(64);
		expect((await delivery(first)).reply_token_hash).not.toContain(replyToken(adminCopy.reply_to)!);
		expect(await env.EMAIL_BUCKET.head(`raw/${first}.eml`)).toBeNull();
		const reply = incoming('admin@gmail.com', adminCopy.reply_to, { 'Authentication-Results': 'mx.cloudflare.net; spf=pass; dkim=pass; dmarc=pass' }, `My answer\n${adminCopy.text}`, `<p>My answer</p>${adminCopy.html}`);
		const adminSourceId = reply.headers.get('Message-ID');
		const second = (await service.receive(reply, collaborators()))!;
		await service.deliver(second, collaborators());
		const userCopy = resend.payloads[1];
		await expect(service.receive(incoming('stranger@example.com', userCopy.reply_to), collaborators())).rejects.toThrow('does not belong');
		expect(userCopy.to).toEqual(['answer@example.net']);
		expect(userCopy.html).toContain('VRCStorage');
		expect(userCopy.html).toContain('contact@vrcstorage.lat');
		expect(userCopy.headers['In-Reply-To']).toBe(sourceId);
		expect(userCopy.text).toContain('My answer');
		expect(userCopy.text).not.toContain('VRCStorage proxy');
		expect(userCopy.html).not.toContain('VRCStorage proxy');
		expect(JSON.stringify(userCopy)).not.toContain('admin@gmail.com');
		const third = (await service.receive(incoming('answer@example.net', userCopy.reply_to), collaborators()))!;
		await service.deliver(third, collaborators());
		expect(resend.payloads[2].to).toEqual(['admin@gmail.com']);
		expect(resend.payloads[2].headers['In-Reply-To']).toBe(adminSourceId);
		expect((await delivery(first)).conversation_uuid).toBe((await delivery(third)).conversation_uuid);
	});

	it('rejects forged admin replies, unknown tokens, wrong participants and malformed Reply-To', async () => {
		const service = new EmailService(env.DB);
		const resend = mockResend();
		const uuid = (await service.receive(incoming(), collaborators()))!;
		await service.deliver(uuid, collaborators());
		const address = resend.payloads[0].reply_to;
		await expect(service.receive(incoming('admin@gmail.com', address), collaborators())).rejects.toThrow('not authenticated');
		await expect(service.receive(incoming('other@example.com', address, { 'Authentication-Results': 'mx.cloudflare.net; dmarc=pass' }), collaborators())).rejects.toThrow('not authenticated');
		await expect(service.receive(incoming('admin@gmail.com', address, { 'Authentication-Results': 'mx.cloudflare.net; dmarc=fail, attacker.example; dmarc=pass' }), collaborators())).rejects.toThrow('not authenticated');
		await expect(service.receive(incoming('person@example.com', `reply+${'a'.repeat(32)}@vrcstorage.lat`), collaborators())).rejects.toThrow('Invalid reply');
		await expect(service.receive(incoming('person@example.com', undefined, { 'Reply-To': 'one@example.com, two@example.com' }), collaborators())).rejects.toThrow('Exactly one');
		await expect(service.receive(incoming('person@example.com', undefined, { 'Reply-To': 'reply@vrcstorage.lat' }), collaborators())).rejects.toThrow('Invalid contact');
	});

	it('deduplicates SMTP redelivery and concurrent queue deliveries', async () => {
		const service = new EmailService(env.DB);
		const extra = { 'Message-ID': '<same-message@example.com>' };
		const first = await service.receive(incoming(undefined, undefined, extra), collaborators());
		expect(await service.receive(incoming(undefined, undefined, extra), collaborators())).toBe(first);
		const resend = mockResend();
		await Promise.all([service.deliver(first!, collaborators()), service.deliver(first!, collaborators())]);
		expect(resend.fetch).toHaveBeenCalledTimes(1);
		expect((await delivery(first!)).status).toBe('sent');
	});

	it('rejects automated messages, loops, unsupported addresses and oversized emails before persistence', async () => {
		const service = new EmailService(env.DB);
		const automatedHeaders: Record<string, string>[] = [{ 'Auto-Submitted': 'auto-replied' }, { 'List-Id': 'list.example.com' }, { 'X-VRCStorage-Proxy': 'contact' }];
		for (const extra of automatedHeaders) {
			await expect(service.receive(incoming(undefined, undefined, extra), collaborators())).rejects.toThrow();
		}
		await expect(service.receive(incoming(undefined, 'other@vrcstorage.lat'), collaborators())).rejects.toThrow('Unknown contact');
		await expect(service.receive({ ...incoming(), rawSize: MAX_EMAIL_BYTES + 1 }, collaborators())).rejects.toThrow('25 MiB');
		expect((await env.EMAIL_BUCKET.list()).objects).toHaveLength(0);
	});

	it('turns ingress validation errors into SMTP rejection through the Worker email handler', async () => {
		const input = incoming(undefined, 'unknown@vrcstorage.lat');
		const reject = vi.fn();
		await worker.email({ ...input, setReject: reject, forward: vi.fn(), reply: vi.fn() }, env, createExecutionContext());
		expect(reject).toHaveBeenCalledWith('Unknown contact address');
	});

	it('does not classify a deployment configuration error as a permanent sender rejection', async () => {
		const input = incoming();
		await expect(new EmailService(env.DB).receive(input, { ...collaborators(), adminEmail: 'invalid' })).rejects.toMatchObject({ message: 'Email administrator is not configured correctly' });
		expect((await env.EMAIL_BUCKET.list()).objects).toHaveLength(0);
	});
});

describe('email proxy recovery', () => {
	it('keeps the original legacy payload for already queued messages without a template version', async () => {
		const service = new EmailService(env.DB);
		const uuid = await service.receive(incoming(), collaborators());
		const row = await delivery(uuid);
		const original = (await env.EMAIL_BUCKET.get(row.content_key!))!;
		await env.EMAIL_BUCKET.put(row.content_key!, original.body, { customMetadata: { reply_token: original.customMetadata!.reply_token } });
		const resend = mockResend(503, 'service_unavailable');
		await service.deliver(uuid, collaborators());
		expect(resend.payloads[0].text).toContain(`[VRCStorage proxy ${uuid}]`);
		await env.DB.prepare('UPDATE email_deliveries SET next_attempt_at = 0 WHERE uuid = ?').bind(uuid).run();
		await service.deliver(uuid, collaborators());
		expect(resend.payloads[1]).toEqual(resend.payloads[0]);
		expect(resend.keys).toEqual([`contact/${uuid}`, `contact/${uuid}`]);
	});

	it('distinguishes transient original-stream failures from permanent MIME safety-limit failures', async () => {
		const uuid = (await new EmailService(env.DB).receive(incoming(), collaborators()))!;
		const row = await delivery(uuid);
		const conversation = { uuid: row.conversation_uuid, author_email: 'person@example.com', reply_email: 'person@example.com', created_at: Date.now() };
		const broken = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error('R2 disconnected')); } });
		await expect(sendEmail(broken, row, conversation, 'a'.repeat(32), 're_tests_only')).rejects.toMatchObject({ retryable: true });
		const oversized = new Response(`X-Oversized: ${'a'.repeat(256 * 1024)}\r\n\r\nBody`).body!;
		await expect(sendEmail(oversized, row, conversation, 'a'.repeat(32), 're_tests_only')).rejects.toMatchObject({ retryable: false });
	});

	it('recovers a lost D1 acceptance commit without changing the Resend idempotency key', async () => {
		const service = new EmailService(env.DB);
		const uuid = (await service.receive(incoming(), collaborators()))!;
		const resend = mockResend();
		const commit = vi.spyOn(EmailDeliveryRepository.prototype, 'sent').mockRejectedValueOnce(new Error('D1 temporarily unavailable'));
		await expect(service.deliver(uuid, collaborators())).rejects.toThrow('D1 temporarily unavailable');
		expect((await delivery(uuid)).status).toBe('sending');
		expect(await env.EMAIL_BUCKET.head(`raw/${uuid}.eml`)).not.toBeNull();
		await env.DB.prepare('UPDATE email_deliveries SET lease_until = 0 WHERE uuid = ?').bind(uuid).run();
		await service.deliver(uuid, collaborators());
		expect(resend.keys).toEqual([`contact/${uuid}`, `contact/${uuid}`]);
		expect(resend.payloads[0]).toEqual(resend.payloads[1]);
		expect((await delivery(uuid)).status).toBe('sent');
		expect(commit).toHaveBeenCalledTimes(2);
	});

	it('does not delete content when its acceptance lease was replaced', async () => {
		const service = new EmailService(env.DB);
		const uuid = (await service.receive(incoming(), collaborators()))!;
		mockResend();
		vi.spyOn(EmailDeliveryRepository.prototype, 'sent').mockResolvedValue(false);
		await service.deliver(uuid, collaborators());
		expect(await env.EMAIL_BUCKET.head(`raw/${uuid}.eml`)).not.toBeNull();
	});

	it('retries transient errors with an identical payload and idempotency key', async () => {
		const service = new EmailService(env.DB);
		const uuid = (await service.receive(incoming(), collaborators()))!;
		const resend = mockResend(503, 'service_unavailable');
		expect(await service.deliver(uuid, collaborators())).toBeGreaterThan(0);
		expect((await delivery(uuid)).status).toBe('pending');
		await env.DB.prepare('UPDATE email_deliveries SET next_attempt_at = 0 WHERE uuid = ?').bind(uuid).run();
		await service.deliver(uuid, collaborators());
		expect(resend.keys).toEqual([`contact/${uuid}`, `contact/${uuid}`]);
		expect(resend.payloads[0]).toEqual(resend.payloads[1]);
	});

	it('honors daily quota reset and stops sending after the 23-hour deadline', async () => {
		const service = new EmailService(env.DB);
		const uuid = (await service.receive(incoming(), collaborators()))!;
		const resend = mockResend(429, 'daily_quota_exceeded');
		await service.deliver(uuid, collaborators());
		expect((await delivery(uuid)).next_attempt_at).toBeLessThanOrEqual((await delivery(uuid)).deadline_at);
		await env.DB.prepare('UPDATE email_deliveries SET next_attempt_at = 0, deadline_at = ? WHERE uuid = ?').bind(Date.now() - 1, uuid).run();
		await service.deliver(uuid, collaborators());
		expect(resend.fetch).toHaveBeenCalledTimes(1);
		expect((await delivery(uuid)).status).toBe('failed');
	});

	it('recovers queue admission failures from the D1 outbox', async () => {
		const service = new EmailService(env.DB);
		const queue = { send: vi.fn().mockRejectedValue(new Error('offline')), sendBatch: vi.fn(), metrics: vi.fn() };
		const input = { ...collaborators(), queue };
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const uuid = (await service.receive(incoming(), input))!;
		expect((await delivery(uuid)).status).toBe('pending');
		queue.send.mockResolvedValue(undefined);
		await service.maintain(input);
		expect(queue.send).toHaveBeenLastCalledWith({ delivery_uuid: uuid });
		expect(log).toHaveBeenCalled();
	});

	it('fails the whole delivery on unsupported attachments and retains its original for 30 days', async () => {
		const { uuid, contentKey } = await failedEmail();
		const row = await delivery(uuid);
		expect(row.status).toBe('failed');
		expect(row.content_expires_at! - row.failed_at!).toBe(FAILED_RETENTION_MS);
		expect(await env.EMAIL_BUCKET.head(contentKey)).not.toBeNull();
		expect(row.recipient).toBe('admin@gmail.com');
		expect((await new EmailService(env.DB).failures(1)).deliveries[0]).toMatchObject({ content_available: true, recipient: null, direction: 'admin' });
	});

	it('removes expired originals without expiring the conversation or its delivery metadata', async () => {
		const { uuid, contentKey } = await failedEmail();
		await env.DB.prepare('UPDATE email_deliveries SET content_expires_at = ? WHERE uuid = ?').bind(Date.now() - 1, uuid).run();
		const service = new EmailService(env.DB);
		await expect(service.original(uuid, env.EMAIL_BUCKET)).rejects.toThrow('retention has expired');
		await service.maintain(collaborators());
		expect(await env.EMAIL_BUCKET.head(contentKey)).toBeNull();
		expect((await delivery(uuid)).content_key).toBeNull();
		expect(await env.DB.prepare('SELECT uuid FROM email_conversations').first()).not.toBeNull();
	});

	it('dispatches the email queue without affecting the existing upload queue', async () => {
		const uuid = (await new EmailService(env.DB).receive(incoming(), collaborators()))!;
		mockResend();
		const batch = createMessageBatch('vrcstorage-email', [{ id: 'email-job', attempts: 1, timestamp: new Date(), body: { delivery_uuid: uuid } }]);
		const ctx = createExecutionContext();
		await worker.queue(batch, env, ctx);
		expect((await getQueueResult(batch, ctx)).explicitAcks).toEqual(['email-job']);
		expect((await delivery(uuid)).status).toBe('sent');
	});
});

describe('failed email administration', () => {
	it('keeps user recipients visible without exposing the administrator mailbox', async () => {
		const { uuid } = await failedEmail();
		await env.DB.prepare("UPDATE email_deliveries SET direction = 'user', recipient = ? WHERE uuid = ?").bind('person@example.com', uuid).run();
		expect((await new EmailService(env.DB).failures(1)).deliveries[0]).toMatchObject({ recipient: 'person@example.com', direction: 'user' });
	});

	it('requires administrator authentication for listing, downloading and deleting originals', async () => {
		const { uuid, contentKey } = await failedEmail();
		const base = 'http://localhost:8787/api/admin/email';
		for (const [method, path] of [['GET', ''], ['GET', `/${uuid}/original`], ['DELETE', `/${uuid}`]]) {
			expect((await exports.default.fetch(base + path, { method, headers: { Origin: 'https://vrcstorage.lat' } })).status).toBe(401);
		}
		const normal = await createUser('normal');
		expect((await exports.default.fetch(base, { headers: { Cookie: normal.cookie } })).status).toBe(403);
		const admin = await createUser('operator');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const headers = { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat' };
		const listing = await exports.default.fetch(base, { headers });
		expect(listing.headers.get('Cache-Control')).toContain('no-store');
		const json = await listing.text();
		expect(json).not.toContain('reply_token');
		expect(json).not.toContain('content_key');
		expect(json).not.toContain('admin@gmail.com');
		expect(JSON.parse(json).deliveries[0].recipient).toBeNull();
		expect(json).toContain(uuid);
		const original = await exports.default.fetch(`${base}/${uuid}/original`, { headers });
		expect(original.status).toBe(200);
		expect(original.headers.get('Content-Disposition')).toContain('attachment;');
		expect(new TextDecoder().decode(await original.arrayBuffer())).toContain('document.pdf');
		expect((await exports.default.fetch(`${base}/${uuid}`, { method: 'DELETE', headers })).status).toBe(200);
		expect(await env.EMAIL_BUCKET.head(contentKey)).toBeNull();
		expect((await exports.default.fetch(`${base}/${uuid}/original`, { headers })).status).toBe(404);
		expect((await exports.default.fetch(`${base}/${uuid}`, { method: 'DELETE', headers })).status).toBe(200);
	});
});

describe('email message boundaries', () => {
	it('renders a branded HTML body for plain text without exposing markup or internal markers', () => {
		const rendered = renderEmail('person@example.com', 'Primera línea\n<script>alert("hello")</script>');
		expect(rendered.html).toContain('VRCStorage');
		expect(rendered.html).toContain('person@example.com');
		expect(rendered.html).toContain('Primera línea<br>&lt;script&gt;');
		expect(rendered.html).not.toContain('<script>');
		expect(rendered.html).not.toContain('[VRCStorage proxy');
		expect(rendered.text).toBe('VRCStorage\nperson@example.com\n\nPrimera línea\n<script>alert("hello")</script>');
	});

	it('preserves original HTML and removes legacy proxy marks without truncating quoted content', () => {
		const old = proxyBodies(crypto.randomUUID(), 'person@example.com', 'Original message', '<p>Original <img src="cid:picture"></p>');
		const rendered = renderEmail('contact@vrcstorage.lat', `Answer\n${old.text}\nSignature`, `<p>Answer</p>${old.html}<p>Signature</p>`);
		expect(rendered.html).toContain('<img src="cid:picture">');
		expect(rendered.html).toContain('<p>Signature</p>');
		expect(rendered.text).toContain('Signature');
		expect(rendered.html).not.toContain('[VRCStorage proxy');
		expect(rendered.text).not.toContain('[VRCStorage proxy');
	});

	it('only trusts Cloudflare authentication and strips marked proxy blocks without truncating signatures', () => {
		expect(authenticatedAdmin(new Headers({ 'Authentication-Results': 'attacker.example; dmarc=pass' }))).toBe(false);
		expect(authenticatedAdmin(new Headers({ 'Authentication-Results': 'mx.cloudflare.net; dmarc=fail, mx.cloudflare.net; dmarc=pass' }))).toBe(false);
		expect(() => singleMailbox('Group: one@example.com;')).toThrow();
		const bodies = proxyBodies(crypto.randomUUID(), 'person@example.com', 'Original message');
		expect(cleanProxyBlocks(`Answer\n${bodies.text}\nSignature\n──────────────────────────────`)).toContain('Signature\n──────────────────────────────');
		expect(replyToken(`reply+${'a'.repeat(32)}@vrcstorage.lat.evil.example`)).toBeNull();
	});
});
