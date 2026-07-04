// =========================================================================================================
// DOMAIN ERRORS
// =========================================================================================================
// Typed errors thrown by the service layer. Handlers never build HTTP status codes
// from business logic directly — they throw these, and the central error handler in
// index.ts maps each to the correct HTTP response. This keeps services free of any
// Hono/HTTP knowledge.
// =========================================================================================================

// =========================================================================================================
// Base
// =========================================================================================================

export class DomainError extends Error {
	/** HTTP status this error maps to. */
	readonly status: number;
	/** Optional machine-readable details (e.g. Zod issues). */
	readonly details?: unknown;

	constructor(message: string, status: number, details?: unknown) {
		super(message);
		this.name = this.constructor.name;
		this.status = status;
		this.details = details;
	}
}

// =========================================================================================================
// Concrete errors
// =========================================================================================================

/** The requested entity does not exist. → 404 */
export class NotFoundError extends DomainError {
	constructor(message = 'Not found') {
		super(message, 404);
	}
}

/** The request is not authenticated (no/invalid session). → 401 */
export class UnauthorizedError extends DomainError {
	constructor(message = 'Unauthorized') {
		super(message, 401);
	}
}

/** The request is authenticated but not allowed to perform the action. → 403 */
export class ForbiddenError extends DomainError {
	constructor(message = 'Forbidden') {
		super(message, 403);
	}
}

/** The input is structurally or semantically invalid. → 400 */
export class ValidationError extends DomainError {
	constructor(message = 'Invalid input', details?: unknown) {
		super(message, 400, details);
	}
}

/** A conflicting state prevents the action (e.g. duplicate). → 409 */
export class ConflictError extends DomainError {
	constructor(message = 'Conflict') {
		super(message, 409);
	}
}
