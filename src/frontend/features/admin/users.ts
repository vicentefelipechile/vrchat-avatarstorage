// =========================================================================================================
// features/admin/users.ts — User list with per-user KV cache clear
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { showConfirm } from '../../lib/confirm';
import { icons } from '../../lib/icons';
import { adminGet, adminPost, adminDelete, requestTwoFactorCode, AdminApiError } from './api';
import { esc, fmtDate } from './esc';
import { paginationBar, wirePagination, errorRow, emptyRow } from './admin-table';
import type { UserRow, PaginationMeta } from './types';

export function loadUsers(el: HTMLElement, signal: AbortSignal): void {
	let q = '';
	let page = 1;

	el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.users.title'))}</h2>
		<div class="admin-form-panel">
			<div class="admin-action-bar">
				<input type="search" name="q" class="admin-search-input" placeholder="${esc(t('admin.users.searchPlaceholder'))}" aria-label="${esc(t('admin.users.searchPlaceholder'))}">
			</div>
			<div class="admin-table-wrap"><table class="admin-data-table">
				<thead><tr><th>${esc(t('admin.overview.colUser'))}</th><th>${esc(t('admin.users.colRole'))}</th><th>${esc(t('admin.users.colRegistered'))}</th><th></th></tr></thead>
				<tbody data-tbody><tr><td colspan="4" class="admin-empty">${esc(t('common.loading'))}</td></tr></tbody>
			</table></div>
			<div data-pagination></div>
		</div>`;

	const tbody = el.querySelector<HTMLElement>('[data-tbody]')!;
	const pagWrap = el.querySelector<HTMLElement>('[data-pagination]')!;

	async function refresh(): Promise<void> {
		const qp = new URLSearchParams({ page: String(page) });
		if (q) qp.set('q', q);
		try {
			const data = await adminGet<{ users: UserRow[]; pagination: PaginationMeta }>(`/api/admin/users?${qp}`, signal);
			if (signal.aborted) return;
			tbody.innerHTML =
				data.users
					.map((u) => {
						const self = u.username === window.appState.user?.username;
						const badges =
							`<span class="admin-badge-status ${u.is_admin ? 'is-active' : 'is-inactive'}">${u.is_admin ? esc(t('admin.users.roleAdmin')) : esc(t('admin.users.roleUser'))}</span>` +
							(u.is_banned ? ` <span class="admin-badge-status is-banned">${esc(t('admin.users.roleBanned'))}</span>` : '');
						const roleBtn = self
							? ''
							: `<button type="button" class="btn btn-sm" data-role="${esc(u.username)}" data-make-admin="${u.is_admin ? 0 : 1}">${icons.shield(14)} ${u.is_admin ? esc(t('admin.users.btnRemoveAdmin')) : esc(t('admin.users.btnMakeAdmin'))}</button>`;
						const modBtns = self
							? ''
							: u.is_banned
								? `<button type="button" class="btn btn-sm" data-ban="${esc(u.username)}" data-banned="0">${icons.check(14)} ${esc(t('admin.users.btnUnban'))}</button>`
								: `<button type="button" class="btn btn-sm btn-danger" data-ban="${esc(u.username)}" data-banned="1">${icons.lock(14)} ${esc(t('admin.users.btnBan'))}</button>`;
						const delBtn = self || u.is_admin ? '' : `<button type="button" class="btn btn-sm btn-danger" data-deluser="${esc(u.username)}">${icons.trash(14)} ${esc(t('admin.users.btnDelete'))}</button>`;
						return `<tr><td>${esc(u.username)}</td><td>${badges}</td><td>${esc(fmtDate(u.created_at))}</td><td class="admin-row-actions"><button type="button" class="btn btn-sm" data-clear-cache="${esc(u.username)}">${esc(t('admin.users.btnCache'))}</button>${roleBtn}${modBtns}${delBtn}</td></tr>`;
					})
					.join('') || emptyRow(4, t('admin.resources.noResults'));
			pagWrap.innerHTML = paginationBar(data.pagination, t('admin.users.usersCountLabel'));
		} catch {
			if (signal.aborted) return;
			tbody.innerHTML = errorRow(4);
			pagWrap.innerHTML = '';
		}
	}

	tbody.addEventListener('click', async (e) => {
		const cacheBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-clear-cache]');
		if (cacheBtn) {
			const username = cacheBtn.dataset.clearCache!;
			cacheBtn.disabled = true;
			try {
				await adminPost(`/api/admin/cache/clear/${encodeURIComponent(username)}`);
				showToast(`${t('admin.users.toastCacheCleared')} "${username}"`, 'success');
			} catch {
				showToast(t('admin.users.toastCacheClearedError'), 'error');
			}
			cacheBtn.disabled = false;
			return;
		}
		const roleBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-role]');
		if (roleBtn) {
			const username = roleBtn.dataset.role!;
			const makeAdmin = roleBtn.dataset.makeAdmin === '1';
			const ok = await showConfirm({
				message: `${makeAdmin ? t('admin.users.confirmPromote') : t('admin.users.confirmDemote')} "${username}"?`,
				confirmText: makeAdmin ? t('admin.users.btnMakeAdmin') : t('admin.users.btnRemoveAdmin'),
				danger: !makeAdmin,
			});
			if (!ok) return;
			const code = await requestTwoFactorCode();
			if (!code) return;
			roleBtn.disabled = true;
			try {
				await adminPost(`/api/admin/users/${encodeURIComponent(username)}/role`, { is_admin: makeAdmin, code });
				showToast(t('admin.users.toastRoleChanged'), 'success');
				await refresh();
			} catch (error) {
				showToast(error instanceof AdminApiError ? error.message : t('admin.users.toastRoleError'), 'error');
				roleBtn.disabled = false;
			}
			return;
		}
		const banBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ban]');
		if (banBtn) {
			const username = banBtn.dataset.ban!;
			const banned = banBtn.dataset.banned === '1';
			const ok = await showConfirm({
				message: `${banned ? t('admin.users.confirmBan') : t('admin.users.confirmUnban')} "${username}"?`,
				confirmText: banned ? t('admin.users.btnBan') : t('admin.users.btnUnban'),
				danger: banned,
			});
			if (!ok) return;
			const code = await requestTwoFactorCode();
			if (!code) return;
			banBtn.disabled = true;
			try {
				await adminPost(`/api/admin/users/${encodeURIComponent(username)}/ban`, { banned, code });
				showToast(banned ? t('admin.users.toastBanned') : t('admin.users.toastUnbanned'), 'success');
				await refresh();
			} catch (error) {
				showToast(error instanceof AdminApiError ? error.message : t('admin.users.toastBanError'), 'error');
				banBtn.disabled = false;
			}
			return;
		}
		const delBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-deluser]');
		if (delBtn) {
			const username = delBtn.dataset.deluser!;
			const ok = await showConfirm({
				message: `${t('admin.users.confirmDelete')} "${username}"?`,
				confirmText: t('admin.users.btnDelete'),
				danger: true,
			});
			if (!ok) return;
			const code = await requestTwoFactorCode();
			if (!code) return;
			delBtn.disabled = true;
			try {
				const d = await adminDelete<{ resources_removed?: number }>(`/api/admin/users/${encodeURIComponent(username)}`, { code });
				showToast(`${t('admin.users.toastDeleted')} (${d.resources_removed ?? 0})`, 'success');
				await refresh();
			} catch (error) {
				showToast(error instanceof AdminApiError ? error.message : t('admin.users.toastDeleteError'), 'error');
				delBtn.disabled = false;
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
			q = value;
			page = 1;
			void refresh();
		}, 400);
	});

	void refresh();
}
