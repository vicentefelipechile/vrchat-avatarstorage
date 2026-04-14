// =========================================================================
// views/ClothesView.ts — Clothes/accessories search with sidebar filter panel
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { t } from '../i18n';
import { buildFilterPanel, FilterType, initFilterPanel } from '../filter-panel';
import type { RouteContext } from '../types';
import { DataCache } from '../cache';
import { TimeUnit } from '../utils';

// =========================================================================
// Types
// =========================================================================

interface ClothesResource {
	uuid: string;
	title: string;
	thumbnail_key: string | null;
	download_count: number;
	created_at: number;
	meta: {
		gender_fit: string;
		clothing_type: string;
		is_base: number;
		is_nsfw: number;
		has_physbones: number;
		platform: string;
		base_avatar_uuid: string | null;
		base_avatar_name_raw: string | null;
	};
}

interface ClothesListResponse {
	resources: ClothesResource[];
	pagination: { page: number; limit: number; total: number; hasNextPage: boolean; hasPrevPage: boolean };
}

// =========================================================================
// Helpers
// =========================================================================

function clothesCard(res: ClothesResource): string {
	const title = res.title.substring(0, 50);
	const date = new Date(res.created_at).toLocaleDateString();

	const imgHtml = res.thumbnail_key
		? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy"><span class="card-badge">${res.meta.clothing_type}</span></div>`
		: `<div class="card-image card-image-placeholder"><span class="card-badge">${res.meta.clothing_type}</span></div>`;

	return `<div class="card">
		<a href="/item/${res.uuid}" data-link class="card-link">${imgHtml}</a>
		<div class="card-body">
			<h3>${title}${res.title.length > 50 ? '…' : ''}</h3>
			<div class="card-meta">
				<span>${date}</span>
				<div class="card-stats"><span>📥 ${res.download_count}</span></div>
			</div>
			<div class="card-footer">
				<a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
			</div>
		</div>
	</div>`;
}

const CLOTHES_FILTER_CONFIG = {
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
			options: [
				{ value: 'male' },
				{ value: 'female' },
				{ value: 'unisex' },
				{ value: 'kemono' },
			],
		},
		{
			name: 'platform',
			type: FilterType.CheckBox,
			options: [
				{ value: 'pc' },
				{ value: 'quest' },
				{ value: 'cross' },
			],
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

function buildSortSelect(current: string): string {
	const opts = [
		{ value: 'created_at', label: t('sort.newest') },
		{ value: 'download_count', label: t('sort.mostDownloaded') },
		{ value: 'title', label: t('sort.aZ') },
	];
	return `<select class="filter-select" id="clothes-sort-select" style="width:auto;">
		${opts.map((o) => `<option value="${o.value}"${current === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
	</select>`;
}

// =========================================================================
// buildResults
// Builds only the results section HTML (no filter panel).
// Called on initial load and on every filter/sort change.
// =========================================================================

async function buildResults(params: URLSearchParams): Promise<string> {
	const page = parseInt(params.get('page') || '1', 10);
	const sortBy = params.get('sort_by') || 'created_at';

	let data: ClothesListResponse | null = null;
	try {
		const res = await DataCache.fetch<ClothesListResponse>(`/api/clothes?${params.toString()}`, {
			ttl: TimeUnit.Minute * 30,
			persistent: true,
		});
		if (res) data = res;
	} catch {
		/* empty */
	}

	const resources = data?.resources ?? [];
	const pagination = data?.pagination ?? { page: 1, total: 0, hasNextPage: false, hasPrevPage: false };

	const cardsHtml =
		resources.length === 0
			? `<div class="category-empty"><p>${t('filterPanel.noClothes')}</p></div>`
			: `<div class="grid">${resources.map(clothesCard).join('')}</div>`;

	const prevBtn = pagination.hasPrevPage
		? `<a href="/clothes?${buildPageParams(params, page - 1)}" data-link class="btn">${t('filterPanel.prev')}</a>`
		: '';
	const nextBtn = pagination.hasNextPage
		? `<a href="/clothes?${buildPageParams(params, page + 1)}" data-link class="btn">${t('filterPanel.next')}</a>`
		: '';
	const pagCtrls =
		prevBtn || nextBtn
			? `<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			${prevBtn}<span style="align-self:center;">${t('filterPanel.pagePrefix')} ${pagination.page}</span>${nextBtn}
		  </div>`
			: '';

	return `<div class="filter-results-header">
		<span class="filter-results-count">${pagination.total} ${t('filterPanel.clothesCountStr')}</span>
		<div class="filter-sort-row">
			<span>${t('filterPanel.sortLabel')}</span>
			${buildSortSelect(sortBy)}
		</div>
	</div>
	${cardsHtml}
	${pagCtrls}`;
}

// =========================================================================
// View
// =========================================================================

export async function clothesView(ctx: RouteContext): Promise<string> {
	document.title = t('filterPanel.titleClothes');

	return `<div class="category-layout">
		${buildFilterPanel(CLOTHES_FILTER_CONFIG)}
		<div class="category-results" id="clothes-results">
			${await buildResults(ctx.query)}
		</div>
	</div>`;
}

// =========================================================================
// After
// =========================================================================

export function clothesAfter(ctx: RouteContext): void {
	const panel = document.getElementById('filter-panel');
	if (!panel) return;

	async function refreshResults(newParams: URLSearchParams): Promise<void> {
		const resultsEl = document.getElementById('clothes-results');
		if (!resultsEl) return;

		history.replaceState(null, '', `/clothes?${newParams.toString()}`);
		resultsEl.style.opacity = '0.5';
		resultsEl.innerHTML = await buildResults(newParams);
		resultsEl.style.opacity = '1';

		bindSortSelect(newParams);
	}

	initFilterPanel(panel, (newParams) => {
		const sortEl = document.getElementById('clothes-sort-select') as HTMLSelectElement | null;
		if (sortEl?.value) newParams.set('sort_by', sortEl.value);
		newParams.delete('page');
		refreshResults(newParams);
	});

	function bindSortSelect(currentParams: URLSearchParams): void {
		document.getElementById('clothes-sort-select')?.addEventListener('change', (e) => {
			const sortBy = (e.target as HTMLSelectElement).value;
			const p = new URLSearchParams(currentParams.toString());
			p.set('sort_by', sortBy);
			p.delete('page');
			refreshResults(p);
		});
	}

	bindSortSelect(ctx.query);
}

// =========================================================================
// Helpers
// =========================================================================

function buildPageParams(current: URLSearchParams, newPage: number): string {
	const p = new URLSearchParams(current.toString());
	p.set('page', String(newPage));
	return p.toString();
}