// =========================================================================
// views/ClothesView.ts — Clothes/accessories search (filter panel + grid)
// =========================================================================
//
// Thin wrapper over createFilteredListView — see AvatarsView for the pattern.

import { createFilteredListView, FilterType, TimeUnit } from '../features/filtered-list';
import { metaLabel } from '../lib/utils';

// =========================================================================
// Types
// =========================================================================

interface ClothesMeta {
	gender_fit: string;
	clothing_type: string;
	is_base: number;
	is_nsfw: number;
	has_physbones: number;
	platform: string;
	base_avatar_uuid: string | null;
	base_avatar_name_raw: string | null;
}

// =========================================================================
// Config
// =========================================================================

const FILTERS = {
	groups: [
		{
			name: 'clothing_type',
			type: FilterType.CheckBox,
			options: [
				{ value: 'top' },
				{ value: 'jacket' },
				{ value: 'bottom' },
				{ value: 'dress' },
				{ value: 'fullbody' },
				{ value: 'swimwear' },
				{ value: 'shoes' },
				{ value: 'legwear' },
				{ value: 'hat' },
				{ value: 'hair' },
				{ value: 'accessory' },
				{ value: 'tail' },
				{ value: 'ears' },
				{ value: 'wings' },
				{ value: 'body-part', label: 'bodyPart' },
				{ value: 'underwear' },
				{ value: 'other' },
			],
		},
		{
			name: 'gender_fit',
			label: 'avatar_gender',
			type: FilterType.CheckBox,
			options: [{ value: 'male' }, { value: 'female' }, { value: 'unisex' }, { value: 'kemono' }],
		},
		{
			name: 'platform',
			type: FilterType.CheckBox,
			options: [{ value: 'pc' }, { value: 'quest' }, { value: 'cross' }],
		},
		{
			name: 'features',
			type: FilterType.Toggle,
			options: [
				{ value: 'is_nsfw', label: 'nsfw' },
				{ value: 'has_physbones', label: 'physbones' },
			],
		},
	],
};

// =========================================================================
// View
// =========================================================================

export const { view: clothesView, after: clothesAfter } = createFilteredListView<ClothesMeta>({
	slug: 'clothes',
	endpoint: '/api/clothes',
	route: '/clothes',
	titleKey: 'filterPanel.titleClothes',
	countKey: 'filterPanel.clothesCountStr',
	emptyKey: 'filterPanel.noClothes',
	cacheTtl: TimeUnit.Hour,
	filters: FILTERS,
	badge: (meta) => metaLabel('clothing_type', meta.clothing_type),
});
