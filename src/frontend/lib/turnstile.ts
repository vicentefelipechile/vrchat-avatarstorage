// =========================================================================
// lib/turnstile.ts — Cloudflare Turnstile widget rendering
// =========================================================================

import { api } from '../api';

let _cachedSiteKey: string | null = null;

async function getSiteKey(): Promise<string | null> {
	if (_cachedSiteKey) return _cachedSiteKey;
	try {
		const data = await api.System.Config();
		_cachedSiteKey = data.turnstileSiteKey ?? null;
		return _cachedSiteKey;
	} catch {
		return null;
	}
}

export async function renderTurnstile(selector: string): Promise<string | undefined> {
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
	return window.turnstile.render(selector, { sitekey: key.trim() });
}
