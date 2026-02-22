import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { stripMarkdown } from '../utils.js';

export default class CategoryView extends AbstractView {
    async getHtml() {
        const categoryKey = decodeURIComponent(this.params.id);
        const displayName = t('cats.' + categoryKey) || categoryKey;

        this.categoryKey = categoryKey;

        return `
            <div class="category-header">
                <h1>${displayName}</h1>
                <p class="category-description">${t('cats.desc.' + categoryKey) || ''}</p>
            </div>
            <div id="category-resources">
                <div class="loading-skeleton">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
            </div>
        `;
    }

    async postRender() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = parseInt(urlParams.get('page')) || 1;

        const data = await DataCache.fetch(`/api/resources/category/${this.categoryKey}?page=${page}`, 300000);

        const container = document.getElementById('category-resources');
        if (container) {
            if (!data.resources || data.resources.length === 0) {
                container.innerHTML = `<p class="no-results">${t('common.noResourcesFound')}</p>`;
            } else {
                const cardsHtml = data.resources.map(res => this.renderCard(res)).join('');

                let paginationHtml = '';
                if (data.pagination) {
                    const { page, hasPrevPage, hasNextPage } = data.pagination;

                    if (hasPrevPage || hasNextPage) {
                        paginationHtml = `
                            <div class="pagination">
                                <a href="/category/${this.categoryKey}?page=${page - 1}"
                                   class="btn ${!hasPrevPage ? 'disabled' : ''}"
                                   ${!hasPrevPage ? 'style="pointer-events: none; opacity: 0.5;"' : 'data-link'}>
                                   &laquo; ${t('pagination.prev') || 'Previous'}
                                </a>
                                <span class="page-info">${page}</span>
                                <a href="/category/${this.categoryKey}?page=${page + 1}"
                                   class="btn ${!hasNextPage ? 'disabled' : ''}"
                                   ${!hasNextPage ? 'style="pointer-events: none; opacity: 0.5;"' : 'data-link'}>
                                   ${t('pagination.next') || 'Next'} &raquo;
                                </a>
                            </div>
                        `;
                    }
                }

                container.innerHTML = `<div class="grid">${cardsHtml}</div>${paginationHtml}`;
            }
        }
    }

    renderCard(res) {
        const title = stripMarkdown(res.title).substring(0, 50);
        const description = stripMarkdown(res.description || '').substring(0, 80);
        const categoryLabel = t('cats.' + res.category) || res.category;
        const date = new Date(res.timestamp).toLocaleDateString();
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
