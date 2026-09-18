// =========================================================================================================
// features/admin/resources.ts — Filterable resource list with approve (reject/deactivate live on ItemView)
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { showConfirm } from '../../lib/confirm';
import { icons } from '../../lib/icons';
import { approveResource } from '../admin';
import { adminGet, adminDelete, requestTwoFactorCode, AdminApiError } from './api';
import { esc, fmtDate } from './esc';
import { paginationBar, wirePagination, errorRow, emptyRow } from './admin-table';
import type { ResourceRow, PaginationMeta } from './types';

interface Filters {
	q: string;
	category: string;
	status: string;
}

export function loadResources(el: HTMLElement, signal: AbortSignal): void {
	const filters: Filters = { q: '', category: '', status: '' };
	let page = 1;

	el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.resources.title'))}</h2>
		<div class="admin-form-panel">
			<div class="admin-action-bar">
				<input type="search" name="q" class="admin-search-input" placeholder="${esc(t('admin.resources.searchPlaceholder'))}" aria-label="${esc(t('admin.resources.searchPlaceholder'))}">
				<select name="category" class="filter-select admin-filter-select" aria-label="${esc(t('admin.resources.allCats'))}">
					<option value="">${esc(t('admin.resources.allCats'))}</option>
					<option value="avatars">${esc(t('admin.stats.avatars'))}</option>
					<option value="assets">${esc(t('admin.stats.assets'))}</option>
					<option value="clothes">${esc(t('admin.stats.clothes'))}</option>
				</select>
				<select name="status" class="filter-select admin-filter-select" aria-label="${esc(t('admin.resources.allStatus'))}">
					<option value="">${esc(t('admin.resources.allStatus'))}</option>
					<option value="1">${esc(t('admin.resources.approved'))}</option>
					<option value="0">${esc(t('admin.resources.pending'))}</option>
				</select>
			</div>
			<div class="admin-table-wrap"><table class="admin-data-table">
				<thead><tr><th>${esc(t('admin.overview.colTitle'))}</th><th>${esc(t('admin.overview.colCat'))}</th><th>${esc(t('admin.overview.colAuthor'))}</th><th>${esc(t('admin.resources.colStatus'))}</th><th title="downloads">↓</th><th>${esc(t('admin.overview.colDate'))}</th><th></th></tr></thead>
				<tbody data-tbody><tr><td colspan="7" class="admin-empty">${esc(t('common.loading'))}</td></tr></tbody>
			</table></div>
			<div data-pagination></div>
		</div>`;

	const tbody = el.querySelector<HTMLElement>('[data-tbody]')!;
	const pagWrap = el.querySelector<HTMLElement>('[data-pagination]')!;

	async function refresh(): Promise<void> {
		const qp = new URLSearchParams({ page: String(page) });
		if (filters.category) qp.set('category', filters.category);
		if (filters.status) qp.set('status', filters.status);
		if (filters.q) qp.set('q', filters.q);
		try {
			const data = await adminGet<{ resources: ResourceRow[]; pagination: PaginationMeta }>(`/api/admin/resources?${qp}`, signal);
			if (signal.aborted) return;
			tbody.innerHTML =
				data.resources
					.map(
						(r) =>
							`<tr><td><a href="/item/${esc(r.uuid)}" data-link>${esc(r.title)}</a></td><td>${esc(r.category)}</td><td>${esc(r.author_username) || '—'}</td><td><span class="admin-badge-status ${r.is_active ? 'is-active' : 'is-pending'}">${r.is_active ? esc(t('admin.resources.approved')) : esc(t('admin.resources.pending'))}</span></td><td>${r.download_count}</td><td>${esc(fmtDate(r.created_at))}</td><td class="admin-row-actions">${r.is_active ? '' : `<button type="button" class="btn btn-sm" data-approve="${esc(r.uuid)}">${icons.check(14)} ${esc(t('admin.resources.btnApprove'))}</button>`}<button type="button" class="btn btn-sm btn-danger" data-delete="${esc(r.uuid)}" data-title="${esc(r.title)}">${icons.trash(14)} ${esc(t('admin.resources.btnDelete'))}</button></td></tr>`,
					)
					.join('') || emptyRow(7, t('admin.resources.noResults'));
			pagWrap.innerHTML = paginationBar(data.pagination, t('admin.resources.resultsLabel'));
		} catch {
			if (signal.aborted) return;
			tbody.innerHTML = errorRow(7);
			pagWrap.innerHTML = '';
		}
	}

	// Approve via the shared ItemView helper (single correct endpoint) — reject/deactivate stay on ItemView.
	tbody.addEventListener('click', async (e) => {
		const approveBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-approve]');
		if (approveBtn) {
			const uuid = approveBtn.dataset.approve!;
			approveBtn.disabled = true;
			await approveResource(uuid, () => {
				page = 1;
				void refresh();
			});
			approveBtn.disabled = false;
			return;
		}
		const deleteBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-delete]');
		if (deleteBtn) {
			const uuid = deleteBtn.dataset.delete!;
			const ok = await showConfirm({
				message: `${t('admin.resources.confirmDelete')} "${deleteBtn.dataset.title}"?`,
				confirmText: t('admin.resources.btnDelete'),
				danger: true,
			});
			if (!ok) return;
			const code = await requestTwoFactorCode();
			if (!code) return;
			deleteBtn.disabled = true;
			try {
				await adminDelete(`/api/resources/${uuid}`, { code });
				showToast(t('admin.resources.toastDeleted'), 'success');
				await refresh();
			} catch (error) {
				showToast(error instanceof AdminApiError ? error.message : t('admin.resources.toastDeleteError'), 'error');
				deleteBtn.disabled = false;
			}
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
			filters.q = value;
			page = 1;
			void refresh();
		}, 400);
	});
	el.querySelector<HTMLSelectElement>('select[name="category"]')!.addEventListener('change', (e) => {
		filters.category = (e.target as HTMLSelectElement).value;
		page = 1;
		void refresh();
	});
	el.querySelector<HTMLSelectElement>('select[name="status"]')!.addEventListener('change', (e) => {
		filters.status = (e.target as HTMLSelectElement).value;
		page = 1;
		void refresh();
	});

	void refresh();
}
