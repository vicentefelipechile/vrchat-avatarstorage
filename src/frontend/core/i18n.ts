// =========================================================================================================
// i18n.ts — Translation loader
// Locale files live in public/i18n/ as plain JSON and are imported statically
// here, so esbuild bundles every locale into public/js/bundle.js.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import es from '../../../public/i18n/es.json';
import en from '../../../public/i18n/en.json';
import ru from '../../../public/i18n/ru.json';
import jp from '../../../public/i18n/jp.json';
import cn from '../../../public/i18n/cn.json';
import fr from '../../../public/i18n/fr.json';
import pt from '../../../public/i18n/pt.json';
import de from '../../../public/i18n/de.json';
import it from '../../../public/i18n/it.json';
import pl from '../../../public/i18n/pl.json';
import nl from '../../../public/i18n/nl.json';
import tr from '../../../public/i18n/tr.json';

// =========================================================================================================
// Constants
// =========================================================================================================

const translations: Record<string, Translations> = { es, en, ru, jp, cn, fr, pt, de, it, pl, nl, tr };
const LANGUAGE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const LANGUAGE_CODES: Record<string, string> = { jp: 'ja', cn: 'zh' };

// =========================================================================================================
// Types
// =========================================================================================================

type Translations = Record<string, unknown>;

// =========================================================================================================
// Helpers
// =========================================================================================================

function supportedLanguage(language: string | null | undefined): string | undefined {
	const base = language?.toLowerCase().split('-')[0];
	const locale = base === 'ja' ? 'jp' : base === 'zh' ? 'cn' : base;
	return locale && Object.prototype.hasOwnProperty.call(translations, locale) ? locale : undefined;
}

function initialLanguage(): string {
	const cookie = document.cookie.split(';').find((entry) => entry.trim().startsWith('lang='));
	let saved = supportedLanguage(cookie?.trim().slice('lang='.length));
	try {
		// Migrate existing choices without letting stale local storage override future cookie changes.
		saved ??= supportedLanguage(localStorage.getItem('lang'));
		localStorage.removeItem('lang');
	} catch (error) {
		console.error('Cannot migrate the saved language', error);
	}
	return saved ?? supportedLanguage(navigator.language || navigator.languages?.[0]) ?? 'en';
}

function saveLanguage(lang: string): void {
	document.cookie = `lang=${lang}; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
	document.documentElement.lang = LANGUAGE_CODES[lang] ?? lang;
}

function resolve(lang: string, path: string): string | undefined {
	const result = path.split('.').reduce((obj: unknown, key: string) => {
		if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
		return undefined;
	}, translations[lang] as unknown);
	return typeof result === 'string' ? result : undefined;
}

// =========================================================================================================
// Initialization
// =========================================================================================================

let currentLang = initialLanguage();
saveLanguage(currentLang);

// =========================================================================================================
// Public API
// =========================================================================================================

export function t(path: string): string {
	return resolve(currentLang, path) ?? resolve('en', path) ?? path;
}

export function setLanguage(lang: string): void {
	if (Object.prototype.hasOwnProperty.call(translations, lang)) {
		currentLang = lang;
		saveLanguage(lang);
		location.reload();
	}
}

export function getCurrentLang(): string {
	return currentLang;
}
