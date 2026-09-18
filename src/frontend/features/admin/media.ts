// =========================================================================================================
// features/admin/media.ts — Orphaned-media stats + cleanup (uses showConfirm, loadingBtn, icons)
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { loadingBtn } from '../../lib/dom';
import { showConfirm } from '../../lib/confirm';
import { icons } from '../../lib/icons';
import { adminGet, adminPost, requestTwoFactorCode, AdminApiError } from './api';
import { esc } from './esc';
import type { OrphanStats } from './types';

export function loadMedia(el: HTMLElement, signal: AbortSignal): void {
	el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.media.title'))}</h2>
		<div class="admin-loading">${esc(t('common.loading'))}</div>`;

	adminGet<OrphanStats>('/api/admin/stats/orphaned-media', signal)
		.then((stats) => {
			if (signal.aborted) return;
			const filesList = stats.orphaned_files.length
				? `<details class="admin-orphan-details"><summary>${esc(t('admin.media.viewList'))} (${stats.orphaned_files.length})</summary>
					<ul class="file-list">${stats.orphaned_files.map((f) => `<li><strong>${esc(f.filename)}</strong> — ${esc(f.type)}, ${f.age_hours}h</li>`).join('')}</ul>
				</details>`
				: '';
			el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.media.title'))}</h2>
			<div class="admin-stats-grid">
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.total_media}</div><div class="admin-stat-label">${esc(t('admin.media.totalMedia'))}</div></div>
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.total_resources}</div><div class="admin-stat-label">${esc(t('admin.media.totalResources'))}</div></div>
				<div class="admin-stat-card${stats.orphaned_count > 0 ? ' is-warning' : ''}"><div class="admin-stat-value">${stats.orphaned_count}</div><div class="admin-stat-label">${esc(t('admin.stats.orphanedMedia'))}</div></div>
			</div>
			<div class="admin-form-panel">
				<h3>${esc(t('admin.media.subtitle'))}</h3>
				<p class="admin-muted-paragraph">${esc(t('admin.media.desc'))}</p>
				${filesList}
				${stats.orphaned_count > 0
					? `<button type="button" class="btn btn-sm btn-danger" data-cleanup>${icons.trash(14)} ${esc(t('admin.media.btnDeleteOrphaned'))} (${stats.orphaned_count})</button>`
					: `<p class="admin-success-line">${icons.check(14)} ${esc(t('admin.media.noOrphaned'))}</p>`}`;

			el.querySelector('[data-cleanup]')?.addEventListener('click', async (e) => {
				const ok = await showConfirm({ message: t('admin.media.confirmDelete'), confirmText: t('admin.media.btnDeleteOrphaned'), danger: true });
				if (!ok) return;
				const code = await requestTwoFactorCode();
				if (!code) return;
				const btn = e.target as HTMLButtonElement;
				const restore = loadingBtn(btn, `… ${t('admin.media.toastDeleting')}`);
				try {
					const d = await adminPost<{ deleted?: number }>('/api/admin/cleanup/orphaned-media', { code });
					showToast(`${d.deleted ?? 0} ${t('admin.media.toastDeleted')}`, 'success');
					loadMedia(el, signal);
				} catch (error) {
					showToast(error instanceof AdminApiError ? error.message : t('admin.networkError'), 'error');
					restore();
				}
			});
		})
		.catch(() => {
			if (signal.aborted) return;
			el.innerHTML = `<p class="admin-error-message">${esc(t('admin.statsError'))}</p>`;
		});
}
