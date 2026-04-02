// =========================================================================
// views/AdminView.ts — Admin dashboard: stats, cleanup, cache, pending
// =========================================================================

import { t } from '../i18n';
import { stripMarkdown, showToast } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext, Resource } from '../types';

// =========================================================================
// Types
// =========================================================================

interface OrphanedFile {
	filename: string;
	type: string;
	age_hours: number;
}

interface AdminStats {
	orphaned_count: number;
	total_media: number;
	total_resources: number;
	cutoff_hours: number;
	orphaned_files: OrphanedFile[];
}

// =========================================================================
// Helpers
// =========================================================================

function pendingCard(res: Resource): string {
	const title = stripMarkdown(res.title).substring(0, 50);
	const categoryLabel = t('cats.' + res.category) || res.category;
	const date = new Date(res.created_at).toLocaleDateString();
	const authorName = res.author?.username ?? 'Unknown';
	const avatarImg = res.author?.avatar_url
		? `<img src="${res.author.avatar_url}" alt="${authorName}" class="card-author-avatar" onerror="this.style.display='none'">`
		: `<div class="card-author-avatar-placeholder">${authorName.charAt(0).toUpperCase()}</div>`;

	return `
		<div class="card">
			<a href="/item/${res.uuid}" data-link class="card-link">
				${res.thumbnail_key
			? `<div class="card-image">
						<img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
			: `<div class="card-image card-image-placeholder">
						<span class="card-badge">${categoryLabel}</span>
					</div>`}
			</a>
			<div class="card-body">
				<h3>${title}${res.title.length > 50 ? '…' : ''}</h3>
				<div class="card-author">${avatarImg}<span class="card-author-name">${authorName}</span></div>
				<div class="card-meta"><span>${date}</span></div>
				<div class="card-footer">
					<a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
				</div>
			</div>
		</div>`;
}

function statsHtml(stats: AdminStats): string {
	return `
		<div class="stat-card">
			<div class="stat-value" style="color:${stats.orphaned_count > 0 ? '#ff9800' : '#4caf50'}">
				${stats.orphaned_count}
			</div>
			<div class="stat-label">${t('admin.orphanedFiles')}</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">${stats.total_media}</div>
			<div class="stat-label">${t('admin.totalMedia')}</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">${stats.total_resources}</div>
			<div class="stat-label">${t('admin.totalResources')}</div>
		</div>`;
}

function cleanupHtml(stats: AdminStats): string {
	if (stats.orphaned_count > 0) {
		return `
			<div class="cleanup-card warning">
				<h3 class="cleanup-title">⚠️ ${t('admin.orphanedFilesFound')}</h3>
				<p class="cleanup-desc">
					${t('admin.orphanedFilesDesc').replace('{count}', String(stats.orphaned_count)).replace('{hours}', String(stats.cutoff_hours))}
				</p>
				<details class="cleanup-details">
					<summary>${t('admin.viewFileList')}</summary>
					<ul class="file-list">
						${stats.orphaned_files.map((f) => `<li><strong>${f.filename}</strong> <span>(${f.type}, ${f.age_hours}h)</span></li>`).join('')}
					</ul>
				</details>
				<button id="cleanup-orphaned" class="btn btn-danger">🗑️ ${t('admin.cleanupOrphaned')}</button>
			</div>`;
	}
	return `
		<div class="cleanup-card success">
			<h3 class="cleanup-title">✅ ${t('admin.noOrphanedFiles')}</h3>
			<p class="cleanup-desc">${t('admin.noOrphanedFilesDesc')}</p>
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function adminView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('admin.title')}`;

	if (!window.appState.isAdmin) {
		return `<h1>${t('common.accessDenied')}</h1>`;
	}

	return `
		<h1>${t('admin.title')}</h1>

		<div id="admin-stats" class="admin-grid">
			<div class="stat-card"><div class="stat-value skeleton-text">…</div><div class="stat-label">${t('common.loading')}</div></div>
			<div class="stat-card"><div class="stat-value skeleton-text">…</div><div class="stat-label">${t('common.loading')}</div></div>
			<div class="stat-card"><div class="stat-value skeleton-text">…</div><div class="stat-label">${t('common.loading')}</div></div>
		</div>

		<div class="admin-card" style="margin-bottom:20px;background:var(--card-bg);padding:20px;border:1px solid var(--border-color)">
			<h3 style="margin-top:0">${t('admin.cacheClear')}</h3>
			<div style="display:flex;gap:10px;max-width:400px">
				<input type="text" id="cache-username" class="form-input" placeholder="${t('admin.usernamePlaceholder')}" style="flex:1;padding:10px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-color)">
				<button id="btn-clear-cache" class="btn">${t('admin.clearCacheBtn')}</button>
			</div>
		</div>

		<div id="cleanup-section">
			<div class="cleanup-card loading"><p>${t('common.loadingCleanup')}</p></div>
		</div>

		<h2 style="margin-top:30px">${t('admin.pendingResources')}</h2>
		<div id="pending-resources">
			<p>${t('common.loadingPending')}</p>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function adminAfter(_ctx: RouteContext): Promise<void> {
	if (!window.appState.isAdmin) {
		navigateTo('/');
		return;
	}

	const [stats, pending] = await Promise.all([
		fetch('/api/admin/stats/orphaned-media').then((r) => r.json()) as Promise<AdminStats>,
		fetch('/api/admin/pending').then((r) => r.json()) as Promise<Resource[]>,
	]);

	// Stats
	const statsEl = document.getElementById('admin-stats');
	if (statsEl) statsEl.innerHTML = statsHtml(stats);

	// Cleanup section
	const cleanupEl = document.getElementById('cleanup-section');
	if (cleanupEl) cleanupEl.innerHTML = cleanupHtml(stats);

	// Orphan cleanup button
	document.getElementById('cleanup-orphaned')?.addEventListener('click', async (e) => {
		if (!confirm(t('admin.cleanupConfirm'))) return;
		const btn = e.target as HTMLButtonElement;
		btn.disabled = true;
		btn.innerHTML = `⏳ ${t('admin.cleaning')}`;
		try {
			const res = await fetch('/api/admin/cleanup/orphaned-media', { method: 'POST' });
			const data = await res.json() as { deleted?: number; error?: string };
			if (res.ok) {
				showToast(t('admin.cleanupSuccess').replace('{count}', String(data.deleted)), 'success');
				// reload handled gracefully if we need to? Or just simple setTimeout
				setTimeout(() => location.reload(), 1500);
			} else {
				showToast(`${t('admin.error')}: ${data.error}`, 'error');
			}
		} catch {
			showToast(t('admin.networkError'), 'error');
		} finally {
			btn.disabled = false;
			btn.innerHTML = `🗑️ ${t('admin.cleanupOrphaned')}`;
		}
	});

	// Cache clear button
	document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
		const input = document.getElementById('cache-username') as HTMLInputElement;
		const username = input.value.trim();
		if (!username) return;

		const btn = document.getElementById('btn-clear-cache') as HTMLButtonElement;
		const restore = () => { btn.disabled = false; btn.textContent = t('admin.clearCacheBtn'); };
		btn.disabled = true;
		btn.textContent = '…';

		try {
			const res = await fetch(`/api/admin/cache/clear/${encodeURIComponent(username)}`, { method: 'POST' });
			const data = await res.json() as { error?: string };
			if (res.ok) {
				showToast(t('admin.cacheClearSuccess').replace('{user}', username), 'success');
				input.value = '';
			} else {
				showToast(`${t('admin.error')}: ${data.error ?? t('admin.cacheClearError')}`, 'error');
			}
		} catch {
			showToast(t('admin.networkError'), 'error');
		} finally {
			restore();
		}
	});

	// Pending resources
	const pendingEl = document.getElementById('pending-resources')!;
	pendingEl.innerHTML = pending.length === 0
		? `<p>${t('admin.noPending')}</p>`
		: `<div class="grid">${pending.map(pendingCard).join('')}</div>`;
}
