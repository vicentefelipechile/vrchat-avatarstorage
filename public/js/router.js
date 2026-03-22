import HomeView from './views/HomeView.js';
import CategoryView from './views/CategoryView.js';
import ItemView from './views/ItemView.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import UploadView from './views/UploadView.js';
import SettingsView from './views/SettingsView.js';
import AdminView from './views/AdminView.js';
import WikiView from './views/WikiView.js';
import EditResourceView from './views/EditResourceView.js';
import HistoryView from './views/HistoryView.js';
import FavoritesView from './views/FavoritesView.js';
import TOSView from './views/TOSView.js';
import DMCAView from './views/DMCAView.js';
import OAuthRegisterView from './views/OAuthRegisterView.js';
import BlogListView from './views/BlogListView.js';
import BlogPostView from './views/BlogPostView.js';
import BlogCreateView from './views/BlogCreateView.js';
import { pathToRegex, getParams } from './utils.js';

export const router = async () => {
	const routes = [
		{ path: '/', view: HomeView },
		{ path: '/category/:id', view: CategoryView },
		{ path: '/item/:id', view: ItemView },
		{ path: '/resource/:id/edit', view: EditResourceView },
		{ path: '/resource/:id/history', view: HistoryView },
		{ path: '/login', view: LoginView },
		{ path: '/settings', view: SettingsView },
		{ path: '/register', view: RegisterView },
		{ path: '/upload', view: UploadView },
		{ path: '/admin', view: AdminView },
		{ path: '/favorites', view: FavoritesView },
		{ path: '/wiki', view: WikiView },
		{ path: '/tos', view: TOSView },
		{ path: '/dmca', view: DMCAView },
		{ path: '/register/oauth', view: OAuthRegisterView },
		{ path: '/blog/create', view: BlogCreateView },
		{ path: '/blog/:id/edit', view: BlogCreateView },
		{ path: '/blog/:id', view: BlogPostView },
		{ path: '/blog', view: BlogListView },
	];

	const potentialMatches = routes.map((route) => {
		return {
			route: route,
			result: location.pathname.match(pathToRegex(route.path)),
		};
	});

	let match = potentialMatches.find((potentialMatch) => potentialMatch.result !== null);

	if (!match) {
		match = {
			route: routes[0],
			result: [location.pathname],
		};
	}

	const view = new match.route.view(getParams(match));

	const contentPayload = document.getElementById('app');
	contentPayload.innerHTML = await view.getHtml();

	if (view.postRender) await view.postRender();

	// Scroll handling:
	// - Wiki pages: always preserve scroll (long articles)
	// - Forward navigation (link click): reset to top
	// - Back/forward (popstate): restore saved scroll position
	const isWiki = location.pathname === '/wiki' || location.pathname.startsWith('/wiki/');
	if (!isWiki) {
		if (navigateToFlag) {
			// Forward navigation — scroll to top
			window.scrollTo({ top: 0, behavior: 'instant' });
		} else {
			// Popstate — restore saved scroll if available
			const savedScroll = history.state?.scrollY ?? 0;
			window.scrollTo({ top: savedScroll, behavior: 'instant' });
		}
	}
	navigateToFlag = false;

	// Dispatch event so app.js can update Nav
	window.dispatchEvent(new CustomEvent('route-changed'));
};

export const navigateTo = (url) => {
	// Save current scroll before leaving this page
	const state = history.state || {};
	history.replaceState({ ...state, scrollY: window.scrollY }, '');

	// Mark the next router() call as a forward navigation
	navigateToFlag = true;
	history.pushState(null, null, url);
	router();
};

// False = popstate (back/forward), true = navigateTo (forward link click)
let navigateToFlag = false;
