// =========================================================================================================
// DRIVE ROUTES (v2)
// =========================================================================================================
// Export-only Drive transfer (R2 -> user's Google Drive via Queues).
// Drive auth is fully optional and incremental: login never asks for drive.file.
// User must explicitly click "Save to Drive" / "Connect Drive" to grant drive.file
// (offline + consent) — the binding is per-user, with an optional default folder
// where every transfer is saved. Folder is optional; fallback is root (My Drive).
// Queue handles the resumable upload out-of-band (DRIVE_QUEUE).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { DriveService } from '../../services/drive-service';
import { fail } from '../responses';
import { buildGoogleDriveAuthUrl, exchangeGoogleCode } from '../../auth/google';
import { encryptSecret } from '../../auth/2fa';

// =========================================================================================================
// Constants
// =========================================================================================================

const DRIVE_STATE_TTL = 60 * 10; // 10 minutes

const TRANSFER_SCHEMA = z.object({
	r2_key: z.string().min(1).max(256),
	folder_id: z.string().min(1).max(256).optional().nullable(),
});

const FOLDER_SCHEMA = z.object({
	folder_id: z.string().min(1).max(256).nullable(),
	folder_name: z.string().min(1).max(256).nullable(),
});

// =========================================================================================================
// Endpoints
// =========================================================================================================

const drive = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/drive/status
// Returns whether Drive is linked and the default folder (for Settings + ItemView).
// =========================================================================================================

drive.get('/status', requireAuth, async (c) => {
	const user = c.get('user');
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	const status = await svc.getLinkStatus(user.uuid);
	return c.json(status);
});

// =========================================================================================================
// GET /api/drive/auth — Redirect to Google's Drive consent (drive.file offline)
// =========================================================================================================

drive.get('/auth', requireAuth, async (c) => {
	const state = crypto.randomUUID();
	const redirectUri = new URL('/api/drive/callback', c.req.url).toString();
	await c.env.VRCSTORAGE_KV.put(`drive_state:${state}`, c.get('user').uuid, { expirationTtl: DRIVE_STATE_TTL });
	return c.redirect(buildGoogleDriveAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state), 302);
});

// =========================================================================================================
// GET /api/drive/callback — Google redirects here after Drive consent
// =========================================================================================================

drive.get('/callback', async (c) => {
	const { code, state, error } = c.req.query();
	if (error) return c.redirect('/settings?drive=denied', 302);
	if (!code || !state) return fail(c, 'Missing code or state', 400);

	const userUuid = await c.env.VRCSTORAGE_KV.get(`drive_state:${state}`);
	if (!userUuid) return fail(c, 'Invalid or expired Drive state', 400);
	await c.env.VRCSTORAGE_KV.delete(`drive_state:${state}`);

	try {
		const redirectUri = new URL('/api/drive/callback', c.req.url).toString();
		const tokens = await exchangeGoogleCode(code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, redirectUri);
		if (!tokens.refresh_token) {
			// Google only returns refresh_token on first consent; if missing, user already linked — keep existing.
			return c.redirect('/settings?drive=linked', 302);
		}
		// Encrypt and persist via DriveService (reuse JWT_SECRET as encryption key, same as 2FA)
		const encrypted = await encryptSecret(tokens.refresh_token, c.env.JWT_SECRET);
		const { OAuthRepository } = await import('../../repositories/oauth-repository');
		const repo = new OAuthRepository(c.env.DB);
		// Ensure user has a google provider row; if not, create a placeholder link via direct SQL check
		const existing = await repo.findProviderByUser(userUuid, 'google');
		if (!existing) {
			// User never logged in via Google — still allow Drive link: insert row with provider_id = userUuid
			await c.env.DB.prepare('INSERT OR IGNORE INTO user_oauth_providers (user_uuid, provider, provider_id) VALUES (?, ?, ?)').bind(userUuid, 'google', userUuid).run();
		}
		await repo.updateDriveTokens(userUuid, 'google', encrypted, tokens.scope ?? 'https://www.googleapis.com/auth/drive.file');
		return c.redirect('/settings?drive=linked', 302);
	} catch (err) {
		console.error('[Drive /callback]', err);
		return c.redirect('/settings?drive=error', 302);
	}
});

// =========================================================================================================
// GET /api/drive/folders — List folders for picker (proxy to Drive, browsable)
// =========================================================================================================

drive.get('/folders', requireAuth, async (c) => {
	const parentId = c.req.query('parentId') ?? null;
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	try {
		const folders = await svc.listFolders(c.get('user').uuid, parentId);
		return c.json({ folders, parentId });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error';
		if (msg.includes('insufficient') || msg.includes('scope insufficient')) return fail(c, 'Drive scope insufficient — desconecta y vuelve a conectar Drive en Ajustes.', 403);
		const status = msg.includes('Drive not linked') ? 403 : 500;
		return fail(c, msg, status);
	}
});

// =========================================================================================================
// POST /api/drive/folders/ensure — Create or reuse folder (in current parent)
// =========================================================================================================

drive.post('/folders/ensure', requireAuth, async (c) => {
	const parsed = z.object({ name: z.string().min(1).max(100), parentId: z.string().max(256).nullable().optional() }).safeParse(await c.req.json().catch(() => ({})));
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	try {
		const folder = await svc.ensureFolder(c.get('user').uuid, parsed.data.name, parsed.data.parentId ?? null);
		await svc.setDefaultFolder(c.get('user').uuid, folder.id, folder.name);
		return c.json(folder);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error';
		return fail(c, msg, 500);
	}
});

// =========================================================================================================
// POST /api/drive/folders/create — Create folder with custom name in current parent
// =========================================================================================================

drive.post('/folders/create', requireAuth, async (c) => {
	const parsed = z.object({ name: z.string().min(1).max(100), parentId: z.string().max(256).nullable().optional() }).safeParse(await c.req.json().catch(() => ({})));
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	try {
		const folder = await svc.ensureFolder(c.get('user').uuid, parsed.data.name, parsed.data.parentId ?? null);
		return c.json(folder);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error';
		return fail(c, msg, 500);
	}
});

// =========================================================================================================
// POST /api/drive/folder — Set/clear default folder (optional)
// =========================================================================================================

drive.post('/folder', requireAuth, async (c) => {
	const parsed = FOLDER_SCHEMA.safeParse(await c.req.json().catch(() => ({})));
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);
	const { folder_id, folder_name } = parsed.data;
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	try {
		await svc.setDefaultFolder(c.get('user').uuid, folder_id ?? null, folder_name ?? null);
		return c.json({ success: true, folder_id, folder_name });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error';
		const status = msg.includes('Drive not linked') ? 403 : 400;
		return fail(c, msg, status);
	}
});

// =========================================================================================================
// DELETE /api/drive/link — Unlink Drive (clear tokens + folder + KV cache)
// =========================================================================================================

drive.delete('/link', requireAuth, async (c) => {
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	const raw = await svc.getDecryptedRefreshToken(c.get('user').uuid);
	await svc.clearLink(c.get('user').uuid, raw ?? undefined);
	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/drive/transfer — Enqueue R2 -> Drive transfer
// =========================================================================================================

drive.post('/transfer', requireAuth, async (c) => {
	const parsed = TRANSFER_SCHEMA.safeParse(await c.req.json().catch(() => ({})));
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);
	const { r2_key, folder_id } = parsed.data;
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	try {
		// folder_id override only respected if user explicitly passed it; otherwise use stored default.
		// For security we ignore client folder_id unless it matches the stored preference flow — here we allow
		// override but DriveService will resolve to stored default if null.
		const res = await svc.createTransfer(c.get('user').uuid, r2_key, folder_id ?? null);
		return c.json(res, 202);
	} catch (e) {
		if (e instanceof Error && e.message.includes('Drive not linked')) return fail(c, e.message, 403);
		throw e;
	}
});

// =========================================================================================================
// GET /api/drive/jobs/:id — Poll single job status
// =========================================================================================================

drive.get('/jobs/:id', requireAuth, async (c) => {
	const id = c.req.param('id')!;
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	const job = await svc.getJob(c.get('user').uuid, id);
	return c.json(job);
});

// =========================================================================================================
// GET /api/drive/jobs — List user's recent jobs
// =========================================================================================================

drive.get('/jobs', requireAuth, async (c) => {
	const svc = new DriveService(c.env.DB, c.env.VRCSTORAGE_KV, c.env.BUCKET, c.env.DRIVE_QUEUE, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, c.env.JWT_SECRET);
	const jobs = await svc.listJobs(c.get('user').uuid);
	return c.json(jobs);
});

// =========================================================================================================
// Export
// =========================================================================================================

export default drive;
