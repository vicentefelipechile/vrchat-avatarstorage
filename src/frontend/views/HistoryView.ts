// =========================================================================
// views/HistoryView.ts — Revision history with word-level and meta diff
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { diffString } from '../diff';
import type { RouteContext, Resource } from '../types';
import { TimeUnit } from '../utils';

// =========================================================================
// Types
// =========================================================================

interface HistoryEntry {
	uuid: string;
	change_type: string;
	created_at: number;
	previous_data: Resource;
	actor?: { username: string; avatar_url?: string };
}

interface MetaEditFields {
	[key: string]: unknown;
}

interface MetaEditSnapshot {
	meta_type: 'avatar_meta' | 'asset_meta' | 'clothes_meta';
	fields: MetaEditFields;
}

// =========================================================================
// Helpers — content_edit
// =========================================================================

const AVATAR_DETAILS_RE = /\n\n---\n\n### Avatar Details\n[\s\S]*$/;
const cleanDesc = (text: string) => (text ? text.replace(AVATAR_DETAILS_RE, '') : '');

function normalizeTags(tags: unknown): string[] {
	if (!Array.isArray(tags)) return [];
	return tags.map((tag) => (typeof tag === 'object' && tag !== null ? (tag as { name: string }).name : String(tag)));
}

// =========================================================================
// Helpers — meta_edit
// =========================================================================

const META_FIELD_LABELS: Record<string, string> = {
	avatar_gender: 'meta.avatar.gender',
	avatar_size: 'meta.avatar.size',
	avatar_type: 'meta.avatar.type',
	is_nsfw: 'meta.features.nsfw',
	has_physbones: 'meta.features.physbones',
	has_face_tracking: 'meta.features.face_tracking',
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
	clothing_type: 'meta.clothes_type.title',
	is_base: 'meta.clothes.isBase',
	base_avatar_uuid: 'meta.asset_type.avatarBase',
	base_avatar_name_raw: 'meta.asset_type.avatarBase',
	has_physbones_clothes: 'meta.features.physbones',
} as const;

function formatMetaValue(key: string, value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'number' && (key.startsWith('has_') || key.startsWith('is_'))) return value === 1 ? '✓ Sí' : '✗ No';
	return String(value);
}

async function fetchCurrentMeta(uuid: string, metaType: MetaEditSnapshot['meta_type']): Promise<MetaEditFields | null> {
	const endpointMap: Record<string, string> = {
		avatar_meta: `/api/avatars/${uuid}`,
		asset_meta: `/api/assets/${uuid}`,
		clothes_meta: `/api/clothes/${uuid}`,
	};
	const url = endpointMap[metaType];
	if (!url) return null;
	try {
		const res = await DataCache.fetch<HistoryEntry>(url, { ttl: TimeUnit.Minute * 30, persistent: true });
		if (!res) return null;

		// The endpoint returns a flat object where meta fields are top-level or nested
		// assets/avatars/clothes routes return flat rows, extract everything except uuid/title/is_active
		const ignored = new Set(['uuid', 'title', 'is_active', 'resource_uuid']);
		const out: MetaEditFields = {};
		for (const [k, v] of Object.entries(res)) {
			if (!ignored.has(k)) out[k] = v;
		}
		return out;
	} catch {
		return null;
	}
}

const IGNORED_META_KEYS = new Set(['resource_uuid', 'uuid']);

function renderMetaDiff(snapshot: MetaEditSnapshot, current: MetaEditFields | null, authorName?: string): string {
	const prev = snapshot.fields;

	if (!current) {
		// Can't fetch current state — just show the snapshot as-is
		const rows = Object.entries(prev)
			.filter(([k]) => !IGNORED_META_KEYS.has(k))
			.map(([k, v]) => {
				const label = t(META_FIELD_LABELS[k] || k);
				return `<tr>
					<td style="color:var(--text-muted);font-size:0.85em">${label}</td>
					<td><del style="color:#b31d28;background:#ffeef0;padding:1px 4px">${formatMetaValue(k, v)}</del></td>
					<td style="color:var(--text-muted)">—</td>
				</tr>`;
			})
			.join('');
		return rows
			? `<table style="width:100%;border-collapse:collapse;font-size:0.88em">
				<thead><tr>
					<th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-color);width:40%">${t('history.meta.field')}</th>
					<th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-color)">${t('history.meta.before')}</th>
					<th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-color)">${t('history.meta.after')}</th>
				</tr></thead>
				<tbody>${rows}</tbody>
			</table>`
			: `<em style="color:#666">${t('history.meta.noFields')}</em>`;
	}

	const changedRows: string[] = [];

	for (const [k, prevVal] of Object.entries(prev)) {
		if (IGNORED_META_KEYS.has(k)) continue;
		const currVal = current[k];
		const prevStr = formatMetaValue(k, prevVal);
		const currStr = formatMetaValue(k, currVal);

		if (prevStr === currStr) continue;

		const label = t(META_FIELD_LABELS[k] || k);

		// Special case: author_uuid changed from null to a UUID
		if (k === 'author_uuid' && !prevVal && currVal) {
			const displayName = authorName ?? String(currVal);
			changedRows.push(`<tr style="background:var(--bg-hover)">
				<td style="padding:5px 8px;border-bottom:1px solid var(--border-color);font-weight:500">${label}</td>
				<td style="padding:5px 8px;border-bottom:1px solid var(--border-color)"><span style="color:var(--text-muted)">—</span></td>
				<td style="padding:5px 8px;border-bottom:1px solid var(--border-color)"><ins style="color:#22863a;background:#e6ffec;padding:1px 4px;text-decoration:none">${displayName}</ins></td>
			</tr>`);
			continue;
		}

		changedRows.push(`<tr>
			<td style="padding:5px 8px;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:0.85em">${label}</td>
			<td style="padding:5px 8px;border-bottom:1px solid var(--border-color)"><del style="color:#b31d28;background:#ffeef0;padding:1px 4px;text-decoration:none">${prevStr}</del></td>
			<td style="padding:5px 8px;border-bottom:1px solid var(--border-color)"><ins style="color:#22863a;background:#e6ffec;padding:1px 4px;text-decoration:none">${currStr}</ins></td>
		</tr>`);
	}

	if (changedRows.length === 0) {
		return `<em style="color:#666">${t('history.meta.noChanges')}</em>`;
	}

	return `<table style="width:100%;border-collapse:collapse;font-size:0.88em">
		<thead><tr>
			<th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-color);width:35%">${t('history.meta.field')}</th>
			<th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-color)">${t('history.meta.before')}</th>
			<th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-color)">${t('history.meta.after')}</th>
		</tr></thead>
		<tbody>${changedRows.join('')}</tbody>
	</table>`;
}

// =========================================================================
// Helpers — card renderer
// =========================================================================

async function historyCard(entry: HistoryEntry, current: Resource, resourceUuid: string): Promise<string> {
	const date = new Date(entry.created_at * 1000).toLocaleString();
	const actorName = entry.actor?.username ?? 'Unknown';
	const actorAvatar = entry.actor?.avatar_url ?? '';
	const changeTypeLabel = t(`history.types.${entry.change_type}`) || entry.change_type;

	let changesHtml = '';

	if (entry.change_type === 'meta_edit') {
		let snapshot: MetaEditSnapshot | null = null;
		try {
			const raw = entry.previous_data as unknown as string;
			snapshot = typeof raw === 'string' ? (JSON.parse(raw) as MetaEditSnapshot) : (raw as unknown as MetaEditSnapshot);
		} catch {
			snapshot = null;
		}

		if (!snapshot) {
			changesHtml = `<em style="color:#666">Snapshot de metadatos inválido</em>`;
		} else {
			const currentMeta = await fetchCurrentMeta(resourceUuid, snapshot.meta_type);

			// Try to resolve author name if author_uuid changed
			/*
			let authorName: string | undefined;
			const prevAuthorUuid = snapshot.fields.author_uuid;
			const currAuthorUuid = currentMeta?.['author_uuid'];
			if (!prevAuthorUuid && currAuthorUuid) {
				try {
					const authorRes = await fetch(`/api/authors/${currAuthorUuid}`);
					if (authorRes.ok) {
						const a = (await authorRes.json()) as { name?: string; slug?: string };
						authorName = a.name ?? a.slug;
					}
				} catch {
					// fallback to UUID
				}
			}
			*/

			changesHtml = renderMetaDiff(snapshot, currentMeta);
		}
	} else if (entry.change_type === 'approval') {
		const prev = entry.previous_data as unknown as { is_active?: boolean };
		const wasActive = prev?.is_active;
		changesHtml = wasActive
			? `<span style="color:#b31d28">Recurso desactivado / rechazado</span>`
			: `<span style="color:#22863a">Recurso aprobado / activado</span>`;
	} else {
		// content_edit — existing behaviour
		const prev = entry.previous_data;

		if (prev.title !== current.title) {
			changesHtml += `
			<div class="diff-block">
				<strong>${t('history.field.title')}:</strong>
				<div class="diff-content">${diffString(prev.title, current.title)}</div>
			</div>`;
		}

		const prevDesc = cleanDesc(prev.description);
		const currDesc = cleanDesc(current.description);
		if (prevDesc !== currDesc) {
			changesHtml += `
			<div class="diff-block">
				<strong>${t('history.field.desc')}:</strong>
				<div class="diff-content markdown-body" style="font-size:0.9em;padding:10px;background:var(--bg-code);border:1px solid var(--border-color);white-space:pre-wrap!important;font-family:monospace">
					${diffString(prevDesc, currDesc)}
				</div>
			</div>`;
		}

		if (prev.category !== current.category) {
			changesHtml += `
			<div class="diff-block">
				<strong>${t('history.field.cat')}:</strong>
				<div class="diff-content">
					<del style="background:#ffeef0;color:#b31d28">${prev.category}</del>
					&rarr;
					<ins style="background:#e6ffec;color:#22863a">${current.category}</ins>
				</div>
			</div>`;
		}

		const oldTags = normalizeTags(prev.tags);
		const newTags = normalizeTags(current.tags);
		if (JSON.stringify([...oldTags].sort()) !== JSON.stringify([...newTags].sort())) {
			changesHtml += `
			<div class="diff-block">
				<strong>${t('history.field.tags')}:</strong>
				<div class="diff-content">
					<span style="color:#b31d28">- [${oldTags.join(', ')}]</span><br>
					<span style="color:#22863a">+ [${newTags.join(', ')}]</span>
				</div>
			</div>`;
		}

		if (!changesHtml) changesHtml = `<em style="color:#666">${t('history.noVisibleChanges')}</em>`;
	}

	const badgeColor = entry.change_type === 'meta_edit' ? 'badge-purple' : entry.change_type === 'approval' ? 'badge-green' : 'badge-blue';

	return `
		<div class="history-card" style="background:var(--bg-card);border:1px solid var(--border-color);padding:20px;margin-bottom:20px">
			<div class="history-header" style="display:flex;align-items:center;margin-bottom:15px;border-bottom:1px solid var(--border-color);padding-bottom:10px">
				<img src="${actorAvatar}" alt="${actorName}" style="width:32px;height:32px;margin-right:10px;background:#ddd;border-radius:50%">
				<div>
					<div style="font-weight:bold">${actorName}</div>
					<div style="font-size:0.85em;color:var(--text-muted)">${date}</div>
				</div>
				<div style="margin-left:auto">
					<span class="badge ${badgeColor}">${changeTypeLabel}</span>
				</div>
			</div>
			<div class="history-changes">${changesHtml}</div>
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function historyView(ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('history.title')}`;
	const id = ctx.params.id;

	return `
		<div class="history-container" style="max-width:1000px;margin:0 auto">
			<div style="margin-bottom:20px">
				<a href="/item/${id}" data-link class="btn" style="background:#666">&larr; ${t('history.backToResource')}</a>
			</div>
			<h1>${t('history.title')}</h1>
			<div id="history-list" class="timeline">
				<p>${t('common.loading')}</p>
			</div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function historyAfter(ctx: RouteContext): Promise<void> {
	const id = ctx.params.id;
	const list = document.getElementById('history-list')!;

	try {
		const [entries, currentRes] = await Promise.all([
			DataCache.fetch(`/api/resources/${id}/history`, { ttl: TimeUnit.Minute * 5, persistent: true }) as Promise<HistoryEntry[]>,
			DataCache.fetch(`/api/resources/${id}`, { ttl: TimeUnit.Minute * 5, persistent: true }) as Promise<Resource>,
		]);

		if (!entries || entries.length === 0) {
			list.innerHTML = `<p>${t('history.noHistory')}</p>`;
			return;
		}

		// meta_edit cards require async fetches — resolve all in order
		let nextState: Resource = currentRes;
		const cardPromises: Promise<string>[] = [];
		for (const entry of entries) {
			cardPromises.push(historyCard(entry, nextState, id));
			if (entry.change_type === 'content_edit') {
				nextState = entry.previous_data;
			}
		}

		const cards = await Promise.all(cardPromises);
		list.innerHTML = cards.join('');
	} catch (e) {
		list.innerHTML = `<p style="color:red">Error loading history: ${(e as Error).message}</p>`;
	}
}