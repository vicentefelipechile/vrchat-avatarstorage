// =========================================================================================================
// features/admin/overview.ts — Dashboard stats + latest uploads/registrations
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { adminGet, AdminApiError } from './api';
import { esc, fmtDate } from './esc';
import type { AdminStats, Timeseries } from './types';

/** Minimal brutalist bar chart: flex bars normalized to the max value, exact count in title. */
function barChart(days: string[], values: number[], cls: string): string {
	const max = Math.max(1, ...values);
	const bars = values.map((v, i) => `<div class="admin-chart-bar ${cls}" style="height:${Math.max(3, Math.round((v / max) * 100))}%" title="${esc(days[i])}: ${v}"></div>`).join('');
	return `<div class="admin-chart" role="img">${bars}</div>`;
}

export function loadOverview(el: HTMLElement, signal: AbortSignal): void {
	el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.nav.overview'))}</h2>
		<div class="admin-loading">${esc(t('common.loading'))}</div>`;

	adminGet<AdminStats>('/api/admin/stats', signal)
		.then((stats) => {
			if (signal.aborted) return;
			const uploads = stats.latest_uploads
				.map(
					(r) =>
						`<tr><td><a href="/item/${esc(r.uuid)}" data-link>${esc(r.title)}</a></td><td>${esc(r.category)}</td><td>${esc(r.author_username) || '—'}</td><td>${esc(fmtDate(r.created_at))}</td></tr>`,
				)
				.join('');
			const users = stats.latest_registrations
				.map((u) => `<tr><td>${esc(u.username)}</td><td>${esc(fmtDate(u.created_at))}</td></tr>`)
				.join('');
			el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.nav.overview'))}</h2>
			<div class="admin-stats-grid">
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.users}</div><div class="admin-stat-label">${esc(t('admin.stats.users'))}</div></div>
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.avatars}</div><div class="admin-stat-label">${esc(t('admin.stats.avatars'))}</div></div>
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.assets}</div><div class="admin-stat-label">${esc(t('admin.stats.assets'))}</div></div>
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.clothes}</div><div class="admin-stat-label">${esc(t('admin.stats.clothes'))}</div></div>
				<div class="admin-stat-card${stats.pending > 0 ? ' is-warning' : ''}"><div class="admin-stat-value">${stats.pending}</div><div class="admin-stat-label">${esc(t('admin.stats.pending'))}</div></div>
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.authors}</div><div class="admin-stat-label">${esc(t('admin.stats.authors'))}</div></div>
				<div class="admin-stat-card"><div class="admin-stat-value">${stats.media}</div><div class="admin-stat-label">${esc(t('admin.stats.media'))}</div></div>
				<div class="admin-stat-card${stats.orphaned_media > 0 ? ' is-danger' : ''}"><div class="admin-stat-value">${stats.orphaned_media}</div><div class="admin-stat-label">${esc(t('admin.stats.orphanedMedia'))}</div></div>
			</div>
			<div class="admin-overview-panels" data-charts></div>
			<div class="admin-overview-panels">
				<div class="admin-form-panel">
					<h3>${esc(t('admin.overview.latestUploads'))}</h3>
					<div class="admin-table-wrap"><table class="admin-data-table">
						<thead><tr><th>${esc(t('admin.overview.colTitle'))}</th><th>${esc(t('admin.overview.colCat'))}</th><th>${esc(t('admin.overview.colAuthor'))}</th><th>${esc(t('admin.overview.colDate'))}</th></tr></thead>
						<tbody>${uploads || `<tr><td colspan="4" class="admin-empty">${esc(t('admin.overview.noData'))}</td></tr>`}</tbody>
					</table></div>
				</div>
				<div class="admin-form-panel">
					<h3>${esc(t('admin.overview.latestUsers'))}</h3>
					<div class="admin-table-wrap"><table class="admin-data-table">
						<thead><tr><th>${esc(t('admin.overview.colUser'))}</th><th>${esc(t('admin.overview.colDate'))}</th></tr></thead>
						<tbody>${users || `<tr><td colspan="2" class="admin-empty">${esc(t('admin.overview.noData'))}</td></tr>`}</tbody>
					</table></div>
				</div>
			</div>`;

			// Charts are best-effort: the stats above already rendered, a series failure just hides them.
			adminGet<Timeseries>('/api/admin/stats/timeseries?days=30', signal)
				.then((series) => {
					if (signal.aborted) return;
					const charts = el.querySelector('[data-charts]');
					if (!charts) return;
					charts.innerHTML = `<div class="admin-form-panel">
						<h3>${esc(t('admin.overview.uploadsChart'))}</h3>
						${barChart(series.days, series.uploads, 'is-uploads')}
					</div>
					<div class="admin-form-panel">
						<h3>${esc(t('admin.overview.registrationsChart'))}</h3>
						${barChart(series.days, series.registrations, 'is-registrations')}
					</div>`;
				})
				.catch(() => {});
		})
		.catch((e) => {
			if (signal.aborted) return;
			if (e instanceof AdminApiError && e.status === 403) showToast(t('common.accessDenied'), 'error');
			el.innerHTML = `<p class="admin-error-message">${esc(t('admin.statsError'))}</p>`;
		});
}

