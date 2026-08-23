// =========================================================================================================
// OAUTH ROUTES (v2)
// =========================================================================================================
// HTTP layer for OAuth 2.0 provider login flows, mounted under /api/auth. Currently supports Google;
// adding a provider = add a new GET consent + GET callback pair here. Handlers own the provider
// adapter calls (auth/google.ts), the OAuth-state CSRF token (KV), session creation, and the
// `user:` session cache. The identity resolution + pending-registration rules and all SQL live in
// OAuthService / OAuthRepository / UserRepository.
//
// The redirects and JSON responses are identical to the legacy handler so the frontend and the
// Google redirect URIs work unchanged.
//
// ENDPOINTS
// ---------
// GET  /google           — Redirect to Google's consent screen (stores a CSRF state in KV).
// GET  /google/callback  — Google returns here; resolve identity → session or username selection.
// POST /complete         — Finish a pending registration after the user picks a username.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { setCookie, getCookie } from 'hono/cookie';
import { buildGoogleAuthUrl, exchangeGoogleCode, verifyGoogleIdToken } from '../../auth/google';
import { createSession } from '../../auth';
import { OAuthService } from '../../services/oauth-service';
import { fail } from '../responses';

// =========================================================================================================
// Constants
// =========================================================================================================

const USERNAME_ALPHANUMERIC = /^[a-zA-Z0-9_]+$/;
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const OAUTH_STATE_TTL = 60 * 10; // 10 minutes
// M-3: Cookie name for the pending OAuth registration token. httpOnly prevents JS access.
const PENDING_OAUTH_TOKEN_COOKIE = 'oauth_pending_token';

const COMPLETE_SCHEMA = z.object({
	token: z.string().min(1).max(128),
	username: z.string().min(3).max(32).regex(USERNAME_ALPHANUMERIC, 'Username may only contain letters, numbers, and underscores'),
});

// =========================================================================================================
// Endpoints
// =========================================================================================================

const oauth = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/auth/google
// Redirect the user to Google's OAuth consent screen.
// =========================================================================================================

oauth.get('/google', async (c) => {
	const state = crypto.randomUUID();
	const redirectUri = new URL('/api/auth/google/callback', c.req.url).toString();

	// Store state in KV for CSRF protection (one-time use, 10 min TTL).
	await c.env.VRCSTORAGE_KV.put(`oauth_state:${state}`, '1', { expirationTtl: OAUTH_STATE_TTL });

	return c.redirect(buildGoogleAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state), 302);
});

// =========================================================================================================
// GET /api/auth/google/callback
// Google redirects here after the user grants consent.
// =========================================================================================================

oauth.get('/google/callback', async (c) => {
	const { code, state, error } = c.req.query();

	// User denied consent.
	if (error) return c.redirect('/login?error=oauth_denied', 302);

	// Validate required params.
	if (!code || !state) return fail(c, 'Missing code or state parameter', 400);

	// CSRF: verify + consume the state (one-time use).
	const storedState = await c.env.VRCSTORAGE_KV.get(`oauth_state:${state}`);
	if (!storedState) return fail(c, 'Invalid or expired OAuth state', 400);
	await c.env.VRCSTORAGE_KV.delete(`oauth_state:${state}`);

	try {
		const redirectUri = new URL('/api/auth/google/callback', c.req.url).toString();

		// Exchange code → id_token → verified claims.
		const tokens = await exchangeGoogleCode(code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_SECRET, redirectUri);
		if (!tokens.id_token) throw new Error('Google did not return an id_token');
		const claims = await verifyGoogleIdToken(tokens.id_token, c.env.GOOGLE_CLIENT_ID, c.env.VRCSTORAGE_KV);

		const result = await new OAuthService(c.env.DB, c.env.VRCSTORAGE_KV).resolveIdentity({
			provider: 'google',
			providerId: claims.sub,
			email: claims.email ?? null,
			avatarUrl: claims.picture ?? null,
		});

		if (result.status === 'existing') {
			// Known user — create a session and send home.
			await createSession(c, { username: result.username, is_admin: result.is_admin });
			// H-4: Include uuid in KV cache so getAuthUser can validate the cached entry.
			await c.env.VRCSTORAGE_KV.put(
				`user:${result.username}`,
				JSON.stringify({ uuid: result.user_uuid, username: result.username, is_admin: result.is_admin === 1 }),
				{ expirationTtl: SESSION_TTL },
			);
			return c.redirect('/?login=google', 302);
		}

		// New user — set the pending token as an httpOnly cookie (M-3: keep it out of the URL,
		// browser history, and Referer headers) and redirect to the username-selection page.
		setCookie(c, PENDING_OAUTH_TOKEN_COOKIE, result.pendingToken, {
			httpOnly: true,
			secure: true,
			// SameSite=Lax (not Strict): the cookie must survive the redirect from Google's domain.
			sameSite: 'Lax',
			path: '/',
			maxAge: OAUTH_STATE_TTL,
		});
		return c.redirect('/oauth/register', 302);
	} catch (err) {
		console.error('[OAuth /google/callback]', err);
		return c.redirect('/login?error=oauth_failed', 302);
	}
});

// =========================================================================================================
// POST /api/auth/complete
// Called by OAuthRegisterView after the user chooses a username.
// =========================================================================================================

oauth.post('/complete', async (c) => {
	// M-3: Read the pending token from the httpOnly cookie instead of the request body.
	const tokenFromCookie = getCookie(c, PENDING_OAUTH_TOKEN_COOKIE);

	const parsed = COMPLETE_SCHEMA.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	const { token: tokenFromBody, username } = parsed.data;

	// Accept the token from either the cookie (new secure path) or the request body (legacy path).
	// The cookie path is preferred; the body fallback exists for the transition period while the
	// frontend is updated to not send the token in the request body.
	const token = tokenFromCookie ?? tokenFromBody;
	if (!token) return fail(c, 'Missing registration token', 401);

	// Domain errors (Gone 410 / Conflict 409) bubble to app.onError with their status.
	const user = await new OAuthService(c.env.DB, c.env.VRCSTORAGE_KV).completeRegistration(token, username);

	// Expire the pending cookie immediately after consuming the token.
	setCookie(c, PENDING_OAUTH_TOKEN_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 0 });

	// Create a session for the newly registered user.
	// H-4: Include uuid in KV cache so getAuthUser can validate the cached entry.
	await createSession(c, { username: user.username, is_admin: user.is_admin });
	await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify({ uuid: user.user_uuid, username: user.username, is_admin: false }), {
		expirationTtl: SESSION_TTL,
	});

	return c.json({ success: true });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default oauth;
