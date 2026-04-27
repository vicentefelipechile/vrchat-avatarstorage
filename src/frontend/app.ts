// =========================================================================
// app.ts — Entry point: auth, nav, route registration
// =========================================================================

import { route, notFound, navigateTo, initRouter } from './router';
import { setLanguage, getCurrentLang, t } from './i18n';
import { DataCache } from './cache';
import { showToast, TimeUnit } from './utils';
import type { AuthUser } from './types';

// Views
import { homeView } from './views/HomeView';
import { categoryView } from './views/CategoryView';
import { itemView, itemAfter } from './views/ItemView';
import { loginView, loginAfter } from './views/LoginView';
import { registerView, registerAfter } from './views/RegisterView';
import { uploadView, uploadAfter } from './views/UploadView';
import { settingsView, settingsAfter } from './views/SettingsView';
import { adminView, adminAfter } from './views/AdminView';
import { wikiView, wikiAfter } from './views/WikiView';
import { editResourceView, editResourceAfter } from './views/EditResourceView';
import { historyView, historyAfter } from './views/HistoryView';
import { favoritesView, favoritesAfter } from './views/FavoritesView';
import { tosView } from './views/TOSView';
import { dmcaView, dmcaAfter } from './views/DMCAView';
import { oauthRegisterView, oauthRegisterAfter } from './views/OAuthRegisterView';
import { blogListView } from './views/BlogListView';
import { blogPostView, blogPostAfter } from './views/BlogPostView';
import { blogCreateView, blogCreateAfter } from './views/BlogCreateView';
import { avatarsView, avatarsAfter } from './views/AvatarsView';
import { assetsView, assetsAfter } from './views/AssetsView';
import { clothesView, clothesAfter } from './views/ClothesView';
import { authorView, authorAfter } from './views/AuthorView';
import { communityView, communityAfter } from './views/CommunityView';
import { adCreateView, adCreateAfter } from './views/AdCreateView';
import { adDetailView, adDetailAfter } from './views/AdDetailView';


// =========================================================================
// Global state
// =========================================================================

interface CachedAuth {
	isLoggedIn: boolean;
	isAdmin: boolean;
	user: AuthUser | null;
}

const cachedAuth = localStorage.getItem('auth_state');
let initialAuth: CachedAuth = { isLoggedIn: false, isAdmin: false, user: null };
if (cachedAuth) {
	try {
		initialAuth = JSON.parse(cachedAuth) as CachedAuth;
	} catch {
		/* ignore */
	}
}

window.appState = {
	isLoggedIn: initialAuth.isLoggedIn,
	isAdmin: initialAuth.isAdmin,
	user: initialAuth.user,
};

// Expose for inline use (search bars, etc.)
window.navigateTo = navigateTo;
window.setLanguage = setLanguage;

// =========================================================================
// Route registration
// =========================================================================

route('/', homeView);
route('/category/:category', categoryView);
route('/item/:id', itemView, { after: itemAfter });
route('/resource/:id', itemView, { after: itemAfter });
route('/resource/:id/edit', editResourceView, { after: editResourceAfter });
route('/resource/:id/history', historyView, { after: historyAfter });
route('/login', loginView, { after: loginAfter });
route('/register', registerView, { after: registerAfter });
route('/upload', uploadView, { after: uploadAfter });
route('/settings', settingsView, { after: settingsAfter });
route('/admin', adminView, { after: adminAfter });
route('/wiki', wikiView, { after: wikiAfter });
route('/favorites', favoritesView, { after: favoritesAfter });
route('/tos', tosView);
route('/dmca', dmcaView, { after: dmcaAfter });
route('/oauth/register', oauthRegisterView, { after: oauthRegisterAfter });
route('/blog', blogListView);
route('/blog/create', blogCreateView, { after: blogCreateAfter });
route('/blog/:id', blogPostView, { after: blogPostAfter });
route('/blog/:id/edit', blogCreateView, { after: blogCreateAfter });
route('/avatars', avatarsView, { after: avatarsAfter });
route('/assets', assetsView, { after: assetsAfter });
route('/clothes', clothesView, { after: clothesAfter });
route('/authors/:slug', authorView, { after: authorAfter });
route('/community', communityView, { after: communityAfter });
route('/community/create', adCreateView, { after: adCreateAfter });
route('/community/:uuid/edit', adCreateView, { after: adCreateAfter });
route('/community/:uuid', adDetailView, { after: adDetailAfter });

notFound(
	async () => `
	<div style="padding:60px;text-align:center">
		<h2>404 — ${t('common.notFound') || 'Page not found'}</h2>
		<a href="/" data-link style="color:var(--accent)">${t('nav.home') || 'Go home'}</a>
	</div>
`,
);

// =========================================================================
// Nav DOM
// =========================================================================

function updateNavDOM(): void {
	const { isLoggedIn, isAdmin } = window.appState;

	const userMenu = document.querySelector<HTMLElement>('.user-menu');
	const loginLink = document.querySelector<HTMLElement>('.login-link');

	if (userMenu && loginLink) {
		userMenu.style.display = isLoggedIn ? 'inline-block' : 'none';
		loginLink.style.display = isLoggedIn ? 'none' : 'inline-block';
	}

	document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
		const key = el.getAttribute('data-i18n')!;
		if (key === 'nav.admin') {
			el.style.display = isAdmin ? 'block' : 'none';
			if (isAdmin) el.textContent = t('nav.admin');
		} else {
			el.textContent = t(key);
		}
	});

	document.querySelector<HTMLElement>('.nav-links')?.classList.remove('active');
	document.querySelector<HTMLElement>('.nav-utils')?.classList.remove('active');
	document.getElementById('user-menu-dropdown')?.classList.remove('active');
}

// =========================================================================
// Auth
// =========================================================================

async function updateNav(): Promise<void> {
	const prev = {
		isLoggedIn: window.appState.isLoggedIn,
		isAdmin: window.appState.isAdmin,
		username: window.appState.user?.username,
	};

	try {
		const data = (await DataCache.fetch('/api/auth/status', TimeUnit.Hour)) as AuthUser & { loggedIn: boolean; is_admin: boolean };
		window.appState.isLoggedIn = data.loggedIn;
		window.appState.isAdmin = data.is_admin;
		window.appState.user = data.loggedIn ? data : null;
		localStorage.setItem(
			'auth_state',
			JSON.stringify({
				isLoggedIn: data.loggedIn,
				isAdmin: data.is_admin,
				user: data.loggedIn ? data : null,
			}),
		);
	} catch {
		localStorage.removeItem('auth_state');
		window.appState = { isLoggedIn: false, isAdmin: false, user: null };
	}

	const changed =
		prev.isLoggedIn !== window.appState.isLoggedIn ||
		prev.isAdmin !== window.appState.isAdmin ||
		prev.username !== window.appState.user?.username;

	if (changed) updateNavDOM();
}

// =========================================================================
// Version info modal
// =========================================================================

interface VersionInfo {
	worker?: {
		versionId?: string;
		versionTag?: string | null;
		commitHash?: string;
		deployedAt?: string;
		deployedAtTimestamp?: number;
		compatibilityDate?: string;
	};
	runtime?: {
		name?: string;
		engine?: string;
	};
	request?: {
		rayId?: string | null;
		requestId?: string | null;
		country?: string | null;
		colo?: string | null;
	};
}

function populateVersionInfo(data: VersionInfo): void {
	const set = (id: string, val?: string | number | null) => {
		const el = document.getElementById(id);
		if (el) el.textContent = val != null ? String(val) : '—';
	};
	set('vi-version-id', data.worker?.versionId);
	set('vi-version-tag', data.worker?.versionTag ?? '—');
	set('vi-commit', data.worker?.commitHash);
	set('vi-deployed', data.worker?.deployedAt);
	set('vi-compat', data.worker?.compatibilityDate);
	set('vi-runtime', data.runtime?.name ?? 'Cloudflare Workers');
	set('vi-ray', data.request?.rayId);
	set('vi-req-id', data.request?.requestId);
	set('vi-country', data.request?.country);
	set('vi-colo', data.request?.colo);
}

function initVersionModal(): void {
	const btn = document.getElementById('version-info-btn');
	const modal = document.getElementById('version-info-modal');
	const closeBtn = document.getElementById('version-info-close');
	const loading = document.getElementById('version-info-loading');
	const dataEl = document.getElementById('version-info-data');
	const errorEl = document.getElementById('version-info-error');

	if (!btn || !modal) return;

	let loaded = false;

	const open = async () => {
		modal.style.display = 'flex';
		if (loaded) return;
		try {
			const res = await fetch('/api/version');
			if (!res.ok) throw new Error();
			populateVersionInfo((await res.json()) as VersionInfo);
			loading?.style.setProperty('display', 'none');
			dataEl?.style.setProperty('display', 'block');
			loaded = true;
		} catch {
			loading?.style.setProperty('display', 'none');
			errorEl?.style.setProperty('display', 'block');
		}
	};

	const close = () => {
		modal.style.display = 'none';
	};

	btn.addEventListener('click', open);
	closeBtn?.addEventListener('click', close);
	modal.addEventListener('click', (e) => {
		if (e.target === modal) close();
	});
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && modal.style.display === 'flex') close();
	});
}

// =========================================================================
// Prefetch on hover
// =========================================================================

function initPrefetch(): void {
	document.body.addEventListener('mouseover', (e) => {
		const card = (e.target as HTMLElement).closest<HTMLElement>('.card');
		const link =
			(e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="/item/"]') ??
			card?.querySelector<HTMLAnchorElement>('a[href^="/item/"]');

		const href = link?.getAttribute('href');
		if (!href) return;

		const uuid = href.split('/item/')[1];
		if (!uuid) return;

		DataCache.prefetch(`/api/resources/${uuid}`, { ttl: TimeUnit.Minute * 5, persistent: true });
		DataCache.prefetch(`/api/comments/${uuid}`, { ttl: TimeUnit.Minute * 5 });
	});
}

// =========================================================================
// DOMContentLoaded — wire up all UI chrome
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
	// =========================================================================
	// Age Gate
	// =========================================================================
	const ageGateOverlay = document.getElementById('age-gate-overlay');
	if (ageGateOverlay && !localStorage.getItem('age_verified')) {
		ageGateOverlay.style.display = 'flex';

		document.getElementById('age-gate-yes')?.addEventListener('click', () => {
			localStorage.setItem('age_verified', '1');
			ageGateOverlay.style.display = 'none';
		});

		document.getElementById('age-gate-no')?.addEventListener('click', () => {
			window.location.href = 'https://youtu.be/XqZsoesa55w?t=29';
		});

		// Block Escape key and backdrop clicks while gate is visible
		document.addEventListener(
			'keydown',
			(e) => {
				if (ageGateOverlay.style.display !== 'none' && e.key === 'Escape') {
					e.preventDefault();
					e.stopPropagation();
				}
			},
			true,
		);
	}

	// Mobile menu
	document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
		document.querySelector<HTMLElement>('.nav-links')?.classList.toggle('active');
		document.querySelector<HTMLElement>('.nav-utils')?.classList.toggle('active');
	});

	// User menu dropdown
	const userMenuBtn = document.getElementById('user-menu-btn');
	const userMenuDropdown = document.getElementById('user-menu-dropdown');
	if (userMenuBtn && userMenuDropdown) {
		userMenuBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			userMenuDropdown.classList.toggle('active');
		});
		document.addEventListener('click', (e) => {
			if (!(e.target as HTMLElement).closest('.user-menu')) {
				userMenuDropdown.classList.remove('active');
			}
		});
	}

	// Logout
	document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
		e.preventDefault();
		if (!confirm(t('login.logoutConfirm'))) return;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			DataCache.clear('/api/auth/status');
			localStorage.removeItem('auth_state');
			window.appState = { isLoggedIn: false, isAdmin: false, user: null };
			await updateNav();
			navigateTo('/login');
			// SPA navigation keeps the DOM alive — toast is visible on the login page
			showToast(t('login.logout_success') || 'Sesión cerrada correctamente', 'success');
		} catch {
			showToast(t('common.networkError') || 'Error de red', 'error');
		}
	});

	// Language selector
	const langSelector = document.getElementById('lang-selector') as HTMLSelectElement | null;
	if (langSelector) {
		langSelector.value = getCurrentLang();
		langSelector.addEventListener('change', () => setLanguage(langSelector.value));
	}

	// Theme toggle
	const themeToggle = document.getElementById('theme-toggle');
	const applyTheme = (theme: string) => {
		if (theme === 'dark') {
			document.documentElement.setAttribute('data-theme', 'dark');
			if (themeToggle) themeToggle.textContent = '🌙';
		} else {
			document.documentElement.removeAttribute('data-theme');
			if (themeToggle) themeToggle.textContent = '☀️';
		}
	};

	if (themeToggle) {
		themeToggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
		themeToggle.addEventListener('click', () => {
			const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
			applyTheme(next);
			localStorage.setItem('theme', next);
		});
	}

	// Version modal
	initVersionModal();

	// Prefetch
	initPrefetch();

	// Update nav DOM on route changes
	window.addEventListener('route-changed', updateNavDOM);

	// Service Worker
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('/sw.js')
			.then((r) => console.log('SW registered:', r.scope))
			.catch((e) => console.error('SW registration failed:', e));
	}

	// Boot
	updateNavDOM();
	initRouter();

	// Flash toast — shown after a full-page redirect (e.g. after standard login)
	const flashRaw = sessionStorage.getItem('flash_toast');
	if (flashRaw) {
		sessionStorage.removeItem('flash_toast');
		try {
			const flash = JSON.parse(flashRaw) as { message: string; type?: string };
			// Slight delay so the page content renders first
			setTimeout(() => showToast(flash.message, (flash.type as 'info' | 'success' | 'error' | 'warning') ?? 'info', 4000), 300);
		} catch {
			/* ignore */
		}
	}

	// OAuth login toast — shown after Google redirects to /?login=google
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get('login') === 'google') {
		// Clean the URL so the param doesn't persist on manual reload
		history.replaceState(null, '', '/');
		// Pre-populate auth_state so the nav renders correctly without waiting for the async fetch
		localStorage.setItem('auth_state', JSON.stringify({ isLoggedIn: true, isAdmin: false, user: null }));
		setTimeout(() => showToast(t('login.success'), 'success', 4000), 300);
	}

	// Background auth refresh (non-blocking)
	updateNav().catch(console.error);
});
