// =========================================================================
// views/AdminView.ts — Thin shell: sidebar nav + section containers (desktop only)
// Section bodies live in features/admin/*; approve/reject/deactivate live on ItemView.
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { t } from '../core/i18n';
import { navigateTo } from '../core/router';
import { esc } from '../features/admin/esc';
import { loadOverview } from '../features/admin/overview';
import { loadResources } from '../features/admin/resources';
import { loadUsers } from '../features/admin/users';
import { loadComments } from '../features/admin/comments';
import { loadAuthors } from '../features/admin/authors';
import { loadMedia } from '../features/admin/media';
import { loadCache } from '../features/admin/cache';
import type { RouteContext } from '../types';

// =========================================================================
// Sidebar nav (labels resolved at render time, so language switches apply)
// =========================================================================

function navItems(): { id: string; label: string }[] {
	return [
		{ id: 'overview', label: t('admin.nav.overview') },
		{ id: 'resources', label: t('admin.nav.resources') },
		{ id: 'users', label: t('admin.nav.users') },
		{ id: 'comments', label: t('admin.nav.comments') },
		{ id: 'authors', label: t('admin.nav.authors') },
		{ id: 'media', label: t('admin.nav.media') },
		{ id: 'cache', label: t('admin.nav.cache') },
	];
}

function validSection(id: string): string {
	return navItems().some((n) => n.id === id) ? id : 'overview';
}

// =========================================================================
// View
// =========================================================================

export async function adminView(_ctx: RouteContext): Promise<string> {
	if (!window.appState.isAdmin) return `<h1>${esc(t('common.accessDenied'))}</h1>`;

	const items = navItems();
	const navHtml = items.map((item) => `<li class="admin-sidebar-nav-item" data-section="${item.id}">${esc(item.label)}</li>`).join('');
	const sectionsHtml = items
		.map((item) => `<div class="admin-section" id="section-${item.id}" aria-label="${esc(item.label)}"></div>`)
		.join('');

	return `<div class="admin-desktop-only-warning">
		<h2>${esc(t('admin.desktopWarningTitle'))}</h2>
		<p>${esc(t('admin.desktopWarningDesc'))}</p>
	</div>
	<div class="admin-layout">
		<aside class="admin-sidebar">
			<div class="admin-sidebar-title">${esc(t('admin.title'))}</div>
			<ul class="admin-sidebar-nav">${navHtml}</ul>
		</aside>
		<main class="admin-content">${sectionsHtml}</main>
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

	const navEl = document.querySelectorAll<HTMLElement>('.admin-sidebar-nav-item');
	const sectionEls = document.querySelectorAll<HTMLElement>('.admin-section');
	const loaded = new Set<string>();
	let aborter: AbortController | null = null;

	function switchSection(id: string, pushHistory = true): void {
		id = validSection(id);
		aborter?.abort();
		aborter = new AbortController();
		navEl.forEach((n) => n.classList.toggle('active', n.dataset.section === id));
		sectionEls.forEach((s) => s.classList.toggle('active', s.id === `section-${id}`));
		if (pushHistory) history.replaceState(null, '', `/admin#${id}`);
		if (!loaded.has(id)) loaded.add(id);
		loadSection(id, aborter.signal);
	}

	function loadSection(id: string, signal: AbortSignal): void {
		const sectionEl = document.getElementById(`section-${id}`);
		if (!sectionEl) return;
		switch (id) {
			case 'overview':
				return loadOverview(sectionEl, signal);
			case 'resources':
				return loadResources(sectionEl, signal);
			case 'users':
				return loadUsers(sectionEl, signal);
			case 'comments':
				return loadComments(sectionEl, signal);
			case 'authors':
				return loadAuthors(sectionEl, signal);
			case 'media':
				return loadMedia(sectionEl, signal);
			case 'cache':
				return loadCache(sectionEl);
		}
	}

	navEl.forEach((item) => {
		item.addEventListener('click', () => switchSection(item.dataset.section!));
	});

	// Browser back/forward across section hashes (same-document, so popstate fires without a rerender).
	window.addEventListener('hashchange', () => switchSection(window.location.hash.replace('#', ''), false));

	switchSection(window.location.hash.replace('#', '') || 'overview', false);
}
