// =========================================================================================================
// GOOGLE OAUTH HELPER
// =========================================================================================================
// Pure functions for the Google OAuth 2.0 Authorization Code flow.
// All state management (KV caching, session creation) is handled in the route.
//
// =========================================================================================================
// Login Flow Overview
// =========================================================================================================
//
//  Browser                     VRCStorage Worker                    Google
//  ───────                     ─────────────────                    ──────
//    │                                │                                │
//    │  GET /auth/google/login        │                                │
//    │ ─────────────────────────────► │                                │
//    │                                │  buildGoogleAuthUrl()          │
//    │                                │  (generate state + store in KV)│
//    │  302 → accounts.google.com     │                                │
//    │ ◄───────────────────────────── │                                │
//    │                                │                                │
//    │  User grants consent                                            │
//    │ ──────────────────────────────────────────────────────────────► │
//    │                                │                                │
//    │  GET /auth/google/callback                                      │
//    │    ?code=AUTH_CODE             │                                │
//    │    &state=RANDOM_STATE         │                                │
//    │ ─────────────────────────────► │                                │
//    │                                │  1. Verify state (CSRF check)  │
//    │                                │  2. exchangeGoogleCode()       │
//    │                                │ ─────────────────────────────► │
//    │                                │       POST /token              │
//    │                                │ ◄───────────────────────────── │
//    │                                │     { id_token: JWT }          │
//    │                                │  3. verifyGoogleIdToken()      │
//    │                                │     ├─ fetch JWKS (KV-cached)  │
//    │                                │     ├─ match key by kid        │
//    │                                │     ├─ verify RS256 signature  │
//    │                                │     └─ validate iss/aud/exp    │
//    │                                │  4. Upsert user in D1          │
//    │                                │     (oauth-upsert.ts)          │
//    │                                │  5. Create session cookie      │
//    │  302 → /                       │                                │
//    │ ◄───────────────────────────── │                                │
//
//  This module is responsible only for steps marked with a function name above.
//  Steps 1, 4, and 5 are handled entirely inside src/routes/oauth.ts.
//
// =========================================================================================================
// References
// =========================================================================================================
//   OAuth 2.0 flow:     https://developers.google.com/identity/protocols/oauth2/web-server
//   OpenID Connect:     https://developers.google.com/identity/openid-connect/openid-connect
//   Token endpoint:     https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
//   JWKS verification:  https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
//   Web Crypto API:     https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
// =========================================================================================================

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

// =========================================================================================================
// Helpers
// =========================================================================================================

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
 * Fetches Google's public JWKS, using KV as a 1-hour cache.
 * Google rotates keys rarely; the TTL is a reasonable balance between freshness and latency.
 *
 * @param kv - The KV namespace used to cache the JWKS response.
 * @returns The list of public JWK keys from Google's JWKS endpoint.
 * @throws If the fetch to Google's JWKS endpoint fails.
 *
 * @see https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
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

/**
 * Converts a Base64url-encoded string to a Uint8Array.
 * Required because the Web Crypto API operates on raw byte arrays, not Base64 strings.
 *
 * @param b64 - A Base64url-encoded string (e.g. a JWT segment).
 * @returns The decoded bytes as a Uint8Array.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
 */
function base64urlToBytes(b64: string): Uint8Array {
	const b64standard = b64.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(b64standard);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Imports the RSA public key from a JWKS entry and verifies the JWT signature,
 * then decodes and validates the standard OpenID Connect claims (iss, aud, exp).
 *
 * @param key       - The JWK entry whose `kid` matches the token header.
 * @param headerB64 - Base64url-encoded JWT header segment.
 * @param payloadB64 - Base64url-encoded JWT payload segment.
 * @param signatureB64 - Base64url-encoded JWT signature segment.
 * @param clientId  - The OAuth 2.0 client ID; validated against the `aud` claim.
 * @returns The verified {@link GoogleClaims} extracted from the token payload.
 * @throws If the RSA signature is invalid, the token is expired, or the `aud`/`iss` claims mismatch.
 *
 * @see https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
 */
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

// =========================================================================================================
// Exports
// =========================================================================================================

/**
 * Builds the Google OAuth 2.0 authorization URL that the user is redirected to.
 * Requests the `openid email profile` scopes for OpenID Connect identity.
 *
 * @param clientId    - The OAuth 2.0 client ID from Google Cloud Console.
 * @param redirectUri - The URI Google will redirect back to after consent.
 * @param state       - An opaque CSRF token stored in session and verified on callback.
 * @returns The fully-constructed authorization URL.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient
 */
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

/**
 * Exchanges a Google authorization code for an ID token via the token endpoint.
 * Only the `id_token` is returned; the access token and refresh token are discarded
 * because we only need identity claims (OpenID Connect), not API access.
 *
 * @param code         - The authorization code returned by Google on the callback.
 * @param clientId     - The OAuth 2.0 client ID.
 * @param clientSecret - The OAuth 2.0 client secret.
 * @param redirectUri  - Must exactly match the URI used in the authorization request.
 * @returns An object containing the signed `id_token` JWT.
 * @throws If Google returns a non-2xx response or does not include an `id_token`.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
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

/**
 * Verifies a Google ID token (RS256) against Google's public JWKS.
 *
 * Validation steps performed:
 * 1. Parse and validate the JWT structure (3 segments).
 * 2. Confirm the algorithm is RS256.
 * 3. Fetch the matching public key by `kid`; if not cached, bust cache and retry once.
 * 4. Verify the RSA-PKCS1-v1_5 signature using the Web Crypto API.
 * 5. Validate `exp`, `aud`, and `iss` claims per the OpenID Connect spec.
 *
 * @param idToken  - The signed JWT returned by {@link exchangeGoogleCode}.
 * @param clientId - The OAuth 2.0 client ID; validated against the `aud` claim.
 * @param kv       - The KV namespace used to cache Google's JWKS.
 * @returns The verified {@link GoogleClaims} if the token is valid.
 * @throws If the JWT is malformed, the algorithm is unexpected, the key is not found,
 *         the signature is invalid, or any claim fails validation.
 *
 * @see https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
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
