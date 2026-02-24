import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { stripMarkdown } from '../utils.js';

export default class FavoritesView extends AbstractView {
	async getHtml() {
		return `
            <div class="category-header">
                <h1>${t('nav.favorites')}</h1>
            </div>
            <div id="favorites-resources">
                <div class="loading-skeleton">
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

		// Use cache-busting to force fresh data
		const cacheBuster = `?_=${Date.now()}`;
		const data = await DataCache.fetch(`/api/favorites?page=${page}${cacheBuster}`, 60000);

		const container = document.getElementById('favorites-resources');
		if (container) {
			if (!data.favorites || data.favorites.length === 0) {
				container.innerHTML = `<p class="no-results">${t('common.noFavorites')}</p>`;
			} else {
				const cardsHtml = data.favorites.map((res) => this.renderCard(res)).join('');

				let paginationHtml = '';
				if (data.pagination) {
					const { page, total_pages } = data.pagination;

					if (total_pages > 1) {
						paginationHtml = `
                            <div class="pagination">
                                <a href="/favorites?page=${page - 1}"
                                   class="btn ${page <= 1 ? 'disabled' : ''}"
                                   ${page <= 1 ? 'style="pointer-events: none; opacity: 0.5;"' : 'data-link'}>
                                   &laquo; ${t('pagination.prev') || 'Previous'}
                                </a>
                                <span class="page-info">${page}</span>
                                <a href="/favorites?page=${page + 1}"
                                   class="btn ${page >= total_pages ? 'disabled' : ''}"
                                   ${page >= total_pages ? 'style="pointer-events: none; opacity: 0.5;"' : 'data-link'}>
                                   ${t('pagination.next') || 'Next'} &raquo;
                                </a>
                            </div>
                        `;
					}
				}

				container.innerHTML = `<div class="grid">${cardsHtml}</div>${paginationHtml}`;

				// Attach event listeners after rendering cards
				this.attachEventListeners();
			}
		}
	}

	attachEventListeners() {
		document.querySelectorAll('.favorite-move-top').forEach((btn) => {
			btn.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				const uuid = btn.dataset.uuid;
				await this.moveToTop(uuid);
			});
		});

		document.querySelectorAll('.favorite-remove').forEach((btn) => {
			btn.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				const uuid = btn.dataset.uuid;
				await this.removeFavorite(uuid);
			});
		});
	}

	renderCard(res) {
		const title = stripMarkdown(res.title).substring(0, 50);
		const description = stripMarkdown(res.description || '').substring(0, 80);
		const categoryLabel = t('cats.' + res.category) || res.category;
		const date = new Date(res.created_at * 1000).toLocaleDateString();

		const authorName = res.author_username || 'Unknown';
		const authorAvatar = res.author_avatar || '';
		const avatarImg = authorAvatar
			? `<img src="${authorAvatar}" alt="${authorName}" class="card-author-avatar" onerror="this.style.display='none'">`
			: `<div class="card-author-avatar-placeholder">${authorName.charAt(0).toUpperCase()}</div>`;

		return `
            <div class="card" data-resource-id="${res.resource_uuid}">
                <a href="/item/${res.resource_uuid}" data-link class="card-link">
                    ${
											res.thumbnail_key
												? `
                        <div class="card-image">
                            <img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy">
                            <span class="card-badge">${categoryLabel}</span>
                        </div>
                    `
												: `
                        <div class="card-image card-image-placeholder">
                            <span class="card-badge">${categoryLabel}</span>
                        </div>
                    `
										}
                </a>
                <div class="card-body">
                    <h3>${title}${res.title.length > 50 ? '...' : ''}</h3>
                    <div class="card-meta">
                        <div class="card-author">
                            ${avatarImg}
                            <span>${authorName}</span>
                        </div>
                        <span class="card-date">${date}</span>
                    </div>
                    <p class="card-text">${description}...</p>
                    <div class="card-footer favorite-card-footer">
                        <a href="/item/${res.resource_uuid}" data-link class="btn-favorite-details">${t('card.view')}</a>
                        <div class="favorite-actions">
                            <button class="btn-square favorite-move-top" data-uuid="${res.resource_uuid}">
                                ${t('common.moveToTop')}
                            </button>
                            <button class="btn-square favorite-remove" data-uuid="${res.resource_uuid}">
                                ${t('common.removeFavorite')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
	}

	async moveToTop(uuid) {
		try {
			const response = await fetch('/api/favorites/reorder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resource_uuid: uuid, move_to_top: true }),
			});

			if (response.ok) {
				// Clear cache completely
				DataCache.clear();

				// Fetch fresh data directly without cache
				const urlParams = new URLSearchParams(window.location.search);
				const page = parseInt(urlParams.get('page')) || 1;
				const freshData = await fetch(`/api/favorites?page=${page}`).then((r) => r.json());

				this.renderFavorites(freshData);
			} else {
				const err = await response.json();
				alert('Error: ' + (err.error || 'Unknown error'));
			}
		} catch (err) {
			console.error('Error moving favorite to top:', err);
		}
	}

	async removeFavorite(uuid) {
		if (!confirm(t('common.removeFavorite') + '?')) return;

		try {
			const response = await fetch(`/api/favorites/${uuid}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				// Clear cache completely
				DataCache.clear();

				// Fetch fresh data directly without cache
				const urlParams = new URLSearchParams(window.location.search);
				const page = parseInt(urlParams.get('page')) || 1;
				const freshData = await fetch(`/api/favorites?page=${page}`).then((r) => r.json());

				this.renderFavorites(freshData);
			}
		} catch (err) {
			console.error('Error removing favorite:', err);
		}
	}

	renderFavorites(data) {
		const container = document.getElementById('favorites-resources');
		if (!container) return;

		if (!data.favorites || data.favorites.length === 0) {
			container.innerHTML = `<p class="no-results">${t('common.noFavorites')}</p>`;
			return;
		}

		const cardsHtml = data.favorites.map((res) => this.renderCard(res)).join('');

		let paginationHtml = '';
		if (data.pagination) {
			const { page, total_pages } = data.pagination;

			if (total_pages > 1) {
				paginationHtml = `
					<div class="pagination">
						<a href="/favorites?page=${page - 1}"
						   class="btn ${page <= 1 ? 'disabled' : ''}"
						   ${page <= 1 ? 'style="pointer-events: none; opacity: 0.5;"' : 'data-link'}>
						   &laquo; ${t('pagination.prev') || 'Previous'}
						</a>
						<span class="page-info">${page}</span>
						<a href="/favorites?page=${page + 1}"
						   class="btn ${page >= total_pages ? 'disabled' : ''}"
						   ${page >= total_pages ? 'style="pointer-events: none; opacity: 0.5;"' : 'data-link'}>
						   ${t('pagination.next') || 'Next'} &raquo;
						</a>
					</div>
				`;
			}
		}

		container.innerHTML = `<div class="grid">${cardsHtml}</div>${paginationHtml}`;
		this.attachEventListeners();
	}
}
