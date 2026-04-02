// ============================================================================
// i18n.ts — Translation loader
// Locale files live in public/js/i18n/ and are served as separate static files.
// They are imported statically here so esbuild bundles them INTO the bundle.
// The user requested locale files separate — if you want truly lazy loading,
// swap these for dynamic fetch() calls instead.
// ============================================================================

import es from '../../public/js/i18n/es.js';
import en from '../../public/js/i18n/en.js';
import ru from '../../public/js/i18n/ru.js';
import jp from '../../public/js/i18n/jp.js';
import cn from '../../public/js/i18n/cn.js';
import fr from '../../public/js/i18n/fr.js';
import pt from '../../public/js/i18n/pt.js';
import de from '../../public/js/i18n/de.js';
import it from '../../public/js/i18n/it.js';
import pl from '../../public/js/i18n/pl.js';
import nl from '../../public/js/i18n/nl.js';
import tr from '../../public/js/i18n/tr.js';

type Translations = Record<string, unknown>;

const translations: Record<string, Translations> = { es, en, ru, jp, cn, fr, pt, de, it, pl, nl, tr };

let currentLang: string = localStorage.getItem('lang') || 'es';

export function t(path: string): string {
	const result = path.split('.').reduce((obj: unknown, key: string) => {
		if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
		return undefined;
	}, translations[currentLang] as unknown);
	return (result as string) ?? path;
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
