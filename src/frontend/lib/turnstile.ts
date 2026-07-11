// =========================================================================
// lib/turnstile.ts — Cloudflare Turnstile widget rendering
// =========================================================================

let _cachedSiteKey: string | null = null;

async function getSiteKey(): Promise<string | null> {
	if (_cachedSiteKey) return _cachedSiteKey;
	try {
		const res = await fetch('/api/config');
		const data = (await res.json()) as { turnstileSiteKey?: string };
		_cachedSiteKey = data.turnstileSiteKey ?? null;
		return _cachedSiteKey;
	} catch {
		return null;
	}
}

export async function renderTurnstile(selector: string): Promise<void> {
	if (!window.turnstile) {
		console.warn('Turnstile not loaded yet.');
		return;
	}

	const key = await getSiteKey();
	if (!key) {
		console.error('Turnstile site key missing');
		return;
	}

	const container = document.querySelector(selector);
	if (!container) return;

	container.innerHTML = '';
	window.turnstile.render(selector, { sitekey: key.trim() });
}
