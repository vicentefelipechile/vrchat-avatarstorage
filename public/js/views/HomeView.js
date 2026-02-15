import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { stripMarkdown } from '../utils.js';

export default class HomeView extends AbstractView {
    async getHtml() {
        const apiCategories = ['avatars', 'worlds', 'assets', 'clothes', 'others'];
        // Use default non-persistent cache for latest items as they change
        const latest = await DataCache.fetch('/api/latest', 60000);

        const categoriesHtml = apiCategories.map(cat =>
            `<a href="/category/${cat}" data-link class="btn mr-10 mb-10">${t('cats.' + cat)}</a>`
        ).join('');

        const cardsHtml = latest.map(res => `
            <div class="card">
                ${res.thumbnail_key ? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${res.title}" loading="lazy"></div>` : ''}
                <h3>${res.title}</h3>
                <div class="meta">${t('cats.' + res.category) || res.category} | ${new Date(res.created_at * 1000).toLocaleDateString()}</div>
                <p>${stripMarkdown(res.description).substring(0, 100)}...</p>
                <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
            </div>
        `).join('');

        return `
            <section class="mb-40 text-center">
                <h1>${t('home.welcome')}</h1>
                <p>${t('home.browse')}</p>
                <div class="flex-center">${categoriesHtml}</div>
            </section>
            <section>
                <h2>${t('home.latest')}</h2>
                <div class="grid">${cardsHtml}</div>
            </section>
        `;
    }
}
