// =========================================================================
// views/FavoritesView.ts — Saved resources with reorder and remove
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { stripMarkdown } from '../utils';
import type { RouteContext } from '../types';

// =========================================================================
// Types
// =========================================================================

interface Favorite {
	uuid: string;
	thumbnail_key?: string;
	thumbnail_uuid?: string;
	title: string;
	description?: string;
	category: string;
	download_count: number;
	created_at: number; // already in ms from backend (created_at * 1000)
}

interface FavoritesResponse {
	favorites: Favorite[];
	pagination?: { page: number; total_pages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

// =========================================================================
// Helpers
// =========================================================================

function favoriteCard(fav: Favorite): string {
	const title = stripMarkdown(fav.title).substring(0, 50);
	const description = stripMarkdown(fav.description ?? '').substring(0, 80);
	const cleanDescription = description.split('--- Avatar Details')[0];
	const categoryLabel = t('cats.' + fav.category) || fav.category;
	const date = new Date(fav.created_at).toLocaleDateString();
	const downloads = fav.download_count || 0;

	return `
		<div class="card" data-resource-id="${fav.uuid}">
			<a href="/item/${fav.uuid}" data-link class="card-link">
				${
					fav.thumbnail_key
						? `<div class="card-image">
						<img src="/api/download/${fav.thumbnail_key}" alt="${title}" loading="lazy">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
						: `<div class="card-image card-image-placeholder">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
				}
			</a>
			<div class="card-body">
				<h3>${title}${fav.title.length > 50 ? '…' : ''}</h3>
				<div class="card-meta">
					<span>${date}</span>
					<div class="card-stats">
						<span>📥 ${downloads}</span>
					</div>
				</div>
				<p class="card-description">${cleanDescription}${cleanDescription.length >= 80 ? '...' : ''}</p>
				<div class="card-footer favorite-card-footer">
					<a href="/item/${fav.uuid}" data-link class="btn">${t('card.view')}</a>
					<div class="favorite-actions">
						<button class="btn-square favorite-move-top" data-uuid="${fav.uuid}">
							${t('common.moveToTop')}
						</button>
						<button class="btn-square favorite-remove" data-uuid="${fav.uuid}">
							${t('common.removeFavorite')}
						</button>
					</div>
				</div>
			</div>
		</div>`;
}

function paginationHtml(currentPage: number, totalPages: number): string {
	if (totalPages <= 1) return '';
	return `
		<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			<a href="/favorites?page=${currentPage - 1}" data-link
				class="btn${currentPage <= 1 ? ' disabled' : ''}"
				${currentPage <= 1 ? 'style="pointer-events:none;opacity:0.5"' : ''}>
				${t('pagination.prev')}
			</a>
			<span style="align-self:center;">${t('pagination.page')} ${currentPage}</span>
			<a href="/favorites?page=${currentPage + 1}" data-link
				class="btn${currentPage >= totalPages ? ' disabled' : ''}"
				${currentPage >= totalPages ? 'style="pointer-events:none;opacity:0.5"' : ''}>
				${t('pagination.next')}
			</a>
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function favoritesView(ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('nav.favorites')}`;

	const page = parseInt(ctx.query.get('page') ?? '1', 10);
	let data: FavoritesResponse = { favorites: [] };

	try {
		data = (await DataCache.fetch(`/api/favorites?page=${page}&_=${Date.now()}`, 0)) as FavoritesResponse;
	} catch {
		/* show empty */
	}

	const favs = data.favorites ?? [];

	return `
		<div class="page-header">
			<h1>${t('nav.favorites')}</h1>
		</div>

		${
			favs.length === 0
				? `<p class="empty-message">${t('common.noFavorites')}</p>`
				: `<div id="favorites-grid" class="grid">${favs.map(favoriteCard).join('')}</div>`
		}

		${data.pagination ? paginationHtml(data.pagination.page, data.pagination.total_pages) : ''}`;
}

// =========================================================================
// After
// =========================================================================

export function favoritesAfter(_ctx: RouteContext): void {
	// Move to top
	document.querySelectorAll<HTMLButtonElement>('.favorite-move-top').forEach((btn) => {
		btn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();

			const uuid = btn.dataset.uuid!;
			const card = document.querySelector<HTMLElement>(`.card[data-resource-id="${uuid}"]`);
			const grid = document.getElementById('favorites-grid');
			if (card && grid) grid.insertBefore(card, grid.firstChild);

			try {
				await fetch('/api/favorites/reorder', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ resource_uuid: uuid, move_to_top: true }),
				});
				DataCache.clear('/api/favorites');
			} catch {
				/* ignore */
			}
		});
	});

	// Remove from favorites
	document.querySelectorAll<HTMLButtonElement>('.favorite-remove').forEach((btn) => {
		btn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();

			if (!confirm(t('common.removeFavorite') + '?')) return;

			const uuid = btn.dataset.uuid!;
			const card = document.querySelector<HTMLElement>(`.card[data-resource-id="${uuid}"]`);
			card?.remove();

			const remaining = document.querySelectorAll('#favorites-grid .card');
			if (remaining.length === 0) {
				const grid = document.getElementById('favorites-grid');
				if (grid) grid.outerHTML = `<p class="empty-message">${t('common.noFavorites')}</p>`;
			}

			try {
				await fetch(`/api/favorites/${uuid}`, { method: 'DELETE' });
				DataCache.clear('/api/favorites');
			} catch {
				/* ignore */
			}
		});
	});
}
