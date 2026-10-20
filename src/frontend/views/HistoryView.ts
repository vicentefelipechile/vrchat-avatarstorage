// =========================================================================================================
// RESOURCE HISTORY VIEW
// =========================================================================================================
// Accessible before/after comparisons. API values are always rendered as text, never HTML.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { DataCache } from '../core/cache';
import { getCurrentLang, t } from '../core/i18n';
import { buildHistoryRevisions, diffWords, htmlDecode, mediaUrl, metaLabel, safeHttpUrl, showToast } from '../lib/utils';
import type { HistoryEntry, HistoryFieldChange, HistoryRevision, Resource, RouteContext } from '../types';

// =========================================================================================================
// Constants
// =========================================================================================================

const FIELD_LABELS: Record<string, string> = {
	title: 'history.field.title',
	description: 'history.field.desc',
	category: 'history.field.cat',
	is_active: 'history.field.status',
	thumbnail_uuid: 'upload.thumbnail',
	reference_image_uuid: 'edit.changeReference',
	gallery_media_uuids: 'edit.galleryTitle',
	links: 'edit.existingLinks',
	gender: 'meta.avatar_gender.title',
	avatar_gender: 'meta.avatar_gender.title',
	avatar_size: 'meta.avatar_size.title',
	avatar_type: 'meta.avatar_type.title',
	is_nsfw: 'meta.features.nsfw',
	has_physbones: 'meta.features.physbones',
	has_face_tracking: 'meta.features.facetracking',
	has_dps: 'meta.features.dps',
	has_gogoloco: 'meta.features.gogoloco',
	has_toggles: 'meta.features.toggles',
	is_quest_optimized: 'meta.features.questOptimized',
	sdk_version: 'meta.sdk_version.title',
	platform: 'meta.platform.title',
	author_name_raw: 'meta.avatar.author',
	author_uuid: 'meta.avatar.authorLinked',
	asset_type: 'meta.asset_type.title',
	unity_version: 'meta.sdk_version.unityVersion',
	gender_fit: 'meta.avatar_gender.title',
	clothing_type: 'meta.clothing_type.title',
	is_base: 'meta.clothes.isBase',
	base_avatar_uuid: 'meta.clothes.baseAvatar',
	base_avatar_name_raw: 'meta.clothes.baseAvatar',
};
const VALUE_NAMESPACES: Record<string, string> = {
	gender: 'avatar_gender',
	avatar_gender: 'avatar_gender',
	gender_fit: 'avatar_gender',
	avatar_size: 'avatar_size',
	avatar_type: 'avatar_type',
	asset_type: 'asset_type',
	clothing_type: 'clothing_type',
	platform: 'platform',
};
const LOCALES: Record<string, string> = { cn: 'zh-CN', jp: 'ja' };
const MEDIA_FIELDS = new Set(['thumbnail_uuid', 'reference_image_uuid', 'gallery_media_uuids']);

// =========================================================================================================
// Helpers
// =========================================================================================================

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function formatValue(key: string, value: unknown, labels: Record<string, string>): string {
	if (value === null || value === undefined || value === '') return '—';
	if (Array.isArray(value)) return value.length ? value.map((item) => formatValue(key, item, labels)).join(key === 'links' ? '\n\n' : ', ') : '—';
	if (key === 'links' && typeof value === 'object') {
		return Object.entries(value)
			.filter(([field, text]) => (field === 'link_title' || field === 'link_url') && typeof text === 'string' && text)
			.map(([, text]) => htmlDecode(String(text)))
			.join('\n');
	}
	if ((key.startsWith('has_') || key.startsWith('is_')) && (value === 0 || value === 1 || typeof value === 'boolean')) {
		if (key === 'is_active') return value ? t('history.active') : t('history.inactive');
		return value ? t('history.yes') : t('history.no');
	}
	if (key === 'category') return t(`cats.${String(value)}`);
	if (key === 'sdk_version' && (value === 'sdk2' || value === 'sdk3')) return t(`meta.sdk_version.${value === 'sdk2' ? 'v2' : 'v3'}`);
	if (typeof VALUE_NAMESPACES[key] === 'string') return metaLabel(VALUE_NAMESPACES[key], String(value));
	if ((key === 'author_uuid' || key === 'base_avatar_uuid') && typeof value === 'string' && typeof labels[value] === 'string') return htmlDecode(labels[value]);
	return typeof value === 'object' ? JSON.stringify(value) : htmlDecode(String(value));
}

function appendMedia(container: HTMLElement, key: string, value: unknown): void {
	const ids = (Array.isArray(value) ? value : [value]).filter((id): id is string => typeof id === 'string' && id.length > 0);
	if (!ids.length) {
		container.textContent = '—';
		return;
	}
	const gallery = element('div', 'history-media');
	for (const id of ids) {
		const link = element('a', 'history-media-link');
		link.href = mediaUrl(id, 'original');
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		link.title = id;
		const image = element('img');
		image.src = mediaUrl(id, 'low');
		image.alt = t(FIELD_LABELS[key]);
		image.loading = 'lazy';
		image.width = 120;
		image.height = 120;
		image.addEventListener('error', () => link.replaceChildren(document.createTextNode(id)), { once: true });
		link.append(image);
		gallery.append(link);
	}
	container.append(gallery);
}

function comparison(change: HistoryFieldChange, labels: Record<string, string>): HTMLElement {
	const section = element('section', 'history-field');
	section.append(element('h3', '', typeof FIELD_LABELS[change.key] === 'string' ? t(FIELD_LABELS[change.key]) : change.key.replace(/_/g, ' ')));
	const columns = element('div', 'history-comparison');
	const before = element('div', 'history-value history-value-before');
	const after = element('div', 'history-value history-value-after');
	before.append(element('h4', 'history-value-label', `− ${t('history.meta.before')}`));
	after.append(element('h4', 'history-value-label', `+ ${t('history.meta.after')}`));
	const oldValue = element('div', 'history-value-text');
	const newValue = element('div', 'history-value-text');
	if (change.key === 'description') {
		oldValue.tabIndex = 0;
		newValue.tabIndex = 0;
		oldValue.setAttribute('aria-label', `${t('history.field.desc')} — ${t('history.meta.before')}`);
		newValue.setAttribute('aria-label', `${t('history.field.desc')} — ${t('history.meta.after')}`);
	}
	if (MEDIA_FIELDS.has(change.key)) {
		appendMedia(oldValue, change.key, change.before);
		appendMedia(newValue, change.key, change.after);
	} else if (change.key === 'title' || change.key === 'description') {
		const oldText = String(change.before ?? '');
		const newText = String(change.after ?? '');
		for (const part of diffWords(change.key === 'title' ? htmlDecode(oldText) : oldText, change.key === 'title' ? htmlDecode(newText) : newText)) {
			if (part.type === 'equal') {
				oldValue.append(document.createTextNode(part.text));
				newValue.append(document.createTextNode(part.text));
			} else if (part.type === 'delete') oldValue.append(element('del', '', part.text));
			else newValue.append(element('ins', '', part.text));
		}
		if (!oldValue.textContent) oldValue.textContent = '—';
		if (!newValue.textContent) newValue.textContent = '—';
	} else {
		oldValue.append(element('del', '', formatValue(change.key, change.before, labels)));
		newValue.append(element('ins', '', formatValue(change.key, change.after, labels)));
	}
	before.append(oldValue);
	after.append(newValue);
	columns.append(before, after);
	section.append(columns);
	return section;
}

function historyCard(revision: HistoryRevision, labels: Record<string, string>, dateFormat: Intl.DateTimeFormat): HTMLElement {
	const { entry } = revision;
	const card = element('li', 'history-card');
	const header = element('header', 'history-header');
	const actor = element('div', 'history-actor');
	const avatar = element('img', 'history-avatar');
	avatar.src = safeHttpUrl(entry.actor?.avatar_url) ?? '/avatar.png';
	avatar.alt = '';
	avatar.width = 36;
	avatar.height = 36;
	avatar.loading = 'lazy';
	avatar.addEventListener(
		'error',
		() => {
			avatar.hidden = true;
		},
		{ once: true },
	);
	const info = element('div', 'history-actor-info');
	info.append(element('strong', '', htmlDecode(entry.actor?.username ?? t('common.unknown'))));
	const date = new Date(entry.created_at);
	if (Number.isFinite(date.getTime())) {
		const time = element('time', '', dateFormat.format(date));
		time.dateTime = date.toISOString();
		info.append(time);
	} else info.append(element('span', '', t('common.unknown')));
	actor.append(avatar, info);
	const knownType = ['content_edit', 'meta_edit', 'approval', 'create'].includes(entry.change_type);
	header.append(actor, element('h2', 'history-type', knownType ? t(`history.types.${entry.change_type}`) : t('common.unknown')));
	card.append(header);
	for (const change of revision.changes) card.append(comparison(change, { ...labels, ...entry.reference_labels }));
	if (revision.incomplete) card.append(element('p', 'history-notice', t('history.incomplete')));
	else if (!revision.changes.length) card.append(element('p', 'history-notice', entry.change_type === 'meta_edit' ? t('history.meta.noChanges') : t('history.noVisibleChanges')));
	return card;
}

// =========================================================================================================
// View
// =========================================================================================================

export function historyView(_ctx: RouteContext): string {
	return '<section id="resource-history" class="history-page" aria-busy="true"></section>';
}

// =========================================================================================================
// After
// =========================================================================================================

export async function historyAfter(ctx: RouteContext): Promise<void> {
	document.title = `VRCStorage — ${t('history.title')}`;
	const page = document.getElementById('resource-history');
	if (!page) return;
	const id = encodeURIComponent(ctx.params.id);
	const back = element('a', 'btn btn-outline', `← ${t('history.backToResource')}`);
	back.href = `/item/${id}`;
	back.dataset.link = '';
	const heading = element('div', 'history-heading');
	heading.append(element('h1', '', t('history.title')));
	const status = element('p', 'history-notice', t('common.loading'));
	status.setAttribute('role', 'status');
	page.append(back, heading, status);

	try {
		// Do not mix cached current data with a newer revision chain.
		const [entries, current] = await Promise.all([DataCache.fetch<HistoryEntry[]>(`/api/resources/${id}/history`, { ttl: 0 }), DataCache.fetch<Resource>(`/api/resources/${id}`, { ttl: 0 })]);
		if (!page.isConnected) return;
		heading.append(element('p', 'history-resource-title', htmlDecode(current.title)));
		if (!entries.length) {
			status.textContent = t('history.noHistory');
			return;
		}
		const labels: Record<string, string> = {};
		for (const entry of entries) Object.assign(labels, entry.reference_labels);
		if (current.meta && 'author_uuid' in current.meta && current.meta.author_uuid && current.meta.author_name) labels[current.meta.author_uuid] = current.meta.author_name;
		const lang = getCurrentLang();
		const dateFormat = new Intl.DateTimeFormat(LOCALES[lang] ?? lang, { dateStyle: 'medium', timeStyle: 'short' });
		const list = element('ol', 'history-list');
		list.setAttribute('aria-label', t('history.title'));
		const revisions = buildHistoryRevisions(entries, current);
		const unchangedCards: HTMLElement[] = [];
		for (const revision of revisions) {
			const card = historyCard(revision, labels, dateFormat);
			if (!revision.incomplete && !revision.changes.length) {
				card.hidden = true;
				unchangedCards.push(card);
			}
			list.append(card);
		}
		if (unchangedCards.length) {
			const filter = element('label', 'history-filter');
			const checkbox = element('input');
			checkbox.type = 'checkbox';
			filter.append(checkbox, document.createTextNode(`${t('history.showUnchanged')} (${unchangedCards.length})`));
			const empty = element('p', 'history-notice', t('history.noVisibleChanges'));
			empty.hidden = unchangedCards.length !== revisions.length;
			checkbox.addEventListener('change', () => {
				for (const card of unchangedCards) card.hidden = !checkbox.checked;
				empty.hidden = checkbox.checked || unchangedCards.length !== revisions.length;
			});
			heading.append(filter, empty);
		}
		status.replaceWith(list);
	} catch (error) {
		console.error('Failed to load resource history:', error);
		if (!page.isConnected) return;
		status.textContent = t('common.loadError');
		showToast(t('common.loadError'), 'error');
	} finally {
		page.setAttribute('aria-busy', 'false');
	}
}
