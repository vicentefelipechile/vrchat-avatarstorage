// =========================================================================================================
// TWO-FACTOR ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for TOTP two-factor auth, mounted under /api/2fa. Handlers resolve auth,
// parse/validate input, call TwoFactorService, and invalidate the KV session cache on mutations.
// Business rules, secret encryption, and all SQL live in TwoFactorService / UserRepository; domain
// errors map to HTTP via app.onError.
//
// The JSON responses are identical to the legacy handler so the existing frontend works unchanged.
//
// ENDPOINTS
// ---------
// POST /setup   — Generate a secret + backup codes (2FA stays disabled until /verify).
// POST /verify  — Validate a TOTP code, enable 2FA, return one-time backup codes.
// POST /disable — Verify identity + a valid code, then disable 2FA.
// GET  /status  — Whether 2FA is enabled for the authenticated user.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { TwoFactorSetupSchema, TwoFactorVerifySchema, TwoFactorDisableSchema } from '../../validators';
import { TwoFactorService } from '../../services/two-factor-service';
import { fail } from '../responses';

// =========================================================================================================
// Endpoint
// =========================================================================================================

const twoFactor = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// POST /api/2fa/setup
// Setup two-factor authentication for the authenticated user.
// =========================================================================================================

twoFactor.post('/setup', requireAuth, async (c) => {
	const parsed = TwoFactorSetupSchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Invalid input', 400, parsed.error.issues);

	const result = await new TwoFactorService(c.env.DB).setup(c.get('user').username, parsed.data.password, c.env.JWT_SECRET);
	return c.json({ secret: result.secret, otpauthUrl: result.otpauthUrl });
});

// =========================================================================================================
// POST /api/2fa/verify
// Verify the TOTP code, enable 2FA, and return the one-time backup codes.
// =========================================================================================================

twoFactor.post('/verify', requireAuth, async (c) => {
	const parsed = TwoFactorVerifySchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Invalid input', 400, parsed.error.issues);

	const result = await new TwoFactorService(c.env.DB).verify(c.get('user').username, parsed.data.code, c.env.JWT_SECRET);

	// Force active sessions to re-read the (now 2FA-enabled) user on their next request.
	await c.env.VRCSTORAGE_KV.delete(`user:${result.username}`);

	return c.json({ message: '2FA enabled successfully', backupCodes: result.backupCodes });
});

// =========================================================================================================
// POST /api/2fa/disable
// Disable two-factor authentication for the authenticated user.
// =========================================================================================================

twoFactor.post('/disable', requireAuth, async (c) => {
	const parsed = TwoFactorDisableSchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Invalid input', 400, parsed.error.issues);

	const result = await new TwoFactorService(c.env.DB).disable(
		c.get('user').username,
		parsed.data.password,
		parsed.data.code,
		c.env.JWT_SECRET,
	);

	await c.env.VRCSTORAGE_KV.delete(`user:${result.username}`);

	return c.json({ message: '2FA disabled successfully' });
});

// =========================================================================================================
// GET /api/2fa/status
// Return the 2FA status for the authenticated user.
// =========================================================================================================

twoFactor.get('/status', requireAuth, async (c) => {
	const result = await new TwoFactorService(c.env.DB).status(c.get('user').username);
	return c.json({ enabled: result.enabled });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default twoFactor;
