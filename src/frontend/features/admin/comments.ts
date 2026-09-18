// =========================================================================================================
// features/admin/comments.ts — Global comment moderation (delete reuses the ItemView endpoint,
// which already allows admin deletes via CommentService)
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { showConfirm } from '../../lib/confirm';
import { icons } from '../../lib/icons';
import { adminGet } from './api';
import { esc, fmtDate } from './esc';
import { paginationBar, wirePagination, errorRow, emptyRow } from './admin-table';
import type { AdminCommentRow, PaginationMeta } from './types';

function snippet(text: string, max = 120): string {
	const flat = text.replace(/\s+/g, ' ').trim();
	return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function loadComments(el: HTMLElement, signal: AbortSignal): void {
	let q = '';
	let page = 1;

	el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.comments.title'))}</h2>
		<div class="admin-form-panel">
			<div class="admin-action-bar">
				<input type="search" name="q" class="admin-search-input" placeholder="${esc(t('admin.comments.searchPlaceholder'))}" aria-label="${esc(t('admin.comments.searchPlaceholder'))}">
			</div>
			<div class="admin-table-wrap"><table class="admin-data-table">
				<thead><tr><th>${esc(t('admin.comments.colText'))}</th><th>${esc(t('admin.comments.colAuthor'))}</th><th>${esc(t('admin.comments.colResource'))}</th><th>${esc(t('admin.comments.colDate'))}</th><th></th></tr></thead>
				<tbody data-tbody><tr><td colspan="5" class="admin-empty">${esc(t('common.loading'))}</td></tr></tbody>
			</table></div>
			<div data-pagination></div>
		</div>`;

	const tbody = el.querySelector<HTMLElement>('[data-tbody]')!;
	const pagWrap = el.querySelector<HTMLElement>('[data-pagination]')!;

	async function refresh(): Promise<void> {
		const qp = new URLSearchParams({ page: String(page) });
		if (q) qp.set('q', q);
		try {
			const data = await adminGet<{ comments: AdminCommentRow[]; pagination: PaginationMeta }>(`/api/admin/comments?${qp}`, signal);
			if (signal.aborted) return;
			tbody.innerHTML =
				data.comments
					.map(
						(c) =>
							`<tr><td class="admin-comment-text" title="${esc(c.text)}">${esc(snippet(c.text))}</td><td>${esc(c.author_username) || '—'}</td><td>${c.resource_uuid ? `<a href="/item/${esc(c.resource_uuid)}" data-link>${esc(c.resource_title) || esc(c.resource_uuid.slice(0, 8))}</a>` : '—'}</td><td>${esc(fmtDate(c.created_at))}</td><td class="admin-row-actions"><button type="button" class="btn btn-sm btn-danger" data-delcomment="${esc(c.uuid)}">${icons.trash(14)} ${esc(t('admin.comments.btnDelete'))}</button></td></tr>`,
					)
					.join('') || emptyRow(5, t('admin.comments.noResults'));
			pagWrap.innerHTML = paginationBar(data.pagination, t('admin.comments.commentsCountLabel'));
		} catch {
			if (signal.aborted) return;
			tbody.innerHTML = errorRow(5);
			pagWrap.innerHTML = '';
		}
	}

	tbody.addEventListener('click', async (e) => {
		const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-delcomment]');
		if (!btn) return;
		const ok = await showConfirm({
			message: t('admin.comments.confirmDelete'),
			confirmText: t('admin.comments.btnDelete'),
			danger: true,
		});
		if (!ok) return;
		btn.disabled = true;
		try {
			const r = await fetch(`/api/comments/${btn.dataset.delcomment}`, { method: 'DELETE' });
			if (!r.ok) throw new Error(`DELETE → ${r.status}`);
			showToast(t('admin.comments.toastDeleted'), 'success');
			await refresh();
		} catch {
			showToast(t('admin.comments.toastDeleteError'), 'error');
			btn.disabled = false;
		}
	});

	wirePagination(el, (p) => {
		page = p;
		void refresh();
	});

	let debounce: ReturnType<typeof setTimeout>;
	el.querySelector<HTMLInputElement>('input[name="q"]')!.addEventListener('input', (e) => {
		clearTimeout(debounce);
		const value = (e.target as HTMLInputElement).value;
		debounce = setTimeout(() => {
			q = value;
			page = 1;
			void refresh();
		}, 400);
	});

	void refresh();
}
