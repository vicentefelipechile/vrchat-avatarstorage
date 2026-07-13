// =========================================================================
// views/AssetsView.ts — Asset search (filter panel + paginated grid)
// =========================================================================
//
// Thin wrapper over createFilteredListView — see AvatarsView for the pattern.

import { createFilteredListView, FilterType, TimeUnit } from '../features/filtered-list';
import { metaLabel } from '../lib/utils';

// =========================================================================
// Types
// =========================================================================

interface AssetMeta {
	asset_type: string;
	is_nsfw: number;
	unity_version: string;
	platform: string;
	sdk_version: string;
}

// =========================================================================
// Config
// =========================================================================

const FILTERS = {
	groups: [
		{
			name: 'asset_type',
			type: FilterType.CheckBox,
			options: [
				{ value: 'prop' },
				{ value: 'shader' },
				{ value: 'particle' },
				{ value: 'vfx' },
				{ value: 'prefab' },
				{ value: 'script' },
				{ value: 'animation' },
				{ value: 'avatar-base', label: 'avatarBase' },
				{ value: 'texture-pack', label: 'texturePack' },
				{ value: 'sound' },
				{ value: 'tool' },
				{ value: 'hud' },
				{ value: 'other' },
			],
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
			options: [{ value: 'is_nsfw', label: 'nsfw' }],
		},
	],
};

// =========================================================================
// View
// =========================================================================

export const { view: assetsView, after: assetsAfter } = createFilteredListView<AssetMeta>({
	slug: 'asset',
	endpoint: '/api/assets',
	route: '/assets',
	titleKey: 'filterPanel.titleAssets',
	countKey: 'filterPanel.assetCountStr',
	emptyKey: 'filterPanel.noAssets',
	cacheTtl: TimeUnit.Minute * 30,
	filters: FILTERS,
	badge: (meta) => metaLabel('asset_type', meta.asset_type),
});
