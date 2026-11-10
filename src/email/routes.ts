// =========================================================================================================
// EMAIL ADMIN ROUTES
// =========================================================================================================
// Failed delivery metadata and private original downloads; email HTML is never rendered by the app.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { z } from 'zod';

import { requireAdmin, type AuthVariables } from '../http/middleware/auth';
import { EmailService } from './service';

// =========================================================================================================
// Validation
// =========================================================================================================

const PAGE_SCHEMA = z.coerce.number().int().min(1).max(100_000).default(1);
const UUID_SCHEMA = z.uuid();

// =========================================================================================================
// Endpoints
// =========================================================================================================

const emailRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
emailRoutes.use('*', requireAdmin);
emailRoutes.use('*', async (c, next) => {
	c.header('Cache-Control', 'private, no-store');
	await next();
});

// =========================================================================================================
// GET /api/admin/email
// Paginated failed deliveries without bodies or routing capabilities.
// =========================================================================================================

emailRoutes.get('/', async (c) => {
	const page = PAGE_SCHEMA.parse(c.req.query('page'));
	return c.json(await new EmailService(c.env.DB).failures(page));
});

// =========================================================================================================
// GET /api/admin/email/:uuid/original
// Download an original MIME email within its failed-content retention period.
// =========================================================================================================

emailRoutes.get('/:uuid/original', async (c) => {
	const uuid = UUID_SCHEMA.parse(c.req.param('uuid'));
	const original = await new EmailService(c.env.DB).original(uuid, c.env.EMAIL_BUCKET);
	return new Response(original.body, {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `attachment; filename="email-${uuid}.eml"`,
			'Content-Length': String(original.size),
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff',
		},
	});
});

// =========================================================================================================
// DELETE /api/admin/email/:uuid
// Delete failed email content, retaining minimal delivery metadata.
// =========================================================================================================

emailRoutes.delete('/:uuid', async (c) => {
	const uuid = UUID_SCHEMA.parse(c.req.param('uuid'));
	await new EmailService(c.env.DB).deleteFailure(uuid, c.env.EMAIL_BUCKET);
	return c.json({ success: true });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default emailRoutes;
