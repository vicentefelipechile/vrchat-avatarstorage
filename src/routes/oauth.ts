// =========================================================================================================
// OAUTH ROUTES
// =========================================================================================================
// Endpoints for OAuth 2.0 provider login flows.
// Currently supports Google. Adding more providers = add new GET/callback pairs here.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { buildGoogleAuthUrl, exchangeGoogleCode, verifyGoogleIdToken } from '../auth/google';
import { oauthUpsertUser, completeOAuthRegistration, OAuthPendingError, OAuthUsernameError } from '../helpers/oauth-upsert';
import { createSession } from '../auth';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const oauth = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// Constants
// =========================================================================================================

const USERNAME_ALFAUMERIC = new RegExp(/^[a-zA-Z0-9_]+$/)

const OAUTH_COMPLETE_TIME = 7 * 24 * 60 * 60 // One Week

const OAUTH_STATE_TTL = 60 * 10; // 10 minutes

const COMPLETE_SCHEMA = z.object({
	token: z.string().min(1).max(128),
	username: z
		.string()
		.min(3)
		.max(32)
		.regex(USERNAME_ALFAUMERIC, 'Username may only contain letters, numbers, and underscores'),
});

// =========================================================================================================
// GET /api/auth/google
// Redirects the user to Google's OAuth consent screen.
// =========================================================================================================

oauth.get('/google', async (c) => {
	const state = crypto.randomUUID();
	const redirectUri = new URL('/api/auth/google/callback', c.req.url).toString();

	// Store state in KV for CSRF protection
	await c.env.VRCSTORAGE_KV.put(`oauth_state:${state}`, '1', { expirationTtl: OAUTH_STATE_TTL });

	const authUrl = buildGoogleAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state);
	return c.redirect(authUrl, 302);
});

// =========================================================================================================
// GET /api/auth/google/callback
// Google redirects here after the user grants consent.
// =========================================================================================================

oauth.get('/google/callback', async (c) => {
	const { code, state, error } = c.req.query();

	// User denied consent
	if (error) {
		return c.redirect('/login?error=oauth_denied', 302);
	}

	// Validate required params
	if (!code || !state) {
		return c.json({ error: 'Missing code or state parameter' }, 400);
	}

	// CSRF: verify state
	const storedState = await c.env.VRCSTORAGE_KV.get(`oauth_state:${state}`);
	if (!storedState) {
		return c.json({ error: 'Invalid or expired OAuth state' }, 400);
	}
	// State is one-time use
	await c.env.VRCSTORAGE_KV.delete(`oauth_state:${state}`);

	try {
		const redirectUri = new URL('/api/auth/google/callback', c.req.url).toString();

		// Exchange code → id_token
		const { id_token } = await exchangeGoogleCode(code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, redirectUri);

		// Verify id_token → claims
		const claims = await verifyGoogleIdToken(id_token, c.env.GOOGLE_CLIENT_ID, c.env.VRCSTORAGE_KV);

		// Upsert: existing account or pending registration
		const result = await oauthUpsertUser(c.env.DB, c.env.VRCSTORAGE_KV, {
			provider: 'google',
			providerId: claims.sub,
			email: claims.email ?? null,
			avatarUrl: claims.picture ?? null,
		});

		if (result.status === 'existing') {
			// Known user — create session and send home
			await createSession(c, { username: result.username, is_admin: result.is_admin });
			await c.env.VRCSTORAGE_KV.put(
				`user:${result.username}`,
				JSON.stringify({ username: result.username, is_admin: result.is_admin === 1 }),
				{ expirationTtl: 60 * 60 * 24 * 7 },
			);
			return c.redirect('/?login=google', 302);
		}

		// New user — redirect to username selection page
		return c.redirect(`/register/oauth?token=${result.pendingToken}`, 302);
	} catch (err) {
		console.error('[OAuth /google/callback]', err);
		return c.redirect('/login?error=oauth_failed', 302);
	}
});

// =============================================================================
// POST /api/auth/complete
// Called by OAuthRegisterView after the user chooses a username.
// =============================================================================

oauth.post('/complete', async (c) => {
	const body = await c.req.json();
	const parsed = COMPLETE_SCHEMA.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'Validation error', details: parsed.error.issues }, 400);
	}

	const { token, username } = parsed.data;

	try {
		const user = await completeOAuthRegistration(c.env.DB, c.env.VRCSTORAGE_KV, token, username);

		// Create session for the newly registered user
		await createSession(c, { username: user.username, is_admin: user.is_admin });
		await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify({ username: user.username, is_admin: false }), {
			expirationTtl: OAUTH_COMPLETE_TIME,
		});

		return c.json({ success: true });
	} catch (err) {
		if (err instanceof OAuthPendingError) {
			return c.json({ error: 'Registration session expired. Please sign in with Google again.' }, 410);
		}
		if (err instanceof OAuthUsernameError) {
			return c.json({ error: 'Username already taken' }, 409);
		}
		console.error('[OAuth /complete]', err);
		return c.json({ error: 'Registration failed' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default oauth;
