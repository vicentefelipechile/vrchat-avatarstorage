// =========================================================================================================
// Normalized API failures — transport, HTTP and response parsing share one contract.
// =========================================================================================================

// =========================================================================================================
// Types
// =========================================================================================================

export type ApiErrorKind = 'http' | 'network' | 'abort' | 'malformed' | 'rate-limit';

// =========================================================================================================
// Error contract
// =========================================================================================================

export class VrcStorageApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly method: string,
		readonly url: string,
		readonly kind: ApiErrorKind = 'http',
		readonly details?: unknown,
		readonly body?: unknown,
	) {
		super(message);
		this.name = kind === 'abort' ? 'AbortError' : 'VrcStorageApiError';
	}
}
