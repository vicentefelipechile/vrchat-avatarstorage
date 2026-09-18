// =========================================================================================================
// features/admin/admin-table.ts — Shared table shell + numbered button pagination for admin sections
// =========================================================================================================
// Pagination is button-based (in-place re-render of tbody only, so filter inputs never lose focus),
// unlike lib/pagination.ts which renders data-link navigation for public listings.
// =========================================================================================================

import { getPaginationItems } from '../../lib/pagination';
import { t } from '../../core/i18n';
import { esc } from './esc';
import type { PaginationMeta } from './types';

export function totalPages(meta: PaginationMeta): number {
	return Math.max(1, Math.ceil(meta.total / meta.limit));
}

/** Numbered pagination bar. Page switches are delivered via delegation — see wirePagination(). */
export function paginationBar(meta: PaginationMeta, totalLabel: string): string {
	const pages = totalPages(meta);
	const numbers = getPaginationItems(meta.page, pages)
		.map((it) =>
			it === 'ellipsis'
				? `<span class="admin-page-ellipsis" aria-hidden="true">…</span>`
				: it === meta.page
					? `<span class="admin-page-btn is-active" aria-current="page">${it}</span>`
					: `<button type="button" class="admin-page-btn" data-page="${it}">${it}</button>`,
		)
		.join('');
	return `<div class="admin-pagination">
		${meta.hasPrevPage ? `<button type="button" class="btn btn-sm" data-page="${meta.page - 1}">← ${esc(t('filterPanel.prev'))}</button>` : ''}
		<div class="admin-page-numbers">${numbers}</div>
		${meta.hasNextPage ? `<button type="button" class="btn btn-sm" data-page="${meta.page + 1}">${esc(t('filterPanel.next'))} →</button>` : ''}
		<span class="admin-page-info">${esc(t('admin.resources.pageLabel'))} ${meta.page} ${esc(t('pagination.of'))} ${pages} · ${meta.total} ${esc(totalLabel)}</span>
	</div>`;
}

/** Single delegated click listener for every [data-page] button under root. Call once per section. */
export function wirePagination(root: HTMLElement, onPage: (page: number) => void): void {
	root.addEventListener('click', (e) => {
		const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-page]');
		if (!btn || !root.contains(btn)) return;
		onPage(parseInt(btn.dataset.page!, 10));
	});
}

export function errorRow(colspan: number): string {
	return `<tr><td colspan="${colspan}"><p class="admin-error-message">${esc(t('admin.statsError'))}</p></td></tr>`;
}

export function emptyRow(colspan: number, message: string): string {
	return `<tr><td colspan="${colspan}" class="admin-empty">${esc(message)}</td></tr>`;
}

