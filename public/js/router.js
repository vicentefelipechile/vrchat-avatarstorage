import HomeView from './views/HomeView.js';
import CategoryView from './views/CategoryView.js';
import ItemView from './views/ItemView.js';
import LoginView from './views/LoginView.js';
import RegisterView from './views/RegisterView.js';
import UploadView from './views/UploadView.js';
import SettingsView from './views/SettingsView.js';
import AdminView from './views/AdminView.js';
import WikiView from './views/WikiView.js';
import { pathToRegex, getParams } from './utils.js';

export const router = async () => {
    const routes = [
        { path: '/', view: HomeView },
        { path: '/category/:id', view: CategoryView },
        { path: '/item/:id', view: ItemView },
        { path: '/login', view: LoginView },
        { path: '/settings', view: SettingsView },
        { path: '/register', view: RegisterView },
        { path: '/upload', view: UploadView },
        { path: '/admin', view: AdminView },
        { path: '/wiki', view: WikiView }
    ];

    const potentialMatches = routes.map(route => {
        return {
            route: route,
            result: location.pathname.match(pathToRegex(route.path))
        };
    });

    let match = potentialMatches.find(potentialMatch => potentialMatch.result !== null);

    if (!match) {
        match = {
            route: routes[0],
            result: [location.pathname]
        };
    }

    const view = new match.route.view(getParams(match));

    const contentPayload = document.getElementById('app');
    contentPayload.innerHTML = await view.getHtml();

    if (view.postRender) await view.postRender();

    // Dispatch event so app.js can update Nav
    window.dispatchEvent(new CustomEvent('route-changed'));
};

export const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};
