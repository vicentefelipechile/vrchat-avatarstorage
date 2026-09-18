// =========================================================================================================
// features/admin/esc.ts — Output escaping + safe avatar URLs for admin-rendered HTML
// =========================================================================================================
// Every string interpolated into admin innerHTML goes through esc(). Avatar URLs go through
// safeAvatarSrc(), which only allows https:, the local CDN worker, and same-origin paths —
// anything else (javascript:, data:text/html, …) renders as empty.
// =========================================================================================================

export function esc(s: string | null | undefined): string {
	return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function safeAvatarSrc(url: string | null | undefined): string {
	if (!url) return '';
	try {
		const parsed = new URL(url, window.location.origin);
		if (parsed.protocol === 'https:') return url;
		if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return url;
		if (url.startsWith('/')) return url;
	} catch {
		/* relative junk falls through */
	}
	return '';
}

export function fmtDate(tsSeconds: number): string {
	return new Date(tsSeconds * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
