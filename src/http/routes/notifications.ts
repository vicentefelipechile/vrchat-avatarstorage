// =========================================================================================================
// NOTIFICATION ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for browser notification preferences, mounted at /api/notifications.
// Requires authentication. The service owns validation and defaults; the repository owns SQL.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { NotificationService } from '../../services/notification-service';
import { z } from 'zod';
import { AVATAR_TYPE, ASSETS_TYPE } from '../../validators';

// =========================================================================================================
// Validation
// =========================================================================================================

const PrefsSchema = z.object({
	enabled: z.boolean(),
	avatars_enabled: z.boolean(),
	avatar_types: z.array(z.enum(AVATAR_TYPE as unknown as [string, ...string[]])).nullable().optional(),
	asset_types: z.array(z.enum(ASSETS_TYPE as unknown as [string, ...string[]])).nullable().optional(),
	assets_enabled: z.boolean(),
	clothes_enabled: z.boolean(),
});

// =========================================================================================================
// Endpoints
// =========================================================================================================

const notifications = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/notifications/preferences
// Return the caller's notification preferences (defaults if never saved).
// =========================================================================================================

notifications.get('/preferences', requireAuth, async (c) => {
	const user = c.get('user');
	const prefs = await new NotificationService(c.env.DB).getPrefs(user.uuid);
	return c.json(prefs);
});

// =========================================================================================================
// PUT /api/notifications/preferences
// Persist the caller's notification preferences.
// =========================================================================================================

notifications.put('/preferences', requireAuth, async (c) => {
	const user = c.get('user');
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON' }, 400);
	}
	const parsed = PrefsSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: 'Validation error', details: parsed.error.issues }, 400);

	const d = parsed.data;
	const dto = {
		enabled: d.enabled,
		avatars_enabled: d.avatars_enabled,
		avatar_types: d.avatar_types ?? null,
		assets_enabled: d.assets_enabled,
		asset_types: d.asset_types ?? null,
		clothes_enabled: d.clothes_enabled,
		updated_at: null as number | null,
	};

	const saved = await new NotificationService(c.env.DB).setPrefs(user.uuid, dto);
	return c.json(saved);
});

// =========================================================================================================
// Export
// =========================================================================================================

export default notifications;
