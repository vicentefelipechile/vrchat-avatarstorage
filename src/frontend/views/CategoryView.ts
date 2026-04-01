// =========================================================================
// views/CategoryView.ts — Resource listing by category with pagination
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { stripMarkdown } from '../utils';
import type { RouteContext, Resource } from '../types';

// =========================================================================
// Helpers
// =========================================================================

function resourceCard(res: Resource): string {
	const title = stripMarkdown(res.title).substring(0, 50);
	const description = stripMarkdown(res.description || '').substring(0, 80);
	const categoryLabel = t('cats.' + res.category) || res.category;
	const date = new Date(res.created_at).toLocaleDateString();
	const downloads = res.download_count || 0;
	const cleanDescription = description.split('--- Avatar Details')[0];

	return `
		<div class="card">
			<a href="/item/${res.uuid}" data-link class="card-link">
				${res.thumbnail_key
			? `<div class="card-image">
						<img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
			: `<div class="card-image card-image-placeholder">
						<span class="card-badge">${categoryLabel}</span>
					</div>`}
			</a>
			<div class="card-body">
				<h3>${title}${res.title.length > 50 ? '…' : ''}</h3>
				<div class="card-meta">
					<span>${date}</span>
					<div class="card-stats">
						<span>📥 ${downloads}</span>
					</div>
				</div>
				<p class="card-description">${cleanDescription}${cleanDescription.length >= 80 ? '...' : ''}</p>
				<div class="card-footer">
					<a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
				</div>
			</div>
		</div>`;
}

function paginationControls(category: string, page: number, hasMore: boolean, query?: string | null): string {
	const base = query ? `/category/${category}?q=${encodeURIComponent(query)}` : `/category/${category}`;
	const sep = query ? '&' : '?';

	return `
		<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			${page > 1
			? `<a href="${base}${sep}page=${page - 1}" data-link class="btn">${t('pagination.prev')}</a>`
			: ''}
			<span style="align-self:center;">${t('pagination.page')} ${page}</span>
			${hasMore
			? `<a href="${base}${sep}page=${page + 1}" data-link class="btn">${t('pagination.next')}</a>`
			: ''}
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function categoryView(ctx: RouteContext): Promise<string> {
	const category = ctx.params.category ?? 'all';
	const page = parseInt(ctx.query.get('page') ?? '1', 10);
	const searchQuery = ctx.query.get('q') ?? '';

	const categoryLabel = t('cats.' + category) || category;
	document.title = `VRCStorage — ${categoryLabel}`;

	const cacheKey = `/api/resources?category=${category}&page=${page}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`;
	let resources: Resource[] = [];
	let hasMore = false;

	try {
		const data = (await DataCache.fetch(cacheKey, { ttl: 60_000, persistent: true })) as {
			resources: Resource[];
			pagination: { page: number; hasNextPage: boolean; hasPrevPage: boolean };
		};
		resources = data.resources ?? [];
		hasMore = data.pagination?.hasNextPage ?? false;
	} catch {
		return `
			<div class="category-header">
				<h1>${categoryLabel}</h1>
			</div>
			<p class="error-message">${t('common.loadError')}</p>`;
	}

	const categoryDesc = t('cats.desc.' + category) || '';

	return `
		<div class="category-header">
			<h1>${categoryLabel}</h1>
			${categoryDesc ? `<p class="category-description">${categoryDesc}</p>` : ''}
			${searchQuery ? `<p class="category-description">${t('category.showing') || 'Resultados para'} "<strong>${searchQuery}</strong>"</p>` : ''}
		</div>

		${resources.length === 0
			? `<p class="empty-message">${t('common.noResourcesFound')}</p>`
			: `<div class="grid">${resources.map(resourceCard).join('')}</div>`}

		${paginationControls(category, page, hasMore, searchQuery || null)}`;
}
