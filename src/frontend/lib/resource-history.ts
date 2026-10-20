// =========================================================================================================
// RESOURCE HISTORY
// =========================================================================================================
// Reconstruct legacy before-only snapshots backwards; new snapshots carry their own after-state.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { HistoryEntry, HistoryFields, HistoryRevision, Resource } from '../types';

// =========================================================================================================
// Constants
// =========================================================================================================

const META_TYPES: Record<string, string> = { avatars: 'avatar_meta', assets: 'asset_meta', clothes: 'clothes_meta' };
const IGNORED_KEYS = new Set(['uuid', 'resource_uuid', 'meta_type', 'after']);

// =========================================================================================================
// Helpers
// =========================================================================================================

function asFields(value: unknown): HistoryFields | null {
	return value !== null && typeof value === 'object' && !Array.isArray(value) ? { ...value } : null;
}

function normalizeMeta(fields: HistoryFields): HistoryFields {
	const normalized = { ...fields };
	if ('avatar_gender' in normalized) {
		normalized.gender = normalized.avatar_gender;
		delete normalized.avatar_gender;
	}
	if (typeof normalized.clothing_type === 'string') normalized.clothing_type = [normalized.clothing_type];
	return normalized;
}

function comparable(key: string, value: unknown): string | undefined {
	if (key === 'description') return String(value ?? '');
	if (value === null || value === '') return '';
	if (Array.isArray(value)) return JSON.stringify([...value].sort());
	if (typeof value === 'boolean') return String(Number(value));
	return value === undefined ? undefined : JSON.stringify(value);
}

// =========================================================================================================
// Revisions
// =========================================================================================================

export function buildHistoryRevisions(entries: HistoryEntry[], current: Resource): HistoryRevision[] {
	let content: HistoryFields = { title: current.title, description: current.description, category: current.category };
	let approval: HistoryFields = { is_active: current.is_active };
	const metadata: Record<string, HistoryFields> = {};
	const currentMetaType = META_TYPES[current.category];
	if (currentMetaType && current.meta) metadata[currentMetaType] = normalizeMeta({ ...current.meta });

	return entries.map((entry) => {
		const revision: HistoryRevision = { entry, changes: [], incomplete: false };
		const snapshot = asFields(entry.previous_data);
		if (!snapshot) {
			revision.incomplete = true;
			if (entry.change_type === 'content_edit') content = {};
			if (entry.change_type === 'approval') approval = {};
			if (entry.change_type === 'meta_edit') {
				for (const type of Object.keys(metadata)) metadata[type] = {};
			}
			return revision;
		}

		let before: HistoryFields;
		let after: HistoryFields;
		const savedAfter = asFields(snapshot.after);
		if (entry.change_type === 'meta_edit') {
			const type = snapshot.meta_type;
			const fields = asFields(snapshot.fields);
			if (typeof type !== 'string' || !Object.values(META_TYPES).includes(type) || !fields) {
				revision.incomplete = true;
				for (const key of Object.keys(metadata)) metadata[key] = {};
				return revision;
			}
			before = normalizeMeta(fields);
			after = savedAfter ? normalizeMeta(savedAfter) : { ...metadata[type] };
			// Author-link snapshots contain only two fields, so they must not discard the other metadata.
			metadata[type] = { ...metadata[type], ...before };
		} else if (entry.change_type === 'content_edit') {
			before = snapshot;
			after = savedAfter ?? { ...content };
			content = { ...content, ...before };
		} else if (entry.change_type === 'approval') {
			before = snapshot;
			after = savedAfter ?? { ...approval };
			approval = { ...approval, ...before };
		} else {
			revision.incomplete = true;
			return revision;
		}

		const keys = Object.keys(before).filter((key) => !IGNORED_KEYS.has(key));
		if (!keys.length) revision.incomplete = true;
		for (const key of keys) {
			if (!(key in after)) {
				revision.incomplete = true;
				continue;
			}
			if (comparable(key, before[key]) !== comparable(key, after[key])) revision.changes.push({ key, before: before[key], after: after[key] });
		}
		return revision;
	});
}
