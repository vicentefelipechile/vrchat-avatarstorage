// ============================================================================
// i18n.ts — Translation loader
// Locale files live in public/js/i18n/ and are served as separate static files.
// They are imported statically here so esbuild bundles them INTO the bundle.
// The user requested locale files separate — if you want truly lazy loading,
// swap these for dynamic fetch() calls instead.
// ============================================================================

import es from '../../public/i18n/es.json';
import en from '../../public/i18n/en.json';
import ru from '../../public/i18n/ru.json';
import jp from '../../public/i18n/jp.json';
import cn from '../../public/i18n/cn.json';
import fr from '../../public/i18n/fr.json';
import pt from '../../public/i18n/pt.json';
import de from '../../public/i18n/de.json';
import it from '../../public/i18n/it.json';
import pl from '../../public/i18n/pl.json';
import nl from '../../public/i18n/nl.json';
import tr from '../../public/i18n/tr.json';

type Translations = Record<string, unknown>;

const translations: Record<string, Translations> = { es, en, ru, jp, cn, fr, pt, de, it, pl, nl, tr };

let currentLang: string = localStorage.getItem('lang') || 'es';

// ============================================================================
// resolve — walks the dot-path in a given locale, returns string or undefined
// ============================================================================

function resolve(lang: string, path: string): string | undefined {
	const result = path.split('.').reduce((obj: unknown, key: string) => {
		if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
		return undefined;
	}, translations[lang] as unknown);
	return typeof result === 'string' ? result : undefined;
}

// ============================================================================
// t — returns translation for current locale, falls back to 'en', then path
// ============================================================================

export function t(path: string): string {
	return resolve(currentLang, path) ?? resolve('en', path) ?? path;
}

export function setLanguage(lang: string): void {
	if (translations[lang]) {
		currentLang = lang;
		localStorage.setItem('lang', lang);
		location.reload();
	}
}

export function getCurrentLang(): string {
	return currentLang;
}