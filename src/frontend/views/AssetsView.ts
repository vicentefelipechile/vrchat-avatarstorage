// =========================================================================
// views/AssetsView.ts — Assets search with sidebar filter panel
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { t } from '../i18n';
import { buildFilterPanel, FilterType, initFilterPanel } from '../filter-panel';
import type { RouteContext } from '../types';
import { DataCache } from '../cache';
import { TimeUnit } from '../utils';
import { renderAdPrefsPanel } from '../ad-prefs';
import { initAdSystem, mountSidebarSlot } from '../ad-orchestrator';

// =========================================================================
// Types
// =========================================================================

interface AssetResource {
	uuid: string;
	title: string;
	thumbnail_key: string | null;
	download_count: number;
	created_at: number;
	meta: {
		asset_type: string;
		is_nsfw: number;
		unity_version: string;
		platform: string;
		sdk_version: string;
	};
}

interface AssetListResponse {
	resources: AssetResource[];
	pagination: { page: number; limit: number; total: number; hasNextPage: boolean; hasPrevPage: boolean };
}

// =========================================================================
// Helpers
// =========================================================================

function assetCard(res: AssetResource): string {
	const title = res.title.substring(0, 50);
	const date = new Date(res.created_at * 1000).toLocaleDateString();

	const imgHtml = res.thumbnail_key
		? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy"><span class="card-badge">${res.meta.asset_type}</span></div>`
		: `<div class="card-image card-image-placeholder"><span class="card-badge">${res.meta.asset_type}</span></div>`;

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

const ASSET_FILTER_CONFIG = {
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
			options: [
				{ value: 'pc' },
				{ value: 'quest' },
				{ value: 'cross' },
			],
		},
		{
			name: 'sdk_version',
			type: FilterType.CheckBox,
			options: [
				{ value: 'sdk3', label: 'v3' },
				{ value: 'sdk2', label: 'v2' },
			],
		},
		/*
		{
			name: 'unity_version',
			type: FilterType.CheckBox,
			options: [
				{ value: '2022', label: 'Unity 2022' },
				{ value: '2019', label: 'Unity 2019' },
			],
		},
		*/
		{
			name: 'features',
			type: FilterType.Toggle,
			options: [
				{ value: 'is_nsfw', label: 'nsfw' },
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
	return `<select class="filter-select" id="asset-sort-select" style="width:auto;">
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

	let data: AssetListResponse | null = null;
	try {
		const res = await DataCache.fetch<AssetListResponse>(`/api/assets?${params.toString()}`, {
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
			? `<div class="category-empty"><p>${t('filterPanel.noAssets')}</p></div>`
			: `<div class="grid">${resources.map(assetCard).join('')}</div>`;

	const prevBtn = pagination.hasPrevPage
		? `<a href="/assets?${buildPageParams(params, page - 1)}" data-link class="btn">← ${t('filterPanel.prev')}</a>`
		: '';
	const nextBtn = pagination.hasNextPage
		? `<a href="/assets?${buildPageParams(params, page + 1)}" data-link class="btn">${t('filterPanel.next')} →</a>`
		: '';
	const pagCtrls =
		prevBtn || nextBtn
			? `<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			${prevBtn}<span style="align-self:center;">${t('filterPanel.pagePrefix')} ${pagination.page}</span>${nextBtn}
		  </div>`
			: '';

	return `<div class="filter-results-header">
		<span class="filter-results-count">${pagination.total} ${t('filterPanel.assetCountStr')}</span>
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

export async function assetsView(ctx: RouteContext): Promise<string> {
	document.title = t('filterPanel.titleAssets');

	const resultsHtml = await buildResults(ctx.query);

	return `
		${renderAdPrefsPanel()}
		<div class="category-layout">
			${buildFilterPanel(ASSET_FILTER_CONFIG)}
			<div class="category-results" id="asset-results">
				${resultsHtml}
			</div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export function assetsAfter(ctx: RouteContext): void {
	const panel = document.getElementById('filter-panel');
	if (!panel) return;

	initAdSystem();
	mountSidebarSlot({ mode: 'fixed' });

	async function refreshResults(newParams: URLSearchParams): Promise<void> {
		const resultsEl = document.getElementById('asset-results');
		if (!resultsEl) return;

		history.replaceState(null, '', `/assets?${newParams.toString()}`);
		resultsEl.style.opacity = '0.5';
		resultsEl.innerHTML = await buildResults(newParams);
		resultsEl.style.opacity = '1';

		bindSortSelect(newParams);
	}

	initFilterPanel(panel, (newParams) => {
		const sortEl = document.getElementById('asset-sort-select') as HTMLSelectElement | null;
		if (sortEl?.value) newParams.set('sort_by', sortEl.value);
		newParams.delete('page');
		refreshResults(newParams);
	});

	function bindSortSelect(currentParams: URLSearchParams): void {
		document.getElementById('asset-sort-select')?.addEventListener('change', (e) => {
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