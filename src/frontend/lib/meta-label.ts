// =========================================================================
// lib/meta-label.ts — Translates a stored meta value into its localized label
// =========================================================================
//
// Meta values are stored in the DB in kebab/lowercase form (e.g. 'furry',
// 'semi-realistic', 'avatar-base', 'body-part'), while the i18n keys under
// `meta.<namespace>` use camelCase for multi-word values ('semiRealistic',
// 'avatarBase', 'bodyPart'). This bridges the two so card badges and detail
// chips show the value in the current locale instead of the raw English value.

import { t } from '../core/i18n';

// =========================================================================
// Helpers
// =========================================================================

/** kebab-case / snake_case → camelCase ('semi-realistic' → 'semiRealistic'). */
function toCamelKey(value: string): string {
	return value.replace(/[-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Prettifies a raw value as a last-resort label ('semi-realistic' → 'Semi Realistic'). */
function prettify(value: string): string {
	return value
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

// =========================================================================
// metaLabel
// =========================================================================

/**
 * Resolves the localized label for a stored meta value.
 *
 * @param namespace The i18n meta group, e.g. 'avatar_type' | 'asset_type' | 'clothing_type'.
 * @param value     The raw value stored on the resource meta, e.g. 'semi-realistic'.
 * @returns         The translated label, or a prettified fallback when no key exists.
 */
export function metaLabel(namespace: string, value: string | null | undefined): string {
	if (!value) return '';
	const key = `meta.${namespace}.${toCamelKey(value)}`;
	const translated = t(key);
	// t() returns the raw path when the key is missing — fall back to a prettified value.
	return translated === key ? prettify(value) : translated;
}
