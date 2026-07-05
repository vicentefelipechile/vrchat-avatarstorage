// =========================================================================================================
// ADMIN ROUTES (v2)
// =========================================================================================================
// HTTP layer for the admin dashboard + moderation, mounted under /api/admin. Every endpoint is
// admin-gated with requireAdmin (which resolves the user, so handlers read c.get('user')). Handlers
// own the env collaborators — R2 buckets, KV cache, UPLOAD_QUEUE — and hand them to AdminService,
// which owns the payload shaping / filter math and delegates all SQL to AdminRepository. Domain
// errors map to HTTP via app.onError.
//
// The JSON responses are identical to the legacy handlers so the existing frontend works unchanged.
//
// ENDPOINTS
// ---------
// GET  /pending                       — Pending (inactive) resources.
// POST /resource/:uuid/approve        — Activate a pending resource.
// POST /resource/:uuid/reject         — Delete a pending resource + its R2 media.
// POST /resource/:uuid/deactivate     — Deactivate an approved resource.
// GET  /stats/orphaned-media          — Orphaned-media statistics (no deletion).
// POST /cleanup/orphaned-media        — Delete orphaned media from R2 + DB.
// POST /cache/clear/:username         — Clear a user's KV session cache.
// POST /users/:username/role          — Change a user's admin role (+ KV invalidation).
// GET  /stats                         — Consolidated dashboard metrics.
// GET  /users?q=&page=                — Paginated user listing.
// GET  /resources?category=&status=&q=&page= — Paginated resource listing.
// POST /media/generate-variants       — Enqueue variant backfill for images without variants.
// POST /media/unify-keys?confirm=&limit= — One-off: make every media's R2 key equal its uuid (dry-run by default).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAdmin, type AuthVariables } from '../middleware/auth';
import { AdminService } from '../../services/admin-service';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const admin = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Every admin endpoint requires an admin session.
admin.use('*', requireAdmin);

// =========================================================================================================
// GET /api/admin/pending
// Get all pending resources.
// =========================================================================================================

admin.get('/pending', async (c) => {
	const mapped = await new AdminService(c.env.DB).listPending();
	return c.json(mapped);
});

// =========================================================================================================
// POST /api/admin/resource/:uuid/approve
// Approve a pending resource.
// =========================================================================================================

admin.post('/resource/:uuid/approve', async (c) => {
	await new AdminService(c.env.DB).approveResource(c.req.param('uuid'), c.env.VRCSTORAGE_KV);
	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/admin/resource/:uuid/reject
// Reject and delete a pending resource.
// =========================================================================================================

admin.post('/resource/:uuid/reject', async (c) => {
	await new AdminService(c.env.DB).rejectResource(c.req.param('uuid'), c.env.BUCKET);
	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/admin/resource/:uuid/deactivate
// Deactivate an approved resource.
// =========================================================================================================

admin.post('/resource/:uuid/deactivate', async (c) => {
	await new AdminService(c.env.DB).deactivateResource(c.req.param('uuid'), c.env.VRCSTORAGE_KV);
	return c.json({ success: true });
});

// =========================================================================================================
// GET /api/admin/stats/orphaned-media
// Get statistics of orphaned media files without deleting them.
// =========================================================================================================

admin.get('/stats/orphaned-media', async (c) => {
	const stats = await new AdminService(c.env.DB).orphanedMediaStats();
	return c.json(stats);
});

// =========================================================================================================
// POST /api/admin/cleanup/orphaned-media
// Clean up orphaned media files older than 24 hours.
// =========================================================================================================

admin.post('/cleanup/orphaned-media', async (c) => {
	const deleted = await new AdminService(c.env.DB).cleanupOrphanedMedia(c.env.BUCKET, c.env.MEDIA_BUCKET);
	return c.json({ success: true, deleted, message: `Cleaned up ${deleted} orphaned files` });
});

// =========================================================================================================
// POST /api/admin/cache/clear/:username
// Clear the cache for a specific user. Useful for refreshing admin permissions.
// =========================================================================================================

admin.post('/cache/clear/:username', async (c) => {
	const targetUsername = c.req.param('username');
	await c.env.VRCSTORAGE_KV.delete(`user:${targetUsername}`);
	return c.json({ success: true, message: `Cache cleared for user ${targetUsername}` });
});

// =========================================================================================================
// POST /api/admin/users/:username/role
// Update the is_admin flag for a target user and immediately invalidate their KV session cache.
// Without KV invalidation, a demoted admin could retain elevated access for up to 7 days.
// =========================================================================================================

admin.post('/users/:username/role', async (c) => {
	const targetUsername = c.req.param('username');

	let body: { is_admin?: unknown };
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON body', 400);
	}

	const isAdmin = await new AdminService(c.env.DB).changeRole(c.get('user').username, targetUsername, body.is_admin);

	// Critical: invalidate KV cache so the role change takes effect immediately (else up to 7 days stale).
	await c.env.VRCSTORAGE_KV.delete(`user:${targetUsername}`);

	return c.json({ success: true, username: targetUsername, is_admin: isAdmin });
});

// =========================================================================================================
// GET /api/admin/stats
// Consolidated metrics for the admin dashboard overview section.
// =========================================================================================================

admin.get('/stats', async (c) => {
	const stats = await new AdminService(c.env.DB).fetchStats();
	return c.json(stats);
});

// =========================================================================================================
// GET /api/admin/users?q=&page=
// List users with optional search by username.
// =========================================================================================================

admin.get('/users', async (c) => {
	const q = c.req.query('q') || '';
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));

	const { rows, pagination } = await new AdminService(c.env.DB).listUsers(q, page);
	return c.json({ users: rows, pagination });
});

// =========================================================================================================
// GET /api/admin/resources?category=&status=&q=&page=
// List all resources with optional filters.
// =========================================================================================================

admin.get('/resources', async (c) => {
	const q = c.req.query('q') || '';
	const category = c.req.query('category') || '';
	const status = c.req.query('status') || '';
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));

	const { rows, pagination } = await new AdminService(c.env.DB).listResources(q, category, status, page);
	return c.json({ resources: rows, pagination });
});

// =========================================================================================================
// POST /api/admin/media/generate-variants
// Backfill image variants for all existing images that have no variants yet.
// =========================================================================================================

admin.post('/media/generate-variants', async (c) => {
	const enqueued = await new AdminService(c.env.DB).backfillVariants(c.env.UPLOAD_QUEUE);
	return c.json({ enqueued });
});

// =========================================================================================================
// POST /api/admin/media/unify-keys?confirm=true&limit=N
// One-off maintenance migration: collapse the media uuid/r2_key pair so every object's R2 key is its
// uuid. Copies originals in BUCKET to the uuid key, rewrites free-text references, repoints the column,
// then deletes the old object. Idempotent + safe to re-run. Defaults to a DRY RUN (no writes) that also
// counts the text references it would touch; pass ?confirm=true to actually migrate. `limit` caps rows
// per pass (Worker CPU budget) — re-run until the response's `remaining` is 0. Admin-gated.
// =========================================================================================================

admin.post('/media/unify-keys', async (c) => {
	const confirm = c.req.query('confirm') === 'true';
	const limitRaw = parseInt(c.req.query('limit') || '', 10);
	const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined;

	const report = await new AdminService(c.env.DB).unifyMediaKeys(c.env.BUCKET, { dryRun: !confirm, limit });
	return c.json(report);
});

// =========================================================================================================
// Export
// =========================================================================================================

export default admin;
