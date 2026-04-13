// =========================================================================
// router.ts — Minimal SPA router using the History API
// =========================================================================

import type { Route, RouteContext, ViewFn, AfterFn, RouteOptions } from './types';

// -------------------------------------------------------------------------
// Registry
// -------------------------------------------------------------------------

const routes: Route[] = [];

let notFoundView: ViewFn = async () => `<div style="padding:40px;text-align:center"><h2>404 — Page not found</h2></div>`;

// -------------------------------------------------------------------------
// Route registration
// -------------------------------------------------------------------------

export function route(path: string, view: ViewFn, opts: RouteOptions = {}): void {
	const keys: string[] = [];
	const pattern = new RegExp(
		'^' +
			path.replace(/:([^/]+)/g, (_, k: string) => {
				keys.push(k);
				return '([^/]+)';
			}) +
			'$',
	);
	routes.push({ pattern, keys, view, after: opts.after });
}

export function notFound(view: ViewFn): void {
	notFoundView = view;
}

// -------------------------------------------------------------------------
// Navigation
// -------------------------------------------------------------------------

export function navigateTo(urlOrPath: string, replace = false): void {
	// Accept full URLs (from anchor href) or plain paths
	const path = urlOrPath.startsWith('http') ? new URL(urlOrPath).pathname + new URL(urlOrPath).search : urlOrPath;

	if (replace) {
		history.replaceState(null, '', path);
	} else {
		// Save current scroll position in the current history entry before leaving
		history.replaceState({ scrollY: window.scrollY }, '');
		history.pushState(null, '', path);
	}

	dispatch(false);
}

// -------------------------------------------------------------------------
// Dispatch
// -------------------------------------------------------------------------

async function dispatch(isPopState = false): Promise<void> {
	const pathname = location.pathname;
	const query = new URLSearchParams(location.search);

	const app = document.getElementById('app');
	if (!app) return;

	for (const r of routes) {
		const m = pathname.match(r.pattern);
		if (!m) continue;

		const params: Record<string, string> = {};
		r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1] ?? '')));

		const ctx: RouteContext = { params, query };

		try {
			app.innerHTML = await r.view(ctx);
			// Wiki preserves its own scroll (topic changes shouldn't jump to top)
			if (pathname !== '/wiki') {
				// Restore saved scroll on back/forward, jump to top on fresh navigation
				const savedY = isPopState ? ((history.state as { scrollY?: number } | null)?.scrollY ?? 0) : 0;
				window.scrollTo({ top: savedY, behavior: 'instant' });
			}
			await r.after?.(ctx);
			window.dispatchEvent(new CustomEvent('route-changed'));
		} catch (e) {
			console.error('Router render error:', e);
			app.innerHTML = `<p style="color:red;padding:20px">Error loading page.</p>`;
		}
		return;
	}

	// No match → 404
	app.innerHTML = await notFoundView({ params: {}, query });
}

// -------------------------------------------------------------------------
// Init
// -------------------------------------------------------------------------

export function initRouter(): void {
	// Intercept [data-link] clicks and bare <a> clicks
	document.addEventListener('click', (e) => {
		const target = e.target as Element;
		const link = target.closest<HTMLAnchorElement>('[data-link], a[href]');
		if (!link) return;

		const href = link.getAttribute('href');
		if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('/api')) return;

		e.preventDefault();
		navigateTo(href);
	});

	// Browser back/forward — pass isPopState = true to restore scroll
	window.addEventListener('popstate', () => dispatch(true));

	// Dispatch initial URL
	dispatch();
}
