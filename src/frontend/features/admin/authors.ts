// =========================================================================================================
// features/admin/authors.ts — Author CRUD list (uses public /api/authors endpoints)
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { showConfirm } from '../../lib/confirm';
import { icons } from '../../lib/icons';
import { adminGet } from './api';
import { esc, safeAvatarSrc, fmtDate } from './esc';
import { paginationBar, wirePagination, errorRow, emptyRow } from './admin-table';
import { showAuthorForm, fetchAuthorForEdit } from './author-form';
import type { AuthorRow, PaginationMeta } from './types';

export function loadAuthors(el: HTMLElement, signal: AbortSignal): void {
	let page = 1;

	el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.authors.title'))}</h2>
		<div class="admin-form-panel">
			<div class="admin-action-bar">
				<button type="button" class="btn btn-sm" data-create>${icons.plus(14)} ${esc(t('admin.authors.btnNew'))}</button>
			</div>
			<div class="admin-table-wrap"><table class="admin-data-table">
				<thead><tr><th>${esc(t('admin.authors.colName'))}</th><th>${esc(t('admin.authors.colAvatars'))}</th><th>${esc(t('admin.authors.colCreated'))}</th><th></th></tr></thead>
				<tbody data-tbody><tr><td colspan="4" class="admin-empty">${esc(t('common.loading'))}</td></tr></tbody>
			</table></div>
			<div data-pagination></div>
		</div>`;

	const tbody = el.querySelector<HTMLElement>('[data-tbody]')!;
	const pagWrap = el.querySelector<HTMLElement>('[data-pagination]')!;

	async function refresh(): Promise<void> {
		try {
			const data = await adminGet<{ authors: AuthorRow[]; pagination: PaginationMeta }>(`/api/authors?page=${page}&limit=30`, signal);
			if (signal.aborted) return;
			tbody.innerHTML =
				data.authors
					.map((a) => {
						const avatar = safeAvatarSrc(a.avatar_url);
						return `<tr><td><span class="admin-author-cell">${avatar ? `<img src="${esc(avatar)}" class="admin-author-thumb" alt="">` : `<span class="admin-author-thumb admin-author-thumb-empty" aria-hidden="true"></span>`}<a href="/authors/${esc(a.slug)}" data-link>${esc(a.name)}</a></span></td><td>${a.resource_count}</td><td>${esc(fmtDate(a.created_at))}</td><td class="admin-row-actions"><button type="button" class="btn btn-sm" data-edit="${esc(a.slug)}">${icons.edit(14)} ${esc(t('admin.authors.btnEdit'))}</button><button type="button" class="btn btn-sm btn-danger" data-delete="${esc(a.slug)}">${icons.trash(14)} ${esc(t('admin.authors.btnDelete'))}</button></td></tr>`;
					})
					.join('') || emptyRow(4, t('admin.authors.noAuthors'));
			pagWrap.innerHTML = paginationBar(data.pagination, t('admin.authors.authorsCountLabel'));
		} catch {
			if (signal.aborted) return;
			tbody.innerHTML = errorRow(4);
			pagWrap.innerHTML = '';
		}
	}

	el.querySelector('[data-create]')!.addEventListener('click', () => showAuthorForm(el, 'create', undefined, () => void refresh()));

	tbody.addEventListener('click', async (e) => {
		const editBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-edit]');
		const delBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-delete]');
		if (editBtn) {
			try {
				const author = await fetchAuthorForEdit(editBtn.dataset.edit!);
				if (signal.aborted) return;
				showAuthorForm(el, 'edit', author, () => void refresh());
			} catch {
				showToast(t('admin.networkError'), 'error');
			}
			return;
		}
		if (delBtn) {
			const slug = delBtn.dataset.delete!;
			const ok = await showConfirm({ message: `${t('admin.authors.confirmDelete')} "${slug}"?`, confirmText: t('admin.authors.btnDelete'), danger: true });
			if (!ok) return;
			try {
				const r = await fetch(`/api/authors/${slug}`, { method: 'DELETE' });
				if (r.ok) {
					showToast(t('admin.authors.toastDeleted'), 'success');
					await refresh();
				} else {
					const d = (await r.json()) as { error?: string };
					showToast(d.error ?? 'Error', 'error');
				}
			} catch {
				showToast(t('admin.networkError'), 'error');
			}
		}
	});

	wirePagination(el, (p) => {
		page = p;
		void refresh();
	});

	void refresh();
}
