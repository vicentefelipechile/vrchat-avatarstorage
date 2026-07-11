// =========================================================================
// views/AvatarsView.ts — Avatar search (filter panel + paginated grid)
// =========================================================================
//
// Thin wrapper over createFilteredListView: it supplies only what is specific
// to avatars — the meta shape, the filter config, the card badge, and the
// author line under the title. Everything else (grid, pagination, sort,
// partial refresh) lives in the shared factory.

import { createFilteredListView, FilterType, TimeUnit, type FilteredResource } from '../features/filtered-list';

// =========================================================================
// Types
// =========================================================================

interface AvatarMeta {
	avatar_gender: string;
	avatar_size: string;
	avatar_type: string;
	is_nsfw: number;
	has_physbones: number;
	has_dps: number;
	has_face_tracking: number;
	has_gogoloco: number;
	has_toggles: number;
	is_quest_optimized: number;
	sdk_version: string;
	platform: string;
	author_name_raw: string | null;
	author_name: string | null;
	author_slug: string | null;
}

// =========================================================================
// Config
// =========================================================================

const FILTERS = {
	groups: [
		{
			name: 'avatar_type',
			type: FilterType.CheckBox,
			options: [
				{ value: 'human' },
				{ value: 'furry' },
				{ value: 'anime' },
				{ value: 'chibi' },
				{ value: 'cartoon' },
				{ value: 'semi-realistic', label: 'semiRealistic' },
				{ value: 'monster' },
				{ value: 'fantasy' },
				{ value: 'other' },
			],
		},
		{
			name: 'avatar_gender',
			type: FilterType.CheckBox,
			options: [{ value: 'male' }, { value: 'female' }, { value: 'both' }],
		},
		{
			name: 'avatar_size',
			type: FilterType.CheckBox,
			options: [{ value: 'tiny' }, { value: 'small' }, { value: 'medium' }, { value: 'tall' }, { value: 'giant' }],
		},
		{
			name: 'platform',
			type: FilterType.CheckBox,
			options: [{ value: 'pc' }, { value: 'quest' }, { value: 'cross' }],
		},
		{
			name: 'sdk_version',
			type: FilterType.CheckBox,
			options: [
				{ value: 'sdk3', label: 'v3' },
				{ value: 'sdk2', label: 'v2' },
			],
		},
		{
			name: 'features',
			type: FilterType.Toggle,
			options: [
				{ value: 'is_nsfw', label: 'nsfw' },
				{ value: 'has_physbones', label: 'physbones' },
				{ value: 'has_dps', label: 'dps' },
				{ value: 'has_face_tracking', label: 'facetracking' },
				{ value: 'has_gogoloco', label: 'gogoloco' },
				{ value: 'has_toggles', label: 'toggles' },
				{ value: 'is_quest_optimized', label: 'questOptimized' },
			],
		},
	],
};

/** Author line shown under the card title, linked to the author page when a slug exists. */
function authorLine(res: FilteredResource<AvatarMeta>): string {
	const { author_name, author_name_raw, author_slug } = res.meta;
	const display = author_name || author_name_raw || '';
	if (!display) return '';
	const inner = author_slug
		? `<a href="/authors/${author_slug}" data-link class="card-author-link">${display}</a>`
		: `<span class="card-author-plain">${display}</span>`;
	return `<p class="card-author">${inner}</p>`;
}

// =========================================================================
// View
// =========================================================================

export const { view: avatarsView, after: avatarsAfter } = createFilteredListView<AvatarMeta>({
	slug: 'avatar',
	endpoint: '/api/avatars',
	route: '/avatars',
	titleKey: 'filterPanel.titleAvatars',
	countKey: 'filterPanel.avatarCountStr',
	emptyKey: 'filterPanel.noAvatars',
	cacheTtl: TimeUnit.Minute * 30,
	filters: FILTERS,
	badge: (meta) => meta.avatar_type,
	extra: authorLine,
});
