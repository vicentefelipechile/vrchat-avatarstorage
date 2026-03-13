// ============================================================================
// GOOGLE OAUTH HELPER
// ============================================================================
// Pure functions for the Google OAuth 2.0 Authorization Code flow.
// All state management (KV caching, session creation) is handled in the route.
// ============================================================================

export interface GoogleClaims {
	sub: string; // unique Google user ID
	email: string;
	email_verified: boolean;
	name: string;
	picture: string;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const JWKS_KV_KEY = 'jwks:google';
const JWKS_TTL_SECONDS = 60 * 60; // 1 hour

// ----------------------------------------------------------------------------
// Step 1 — Build the redirect URL
// ----------------------------------------------------------------------------

export function buildGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		access_type: 'online',
		prompt: 'select_account',
	});
	return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ----------------------------------------------------------------------------
// Step 2 — Exchange authorization code for tokens
// ----------------------------------------------------------------------------

export async function exchangeGoogleCode(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string,
): Promise<{ id_token: string }> {
	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Google token exchange failed: ${err}`);
	}

	const data = (await res.json()) as { id_token?: string };
	if (!data.id_token) throw new Error('Google did not return an id_token');
	return { id_token: data.id_token };
}

// ----------------------------------------------------------------------------
// Step 3 — Verify the RS256 ID token
// ----------------------------------------------------------------------------

interface JwksKey {
	kid: string;
	n: string;
	e: string;
	alg: string;
	use: string;
}

interface JwksResponse {
	keys: JwksKey[];
}

/**
 * Fetches Google's public JWKS, using KV as a cache.
 * TTL is 1 hour — Google rotates keys rarely but we respect standard caching.
 */
async function getGoogleJwks(kv: KVNamespace): Promise<JwksKey[]> {
	const cached = await kv.get<JwksResponse>(JWKS_KV_KEY, 'json');
	if (cached) return cached.keys;

	const res = await fetch(GOOGLE_JWKS_URL);
	if (!res.ok) throw new Error('Failed to fetch Google JWKS');

	const jwks = (await res.json()) as JwksResponse;
	await kv.put(JWKS_KV_KEY, JSON.stringify(jwks), { expirationTtl: JWKS_TTL_SECONDS });
	return jwks.keys;
}

/** Base64url → Uint8Array */
function base64urlToBytes(b64: string): Uint8Array {
	const b64standard = b64.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(b64standard);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Verifies a Google ID token (RS256) against Google's public JWKS.
 * Returns the verified claims or throws if invalid.
 */
export async function verifyGoogleIdToken(idToken: string, clientId: string, kv: KVNamespace): Promise<GoogleClaims> {
	// 1. Split token parts
	const parts = idToken.split('.');
	if (parts.length !== 3) throw new Error('Invalid JWT structure');

	const [headerB64, payloadB64, signatureB64] = parts;

	// 2. Decode header to get kid
	const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))) as { kid: string; alg: string };
	if (header.alg !== 'RS256') throw new Error(`Unexpected JWT algorithm: ${header.alg}`);

	// 3. Find matching key
	const keys = await getGoogleJwks(kv);
	const key = keys.find((k) => k.kid === header.kid);
	if (!key) {
		// Key not in cache — bust cache and retry once
		await kv.delete(JWKS_KV_KEY);
		const freshKeys = await getGoogleJwks(kv);
		const retryKey = freshKeys.find((k) => k.kid === header.kid);
		if (!retryKey) throw new Error('Google JWKS key not found for kid: ' + header.kid);
		return verifyWithKey(retryKey, headerB64, payloadB64, signatureB64, clientId);
	}

	return verifyWithKey(key, headerB64, payloadB64, signatureB64, clientId);
}

async function verifyWithKey(
	key: JwksKey,
	headerB64: string,
	payloadB64: string,
	signatureB64: string,
	clientId: string,
): Promise<GoogleClaims> {
	// 1. Import RSA public key from JWK
	const cryptoKey = await crypto.subtle.importKey(
		'jwk',
		{ kty: 'RSA', n: key.n, e: key.e, alg: 'RS256', use: 'sig' },
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['verify'],
	);

	// 2. Verify signature
	const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
	const signature = base64urlToBytes(signatureB64);
	const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signedData);
	if (!valid) throw new Error('Google ID token signature is invalid');

	// 3. Decode and validate claims
	const claims = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as GoogleClaims & {
		iss: string;
		aud: string;
		exp: number;
	};

	const now = Math.floor(Date.now() / 1000);
	if (claims.exp < now) throw new Error('Google ID token has expired');
	if (claims.aud !== clientId) throw new Error('Google ID token audience mismatch');
	if (!['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss)) {
		throw new Error('Google ID token issuer mismatch');
	}

	return {
		sub: claims.sub,
		email: claims.email,
		email_verified: claims.email_verified,
		name: claims.name,
		picture: claims.picture,
	};
}
