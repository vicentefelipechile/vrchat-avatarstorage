// =========================================================================
// views/AvatarsView.ts — Avatar search with sidebar filter panel
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { t } from '../i18n';
import { buildFilterPanel, initFilterPanel, FilterType } from '../filter-panel';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';
import { DataCache } from '../cache';
import { TimeUnit } from '../utils';

// =========================================================================
// Types
// =========================================================================

interface AvatarResource {
	uuid: string;
	title: string;
	thumbnail_key: string | null;
	download_count: number;
	created_at: number;
	meta: {
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
	};
}

interface AvatarListResponse {
	resources: AvatarResource[];
	pagination: { page: number; limit: number; total: number; hasNextPage: boolean; hasPrevPage: boolean };
}

// =========================================================================
// Helpers
// =========================================================================

function avatarCard(res: AvatarResource): string {
	const title = res.title.substring(0, 50);
	const date = new Date(res.created_at).toLocaleDateString();
	const authorDisplay = res.meta.author_name || res.meta.author_name_raw || '';
	const authorHtml = res.meta.author_slug
		? `<a href="/authors/${res.meta.author_slug}" data-link class="card-author-link">${authorDisplay}</a>`
		: authorDisplay
			? `<span class="card-author-plain">${authorDisplay}</span>`
			: '';

	const imgHtml = res.thumbnail_key
		? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy"><span class="card-badge">${res.meta.avatar_type}</span></div>`
		: `<div class="card-image card-image-placeholder"><span class="card-badge">${res.meta.avatar_type}</span></div>`;

	return `<div class="card">
		<a href="/item/${res.uuid}" data-link class="card-link">${imgHtml}</a>
		<div class="card-body">
			<h3>${title}${res.title.length > 50 ? '…' : ''}</h3>
			<div class="card-meta">
				<span>${date}</span>
				<div class="card-stats"><span>📥 ${res.download_count}</span></div>
			</div>
			${authorHtml ? `<p class="card-author">${authorHtml}</p>` : ''}
			<div class="card-footer">
				<a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
			</div>
		</div>
	</div>`;
}

const AVATAR_FILTER_CONFIG = {
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
				// { value: 'kemono' },
				// { value: 'mecha' },
				// { value: 'sci-fi', label: 'sciFi' },
				// { value: 'vtuber' },
				{ value: 'other' },
			],
		},
		{
			name: 'avatar_gender',
			type: FilterType.CheckBox,
			options: [
				{ value: 'male' },
				{ value: 'female' },
				{ value: 'both' },
				// { value: 'androgynous' },
				// { value: 'undefined' },
			],
		},
		{
			name: 'avatar_size',
			type: FilterType.CheckBox,
			options: [
				{ value: 'tiny' },
				{ value: 'small' },
				{ value: 'medium' },
				{ value: 'tall' },
				{ value: 'giant' },
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

function buildSortSelect(current: string): string {
	const opts = [
		{ value: 'created_at', label: t('sort.newest') },
		{ value: 'download_count', label: t('sort.mostDownloaded') },
		{ value: 'title', label: t('sort.aZ') },
	];
	return `<select class="filter-select" id="avatar-sort-select" style="width:auto;">
		${opts.map((o) => `<option value="${o.value}"${current === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
	</select>`;
}

// =========================================================================
// View
// =========================================================================

// Extrae solo la parte de resultados como función separada
async function buildResults(params: URLSearchParams): Promise<string> {
    const page = parseInt(params.get('page') || '1', 10);
    const sortBy = params.get('sort_by') || 'created_at';

    const qs = params.toString();
    let data: AvatarListResponse | null = null;
    try {
        const res = await DataCache.fetch<AvatarListResponse>(
            `/api/avatars?${qs}`, 
            { ttl: TimeUnit.Minute * 30, persistent: true }
        );
        if (res !== null) data = res;
    } catch { /* empty */ }

    const resources = data?.resources ?? [];
    const pagination = data?.pagination ?? { 
        page: 1, total: 0, hasNextPage: false, hasPrevPage: false 
    };

    const cardsHtml =
        resources.length === 0
            ? `<div class="category-empty"><p>${t('filterPanel.noAvatars')}</p></div>`
            : `<div class="grid">${resources.map(avatarCard).join('')}</div>`;

    const prevBtn = pagination.hasPrevPage
        ? `<a href="/avatars?${buildPageParams(params, page - 1)}" data-link class="btn">${t('filterPanel.prev')}</a>`
        : '';
    const nextBtn = pagination.hasNextPage
        ? `<a href="/avatars?${buildPageParams(params, page + 1)}" data-link class="btn">${t('filterPanel.next')}</a>`
        : '';
    const pagCtrls = prevBtn || nextBtn
        ? `<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
            ${prevBtn}<span style="align-self:center;">${t('filterPanel.pagePrefix')} ${pagination.page}</span>${nextBtn}
          </div>`
        : '';

    return `<div class="filter-results-header">
        <span class="filter-results-count">${pagination.total} ${t('filterPanel.avatarCountStr')}</span>
        <div class="filter-sort-row">
            <span>${t('filterPanel.sortLabel')}</span>
            ${buildSortSelect(sortBy)}
        </div>
    </div>
    ${cardsHtml}
    ${pagCtrls}`;
}

// avatarsView solo se llama en la carga inicial
export async function avatarsView(ctx: RouteContext): Promise<string> {
    document.title = t('filterPanel.titleAvatars');

    const resultsHtml = await buildResults(ctx.query);

    return `<div class="category-layout">
        ${buildFilterPanel(AVATAR_FILTER_CONFIG)}
        <div class="category-results" id="avatar-results">
            ${resultsHtml}
        </div>
    </div>`;
}

// =========================================================================
// After
// =========================================================================

export function avatarsAfter(ctx: RouteContext): void {
    const panel = document.getElementById('filter-panel');
    if (!panel) return;

    // Función que actualiza SOLO los resultados, sin tocar el panel
    async function refreshResults(newParams: URLSearchParams) {
        const resultsEl = document.getElementById('avatar-results');
        if (!resultsEl) return;

        // Actualiza la URL sin navegar
        history.replaceState(null, '', `/avatars?${newParams.toString()}`);

        // Muestra loading sutil (opcional, sin blanquear)
        resultsEl.style.opacity = '0.5';

        resultsEl.innerHTML = await buildResults(newParams);
        resultsEl.style.opacity = '1';

        // Re-bindear el sort select porque fue recreado
        bindSortSelect(newParams);
    }

    initFilterPanel(panel, (newParams) => {
        const sortEl = document.getElementById('avatar-sort-select') as HTMLSelectElement | null;
        if (sortEl?.value) newParams.set('sort_by', sortEl.value);
        newParams.delete('page');
        refreshResults(newParams);
    });

    function bindSortSelect(currentParams: URLSearchParams) {
        document.getElementById('avatar-sort-select')?.addEventListener('change', (e) => {
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
