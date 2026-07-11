// =========================================================================
// views/filtered-list.ts — Factory for sidebar-filtered resource listings
// =========================================================================
//
// Avatars, assets and clothes are the same page: a filter panel on the left,
// a paginated grid of cards on the right, a sort select, and a partial refresh
// that swaps only the results when a filter or sort changes. This factory holds
// that shared shape once; each view supplies only what differs — its endpoint,
// its filter config, the i18n keys, and how a card renders its meta badge.

import { t } from '../core/i18n';
import { buildFilterPanel, initFilterPanel, FilterType, type FilterPanelConfig } from './filter-panel';
import type { RouteContext } from '../types';
import { DataCache } from '../core/cache';
import { TimeUnit, progressiveImg, initLazyImages, initMediaPolling } from '../lib/utils';

// =========================================================================
// Types
// =========================================================================

/** The row shape every filtered listing shares. `meta` is category-specific. */
export interface FilteredResource<Meta> {
	uuid: string;
	title: string;
	thumbnail_media_uuid: string | null;
	placeholder_blur: string | null;
	processed: boolean;
	download_count: number;
	created_at: number;
	meta: Meta;
}

interface Pagination {
	page: number;
	total: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

interface ListResponse<Meta> {
	resources: FilteredResource<Meta>[];
	pagination: Pagination;
}

/** Everything a concrete listing view must supply to the factory. */
export interface FilteredListConfig<Meta> {
	/** URL slug and cache/DOM id prefix, e.g. 'avatars' → `/api/avatars`, `#avatars-results`. */
	slug: string;
	/** API path (without query string), e.g. `/api/avatars`. */
	endpoint: string;
	/** Route path the pagination links point at, e.g. `/avatars`. */
	route: string;
	/** document.title i18n key. */
	titleKey: string;
	/** i18n key for the "N results" count suffix. */
	countKey: string;
	/** i18n key for the empty-state message. */
	emptyKey: string;
	/** How long list responses stay cached. */
	cacheTtl: number;
	/** Filter panel definition. */
	filters: FilterPanelConfig;
	/** Renders the badge shown over a card's thumbnail, from the row's meta. */
	badge: (meta: Meta) => string;
	/** Optional extra markup under the card title (e.g. an author line). */
	extra?: (res: FilteredResource<Meta>) => string;
}

// =========================================================================
// Shared building blocks
// =========================================================================

function pageParams(current: URLSearchParams, newPage: number): string {
	const p = new URLSearchParams(current.toString());
	p.set('page', String(newPage));
	return p.toString();
}

function sortSelect(slug: string, current: string): string {
	const opts = [
		{ value: 'created_at', label: t('sort.newest') },
		{ value: 'download_count', label: t('sort.mostDownloaded') },
		{ value: 'title', label: t('sort.aZ') },
	];
	return `<select class="filter-select" id="${slug}-sort-select" style="width:auto;">
		${opts.map((o) => `<option value="${o.value}"${current === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
	</select>`;
}

function card<Meta>(cfg: FilteredListConfig<Meta>, res: FilteredResource<Meta>): string {
	const title = res.title.substring(0, 50);
	const date = new Date(res.created_at * 1000).toLocaleDateString();
	const badge = cfg.badge(res.meta);

	const imgHtml = res.thumbnail_media_uuid
		? `<div class="card-image">${progressiveImg({ uuid: res.thumbnail_media_uuid, placeholder: res.placeholder_blur, res: 'low', alt: title, processed: res.processed })}<span class="card-badge">${badge}</span></div>`
		: `<div class="card-image card-image-placeholder"><span class="card-badge">${badge}</span></div>`;

	return `<div class="card">
		<a href="/item/${res.uuid}" data-link class="card-link">${imgHtml}</a>
		<div class="card-body">
			<h3>${title}${res.title.length > 50 ? '…' : ''}</h3>
			<div class="card-meta">
				<span>${date}</span>
				<div class="card-stats"><span>📥 ${res.download_count}</span></div>
			</div>
			${cfg.extra?.(res) ?? ''}
			<div class="card-footer">
				<a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
			</div>
		</div>
	</div>`;
}

/** Builds only the results section (no filter panel). Runs on load and on every filter/sort change. */
async function buildResults<Meta>(cfg: FilteredListConfig<Meta>, params: URLSearchParams): Promise<string> {
	const page = parseInt(params.get('page') || '1', 10);
	const sortBy = params.get('sort_by') || 'created_at';

	let data: ListResponse<Meta> | null = null;
	try {
		const res = await DataCache.fetch<ListResponse<Meta>>(`${cfg.endpoint}?${params.toString()}`, {
			ttl: cfg.cacheTtl,
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
			? `<div class="category-empty"><p>${t(cfg.emptyKey)}</p></div>`
			: `<div class="grid">${resources.map((r) => card(cfg, r)).join('')}</div>`;

	const prevBtn = pagination.hasPrevPage
		? `<a href="${cfg.route}?${pageParams(params, page - 1)}" data-link class="btn">${t('filterPanel.prev')}</a>`
		: '';
	const nextBtn = pagination.hasNextPage
		? `<a href="${cfg.route}?${pageParams(params, page + 1)}" data-link class="btn">${t('filterPanel.next')}</a>`
		: '';
	const pagCtrls =
		prevBtn || nextBtn
			? `<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			${prevBtn}<span style="align-self:center;">${t('filterPanel.pagePrefix')} ${pagination.page}</span>${nextBtn}
		  </div>`
			: '';

	return `<div class="filter-results-header">
		<span class="filter-results-count">${pagination.total} ${t(cfg.countKey)}</span>
		<div class="filter-sort-row">
			<span>${t('filterPanel.sortLabel')}</span>
			${sortSelect(cfg.slug, sortBy)}
		</div>
	</div>
	${cardsHtml}
	${pagCtrls}`;
}

// =========================================================================
// Factory
// =========================================================================

/** Builds the `{ view, after }` pair a filtered listing route registers. */
export function createFilteredListView<Meta>(cfg: FilteredListConfig<Meta>): {
	view: (ctx: RouteContext) => Promise<string>;
	after: (ctx: RouteContext) => void;
} {
	const resultsId = `${cfg.slug}-results`;
	const sortId = `${cfg.slug}-sort-select`;

	async function view(ctx: RouteContext): Promise<string> {
		document.title = t(cfg.titleKey);
		const resultsHtml = await buildResults(cfg, ctx.query);
		return `
			<div class="category-layout">
				${buildFilterPanel(cfg.filters)}
				<div class="category-results" id="${resultsId}">
					${resultsHtml}
				</div>
			</div>`;
	}

	function after(ctx: RouteContext): void {
		const panel = document.getElementById('filter-panel');
		if (!panel) return;

		async function refreshResults(newParams: URLSearchParams): Promise<void> {
			const resultsEl = document.getElementById(resultsId);
			if (!resultsEl) return;

			// Update the URL in place, then swap only the results — the panel keeps its state.
			history.replaceState(null, '', `${cfg.route}?${newParams.toString()}`);
			resultsEl.style.opacity = '0.5';
			resultsEl.innerHTML = await buildResults(cfg, newParams);
			resultsEl.style.opacity = '1';
			initLazyImages();
			initMediaPolling();
			bindSortSelect(newParams);
		}

		function bindSortSelect(currentParams: URLSearchParams): void {
			// The select is recreated on every refresh, so it needs rebinding each time.
			document.getElementById(sortId)?.addEventListener('change', (e) => {
				const p = new URLSearchParams(currentParams.toString());
				p.set('sort_by', (e.target as HTMLSelectElement).value);
				p.delete('page');
				refreshResults(p);
			});
		}

		initFilterPanel(panel, (newParams) => {
			const sortEl = document.getElementById(sortId) as HTMLSelectElement | null;
			if (sortEl?.value) newParams.set('sort_by', sortEl.value);
			newParams.delete('page');
			refreshResults(newParams);
		});

		bindSortSelect(ctx.query);
	}

	return { view, after };
}

// Re-exported so views can build filter configs and set TTLs from one import.
export { FilterType, TimeUnit };
