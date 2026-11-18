// =========================================================================================================
// LANGUAGE PREFERENCE TESTS
// Verify first-visit detection and cookie persistence without rendering the UI.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';

// =========================================================================================================
// Setup
// =========================================================================================================

beforeEach(() => {
	vi.resetModules();
	vi.stubGlobal('document', { cookie: '', documentElement: { lang: '' } });
	vi.stubGlobal('navigator', { language: 'es-MX', languages: ['es-MX', 'en-US'] });
	vi.stubGlobal('location', { protocol: 'https:', reload: vi.fn() });
});

// =========================================================================================================
// Tests
// =========================================================================================================

describe('language preference', () => {
	it.each([
		['es-MX', 'es', 'es'],
		['pt-BR', 'pt', 'pt'],
		['ja-JP', 'jp', 'ja'],
		['zh-TW', 'cn', 'zh'],
		['DE-de', 'de', 'de'],
		['ko-KR', 'en', 'en'],
	])('detects the primary language %s on the first visit', async (browserLanguage, locale, htmlLanguage) => {
		vi.stubGlobal('navigator', { language: browserLanguage, languages: [browserLanguage, 'es'] });
		const { getCurrentLang } = await import('../../../src/frontend/core/i18n');
		expect(getCurrentLang()).toBe(locale);
		expect(document.cookie).toBe(`lang=${locale}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`);
		expect(document.documentElement.lang).toBe(htmlLanguage);
		expect(location.reload).not.toHaveBeenCalled();
	});

	it('uses the cookie ahead of browser and legacy preferences on later visits', async () => {
		document.cookie = 'theme=dark; lang=fr; another=value';
		localStorage.setItem('lang', 'de');
		const { getCurrentLang } = await import('../../../src/frontend/core/i18n');
		expect(getCurrentLang()).toBe('fr');
		expect(localStorage.getItem('lang')).toBeNull();
	});

	it('migrates an existing manual preference to the cookie', async () => {
		localStorage.setItem('lang', 'jp');
		const { getCurrentLang } = await import('../../../src/frontend/core/i18n');
		expect(getCurrentLang()).toBe('jp');
		expect(document.cookie).toContain('lang=jp;');
		expect(localStorage.getItem('lang')).toBeNull();
	});

	it.each(['unsupported', '__proto__', 'constructor', '%ZZ'])('ignores invalid saved language %s', async (language) => {
		document.cookie = `lang=${language}`;
		localStorage.setItem('lang', language);
		const { getCurrentLang } = await import('../../../src/frontend/core/i18n');
		expect(getCurrentLang()).toBe('es');
	});

	it('still detects the browser language when legacy storage is blocked', async () => {
		vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { getCurrentLang } = await import('../../../src/frontend/core/i18n');
		expect(getCurrentLang()).toBe('es');
		expect(document.cookie).toContain('lang=es;');
		expect(log).toHaveBeenCalled();
	});

	it('persists manual changes and restores them after a reload', async () => {
		const { setLanguage } = await import('../../../src/frontend/core/i18n');
		setLanguage('tr');
		expect(document.cookie).toContain('lang=tr;');
		expect(location.reload).toHaveBeenCalledOnce();
		vi.resetModules();
		const { getCurrentLang } = await import('../../../src/frontend/core/i18n');
		expect(getCurrentLang()).toBe('tr');
	});

	it('does not save or reload for an unsupported manual choice', async () => {
		const { setLanguage, getCurrentLang } = await import('../../../src/frontend/core/i18n');
		setLanguage('__proto__');
		expect(getCurrentLang()).toBe('es');
		expect(document.cookie).toContain('lang=es;');
		expect(location.reload).not.toHaveBeenCalled();
	});

	it('allows cookies in local HTTP development without the Secure attribute', async () => {
		vi.stubGlobal('location', { protocol: 'http:', reload: vi.fn() });
		await import('../../../src/frontend/core/i18n');
		expect(document.cookie).not.toContain('Secure');
	});
});
