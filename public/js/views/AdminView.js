import AbstractView from './AbstractView.js';
import { stripMarkdown } from '../utils.js';
import { t } from '../i18n.js';

export default class AdminView extends AbstractView {
    async getHtml() {
        if (!window.appState || !window.appState.isAdmin) {
            return `<h1>Access Denied</h1>`;
        }

        const pending = await fetch('/api/admin/pending').then(res => res.json());

        let content = '';
        if (pending.length === 0) {
            content = `<p>${t('admin.noPending')}</p>`;
        } else {
            const cardsHtml = pending.map(res => `
                <div class="card">
                    ${res.thumbnail_key ? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${res.title}" loading="lazy"></div>` : ''}
                    <h3>${res.title}</h3>
                    <div class="meta">${t('cats.' + res.category) || res.category} | ${new Date(res.timestamp).toLocaleDateString()}</div>
                    <p>${stripMarkdown(res.description).substring(0, 100)}...</p>
                    <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
                </div>
            `).join('');
            content = `<div class="grid">${cardsHtml}</div>`;
        }

        return `
            <h1>${t('admin.title')}</h1>
            ${content}
        `;
    }
}
