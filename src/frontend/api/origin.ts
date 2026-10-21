// =========================================================================================================
// API origin — only API paths participate in the Pages fallback.
// =========================================================================================================

// =========================================================================================================
// Resolution
// =========================================================================================================

export function resolveApiUrl(path: string, hostname = window.location.hostname): string {
	if (!path.startsWith('/api/') || path.includes('\\') || /[\r\n]/.test(path)) throw new TypeError('Expected an absolute API path');
	const parsed = new URL(path, 'https://vrcstorage.lat');
	if (!parsed.pathname.startsWith('/api/')) throw new TypeError('Expected an API path');
	return hostname === 'vrcstorage.pages.dev' ? `https://vrcstorage.lat${path}` : path;
}
