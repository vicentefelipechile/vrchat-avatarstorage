// =========================================================================================================
// HTTP RESPONSE HELPERS
// =========================================================================================================
// Centralized helpers that guarantee a consistent JSON envelope across every route.
// Success responses return the payload directly; error responses always follow
// the shape `{ error: string, details?: unknown }` so the frontend can rely on it.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Standard error envelope. Every failure in the app should flow through here so
 * the client never has to guess the error shape.
 */
export function fail(c: Context, message: string, status: ContentfulStatusCode = 400, details?: unknown) {
	return c.json(details === undefined ? { error: message } : { error: message, details }, status);
}

/**
 * Convenience wrapper for a 200 JSON body. Kept intentionally thin — most
 * handlers return `c.json(payload)` directly; use this when you want the intent
 * ("this is the success path") to read explicitly.
 */
export function ok<T>(c: Context, payload: T, status: ContentfulStatusCode = 200) {
	return c.json(payload as object, status);
}
