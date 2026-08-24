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
import { paginationHtml } from '../lib/pagination';

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
	limit: number;
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

	const isNsfw = (res.meta as Record<string, unknown>)?.is_nsfw === 1;
	const shouldBlur = isNsfw && (cfg.slug === 'asset' || cfg.slug === 'clothes');
	const nsfwClass = shouldBlur ? ' card-nsfw' : '';

	const imgHtml = res.thumbnail_media_uuid
		? `<div class="card-image${nsfwClass}">${progressiveImg({ uuid: res.thumbnail_media_uuid, placeholder: res.placeholder_blur, res: 'low', alt: title, processed: res.processed })}<span class="card-badge">${badge}</span></div>`
		: `<div class="card-image card-image-placeholder${nsfwClass}"><span class="card-badge">${badge}</span></div>`;

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
	const pagination = (data?.pagination as Pagination | undefined) ?? {
		page: 1,
		total: 0,
		limit: 24,
		hasNextPage: false,
		hasPrevPage: false,
	};

	const cardsHtml =
		resources.length === 0
			? `<div class="category-empty"><p>${t(cfg.emptyKey)}</p></div>`
			: `<div class="grid">${resources.map((r) => card(cfg, r)).join('')}</div>`;

	const limit = (pagination as Pagination).limit ?? 24;
	const totalPages = Math.max(1, Math.ceil(pagination.total / limit));
	const displayPage = Math.min(Math.max(1, pagination.page), totalPages);
	const jumpInputId = `${cfg.slug}-page-jump`;
	const pagCtrls =
		pagination.total > 0 && totalPages > 1
			? paginationHtml({
					page: displayPage,
					totalPages,
					route: cfg.route,
					params,
					jumpInputId,
					labels: {
						first: t('pagination.first'),
						prev: t('pagination.prev'),
						next: t('pagination.next'),
						last: t('pagination.last'),
						of: t('pagination.of'),
						pageLabel: t('pagination.page'),
						jumpLabel: t('pagination.jumpLabel'),
						go: t('pagination.go'),
					},
				})
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
			bindPaginationJump(newParams);
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

		function bindPaginationJump(currentParams: URLSearchParams): void {
			const resultsEl = document.getElementById(resultsId);
			if (!resultsEl) return;
			const input = resultsEl.querySelector<HTMLInputElement>(`#${cfg.slug}-page-jump`);
			const btn = resultsEl.querySelector<HTMLButtonElement>('[data-pagination-go]');
			if (!input || !btn) return;

			const go = (): void => {
				const raw = parseInt(input.value, 10);
				if (!Number.isFinite(raw)) return;
				const max = parseInt(input.max || '1', 10) || 1;
				const clamped = Math.min(Math.max(1, raw), max);
				const p = new URLSearchParams(currentParams.toString());
				p.set('page', String(clamped));
				refreshResults(p);
			};

			btn.addEventListener('click', go);
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					go();
				}
			});
		}

		initFilterPanel(panel, (newParams) => {
			const sortEl = document.getElementById(sortId) as HTMLSelectElement | null;
			if (sortEl?.value) newParams.set('sort_by', sortEl.value);
			newParams.delete('page');
			refreshResults(newParams);
		});

		bindSortSelect(ctx.query);
		bindPaginationJump(ctx.query);
	}

	return { view, after };
}

// Re-exported so views can build filter configs and set TTLs from one import.
export { FilterType, TimeUnit };
