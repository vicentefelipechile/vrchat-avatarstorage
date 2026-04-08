// =========================================================================
// views/ClothesView.ts — Clothes/accessories search with sidebar filter panel
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { t } from '../i18n';
import { buildFilterPanel, initFilterPanel } from '../filter-panel';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';

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
	const date = new Date(res.created_at * 1000).toLocaleDateString();

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
			label: 'Tipo de Ropa',
			type: 'checkbox' as const,
			options: [
				{ value: 'top', label: 'Top' },
				{ value: 'jacket', label: 'Jacket' },
				{ value: 'bottom', label: 'Bottom' },
				{ value: 'dress', label: 'Dress' },
				{ value: 'fullbody', label: 'Full Body' },
				{ value: 'swimwear', label: 'Swimwear' },
				{ value: 'shoes', label: 'Shoes' },
				{ value: 'legwear', label: 'Legwear' },
				{ value: 'hat', label: 'Hat' },
				{ value: 'hair', label: 'Hair' },
				{ value: 'accessory', label: 'Accessory' },
				{ value: 'tail', label: 'Tail' },
				{ value: 'ears', label: 'Ears' },
				{ value: 'wings', label: 'Wings' },
				{ value: 'body-part', label: 'Body Part' },
				{ value: 'underwear', label: 'Underwear' },
				{ value: 'other', label: 'Otro' },
			],
		},
		{
			name: 'gender_fit',
			label: 'Talla / Fit',
			type: 'checkbox' as const,
			options: [
				{ value: 'male', label: 'Male' },
				{ value: 'female', label: 'Female' },
				{ value: 'unisex', label: 'Unisex' },
				{ value: 'kemono', label: 'Kemono' },
			],
		},
		{
			name: 'platform',
			label: 'Plataforma',
			type: 'checkbox' as const,
			options: [
				{ value: 'pc', label: 'PC Only' },
				{ value: 'quest', label: 'Quest Only' },
				{ value: 'cross', label: 'Cross-Platform' },
			],
		},
		{
			name: 'toggles',
			label: 'Filtros',
			type: 'toggle' as const,
			options: [
				{ value: 'is_nsfw', label: 'NSFW' },
				{ value: 'has_physbones', label: 'PhysBones' },
				{ value: 'is_base', label: 'Es base (incluye avatar)' },
			],
		},
	],
};

function buildSortSelect(current: string): string {
	const opts = [
		{ value: 'created_at', label: 'Más recientes' },
		{ value: 'download_count', label: 'Más descargados' },
		{ value: 'title', label: 'A–Z' },
	];
	return `<select class="filter-select" id="clothes-sort-select" style="width:auto;">
		${opts.map((o) => `<option value="${o.value}"${current === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
	</select>`;
}

// =========================================================================
// View
// =========================================================================

export async function clothesView(ctx: RouteContext): Promise<string> {
	document.title = 'VRCStorage — Ropa';

	const params = ctx.query;
	const page = parseInt(params.get('page') || '1', 10);
	const sortBy = params.get('sort_by') || 'created_at';

	const qs = params.toString();
	let data: ClothesListResponse | null = null;
	try {
		const res = await fetch(`/api/clothes?${qs}`);
		if (res.ok) data = await res.json() as ClothesListResponse;
	} catch { /* empty */ }

	const resources = data?.resources ?? [];
	const pagination = data?.pagination ?? { page: 1, total: 0, hasNextPage: false, hasPrevPage: false };

	const cardsHtml = resources.length === 0
		? `<div class="category-empty"><p>No se encontraron prendas con estos filtros.</p></div>`
		: `<div class="grid">${resources.map(clothesCard).join('')}</div>`;

	const prevBtn = pagination.hasPrevPage
		? `<a href="/clothes?${buildPageParams(params, page - 1)}" data-link class="btn">← Anterior</a>`
		: '';
	const nextBtn = pagination.hasNextPage
		? `<a href="/clothes?${buildPageParams(params, page + 1)}" data-link class="btn">Siguiente →</a>`
		: '';
	const pagCtrls = (prevBtn || nextBtn)
		? `<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			${prevBtn}<span style="align-self:center;">Página ${pagination.page}</span>${nextBtn}
		  </div>`
		: '';

	return `<div class="category-layout">
		${buildFilterPanel(CLOTHES_FILTER_CONFIG)}
		<div class="category-results">
			<div class="filter-results-header">
				<span class="filter-results-count">${pagination.total} prenda${pagination.total !== 1 ? 's' : ''}</span>
				<div class="filter-sort-row">
					<span>Ordenar:</span>
					${buildSortSelect(sortBy)}
				</div>
			</div>
			${cardsHtml}
			${pagCtrls}
		</div>
	</div>`;
}

// =========================================================================
// After
// =========================================================================

export function clothesAfter(ctx: RouteContext): void {
	const panel = document.getElementById('filter-panel');
	if (!panel) return;

	initFilterPanel(panel, (newParams) => {
		const sortEl = document.getElementById('clothes-sort-select') as HTMLSelectElement | null;
		if (sortEl?.value) newParams.set('sort_by', sortEl.value);
		newParams.delete('page');
		history.replaceState(null, '', `/clothes?${newParams.toString()}`);
		navigateTo(`/clothes?${newParams.toString()}`);
	});

	document.getElementById('clothes-sort-select')?.addEventListener('change', (e) => {
		const sortBy = (e.target as HTMLSelectElement).value;
		const p = ctx.query;
		p.set('sort_by', sortBy);
		p.delete('page');
		history.replaceState(null, '', `/clothes?${p.toString()}`);
		navigateTo(`/clothes?${p.toString()}`);
	});
}

// =========================================================================
// Helpers
// =========================================================================

function buildPageParams(current: URLSearchParams, newPage: number): string {
	const p = new URLSearchParams(current.toString());
	p.set('page', String(newPage));
	return p.toString();
}
