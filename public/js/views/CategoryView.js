import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { stripMarkdown } from '../utils.js';

export default class CategoryView extends AbstractView {
    async getHtml() {
        const categoryKey = decodeURIComponent(this.params.id);
        const displayName = t('cats.' + categoryKey) || categoryKey;
        const data = await DataCache.fetch(`/api/category/${categoryKey}`, 300000);

        const cardsHtml = data.resources.map(res => `
            <div class="card">
                ${res.thumbnail_key ? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${res.title}" loading="lazy"></div>` : ''}
                <h3>${res.title}</h3>
                <div class="meta">${t('cats.' + res.category) || res.category} | ${new Date(res.timestamp).toLocaleDateString()}</div>
                <p>${stripMarkdown(res.description).substring(0, 100)}...</p>
                <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
            </div>
        `).join('');

        return `
            <h1>${displayName}</h1>
            <div class="grid">${cardsHtml}</div>
        `;
    }
}
