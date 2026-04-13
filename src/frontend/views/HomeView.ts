// =========================================================================
// views/HomeView.ts — Homepage: latest resources grid
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
				${
					res.thumbnail_key
						? `<div class="card-image">
						<img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
						: `<div class="card-image card-image-placeholder">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
				}
			</a>
			<div class="card-body">
				<h3>${title}${res.title.length > 50 ? '...' : ''}</h3>
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

// =========================================================================
// View
// =========================================================================

export async function homeView(_ctx: RouteContext): Promise<string> {
	document.title = 'VRCStorage';

	const apiCategories = ['avatars', 'assets', 'clothes'];

	let resources: Resource[] = [];
	try {
		resources = (await DataCache.fetch('/api/resources/latest', { ttl: 60_000 })) as Resource[];
	} catch {
		/* show empty grid */
	}

	const categoriesHtml = apiCategories
		.map((cat) => `<a href="/${cat}" data-link class="category-btn">${t('cats.' + cat)}</a>`)
		.join('');

	return `
		<section class="hero-section">
			<h1>${t('home.welcome')}</h1>
			<p>${t('home.browse')}</p>
			<div class="category-nav">${categoriesHtml}</div>
		</section>
		<section class="latest-section">
			<h2>${t('home.latest')}</h2>
			${
				resources.length === 0
					? `<p class="empty-message">${t('common.noResourcesFound') || 'No resources found.'}</p>`
					: `<div class="grid">${resources.map(resourceCard).join('')}</div>`
			}
		</section>`;
}

// =========================================================================
// After
// =========================================================================

export function homeAfter(_ctx: RouteContext): void {
	// No interactive elements in the home view
}
