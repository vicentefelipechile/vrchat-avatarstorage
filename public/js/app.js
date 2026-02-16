import { router, navigateTo } from './router.js';
import { setLanguage, getCurrentLang, t } from './i18n.js';
import { DataCache } from './cache.js';

// Global State
window.appState = {
    isLoggedIn: false,
    isAdmin: false,
    user: null
};

// Make navigation global for inline onclicks if needed (though we try to avoid them)
window.navigateTo = navigateTo;
window.setLanguage = setLanguage;

export async function updateNav() {
    // Check auth status
    try {
        const data = await DataCache.fetch('/api/auth/status', 60000);
        window.appState.isLoggedIn = data.loggedIn;
        window.appState.isAdmin = data.is_admin;
        window.appState.user = data;
    } catch (e) {
        console.error('Auth check failed', e);
    }

    const { isLoggedIn, isAdmin } = window.appState;

    // Show/hide user menu dropdown vs login link
    const userMenu = document.querySelector('.user-menu');
    const loginLink = document.querySelector('.login-link');

    if (userMenu && loginLink) {
        if (isLoggedIn) {
            userMenu.style.display = 'inline-block';
            loginLink.style.display = 'none';
        } else {
            userMenu.style.display = 'none';
            loginLink.style.display = 'inline-block';
        }
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');

        // Update text content for all i18n elements
        if (key === 'nav.admin') {
            // Admin link in dropdown - show/hide based on admin status
            if (isAdmin) {
                el.style.display = 'block';
                el.textContent = t('nav.admin');
            } else {
                el.style.display = 'none';
            }
        } else {
            el.textContent = t(key);
        }
    });

    // Mobile menu logic can stay or be re-run here if it depends on dynamic content
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) navLinks.classList.remove('active');

    // Close user menu dropdown
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    if (userMenuDropdown) userMenuDropdown.classList.remove('active');
}

// Ensure nav updates on route change
window.addEventListener('route-changed', updateNav);

window.addEventListener('popstate', router);

document.addEventListener('DOMContentLoaded', async () => {
    // Mobile Menu Toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // User Menu Dropdown Toggle
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    if (userMenuBtn && userMenuDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                userMenuDropdown.classList.remove('active');
            }
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm(t('login.logoutConfirm'))) {
                try {
                    await fetch('/api/logout', { method: 'POST' });
                    // Clear auth cache
                    DataCache.clear('/api/auth/status');
                    // Update app state
                    window.appState.isLoggedIn = false;
                    window.appState.isAdmin = false;
                    window.appState.user = null;
                    // Update navigation UI immediately
                    await updateNav();
                    // Redirect to login
                    navigateTo('/login');
                } catch (err) {
                    console.error('Logout failed', err);
                }
            }
        });
    }

    // Initialize Lang Selector
    const langSelector = document.getElementById('lang-selector');
    if (langSelector) {
        langSelector.value = getCurrentLang(); // from i18n
        langSelector.addEventListener('change', (e) => setLanguage(e.target.value));
    }

    document.body.addEventListener('click', e => {
        if (e.target.matches('[data-link]')) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    // Prefetching logic
    document.body.addEventListener('mouseover', e => {
        let link = e.target.closest('a[href^="/item/"]');
        if (!link) {
            const card = e.target.closest('.card');
            if (card) {
                link = card.querySelector('a[href^="/item/"]');
            }
        }

        if (link) {
            const href = link.getAttribute('href');
            if (href) {
                const uuid = href.split('/item/')[1];
                if (uuid) {
                    DataCache.prefetch(`/api/item/${uuid}`, { ttl: 300000, persistent: true });
                    DataCache.prefetch(`/api/comments/${uuid}`, 300000);
                }
            }
        }
    });

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }

    // Initial Nav Update & Router Call
    await updateNav();
    router();
});
