// =========================================================================================================
// lib/pagination.ts — Stateless pagination helpers (no DOM ownership, no app state)
// =========================================================================================================

export type PageItem = number | 'ellipsis';

/**
 * Builds the windowed page-number list with ellipsis.
 * - Always includes 1 and totalPages.
 * - Shows [current - delta .. current + delta] clamped to (2 .. totalPages-1).
 * - Inserts 'ellipsis' where the gap between consecutive numbers is > 1.
 * - If totalPages <= 7 (or otherwise fits without gaps) returns the full range.
 */
export function getPaginationItems(current: number, totalPages: number, delta = 2): PageItem[] {
	if (totalPages <= 1) return [1];
	if (totalPages <= 7) {
		const all: PageItem[] = [];
		for (let i = 1; i <= totalPages; i++) all.push(i);
		return all;
	}

	const left = Math.max(2, current - delta);
	const right = Math.min(totalPages - 1, current + delta);

	const items: PageItem[] = [1];

	if (left > 2) items.push('ellipsis');

	for (let i = left; i <= right; i++) items.push(i);

	if (right < totalPages - 1) items.push('ellipsis');

	items.push(totalPages);

	return items;
}

function pageHref(route: string, params: URLSearchParams, page: number): string {
	const p = new URLSearchParams(params.toString());
	p.set('page', String(page));
	return `${route}?${p.toString()}`;
}

export interface PaginationRenderOpts {
	page: number;
	totalPages: number;
	route: string;
	params: URLSearchParams;
	jumpInputId: string;
	labels: {
		first: string;
		prev: string;
		next: string;
		last: string;
		of: string;
		pageLabel: string;
		jumpLabel: string;
		go: string;
	};
}

/**
 * Renders the full pagination bar as HTML string.
 * - First/Prev/Next/Last are <a data-link> when enabled, <span> when disabled.
 * - Page numbers are <a data-link> except the active page (span.btn.is-active + aria-current).
 * - Ellipsis is a plain span.
 * - Jump control is an input + button (handled via delegation in the view's after()).
 */
export function paginationHtml(opts: PaginationRenderOpts): string {
	const { page, totalPages, route, params, jumpInputId, labels } = opts;

	if (totalPages <= 1) return '';

	const items = getPaginationItems(page, totalPages);

	const firstHtml =
		page > 1
			? `<a href="${pageHref(route, params, 1)}" data-link class="pagination-btn pagination-nav" aria-label="${labels.first}">«</a>`
			: `<span class="pagination-btn pagination-nav is-disabled" aria-disabled="true">«</span>`;

	const prevHtml =
		page > 1
			? `<a href="${pageHref(route, params, page - 1)}" data-link class="pagination-btn pagination-nav" aria-label="${labels.prev}">${labels.prev}</a>`
			: `<span class="pagination-btn pagination-nav is-disabled" aria-disabled="true">${labels.prev}</span>`;

	const nextHtml =
		page < totalPages
			? `<a href="${pageHref(route, params, page + 1)}" data-link class="pagination-btn pagination-nav" aria-label="${labels.next}">${labels.next}</a>`
			: `<span class="pagination-btn pagination-nav is-disabled" aria-disabled="true">${labels.next}</span>`;

	const lastHtml =
		page < totalPages
			? `<a href="${pageHref(route, params, totalPages)}" data-link class="pagination-btn pagination-nav" aria-label="${labels.last}">»</a>`
			: `<span class="pagination-btn pagination-nav is-disabled" aria-disabled="true">»</span>`;

	const numbersHtml = items
		.map((it) => {
			if (it === 'ellipsis') return `<span class="pagination-ellipsis" aria-hidden="true">…</span>`;
			if (it === page)
				return `<span class="pagination-btn is-active" aria-current="page" aria-label="${labels.pageLabel} ${it}">${it}</span>`;
			return `<a href="${pageHref(route, params, it)}" data-link class="pagination-btn" aria-label="${labels.pageLabel} ${it}">${it}</a>`;
		})
		.join('');

	const infoHtml = `<span class="page-info">${labels.pageLabel} ${page} ${labels.of} ${totalPages}</span>`;

	const jumpHtml = `<span class="pagination-jump"><label for="${jumpInputId}" class="pagination-jump-label">${labels.jumpLabel}</label><input id="${jumpInputId}" class="pagination-jump-input" type="number" inputmode="numeric" min="1" max="${totalPages}" placeholder="${page}" aria-label="${labels.jumpLabel}" /><button type="button" class="pagination-btn pagination-jump-btn" data-pagination-go>${labels.go}</button></span>`;

	return `<nav class="pagination" aria-label="${labels.pageLabel}"><div class="pagination-main"><div class="pagination-pages">${firstHtml}${prevHtml}</div><div class="pagination-numbers">${numbersHtml}</div><div class="pagination-pages">${nextHtml}${lastHtml}</div></div><div class="pagination-meta">${infoHtml}${jumpHtml}</div></nav>`;
}
