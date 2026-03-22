import { t } from '../i18n.js';
import { navigateTo } from '../router.js';

export default class BlogPostView {
	constructor(params) {
		this.params = params;
		this.postId = params.id;
		this.post = null;
		this.turnstileWidget = null;
	}

	async getHtml() {
		return `
			<div class="blog-post-page">
				<div id="blog-post-container">
					<p class="loading-text">${t('common.loading')}</p>
				</div>
				<section id="blog-comments-section" class="blog-comments-section" style="display:none;">
					<h2>${t('blog.comments')}</h2>
					<div id="blog-comments-list"></div>
					<div id="blog-comment-form-wrapper"></div>
				</section>
			</div>
		`;
	}

	async postRender() {
		await this._loadPost();
	}

	async _loadPost() {
		const container = document.getElementById('blog-post-container');

		try {
			const res = await fetch(`/api/blog/${this.postId}`);
			if (res.status === 404) {
				container.innerHTML = `<p class="error-text">${t('blog.notFound')}</p>`;
				return;
			}
			if (!res.ok) throw new Error('Failed');
			this.post = await res.json();

			const date = new Date(this.post.created_at * 1000).toLocaleDateString();
			const authorName = this.post.author_display === 'team' ? t('blog.team') : this.post.author_username;
			const isAdmin = window.appState?.isAdmin;
			const coverHtml = this.post.cover_image_key
				? `<div class="blog-post-cover"><img src="/api/download/${this.post.cover_image_key}" alt="${this._escHtml(this.post.title)}" /></div>`
				: '';

			const adminActions = isAdmin
				? `<div class="blog-admin-actions">
						<a href="/blog/${this.post.uuid}/edit" data-link class="btn btn-outline">✏️ ${t('blog.editPost')}</a>
						<button id="blog-delete-btn" class="btn btn-danger">🗑️ ${t('blog.deletePost')}</button>
					</div>`
				: '';

			container.innerHTML = `
				<article class="blog-post-article">
					${adminActions}
					${coverHtml}
					<header class="blog-post-header">
						<h1 class="blog-post-title">${this._escHtml(this.post.title)}</h1>
						<div class="blog-post-meta">
							<span>👤 <strong>${this._escHtml(authorName)}</strong></span>
							<span>📅 ${date}</span>
						</div>
					</header>
					<div class="blog-post-content markdown-body" id="blog-content"></div>
				</article>
			`;

			// Render Markdown
			const contentEl = document.getElementById('blog-content');
			if (window.marked && window.DOMPurify) {
				contentEl.innerHTML = window.DOMPurify.sanitize(window.marked.parse(this.post.content));
			} else {
				contentEl.textContent = this.post.content;
			}

			// Admin delete
			document.getElementById('blog-delete-btn')?.addEventListener('click', () => this._deletePost());

			// Load comments
			const commentsSection = document.getElementById('blog-comments-section');
			commentsSection.style.display = 'block';
			await this._loadComments();
			this._renderCommentForm();
		} catch (e) {
			console.error('Blog post load error:', e);
			container.innerHTML = `<p class="error-text">${t('common.error')}</p>`;
		}
	}

	async _deletePost() {
		if (!confirm(t('blog.deleteConfirm'))) return;
		try {
			const res = await fetch(`/api/blog/${this.postId}`, { method: 'DELETE' });
			if (res.ok) {
				navigateTo('/blog');
			} else {
				alert(t('common.error'));
			}
		} catch {
			alert(t('common.error'));
		}
	}

	async _loadComments() {
		const list = document.getElementById('blog-comments-list');
		list.innerHTML = `<p class="loading-text">${t('common.loadingComments')}</p>`;

		try {
			const res = await fetch(`/api/blog/${this.postId}/comments`);
			const comments = await res.json();

			if (!comments || comments.length === 0) {
				list.innerHTML = `<p class="empty-state">${t('blog.noComments')}</p>`;
				return;
			}

			list.innerHTML = comments
				.map(
					(c) => `
				<div class="comment-card" data-uuid="${c.uuid}">
					<div class="comment-header">
						${c.author_avatar ? `<img src="${c.author_avatar}" class="comment-avatar" alt="" />` : '<span class="comment-avatar-placeholder">👤</span>'}
						<strong class="comment-author">${this._escHtml(c.author)}</strong>
						<span class="comment-date">${new Date(c.timestamp).toLocaleDateString()}</span>
						${window.appState?.isLoggedIn && (window.appState?.isAdmin || window.appState?.username === c.author) ? `<button class="btn-icon delete-comment-btn" data-uuid="${c.uuid}" title="${t('admin.delete')}">🗑️</button>` : ''}
					</div>
					<p class="comment-text">${this._escHtml(c.text)}</p>
				</div>
			`,
				)
				.join('');

			list.querySelectorAll('.delete-comment-btn').forEach((btn) => {
				btn.addEventListener('click', () => this._deleteComment(btn.dataset.uuid));
			});
		} catch (e) {
			list.innerHTML = `<p class="error-text">${t('item.errorLoadingComments')}</p>`;
		}
	}

	_renderCommentForm() {
		const wrapper = document.getElementById('blog-comment-form-wrapper');
		if (!window.appState?.isLoggedIn) {
			wrapper.innerHTML = `<p class="login-prompt"><a href="/login" data-link>${t('blog.loginToComment')}</a></p>`;
			return;
		}

		wrapper.innerHTML = `
			<form id="blog-comment-form" class="comment-form">
				<textarea id="blog-comment-text" placeholder="${t('blog.commentPlaceholder')}" rows="3" maxlength="1000" required></textarea>
				<div id="blog-turnstile-container" class="turnstile-container"></div>
				<button type="submit" id="blog-comment-submit" class="btn btn-primary">${t('item.send')}</button>
			</form>
		`;

		// Render Turnstile
		if (window.turnstile) {
			this.turnstileWidget = window.turnstile.render('#blog-turnstile-container', {
				sitekey: window.appConfig?.TURNSTILE_SITE_KEY || '0x4AAAAAAA',
				theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
			});
		}

		document.getElementById('blog-comment-form').addEventListener('submit', async (e) => {
			e.preventDefault();
			await this._submitComment();
		});
	}

	async _submitComment() {
		const text = document.getElementById('blog-comment-text').value.trim();
		if (!text) return;

		const submitBtn = document.getElementById('blog-comment-submit');
		submitBtn.disabled = true;
		submitBtn.textContent = t('item.sending');

		const token = this.turnstileWidget !== null && window.turnstile ? window.turnstile.getResponse(this.turnstileWidget) : '';

		try {
			const res = await fetch(`/api/blog/${this.postId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, token }),
			});

			if (res.ok) {
				document.getElementById('blog-comment-text').value = '';
				if (window.turnstile && this.turnstileWidget !== null) window.turnstile.reset(this.turnstileWidget);
				await this._loadComments();
			} else {
				const err = await res.json();
				alert(err.error || t('common.error'));
			}
		} catch {
			alert(t('common.error'));
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = t('item.send');
		}
	}

	async _deleteComment(uuid) {
		if (!confirm(t('admin.deleteConfirm'))) return;
		try {
			const res = await fetch(`/api/blog/comments/${uuid}`, { method: 'DELETE' });
			if (res.ok) {
				await this._loadComments();
			} else {
				alert(t('common.error'));
			}
		} catch {
			alert(t('common.error'));
		}
	}

	_escHtml(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
}
