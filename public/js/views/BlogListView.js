import { t } from '../i18n.js';
import { navigateTo } from '../router.js';

export default class BlogListView {
	constructor(params) {
		this.params = params;
		this.posts = [];
		this.page = 1;
		this.totalPages = 1;
	}

	async getHtml() {
		return `
			<div class="blog-list-page">
				<div class="category-header">
					<h1>${t('blog.title')}</h1>
					<p class="blog-subtitle">${t('blog.subtitle')}</p>
					${window.appState?.isAdmin ? `<a href="/blog/create" data-link class="btn btn-primary blog-create-btn">✏️ ${t('blog.createPost')}</a>` : ''}
				</div>
				<div id="blog-list-container">
					<p class="loading-text">${t('blog.loading')}</p>
				</div>
				<div id="blog-pagination" class="blog-pagination" style="display:none;"></div>
			</div>
		`;
	}

	async postRender() {
		await this._loadPosts();
	}

	async _loadPosts() {
		const container = document.getElementById('blog-list-container');
		const paginationEl = document.getElementById('blog-pagination');
		container.innerHTML = `<p class="loading-text">${t('blog.loading')}</p>`;

		try {
			const res = await fetch(`/api/blog?page=${this.page}&limit=10`);
			if (!res.ok) throw new Error('Failed to fetch');
			const data = await res.json();

			this.posts = data.data || [];
			this.totalPages = data.pagination?.total_pages || 1;

			if (this.posts.length === 0) {
				container.innerHTML = `<p class="empty-state">${t('blog.noPostsYet')}</p>`;
				paginationEl.style.display = 'none';
				return;
			}

			container.innerHTML = this.posts.map((post) => this._renderCard(post)).join('');

			// Pagination
			if (this.totalPages > 1) {
				paginationEl.style.display = 'flex';
				paginationEl.innerHTML = this._renderPagination();
				this._attachPaginationListeners();
			} else {
				paginationEl.style.display = 'none';
			}

			// Card click navigation
			container.querySelectorAll('.blog-card[data-id]').forEach((card) => {
				card.addEventListener('click', (e) => {
					if (e.target.closest('a')) return; // Let anchor tags handle themselves
					navigateTo(`/blog/${card.dataset.id}`);
				});
			});
		} catch (e) {
			console.error('Blog list error:', e);
			container.innerHTML = `<p class="error-text">${t('common.error')}</p>`;
		}
	}

	_renderCard(post) {
		const date = new Date(post.created_at * 1000).toLocaleDateString();
		const authorName = post.author_display === 'team' ? t('blog.team') : post.author_username;
		const coverHtml = post.cover_image_key
			? `<div class="blog-card-cover"><img src="/api/download/${post.cover_image_key}" alt="${post.title}" loading="lazy" /></div>`
			: `<div class="blog-card-cover blog-card-cover-placeholder"><span></span></div>`;

		return `
			<article class="blog-card" data-id="${post.uuid}" role="button" tabindex="0">
				${coverHtml}
				<div class="blog-card-body">
					<h2 class="blog-card-title">${this._escHtml(post.title)}</h2>
					${post.excerpt ? `<p class="blog-card-excerpt">${this._escHtml(post.excerpt)}</p>` : ''}
					<div class="blog-card-meta">
						<span class="blog-meta-author">${this._escHtml(authorName)}</span>
						|
						<span class="blog-meta-date">${date}</span>
					</div>
					<a href="/blog/${post.uuid}" data-link class="btn btn-outline blog-read-more">${t('blog.readMore')}</a>
				</div>
			</article>
		`;
	}

	_renderPagination() {
		const prev = this.page > 1 ? `<button id="blog-prev" class="btn btn-outline">${t('pagination.prev')}</button>` : '';
		const next = this.page < this.totalPages ? `<button id="blog-next" class="btn btn-outline">${t('pagination.next')}</button>` : '';
		return `${prev}<span class="page-info">${t('pagination.page')} ${this.page} ${t('pagination.of')} ${this.totalPages}</span>${next}`;
	}

	_attachPaginationListeners() {
		document.getElementById('blog-prev')?.addEventListener('click', () => {
			if (this.page > 1) {
				this.page--;
				this._loadPosts();
			}
		});
		document.getElementById('blog-next')?.addEventListener('click', () => {
			if (this.page < this.totalPages) {
				this.page++;
				this._loadPosts();
			}
		});
	}

	_escHtml(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
}
