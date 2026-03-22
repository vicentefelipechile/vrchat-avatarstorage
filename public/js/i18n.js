import es from './i18n/es.js';
import en from './i18n/en.js';
import ru from './i18n/ru.js';
import jp from './i18n/jp.js';
import cn from './i18n/cn.js';
import fr from './i18n/fr.js';
import pt from './i18n/pt.js';

const translations = { es, en, ru, jp, cn, fr, pt };

let currentLang = localStorage.getItem('lang') || 'es';

export function t(path) {
	return path.split('.').reduce((obj, key) => obj && obj[key], translations[currentLang]) || path;
}
export function setLanguage(lang) {
	if (translations[lang]) {
		currentLang = lang;
		localStorage.setItem('lang', lang);
		location.reload();
	}
}
export function getCurrentLang() { return currentLang; }