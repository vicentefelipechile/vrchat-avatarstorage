// =========================================================================
// views/BlogListView.ts — Blog post listing with pagination
// =========================================================================

import { t } from '../i18n';
import type { RouteContext } from '../types';

// =========================================================================
// Types
// =========================================================================

interface BlogPost {
	uuid: string;
	title: string;
	excerpt?: string;
	content: string;
	cover_image_key?: string;
	author_display: 'personal' | 'team';
	author_username?: string;
	created_at: number;
}

interface BlogListResponse {
	data: BlogPost[];
	pagination?: { page: number; total_pages: number };
}

// =========================================================================
// Helpers
// =========================================================================

function esc(str: string): string {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function blogCard(post: BlogPost): string {
	const date = new Date(post.created_at * 1000).toLocaleDateString();
	const authorName = post.author_display === 'team' ? t('blog.team') : (post.author_username ?? '');
	const coverHtml = post.cover_image_key
		? `<div class="blog-card-cover"><img src="/api/download/${post.cover_image_key}" alt="${esc(post.title)}" loading="lazy"></div>`
		: '';

	return `
		<a class="blog-card" href="/blog/${post.uuid}" data-link>
			${coverHtml}
			<div class="blog-card-body">
				<h2 class="blog-card-title">${esc(post.title)}</h2>
				${post.excerpt ? `<p class="blog-card-excerpt">${esc(post.excerpt)}</p>` : ''}
				<div class="blog-card-meta">
					<span class="blog-meta-author">${esc(authorName)}</span>
					<span class="blog-meta-sep">|</span>
					<span class="blog-meta-date">${date}</span>
				</div>
			</div>
		</a>`;
}

// =========================================================================
// View
// =========================================================================

export async function blogListView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('blog.title')}`;

	let posts: BlogPost[] = [];
	let pagination: BlogListResponse['pagination'];

	try {
		const res = await fetch('/api/blog?page=1&limit=10');
		if (!res.ok) throw new Error();
		const data = await res.json() as BlogListResponse;
		posts = data.data ?? [];
		pagination = data.pagination;
	} catch {
		return `<p class="error-text">${t('common.error')}</p>`;
	}

	const { isAdmin } = window.appState;

	return `
		<div class="blog-list-page">
			<div class="category-header">
				<h1>${t('blog.title')}</h1>
				<p class="blog-subtitle">${t('blog.subtitle')}</p>
				${isAdmin ? `<a href="/blog/create" data-link class="btn btn-primary blog-create-btn">✏️ ${t('blog.createPost')}</a>` : ''}
			</div>

			<div id="blog-list-container">
				${posts.length === 0
					? `<p class="empty-state">${t('blog.noPostsYet')}</p>`
					: posts.map(blogCard).join('')}
			</div>

			${pagination && pagination.total_pages > 1 ? `
				<div id="blog-pagination" class="blog-pagination" style="display:flex">
					${pagination.page > 1 ? `<button id="blog-prev" class="btn btn-outline">${t('pagination.prev')}</button>` : ''}
					<span class="page-info">${t('pagination.page')} ${pagination.page} ${t('pagination.of')} ${pagination.total_pages}</span>
					${pagination.page < pagination.total_pages ? `<button id="blog-next" class="btn btn-outline">${t('pagination.next')}</button>` : ''}
				</div>
			` : ''}
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export function blogListAfter(_ctx: RouteContext): void {
	// Pagination (simple: reload page via navigate)
	let page = 1;

	const loadPage = async (newPage: number) => {
		page = newPage;
		const container = document.getElementById('blog-list-container')!;
		const paginationEl = document.getElementById('blog-pagination');

		container.innerHTML = `<p class="loading-text">${t('blog.loading')}</p>`;

		try {
			const res = await fetch(`/api/blog?page=${page}&limit=10`);
			const data = await res.json() as BlogListResponse;
			const posts = data.data ?? [];

			container.innerHTML = posts.length === 0
				? `<p class="empty-state">${t('blog.noPostsYet')}</p>`
				: posts.map(blogCard).join('');

			// Update pagination
			if (paginationEl && data.pagination) {
				const { page: p, total_pages: total } = data.pagination;
				paginationEl.innerHTML = `
					${p > 1 ? `<button id="blog-prev" class="btn btn-outline">${t('pagination.prev')}</button>` : ''}
					<span class="page-info">${t('pagination.page')} ${p} ${t('pagination.of')} ${total}</span>
					${p < total ? `<button id="blog-next" class="btn btn-outline">${t('pagination.next')}</button>` : ''}
				`;
				attachPaginationButtons(loadPage, page, data.pagination.total_pages);
			}
		} catch {
			container.innerHTML = `<p class="error-text">${t('common.error')}</p>`;
		}
	};

	attachPaginationButtons(loadPage, page, Infinity);
}

function attachPaginationButtons(
	loadPage: (p: number) => Promise<void>,
	currentPage: number,
	totalPages: number,
): void {
	document.getElementById('blog-prev')?.addEventListener('click', () => {
		if (currentPage > 1) loadPage(currentPage - 1);
	});
	document.getElementById('blog-next')?.addEventListener('click', () => {
		if (currentPage < totalPages) loadPage(currentPage + 1);
	});
}
