// =========================================================================================================
// AUTH MIDDLEWARE
// =========================================================================================================
// Reusable authentication/authorization guards. These replace the copy-pasted
// `getAuthUser` + manual owner/admin checks that were duplicated across ~85 handlers.
//
// USAGE:
//   resources.post('/', requireAuth, async (c) => {
//       const user = c.get('user'); // guaranteed non-null AuthUser
//       ...
//   });
//
//   admin.post('/...', requireAdmin, async (c) => { ... });
//
// Ownership is checked in the service layer (it needs the DB row), not here — a
// middleware cannot know who owns an arbitrary entity without a query. See
// `assertOwnerOrAdmin` in the service base for that.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { Context, Next } from 'hono';
import { getAuthUser, type AuthUser } from '../../auth';
import { UnauthorizedError, ForbiddenError } from '../../domain/errors';

// =========================================================================================================
// Context typing
// =========================================================================================================

/**
 * Variables set on the Hono context by these guards. Import this into the
 * generic of routers that use the guards so `c.get('user')` is typed.
 *
 *   const router = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
 */
export type AuthVariables = {
	user: AuthUser;
};

// =========================================================================================================
// Guards
// =========================================================================================================

/**
 * Requires a valid session. On success, stores the resolved user on the context
 * under `user` and continues. On failure, throws UnauthorizedError (mapped to 401
 * by the central error handler).
 */
export async function requireAuth(c: Context, next: Next) {
	const user = await getAuthUser(c);
	if (!user) throw new UnauthorizedError();
	c.set('user', user);
	await next();
}

/**
 * Requires a valid session belonging to an admin. Combines authentication and
 * the admin role check that was previously duplicated in every admin handler.
 */
export async function requireAdmin(c: Context, next: Next) {
	const user = await getAuthUser(c);
	if (!user) throw new UnauthorizedError();
	if (!user.is_admin) throw new ForbiddenError();
	c.set('user', user);
	await next();
}

/**
 * Optional-auth guard: resolves the user if a session exists, but never rejects.
 * Use for endpoints whose response differs for logged-in users (e.g. gated
 * download links) but that are still reachable anonymously.
 */
export async function optionalAuth(c: Context, next: Next) {
	const user = await getAuthUser(c);
	if (user) c.set('user', user);
	await next();
}
