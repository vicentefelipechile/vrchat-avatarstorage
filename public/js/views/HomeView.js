import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { stripMarkdown } from '../utils.js';

export default class HomeView extends AbstractView {
    async getHtml() {
        const apiCategories = ['avatars', 'assets', 'clothes'];
        
        const latest = await DataCache.fetch('/api/resources/latest', 60000);

        const categoriesHtml = apiCategories.map(cat =>
            `<a href="/category/${cat}" data-link class="category-btn">${t('cats.' + cat)}</a>`
        ).join('');

        const cardsHtml = latest.map(res => this.renderCard(res)).join('');

        return `
            <section class="hero-section">
                <h1>${t('home.welcome')}</h1>
                <p>${t('home.browse')}</p>
                <div class="category-nav">${categoriesHtml}</div>
            </section>
            <section class="latest-section">
                <h2>${t('home.latest')}</h2>
                <div class="grid">${cardsHtml}</div>
            </section>
        `;
    }

    renderCard(res) {
        const title = stripMarkdown(res.title).substring(0, 50);
        const description = stripMarkdown(res.description || '').substring(0, 80);
        const categoryLabel = t('cats.' + res.category) || res.category;
        const date = new Date(res.timestamp || res.created_at * 1000).toLocaleDateString();
        const downloads = res.download_count || 0;
        
        const authorName = res.author?.username || 'Unknown';
        const authorAvatar = res.author?.avatar_url || '';
        const avatarImg = authorAvatar 
            ? `<img src="${authorAvatar}" alt="${authorName}" class="card-author-avatar" onerror="this.style.display='none'">`
            : `<div class="card-author-avatar-placeholder">${authorName.charAt(0).toUpperCase()}</div>`;

        return `
            <div class="card">
                <a href="/item/${res.uuid}" data-link class="card-link">
                    ${res.thumbnail_key ? `
                        <div class="card-image">
                            <img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy">
                            <span class="card-badge">${categoryLabel}</span>
                        </div>
                    ` : `
                        <div class="card-image card-image-placeholder">
                            <span class="card-badge">${categoryLabel}</span>
                        </div>
                    `}
                </a>
                <div class="card-body">
                    <h3>${title}${res.title.length > 50 ? '...' : ''}</h3>
                    
                    <div class="card-author">
                        ${avatarImg}
                        <span class="card-author-name">${authorName}</span>
                    </div>
                    
                    <div class="card-meta">
                        <span>${date}</span>
                        <div class="card-stats">
                            <span>📥 ${downloads}</span>
                        </div>
                    </div>
                    
                    <p class="card-description">${description}${description.length >= 80 ? '...' : ''}</p>
                    
                    <div class="card-footer">
                        <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
                    </div>
                </div>
            </div>
        `;
    }
}
