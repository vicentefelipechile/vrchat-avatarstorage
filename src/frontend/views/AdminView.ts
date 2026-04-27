// =========================================================================
// views/AdminView.ts — Full admin dashboard with sidebar navigation
// Desktop only (viewport < 1024px shows warning via CSS)
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { t } from '../i18n';
import { showToast } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext, Resource } from '../types';

// =========================================================================
// Types
// =========================================================================

interface AdminStats {
	users: number;
	avatars: number;
	assets: number;
	clothes: number;
	pending: number;
	authors: number;
	media: number;
	orphaned_media: number;
	latest_uploads: { uuid: string; title: string; category: string; created_at: number; author_username: string | null }[];
	latest_registrations: { uuid: string; username: string; created_at: number }[];
}

interface OrphanStats {
	orphaned_count: number;
	total_media: number;
	total_resources: number;
	cutoff_hours: number;
	orphaned_files: { filename: string; type: string; age_hours: number }[];
}

interface UserRow {
	uuid: string;
	username: string;
	avatar_url: string | null;
	is_admin: number;
	created_at: number;
}

interface ResourceRow {
	uuid: string;
	title: string;
	category: string;
	is_active: number;
	download_count: number;
	created_at: number;
	author_username: string | null;
	thumbnail_key: string | null;
}

interface PaginationMeta {
	page: number;
	total: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

// =========================================================================
// Sidebar nav items
// =========================================================================

const NAV_ITEMS = [
	{ id: 'overview', label: t('admin.nav.overview') },
	{ id: 'resources', label: t('admin.nav.resources') },
	{ id: 'users', label: t('admin.nav.users') },
	{ id: 'authors', label: t('admin.nav.authors') },
	{ id: 'media', label: t('admin.nav.media') },
	{ id: 'cache', label: t('admin.nav.cache') },
	{ id: 'community-ads', label: t('admin.nav.communityAds') },
];

// =========================================================================
// View
// =========================================================================

export async function adminView(_ctx: RouteContext): Promise<string> {
	document.title = `Admin — VRCStorage`;

	if (!window.appState.isAdmin) {
		return `<h1>${t('common.accessDenied')}</h1>`;
	}

	const navHtml = NAV_ITEMS.map(
		(item) => `<li class="admin-sidebar-nav-item" data-section="${item.id}" id="nav-${item.id}">${item.label}</li>`,
	).join('');

	const sectionsHtml = NAV_ITEMS.map(
		(item) =>
			`<div class="admin-section" id="section-${item.id}">
			<div class="admin-loading" id="loading-${item.id}">${t('common.loading')}</div>
		</div>`,
	).join('');

	return `<div class="admin-desktop-only-warning">
		<h2>${t('admin.desktopWarningTitle')}</h2>
		<p>${t('admin.desktopWarningDesc')}</p>
	</div>
	<div class="admin-layout">
		<aside class="admin-sidebar">
			<div class="admin-sidebar-title">${t('admin.title')}</div>
			<ul class="admin-sidebar-nav">${navHtml}</ul>
		</aside>
		<main class="admin-content">
			${sectionsHtml}
		</main>
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

	// Section switching
	const navItems = document.querySelectorAll<HTMLElement>('.admin-sidebar-nav-item');
	const sections = document.querySelectorAll<HTMLElement>('.admin-section');
	const sectionLoaded = new Set<string>();

	const VALID_IDS = new Set(NAV_ITEMS.map((n) => n.id));

	function switchSection(id: string, pushHistory = true): void {
		if (!VALID_IDS.has(id)) id = 'overview';
		navItems.forEach((n) => n.classList.toggle('active', n.dataset.section === id));
		sections.forEach((s) => s.classList.toggle('active', s.id === `section-${id}`));
		if (pushHistory) {
			history.replaceState(null, '', `/admin#${id}`);
		}
		if (!sectionLoaded.has(id)) {
			sectionLoaded.add(id);
			loadSection(id);
		}
	}

	navItems.forEach((item) => {
		item.addEventListener('click', () => switchSection(item.dataset.section!));
	});

	// Restore section from URL hash (supports browser back/forward)
	const initialSection = window.location.hash.replace('#', '') || 'overview';
	switchSection(initialSection, false);
}

// =========================================================================
// Section loaders
// =========================================================================

async function loadSection(id: string): Promise<void> {
	const el = document.getElementById(`section-${id}`);
	if (!el) return;

	switch (id) {
		case 'overview':
			return loadOverview(el);
		case 'resources':
			return loadResources(el);
		case 'users':
			return loadUsers(el);
		case 'authors':
			return loadAuthors(el);
		case 'media':
			return loadMedia(el);
		case 'cache':
			return loadCache(el);
		case 'community-ads':
			return loadCommunityAds(el);
	}
}

// ---- Overview ----

async function loadOverview(el: HTMLElement): Promise<void> {
	let stats: AdminStats;
	try {
		const res = await fetch('/api/admin/stats');
		stats = (await res.json()) as AdminStats;
	} catch {
		el.innerHTML = `<p class="error-message">${t('admin.statsError')}</p>`;
		return;
	}

	const latestUploadsHtml = stats.latest_uploads
		.map(
			(r) =>
				`<tr>
			<td><a href="/item/${r.uuid}" data-link>${r.title}</a></td>
			<td>${r.category}</td>
			<td>${r.author_username ?? '—'}</td>
			<td>${new Date(r.created_at * 1000).toLocaleDateString()}</td>
		</tr>`,
		)
		.join('');

	const latestUsersHtml = stats.latest_registrations
		.map((u) => `<tr><td>${u.username}</td><td>${new Date(u.created_at * 1000).toLocaleDateString()}</td></tr>`)
		.join('');

	el.innerHTML = `<h2 class="admin-section-title">${t('admin.nav.overview')}</h2>
		<div class="admin-stats-grid">
			<div class="admin-stat-card">
				<div class="admin-stat-value">${stats.users}</div>
				<div class="admin-stat-label">${t('admin.stats.users')}</div>
			</div>
			<div class="admin-stat-card">
				<div class="admin-stat-value">${stats.avatars}</div>
				<div class="admin-stat-label">${t('admin.stats.avatars')}</div>
			</div>
			<div class="admin-stat-card">
				<div class="admin-stat-value">${stats.assets}</div>
				<div class="admin-stat-label">${t('admin.stats.assets')}</div>
			</div>
			<div class="admin-stat-card">
				<div class="admin-stat-value">${stats.clothes}</div>
				<div class="admin-stat-label">${t('admin.stats.clothes')}</div>
			</div>
			<div class="admin-stat-card ${stats.pending > 0 ? '--warning' : ''}">
				<div class="admin-stat-value">${stats.pending}</div>
				<div class="admin-stat-label">${t('admin.stats.pending')}</div>
			</div>
			<div class="admin-stat-card">
				<div class="admin-stat-value">${stats.authors}</div>
				<div class="admin-stat-label">${t('admin.stats.authors')}</div>
			</div>
			<div class="admin-stat-card">
				<div class="admin-stat-value">${stats.media}</div>
				<div class="admin-stat-label">${t('admin.stats.media')}</div>
			</div>
			<div class="admin-stat-card ${stats.orphaned_media > 0 ? '--danger' : ''}">
				<div class="admin-stat-value">${stats.orphaned_media}</div>
				<div class="admin-stat-label">${t('admin.stats.orphanedMedia')}</div>
			</div>
		</div>

		<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
			<div class="admin-form-panel" style="padding: 16px;">
				<h3 class="admin-section-title" style="font-size:0.85rem">${t('admin.overview.latestUploads')}</h3>
				<table class="admin-data-table">
					<thead><tr><th>${t('admin.overview.colTitle')}</th><th>${t('admin.overview.colCat')}</th><th>${t('admin.overview.colAuthor')}</th><th>${t('admin.overview.colDate')}</th></tr></thead>
					<tbody>${latestUploadsHtml || `<tr><td colspan="4">${t('admin.overview.noData')}</td></tr>`}</tbody>
				</table>
			</div>
			<div class="admin-form-panel" style="padding: 16px;">
				<h3 class="admin-section-title" style="font-size:0.85rem">${t('admin.overview.latestUsers')}</h3>
				<table class="admin-data-table">
					<thead><tr><th>${t('admin.overview.colUser')}</th><th>${t('admin.overview.colDate')}</th></tr></thead>
					<tbody>${latestUsersHtml || `<tr><td colspan="2">${t('admin.overview.noData')}</td></tr>`}</tbody>
				</table>
			</div>
		</div>`;
}

// ---- Resources ----

async function loadResources(el: HTMLElement, page = 1, category = '', status = '', q = ''): Promise<void> {
	el.innerHTML = `<h2 class="admin-section-title">${t('admin.resources.title')}</h2>
		<div class="admin-form-panel" style="padding: 16px;">
			<div class="admin-action-bar">
				<input type="text" id="res-search" class="admin-search-input" placeholder="${t('admin.resources.searchPlaceholder')}" value="${q}">
				<select id="res-cat" class="filter-select" style="width:140px">
					<option value="">${t('admin.resources.allCats')}</option>
					<option value="avatars" ${category === 'avatars' ? 'selected' : ''}>${t('admin.stats.avatars')}</option>
					<option value="assets" ${category === 'assets' ? 'selected' : ''}>${t('admin.stats.assets')}</option>
					<option value="clothes" ${category === 'clothes' ? 'selected' : ''}>${t('admin.stats.clothes')}</option>
				</select>
				<select id="res-status" class="filter-select" style="width:120px">
					<option value="">${t('admin.resources.allStatus')}</option>
					<option value="1" ${status === '1' ? 'selected' : ''}>${t('admin.resources.approved')}</option>
					<option value="0" ${status === '0' ? 'selected' : ''}>${t('admin.resources.pending')}</option>
				</select>
			</div>
			<div id="res-table-wrap" class="admin-loading">${t('common.loading')}</div>
		</div>`;

	const qp = new URLSearchParams({ page: String(page) });
	if (category) qp.set('category', category);
	if (status) qp.set('status', status);
	if (q) qp.set('q', q);

	try {
		const res = await fetch(`/api/admin/resources?${qp.toString()}`);
		const data = (await res.json()) as { resources: ResourceRow[]; pagination: PaginationMeta };

		const tableBody = data.resources
			.map(
				(r) =>
					`<tr>
				<td><a href="/item/${r.uuid}" data-link>${r.title}</a></td>
				<td>${r.category}</td>
				<td>${r.author_username ?? '—'}</td>
				<td><span class="admin-badge-status ${r.is_active ? 'active' : 'pending'}">${r.is_active ? t('admin.resources.approved') : t('admin.resources.pending')}</span></td>
				<td>${r.download_count}</td>
				<td>${new Date(r.created_at * 1000).toLocaleDateString()}</td>
				<td class="admin-row-actions">
					${!r.is_active ? `<button class="btn" data-approve="${r.uuid}">${t('admin.resources.btnApprove')}</button>` : ''}
				</td>
			</tr>`,
			)
			.join('');

		const pagBtns = `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
			${data.pagination.hasPrevPage ? `<button class="btn" data-res-page="${page - 1}">← ${t('filterPanel.prev')}</button>` : ''}
			<span style="align-self:center;font-size:0.85rem;color:var(--text-muted)">${t('admin.resources.pageLabel')} ${page} · ${data.pagination.total} ${t('admin.resources.resultsLabel')}</span>
			${data.pagination.hasNextPage ? `<button class="btn" data-res-page="${page + 1}">${t('filterPanel.next')} →</button>` : ''}
		</div>`;

		document.getElementById('res-table-wrap')!.innerHTML = `<table class="admin-data-table">
				<thead><tr><th>${t('admin.overview.colTitle')}</th><th>${t('admin.overview.colCat')}</th><th>${t('admin.overview.colAuthor')}</th><th>${t('admin.resources.colStatus')}</th><th>↓</th><th>${t('admin.overview.colDate')}</th><th></th></tr></thead>
				<tbody>${tableBody || `<tr><td colspan="7">${t('admin.resources.noResults')}</td></tr>`}</tbody>
			</table>${pagBtns}`;

		// Approve buttons
		document.querySelectorAll<HTMLButtonElement>('[data-approve]').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const uuid = btn.dataset.approve!;
				try {
					const r = await fetch(`/api/admin/approve/${uuid}`, { method: 'POST' });
					if (r.ok) {
						showToast(t('admin.resources.toastApproved'), 'success');
						loadResources(el, page, category, status, q);
					} else showToast(t('admin.resources.toastApproveError'), 'error');
				} catch {
					showToast(t('admin.networkError'), 'error');
				}
			});
		});

		// Pagination
		document.querySelectorAll<HTMLButtonElement>('[data-res-page]').forEach((btn) => {
			btn.addEventListener('click', () => loadResources(el, parseInt(btn.dataset.resPage!), category, status, q));
		});

		// Filters
		let debounce: ReturnType<typeof setTimeout>;
		document.getElementById('res-search')?.addEventListener('input', (e) => {
			clearTimeout(debounce);
			debounce = setTimeout(() => loadResources(el, 1, category, status, (e.target as HTMLInputElement).value), 400);
		});
		document.getElementById('res-cat')?.addEventListener('change', (e) => {
			loadResources(el, 1, (e.target as HTMLSelectElement).value, status, q);
		});
		document.getElementById('res-status')?.addEventListener('change', (e) => {
			loadResources(el, 1, category, (e.target as HTMLSelectElement).value, q);
		});
	} catch {
		document.getElementById('res-table-wrap')!.innerHTML = `<p class="error-message">${t('admin.statsError')}</p>`;
	}
}

// ---- Users ----

async function loadUsers(el: HTMLElement, page = 1, q = ''): Promise<void> {
	el.innerHTML = `<h2 class="admin-section-title">${t('admin.users.title')}</h2>
		<div class="admin-form-panel" style="padding: 16px;">
			<div class="admin-action-bar">
				<input type="text" id="user-search" class="admin-search-input" placeholder="${t('admin.users.searchPlaceholder')}" value="${q}">
			</div>
			<div id="user-table-wrap" class="admin-loading">${t('common.loading')}</div>
		</div>`;

	try {
		const qp = new URLSearchParams({ page: String(page) });
		if (q) qp.set('q', q);
		const res = await fetch(`/api/admin/users?${qp.toString()}`);
		const data = (await res.json()) as { users: UserRow[]; pagination: PaginationMeta };

		const tbody = data.users
			.map(
				(u) =>
					`<tr>
				<td>${u.username}</td>
				<td><span class="admin-badge-status ${u.is_admin ? 'active' : 'inactive'}">${u.is_admin ? t('admin.users.roleAdmin') : t('admin.users.roleUser')}</span></td>
				<td>${new Date(u.created_at * 1000).toLocaleDateString()}</td>
				<td class="admin-row-actions">
					<button class="btn" data-clear-cache="${u.username}">${t('admin.users.btnCache')}</button>
				</td>
			</tr>`,
			)
			.join('');

		const pagBtns = `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
			${data.pagination.hasPrevPage ? `<button class="btn" data-user-page="${page - 1}">${t('filterPanel.prev')}</button>` : ''}
			<span style="align-self:center;font-size:0.85rem;color:var(--text-muted)">${data.pagination.total} ${t('admin.users.usersCountLabel')}</span>
			${data.pagination.hasNextPage ? `<button class="btn" data-user-page="${page + 1}">${t('filterPanel.next')}</button>` : ''}
		</div>`;

		document.getElementById('user-table-wrap')!.innerHTML = `<table class="admin-data-table">
				<thead><tr><th>${t('admin.overview.colUser')}</th><th>${t('admin.users.colRole')}</th><th>${t('admin.users.colRegistered')}</th><th></th></tr></thead>
				<tbody>${tbody || `<tr><td colspan="4">${t('admin.resources.noResults')}</td></tr>`}</tbody>
			</table>${pagBtns}`;

		document.querySelectorAll<HTMLButtonElement>('[data-clear-cache]').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const username = btn.dataset.clearCache!;
				try {
					const r = await fetch(`/api/admin/cache/clear/${encodeURIComponent(username)}`, { method: 'POST' });
					if (r.ok) showToast(`${t('admin.users.toastCacheCleared')} "${username}"`, 'success');
					else showToast(t('admin.users.toastCacheClearedError'), 'error');
				} catch {
					showToast(t('admin.networkError'), 'error');
				}
			});
		});

		document.querySelectorAll<HTMLButtonElement>('[data-user-page]').forEach((btn) => {
			btn.addEventListener('click', () => loadUsers(el, parseInt(btn.dataset.userPage!), q));
		});

		let debounce: ReturnType<typeof setTimeout>;
		document.getElementById('user-search')?.addEventListener('input', (e) => {
			clearTimeout(debounce);
			debounce = setTimeout(() => loadUsers(el, 1, (e.target as HTMLInputElement).value), 400);
		});
	} catch {
		document.getElementById('user-table-wrap')!.innerHTML = `<p class="error-message">${t('admin.statsError')}</p>`;
	}
}

// ---- Authors ----

interface AuthorRow {
	uuid: string;
	name: string;
	slug: string;
	avatar_url: string | null;
	resource_count: number;
	created_at: number;
}

async function loadAuthors(el: HTMLElement, page = 1): Promise<void> {
	el.innerHTML = `<h2 class="admin-section-title">${t('admin.authors.title')}</h2>
		<div class="admin-form-panel" style="padding: 16px;">
			<div class="admin-action-bar">
				<button class="btn" id="authors-create-btn">${t('admin.authors.btnNew')}</button>
			</div>
			<div id="authors-table-wrap" class="admin-loading">${t('common.loading')}</div>
		</div>`;

	try {
		const res = await fetch(`/api/authors?page=${page}&limit=30`);
		const data = (await res.json()) as { authors: AuthorRow[]; pagination: PaginationMeta };

		const tbody = data.authors
			.map(
				(a) =>
					`<tr>
				<td style="display:flex;align-items:center;gap:10px;">
					${a.avatar_url ? `<img src="${a.avatar_url}" style="width:32px;height:32px;object-fit:cover;border:1px solid var(--border-color);" alt="">` : `<div style="width:32px;height:32px;background:var(--bg-body);border:1px solid var(--border-color);"></div>`}
					<a href="/authors/${a.slug}" data-link>${a.name}</a>
				</td>
				<td>${a.resource_count}</td>
				<td>${new Date(a.created_at * 1000).toLocaleDateString()}</td>
				<td class="admin-row-actions">
					<button class="btn" data-edit-author="${a.slug}">${t('admin.authors.btnEdit')}</button>
					<button class="btn" data-delete-author="${a.slug}">${t('admin.authors.btnDelete')}</button>
				</td>
			</tr>`,
			)
			.join('');

		const pagBtns = `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
			${data.pagination.hasPrevPage ? `<button class="btn" data-author-page="${page - 1}">${t('filterPanel.prev')}</button>` : ''}
			<span style="align-self:center;font-size:0.85rem;color:var(--text-muted)">${data.pagination.total} ${t('admin.authors.authorsCountLabel')}</span>
			${data.pagination.hasNextPage ? `<button class="btn" data-author-page="${page + 1}">${t('filterPanel.next')}</button>` : ''}
		</div>`;

		document.getElementById('authors-table-wrap')!.innerHTML = `<table class="admin-data-table">
				<thead><tr><th>${t('admin.authors.colName')}</th><th>${t('admin.authors.colAvatars')}</th><th>${t('admin.authors.colCreated')}</th><th></th></tr></thead>
				<tbody>${tbody || `<tr><td colspan="4">${t('admin.authors.noAuthors')}</td></tr>`}</tbody>
			</table>${pagBtns}`;

		document.querySelectorAll<HTMLButtonElement>('[data-edit-author]').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const slug = btn.dataset.editAuthor!;
				const existing = await fetch(`/api/authors/${slug}`);
				const { author } = (await existing.json()) as {
					author: AuthorRow & {
						description?: string;
						website_url?: string;
						twitter_url?: string;
						booth_url?: string;
						gumroad_url?: string;
					};
				};
				showAuthorForm(el, 'edit', author);
			});
		});

		document.querySelectorAll<HTMLButtonElement>('[data-delete-author]').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const slug = btn.dataset.deleteAuthor!;
				if (!confirm(`${t('admin.authors.confirmDelete')} "${slug}"?`)) return;
				try {
					const r = await fetch(`/api/authors/${slug}`, { method: 'DELETE' });
					if (r.ok) {
						showToast(t('admin.authors.toastDeleted'), 'success');
						loadAuthors(el, page);
					} else {
						const d = (await r.json()) as { error?: string };
						showToast(d.error ?? 'Error', 'error');
					}
				} catch {
					showToast(t('admin.networkError'), 'error');
				}
			});
		});

		document.querySelectorAll<HTMLButtonElement>('[data-author-page]').forEach((btn) => {
			btn.addEventListener('click', () => loadAuthors(el, parseInt(btn.dataset.authorPage!)));
		});

		document.getElementById('authors-create-btn')?.addEventListener('click', () => showAuthorForm(el, 'create'));
	} catch {
		document.getElementById('authors-table-wrap')!.innerHTML = `<p class="error-message">${t('admin.statsError')}</p>`;
	}
}

// =========================================================================
// Author Image Upload Helper
// =========================================================================

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
	'image/png': 'PNG',
	'image/jpeg': 'JPEG',
	'image/gif': 'GIF',
	'image/webp': 'WEBP',
	'image/avif': 'AVIF',
};

const ALLOWED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

async function uploadAuthorImage(fileInput: HTMLInputElement): Promise<string | null> {
	const file = fileInput.files?.[0];
	if (!file) return null;

	// Client-side format check (MIME + extension)
	const ext = '.' + file.name.split('.').pop()!.toLowerCase();
	if (!ALLOWED_IMAGE_TYPES[file.type] || !ALLOWED_IMAGE_EXTS.includes(ext)) {
		showToast(`${t('admin.authors.toastFormatNotAllowed')} ${Object.values(ALLOWED_IMAGE_TYPES).join(', ')}`, 'error');
		fileInput.value = '';
		return null;
	}

	const dismiss = showToast(t('admin.authors.toastUploading'), 'info', 0);
	try {
		const formData = new FormData();
		formData.append('file', file);
		const r = await fetch('/api/upload', { method: 'PUT', body: formData });
		dismiss();
		if (!r.ok) {
			showToast(t('admin.authors.toastUploadError'), 'error');
			return null;
		}
		const d = (await r.json()) as { r2_key?: string };
		if (!d.r2_key) {
			showToast(t('admin.authors.toastInvalidServerResp'), 'error');
			return null;
		}
		return `/api/download/${d.r2_key}`;
	} catch {
		dismiss();
		showToast(t('admin.networkError'), 'error');
		return null;
	}
}

// =========================================================================
// Unified Author Form (create + edit)
// =========================================================================

type AuthorFormMode = 'create' | 'edit';
interface AuthorFormData {
	slug: string;
	name: string;
	description?: string;
	avatar_url?: string | null;
	website_url?: string | null;
	twitter_url?: string | null;
	booth_url?: string | null;
	gumroad_url?: string | null;
}

function showAuthorForm(sectionEl: HTMLElement, mode: AuthorFormMode, author?: AuthorFormData): void {
	document.getElementById('author-form-panel')?.remove();

	const isEdit = mode === 'edit';
	const title = isEdit ? `${t('admin.authors.formTitleEdit')} ${author!.name}` : t('admin.authors.formTitleNew');

	const form = document.createElement('div');
	form.id = 'author-form-panel';
	form.className = 'admin-form-panel';
	form.style.marginTop = '16px';

	const currentAvatar = isEdit && author?.avatar_url ? author.avatar_url : null;

	form.innerHTML = `<h3>${title}</h3>
		<div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:16px">
			<div style="flex-shrink:0;width:80px;">
				<div id="af-img-preview" style="width:80px;height:80px;background:var(--bg-body);border:2px solid var(--border-color);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.7rem;text-align:center;">
					${currentAvatar ? `<img src="${currentAvatar}" style="width:100%;height:100%;object-fit:cover;" alt="">` : t('admin.authors.noImage')}
				</div>
				<input type="file" id="af-img-file" accept=".png,.jpg,.jpeg,.gif,.webp,.avif,image/png,image/jpeg,image/gif,image/webp,image/avif" style="display:none;">
				<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
					<button class="btn" id="af-img-btn" style="width:100%;font-size:0.75rem;padding:4px 0;">${t('admin.authors.btnUpload')}</button>
					${currentAvatar ? `<button class="btn" id="af-img-remove" style="width:100%;font-size:0.75rem;padding:4px 0;">${t('admin.authors.btnRemove')}</button>` : ''}
				</div>
			</div>
			<div style="flex:1;min-width:0;">
				<div class="admin-form-grid">
					<div class="form-group"><label class="form-label">${t('admin.authors.formName')}</label><input id="af-name" class="form-input" type="text" value="${isEdit ? (author!.name ?? '') : ''}"></div>
					<div class="form-group"><label class="form-label">Website URL</label><input id="af-website" class="form-input" type="url" value="${isEdit ? (author!.website_url ?? '') : ''}"></div>
					<div class="form-group"><label class="form-label">Twitter URL</label><input id="af-twitter" class="form-input" type="url" value="${isEdit ? (author!.twitter_url ?? '') : ''}"></div>
					<div class="form-group"><label class="form-label">Booth URL</label><input id="af-booth" class="form-input" type="url" value="${isEdit ? (author!.booth_url ?? '') : ''}"></div>
					<div class="form-group"><label class="form-label">Gumroad URL</label><input id="af-gumroad" class="form-input" type="url" value="${isEdit ? (author!.gumroad_url ?? '') : ''}"></div>
					<div class="form-group admin-form-full"><label class="form-label">${t('admin.authors.formDesc')}</label><textarea id="af-desc" class="form-input" rows="2" style="resize:vertical;width:100%;">${isEdit ? (author!.description ?? '') : ''}</textarea></div>
				</div>
			</div>
		</div>
		<div style="display:flex;gap:8px;">
			<button class="btn" id="af-submit">${isEdit ? t('admin.authors.btnSave') : t('admin.authors.btnCreate')}</button>
			<button class="btn" id="af-cancel">${t('admin.authors.btnCancel')}</button>
		</div>`;

	sectionEl.querySelector('.admin-form-panel')?.after(form);

	// Track the resolved avatar URL (may change if user uploads a new image)
	let resolvedAvatarUrl: string | null | undefined = isEdit ? author?.avatar_url : undefined;

	// Image preview wiring
	const imgFileInput = document.getElementById('af-img-file') as HTMLInputElement;
	const imgPreview = document.getElementById('af-img-preview')!;

	document.getElementById('af-img-btn')?.addEventListener('click', () => imgFileInput.click());

	imgFileInput.addEventListener('change', async () => {
		const url = await uploadAuthorImage(imgFileInput);
		if (url) {
			resolvedAvatarUrl = url;
			imgPreview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
		}
	});

	document.getElementById('af-img-remove')?.addEventListener('click', () => {
		resolvedAvatarUrl = null;
		imgPreview.innerHTML = 'Sin imagen';
	});

	document.getElementById('af-cancel')?.addEventListener('click', () => form.remove());

	document.getElementById('af-submit')?.addEventListener('click', async () => {
		const name = (document.getElementById('af-name') as HTMLInputElement).value.trim();
		if (!name) {
			showToast(t('admin.authors.toastNameRequired'), 'error');
			return;
		}

		const payload: Record<string, unknown> = {
			name,
			description: (document.getElementById('af-desc') as HTMLTextAreaElement).value.trim() || null,
			avatar_url: resolvedAvatarUrl ?? null,
			website_url: (document.getElementById('af-website') as HTMLInputElement).value.trim() || null,
			twitter_url: (document.getElementById('af-twitter') as HTMLInputElement).value.trim() || null,
			booth_url: (document.getElementById('af-booth') as HTMLInputElement).value.trim() || null,
			gumroad_url: (document.getElementById('af-gumroad') as HTMLInputElement).value.trim() || null,
		};

		try {
			const url = isEdit ? `/api/authors/${author!.slug}` : '/api/authors';
			const method = isEdit ? 'PUT' : 'POST';
			const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
			if (r.ok) {
				showToast(t('admin.authors.toastSaved'), 'success');
				form.remove();
				loadAuthors(sectionEl);
			} else {
				const d = (await r.json()) as { error?: string };
				showToast(d.error ?? 'Error', 'error');
			}
		} catch {
			showToast(t('admin.networkError'), 'error');
		}
	});
}

// ---- Media ----

async function loadMedia(el: HTMLElement): Promise<void> {
	el.innerHTML = `<h2 class="admin-section-title">${t('admin.media.title')}</h2>
		<div id="media-stats-wrap" class="admin-loading">${t('common.loading')}</div>`;

	try {
		const res = await fetch('/api/admin/stats/orphaned-media');
		const stats = (await res.json()) as OrphanStats;

		const warningClass = stats.orphaned_count > 0 ? '--warning' : '';
		const filesList = stats.orphaned_files.length
			? `<details style="margin-top:10px"><summary>${t('admin.media.viewList')} (${stats.orphaned_files.length})</summary>
				<ul class="file-list">${stats.orphaned_files.map((f) => `<li><strong>${f.filename}</strong> — ${f.type}, ${f.age_hours}h</li>`).join('')}</ul>
			</details>`
			: '';

		document.getElementById('media-stats-wrap')!.innerHTML = `<div class="admin-stats-grid">
				<div class="admin-stat-card">
					<div class="admin-stat-value">${stats.total_media}</div>
					<div class="admin-stat-label">${t('admin.media.totalMedia')}</div>
				</div>
				<div class="admin-stat-card">
					<div class="admin-stat-value">${stats.total_resources}</div>
					<div class="admin-stat-label">${t('admin.media.totalResources')}</div>
				</div>
				<div class="admin-stat-card ${warningClass}">
					<div class="admin-stat-value">${stats.orphaned_count}</div>
					<div class="admin-stat-label">${t('admin.stats.orphanedMedia')}</div>
				</div>
			</div>
			<div class="admin-form-panel" style="margin-top:16px">
				<h3>${t('admin.media.subtitle')}</h3>
				<p style="font-size:0.88rem;color:var(--text-muted);margin:0 0 12px">
					${t('admin.media.desc')}
				</p>
				${filesList}
				${
					stats.orphaned_count > 0
						? `<button class="btn btn-danger" id="cleanup-orphaned" style="margin-top:14px">🗑️ ${t('admin.media.btnDeleteOrphaned')} (${stats.orphaned_count})</button>`
						: `<p style="color:#3fb950;font-size:0.88rem;margin:10px 0 0">✅ ${t('admin.media.noOrphaned')}</p>`
				}
			</div>`;

		document.getElementById('cleanup-orphaned')?.addEventListener('click', async (e) => {
			if (!confirm(t('admin.media.confirmDelete'))) return;
			const btn = e.target as HTMLButtonElement;
			btn.disabled = true;
			btn.textContent = `⏳ ${t('admin.media.toastDeleting')}`;
			try {
				const r = await fetch('/api/admin/cleanup/orphaned-media', { method: 'POST' });
				const d = (await r.json()) as { deleted?: number; error?: string };
				if (r.ok) {
					showToast(`${d.deleted} ${t('admin.media.toastDeleted')}`, 'success');
					loadMedia(el);
				} else {
					showToast(d.error ?? 'Error', 'error');
					btn.disabled = false;
					btn.textContent = `🗑️ ${t('admin.media.btnDeleteOrphaned')}`;
				}
			} catch {
				showToast(t('admin.networkError'), 'error');
				btn.disabled = false;
			}
		});
	} catch {
		document.getElementById('media-stats-wrap')!.innerHTML = `<p class="error-message">${t('admin.statsError')}</p>`;
	}
}

// ---- Cache ----

function loadCache(el: HTMLElement): void {
	el.innerHTML = `<h2 class="admin-section-title">${t('admin.cache.title')}</h2>
		<div class="admin-form-panel">
			<h3>${t('admin.cache.subtitle')}</h3>
			<p style="font-size:0.88rem;color:var(--text-muted);margin:0 0 14px">
				${t('admin.cache.desc')}
			</p>
			<div class="admin-action-bar">
				<input type="text" id="cache-username" class="admin-search-input" placeholder="${t('admin.cache.placeholder')}">
				<button class="btn" id="btn-clear-cache">${t('admin.users.btnCache')}</button>
			</div>
		</div>`;

	document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
		const input = document.getElementById('cache-username') as HTMLInputElement;
		const username = input.value.trim();
		if (!username) return;

		const btn = document.getElementById('btn-clear-cache') as HTMLButtonElement;
		btn.disabled = true;
		btn.textContent = '…';
		try {
			const r = await fetch(`/api/admin/cache/clear/${encodeURIComponent(username)}`, { method: 'POST' });
			const d = (await r.json()) as { error?: string };
			if (r.ok) {
				showToast(`${t('admin.users.toastCacheCleared')} "${username}"`, 'success');
				input.value = '';
			} else showToast(d.error ?? t('admin.users.toastCacheClearedError'), 'error');
		} catch {
			showToast(t('admin.networkError'), 'error');
		} finally {
			btn.disabled = false;
			btn.textContent = t('admin.users.btnCache');
		}
	});
}

// ---- Community Ads ----


interface AdRow {
	uuid: string;
	title: string;
	tagline: string;
	service_type: string;
	destination_type: string;
	is_active: number;
	is_approved: number;
	rejected_reason: string | null;
	display_weight: number;
	created_at: number;
	author_username: string | null;
}

interface AdSlot {
	slot_name: string;
	max_concurrent: number;
	rotation_hours: number;
	is_enabled: number;
}

interface AdStatRow {
	uuid: string;
	title: string;
	service_type: string;
	is_active: number;
	total_impressions: number;
	total_clicks: number;
	ctr: string;
}

async function loadCommunityAds(el: HTMLElement, activeTab = 'pending'): Promise<void> {
	el.innerHTML = `<h2 class="admin-section-title">${t('admin.communityAds.title')}</h2>
		<div class="admin-ads-tabs">
			<button class="admin-ads-tab ${activeTab === 'pending' ? 'active' : ''}" data-ads-tab="pending">${t('admin.communityAds.tabPending')}</button>
			<button class="admin-ads-tab ${activeTab === 'active' ? 'active' : ''}" data-ads-tab="active">${t('admin.communityAds.tabActive')}</button>
			<button class="admin-ads-tab ${activeTab === 'slots' ? 'active' : ''}" data-ads-tab="slots">${t('admin.communityAds.tabSlots')}</button>
			<button class="admin-ads-tab ${activeTab === 'stats' ? 'active' : ''}" data-ads-tab="stats">${t('admin.communityAds.tabStats')}</button>
		</div>
		<div id="ads-tab-content" class="admin-loading">${t('common.loading')}</div>`;

	document.querySelectorAll<HTMLButtonElement>('[data-ads-tab]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const tab = btn.dataset.adsTab!;
			document.querySelectorAll('.admin-ads-tab').forEach((b) => b.classList.remove('active'));
			btn.classList.add('active');
			loadAdsTab(tab);
		});
	});

	loadAdsTab(activeTab);
}

async function loadAdsTab(tab: string): Promise<void> {
	const wrap = document.getElementById('ads-tab-content');
	if (!wrap) return;
	wrap.innerHTML = `<div class="admin-loading">${t('common.loading')}</div>`;

	try {
		if (tab === 'pending' || tab === 'active') {
			const status = tab === 'pending' ? 'pending' : 'active';
			const res = await fetch(`/api/admin/ads?status=${status}`);
			const data = (await res.json()) as { ads: AdRow[] };

			const tbody = data.ads.map((a) => `<tr>
				<td><strong>${a.title}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${a.tagline.substring(0, 50)}</span></td>
				<td>${a.service_type}</td>
				<td>${a.author_username ?? '—'}</td>
				<td>${a.destination_type}</td>
				<td>${new Date(a.created_at * 1000).toLocaleDateString()}</td>
				<td class="admin-row-actions">
					${tab === 'pending'
						? `<button class="btn" data-ad-approve="${a.uuid}">${t('admin.communityAds.approve')}</button>
						   <button class="btn" data-ad-reject="${a.uuid}">${t('admin.communityAds.reject')}</button>`
						: `<button class="btn" data-ad-deactivate="${a.uuid}">${t('admin.communityAds.deactivate')}</button>
						   <input type="number" min="1" max="100" value="${a.display_weight}" class="form-input" style="width:60px" data-ad-weight-input="${a.uuid}">
						   <button class="btn" data-ad-save-weight="${a.uuid}">${t('admin.communityAds.saveWeight')}</button>`
					}
				</td>
			</tr>`).join('');

			wrap.innerHTML = `<div class="admin-form-panel" style="padding:16px">
				<table class="admin-data-table">
					<thead><tr>
						<th>${t('admin.communityAds.colAd')}</th>
						<th>${t('admin.communityAds.colType')}</th>
						<th>${t('admin.overview.colAuthor')}</th>
						<th>${t('admin.communityAds.colDest')}</th>
						<th>${t('admin.overview.colDate')}</th>
						<th></th>
					</tr></thead>
					<tbody>${tbody || `<tr><td colspan="6">${t('admin.communityAds.noAds')}</td></tr>`}</tbody>
				</table>
			</div>`;

			// Approve buttons
			document.querySelectorAll<HTMLButtonElement>('[data-ad-approve]').forEach((btn) => {
				btn.addEventListener('click', async () => {
					const r = await fetch(`/api/admin/ads/${btn.dataset.adApprove}/approve`, { method: 'POST' });
					if (r.ok) { showToast(t('admin.communityAds.toastApproved'), 'success'); loadAdsTab('pending'); }
					else showToast(t('admin.networkError'), 'error');
				});
			});

			// Reject buttons
			document.querySelectorAll<HTMLButtonElement>('[data-ad-reject]').forEach((btn) => {
				btn.addEventListener('click', () => {
					const reason = prompt(t('admin.communityAds.rejectReasonPrompt'));
					if (!reason) return;
					fetch(`/api/admin/ads/${btn.dataset.adReject}/reject`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ reason }),
					}).then((r) => {
						if (r.ok) { showToast(t('admin.communityAds.toastRejected'), 'success'); loadAdsTab('pending'); }
						else showToast(t('admin.networkError'), 'error');
					}).catch(() => showToast(t('admin.networkError'), 'error'));
				});
			});

			// Deactivate buttons
			document.querySelectorAll<HTMLButtonElement>('[data-ad-deactivate]').forEach((btn) => {
				btn.addEventListener('click', async () => {
					if (!confirm(t('admin.communityAds.confirmDeactivate'))) return;
					const r = await fetch(`/api/admin/ads/${btn.dataset.adDeactivate}/deactivate`, { method: 'POST' });
					if (r.ok) { showToast(t('admin.communityAds.toastDeactivated'), 'success'); loadAdsTab('active'); }
					else showToast(t('admin.networkError'), 'error');
				});
			});

			// Save weight buttons
			document.querySelectorAll<HTMLButtonElement>('[data-ad-save-weight]').forEach((btn) => {
				btn.addEventListener('click', async () => {
					const uuid = btn.dataset.adSaveWeight!;
					const input = document.querySelector<HTMLInputElement>(`[data-ad-weight-input="${uuid}"]`);
					const weight = parseInt(input?.value ?? '1', 10);
					const r = await fetch(`/api/admin/ads/${uuid}/weight`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ display_weight: weight }),
					});
					if (r.ok) showToast(t('admin.communityAds.toastWeightSaved'), 'success');
					else showToast(t('admin.networkError'), 'error');
				});
			});

		} else if (tab === 'slots') {
			const res = await fetch('/api/admin/ads/slots');
			const data = (await res.json()) as { slots: AdSlot[] };

			const tbody = data.slots.map((s) => `<tr>
				<td><strong>${s.slot_name}</strong></td>
				<td><input type="number" class="form-input" style="width:70px" value="${s.max_concurrent}" data-slot-max="${s.slot_name}"></td>
				<td><input type="number" class="form-input" style="width:70px" value="${s.rotation_hours}" data-slot-hours="${s.slot_name}"></td>
				<td><input type="checkbox" ${s.is_enabled ? 'checked' : ''} data-slot-enabled="${s.slot_name}"></td>
				<td class="admin-row-actions"><button class="btn" data-slot-save="${s.slot_name}">${t('admin.communityAds.saveSlot')}</button></td>
			</tr>`).join('');

			wrap.innerHTML = `<div class="admin-form-panel" style="padding:16px">
				<table class="admin-data-table">
					<thead><tr>
						<th>${t('admin.communityAds.colSlot')}</th>
						<th>${t('admin.communityAds.colMaxConcurrent')}</th>
						<th>${t('admin.communityAds.colRotationHours')}</th>
						<th>${t('admin.communityAds.colEnabled')}</th>
						<th></th>
					</tr></thead>
					<tbody>${tbody}</tbody>
				</table>
			</div>`;

			document.querySelectorAll<HTMLButtonElement>('[data-slot-save]').forEach((btn) => {
				btn.addEventListener('click', async () => {
					const slot = btn.dataset.slotSave!;
					const max = parseInt((document.querySelector<HTMLInputElement>(`[data-slot-max="${slot}"]`)?.value ?? '3'), 10);
					const hours = parseInt((document.querySelector<HTMLInputElement>(`[data-slot-hours="${slot}"]`)?.value ?? '24'), 10);
					const enabled = (document.querySelector<HTMLInputElement>(`[data-slot-enabled="${slot}"]`)?.checked ? 1 : 0);
					const r = await fetch(`/api/admin/ads/slots/${slot}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ max_concurrent: max, rotation_hours: hours, is_enabled: enabled }),
					});
					if (r.ok) showToast(t('admin.communityAds.toastSlotSaved'), 'success');
					else showToast(t('admin.networkError'), 'error');
				});
			});

		} else if (tab === 'stats') {
			const res = await fetch('/api/admin/ads/stats');
			const data = (await res.json()) as { stats: AdStatRow[] };

			const tbody = data.stats.map((s) => `<tr>
				<td>${s.title}</td>
				<td>${s.service_type}</td>
				<td><span class="admin-badge-status ${s.is_active ? 'active' : 'inactive'}">${s.is_active ? t('admin.resources.approved') : t('admin.resources.pending')}</span></td>
				<td>${s.total_impressions}</td>
				<td>${s.total_clicks}</td>
				<td>${s.ctr}</td>
			</tr>`).join('');

			wrap.innerHTML = `<div class="admin-form-panel" style="padding:16px">
				<p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 12px">${t('admin.communityAds.statsNote')}</p>
				<table class="admin-data-table">
					<thead><tr>
						<th>${t('admin.overview.colTitle')}</th>
						<th>${t('admin.communityAds.colType')}</th>
						<th>${t('admin.resources.colStatus')}</th>
						<th>${t('admin.communityAds.colImpressions')}</th>
						<th>${t('admin.communityAds.colClicks')}</th>
						<th>CTR</th>
					</tr></thead>
					<tbody>${tbody || `<tr><td colspan="6">${t('admin.communityAds.noStats')}</td></tr>`}</tbody>
				</table>
			</div>`;
		}
	} catch {
		wrap.innerHTML = `<p class="error-message">${t('admin.statsError')}</p>`;
	}
}

