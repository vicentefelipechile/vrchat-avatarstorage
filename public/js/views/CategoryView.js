import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { stripMarkdown } from '../utils.js';

export default class CategoryView extends AbstractView {
    async getHtml() {
        const categoryKey = decodeURIComponent(this.params.id);
        const displayName = t('cats.' + categoryKey) || categoryKey;

        // Store category key for postRender
        this.categoryKey = categoryKey;

        // Return loading skeleton immediately
        return `
            <h1>${displayName}</h1>
            <div id="category-resources">
                <div style="text-align: center; padding: 40px;">
                    <p style="color: #666; margin: 0;">${t('common.loadingResources')}</p>
                </div>
            </div>
        `;
    }

    async postRender() {
        // Parse page from query params or default to 1
        const urlParams = new URLSearchParams(window.location.search);
        const page = parseInt(urlParams.get('page')) || 1;

        // Fetch data with pagination
        const data = await DataCache.fetch(`/api/resources/category/${this.categoryKey}?page=${page}`, 300000);

        // Update the resources container
        const container = document.getElementById('category-resources');
        if (container) {
            if (!data.resources || data.resources.length === 0) {
                container.innerHTML = `<p>${t('common.noResourcesFound')}</p>`;
            } else {
                const cardsHtml = data.resources.map(res => `
                    <div class="card">
                        ${res.thumbnail_key ? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${res.title}" loading="lazy"></div>` : ''}
                        <h3>${res.title}</h3>
                        <div class="meta">${t('cats.' + res.category) || res.category} | ${new Date(res.timestamp).toLocaleDateString()}</div>
                        <p>${stripMarkdown(res.description).substring(0, 100)}...</p>
                        <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
                    </div>
                `).join('');

                // Pagination Controls
                let paginationHtml = '';
                if (data.pagination) {
                    const { page, hasPrevPage, hasNextPage } = data.pagination;

                    if (hasPrevPage || hasNextPage) {
                        paginationHtml = `
                            <div class="pagination" style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 30px;">
                                <a href="/category/${this.categoryKey}?page=${page - 1}"
                                   class="btn ${!hasPrevPage ? 'disabled' : ''}"
                                   ${!hasPrevPage ? 'style="pointer-events: none; opacity: 0.5;"' : 'data-link'}>
                                   &laquo; ${t('pagination.prev') || 'Previous'}
                                </a>

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
}
