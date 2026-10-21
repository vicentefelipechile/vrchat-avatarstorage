// =========================================================================
// views/ClothesView.ts — Clothes/accessories search (filter panel + grid)
// =========================================================================
//
// Thin wrapper over createFilteredListView — see AvatarsView for the pattern.

import { createFilteredListView, FilterType, TimeUnit } from '../features/filtered-list';
import { metaLabel } from '../lib/utils';
import { api } from '../api';
import type { ClothesListMeta as ClothesMeta } from '../api/categories';

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
	list: (filters, options) => api.Categories.Clothes.List(filters, options),
	route: '/clothes',
	titleKey: 'filterPanel.titleClothes',
	countKey: 'filterPanel.clothesCountStr',
	emptyKey: 'filterPanel.noClothes',
	cacheTtl: TimeUnit.Hour,
	filters: FILTERS,
	badge: (meta) => {
		const types = Array.isArray(meta.clothing_type) ? meta.clothing_type : [];
		if (!types.length) return '';
		const first = metaLabel('clothing_type', types[0]);
		return types.length > 1 ? `${first} +${types.length - 1}` : first;
	},
});
