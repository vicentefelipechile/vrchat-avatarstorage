// =========================================================================
// views/BlogPostView.ts — Blog post reader with comments
// =========================================================================

import { t } from '../i18n';
import { navigateTo } from '../router';
import { renderMarkdown, showToast } from '../utils';
import { commentEditorHtml, initCommentEditor } from '../comment-editor';
import type { RouteContext } from '../types';

// =========================================================================
// Types
// =========================================================================

interface BlogPost {
	uuid: string;
	title: string;
	content: string;
	excerpt?: string;
	cover_image_key?: string;
	author_display: 'personal' | 'team';
	author_username?: string;
	created_at: number;
}

interface BlogComment {
	uuid: string;
	author: string;
	author_avatar?: string;
	timestamp: number;
	text: string;
}

// =========================================================================
// Helpers
// =========================================================================

function esc(str: string): string {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function commentCard(c: BlogComment): string {
	const { isAdmin, user } = window.appState;
	const canDelete = isAdmin || user?.username === c.author;
	return `
		<div class="comment-card" data-uuid="${c.uuid}">
			<div class="comment-header">
				${c.author_avatar ? `<img src="${c.author_avatar}" class="comment-avatar" alt="">` : '<span class="comment-avatar-placeholder">👤</span>'}
				<strong class="comment-author">${esc(c.author)}</strong>
				<span class="comment-date">${new Date(c.timestamp).toLocaleDateString()}</span>
				${canDelete ? `<button class="btn-icon delete-comment-btn" data-uuid="${c.uuid}" title="${t('admin.delete')}">🗑️</button>` : ''}
			</div>
			<p class="comment-text">${esc(c.text)}</p>
		</div>`;
}

async function loadComments(postId: string): Promise<void> {
	const list = document.getElementById('blog-comments-list')!;
	list.innerHTML = `<p class="loading-text">${t('common.loadingComments')}</p>`;

	try {
		const comments = (await fetch(`/api/blog/${postId}/comments`).then((r) => r.json())) as BlogComment[];

		if (!comments?.length) {
			list.innerHTML = `<p class="empty-state">${t('blog.noComments')}</p>`;
			return;
		}

		list.innerHTML = comments.map(commentCard).join('');

		list.querySelectorAll<HTMLButtonElement>('.delete-comment-btn').forEach((btn) => {
			btn.addEventListener('click', async () => {
				if (!confirm(t('admin.deleteConfirm'))) return;
				const res = await fetch(`/api/blog/comments/${btn.dataset.uuid}`, { method: 'DELETE' });
				if (res.ok) await loadComments(postId);
				else showToast(t('common.error'), 'error');
			});
		});
	} catch {
		list.innerHTML = `<p class="error-text">${t('item.errorLoadingComments')}</p>`;
	}
}

// =========================================================================
// View
// =========================================================================

export async function blogPostView(ctx: RouteContext): Promise<string> {
	const id = ctx.params.id;

	let post: BlogPost;
	try {
		const res = await fetch(`/api/blog/${id}`);
		if (res.status === 404) return `<p class="error-text">${t('blog.notFound')}</p>`;
		if (!res.ok) throw new Error();
		post = (await res.json()) as BlogPost;
	} catch {
		return `<p class="error-text">${t('common.error')}</p>`;
	}

	document.title = `VRCStorage — ${post.title}`;

	const date = new Date(post.created_at).toLocaleDateString();
	const authorName = post.author_display === 'team' ? t('blog.team') : (post.author_username ?? '');
	const { isAdmin } = window.appState;

	const coverHtml = post.cover_image_key
		? `<div class="blog-post-cover"><img src="/api/download/${post.cover_image_key}" alt="${esc(post.title)}"></div>`
		: '';

	const adminActions = isAdmin
		? `<div class="blog-admin-actions">
			<a href="/blog/${post.uuid}/edit" data-link class="btn btn-outline">✏️ ${t('blog.editPost')}</a>
			<button id="blog-delete-btn" class="btn btn-danger">🗑️ ${t('blog.deletePost')}</button>
		</div>`
		: '';

	const commentFormHtml = window.appState.isLoggedIn
		? commentEditorHtml({
				formId: 'blog-comment-form',
				textareaId: 'blog-comment-text',
				turnstileId: 'blog-turnstile-container',
				placeholder: t('blog.commentPlaceholder'),
			})
		: `<p class="login-prompt"><a href="/login" data-link>${t('blog.loginToComment')}</a></p>`;

	return `
		<div class="blog-post-page">
			<article class="blog-post-article">
				${adminActions}
				${coverHtml}
				<header class="blog-post-header">
					<h1 class="blog-post-title">${esc(post.title)}</h1>
					<div class="blog-post-meta">
						<span>👤 <strong>${esc(authorName)}</strong></span>
						<span>📅 ${date}</span>
					</div>
				</header>
				<div class="blog-post-content markdown-body" id="blog-content"></div>
			</article>

			<section class="blog-comments-section">
				<h2>${t('blog.comments')}</h2>
				<div id="blog-comments-list"></div>
				<div id="blog-comment-form-wrapper">${commentFormHtml}</div>
			</section>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function blogPostAfter(ctx: RouteContext): Promise<void> {
	const id = ctx.params.id;

	// Render markdown content into the pre-rendered container
	const contentEl = document.getElementById('blog-content');
	if (contentEl) {
		try {
			const res = await fetch(`/api/blog/${id}`);
			const post = (await res.json()) as BlogPost;
			renderMarkdown(contentEl, post.content);
		} catch {
			/* ignore — content already shown */
		}
	}

	// Delete button
	document.getElementById('blog-delete-btn')?.addEventListener('click', async () => {
		if (!confirm(t('blog.deleteConfirm'))) return;
		const res = await fetch(`/api/blog/${id}`, { method: 'DELETE' });
		if (res.ok) navigateTo('/blog');
		else showToast(t('common.error'), 'error');
	});

	// Load comments
	await loadComments(id);

	// Comment form
	initCommentEditor({
		formId: 'blog-comment-form',
		textareaId: 'blog-comment-text',
		turnstileId: 'blog-turnstile-container',
		onSubmit: async (text, token) => {
			const res = await fetch(`/api/blog/${id}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, token }),
			});
			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				throw new Error(err.error ?? t('common.error'));
			}
		},
		onSuccess: async () => {
			await loadComments(id);
		},
	});
}
