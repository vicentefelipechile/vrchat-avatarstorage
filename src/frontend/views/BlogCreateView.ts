// =========================================================================
// views/BlogCreateView.ts — Create / edit a blog post (admin only)
// =========================================================================

import { t } from '../i18n';
import { navigateTo } from '../router';
import { renderMarkdown, showToast } from '../utils';
import { markdownToolbarHtml, initMarkdownToolbar } from '../comment-editor';
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
	cover_image_uuid?: string;
	author_display: 'personal' | 'team';
	slug?: string;
}

// =========================================================================
// Helpers
// =========================================================================

function esc(str: string): string {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str: string): string {
	return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slugify(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 100);
}

function formHtml(editId: string | null, post: BlogPost | null): string {
	const p = post;
	const pageTitle = editId ? t('blog.editPost') : t('blog.createPost');
	const backHref = editId ? `/blog/${editId}` : '/blog';

	return `
		<div class="blog-create-header">
			<h1>${pageTitle}</h1>
			<a href="${backHref}" data-link class="btn btn-outline">← ${t('pagination.prev')}</a>
		</div>

		<form id="blog-create-form" class="blog-create-form">
			<div class="form-group">
				<label for="blog-title">${t('blog.titleLabel')} *</label>
				<input type="text" id="blog-title" class="form-input" maxlength="200" required
					value="${p ? escAttr(p.title) : ''}" placeholder="Mi nuevo artículo…">
			</div>

			<div class="form-group">
				<label>Slug (URL)</label>
				<input type="text" id="blog-slug-preview" class="form-input" readonly
					value="${p ? escAttr(p.slug ?? '') : ''}" style="opacity:0.6">
				<small>Se genera automáticamente del título</small>
			</div>

			<div class="form-group">
				<label for="blog-excerpt">${t('blog.excerptLabel')}</label>
				<textarea id="blog-excerpt" class="form-input" rows="2" maxlength="500"
					placeholder="Resumen breve del artículo…">${p ? esc(p.excerpt ?? '') : ''}</textarea>
			</div>

			<div class="form-group">
				<label>${t('blog.coverImageLabel')}</label>
				${p?.cover_image_key ? `<div class="current-cover"><img src="/api/download/${p.cover_image_key}" alt="cover" style="max-height:120px;border-radius:8px"></div>` : ''}
				<input type="file" id="blog-cover-file" accept="image/*" class="form-input">
				<input type="hidden" id="blog-cover-uuid" value="${p?.cover_image_uuid ?? ''}">
			</div>

			<div class="form-group">
				<label>${t('blog.authorDisplayLabel')}</label>
				<div class="toggle-group toggle-group-col">
					<label class="toggle-option">
						<input type="radio" name="author_display" value="personal" ${!p || p.author_display === 'personal' ? 'checked' : ''}>
						<span>${t('blog.authorPersonal')} (${window.appState.user?.username ?? 'admin'})</span>
					</label>
					<label class="toggle-option">
						<input type="radio" name="author_display" value="team" ${p?.author_display === 'team' ? 'checked' : ''}>
						<span>🌐 ${t('blog.authorTeam')}</span>
					</label>
				</div>
			</div>

			<div class="form-group blog-editor-group">
				<label for="blog-content">${t('blog.contentLabel')} *</label>
				<div class="blog-editor-split">
					<div class="comment-editor">
						${markdownToolbarHtml()}
						<textarea id="blog-content" class="form-input blog-content-textarea"
							placeholder="## Mi artículo\n\nEscribe en **Markdown**…">${p ? esc(p.content) : ''}</textarea>
					</div>
					<div id="editor-preview-panel" class="markdown-body blog-preview-panel"></div>
				</div>
			</div>

			<div id="blog-create-error" class="error-box" style="display:none"></div>
			<div class="blog-create-actions">
				<button type="submit" id="blog-submit-btn" class="btn btn-primary">${t('blog.savePost')}</button>
			</div>
		</form>`;
}

// =========================================================================
// View
// =========================================================================

export async function blogCreateView(ctx: RouteContext): Promise<string> {
	const editId = ctx.params.id ?? null;
	document.title = `VRCStorage — ${editId ? t('blog.editPost') : t('blog.createPost')}`;

	if (!window.appState.isAdmin) {
		navigateTo('/');
		return '';
	}

	return `<div class="blog-create-page"><div id="blog-create-container"><p>${t('common.loading')}</p></div></div>`;
}

// =========================================================================
// After
// =========================================================================

export async function blogCreateAfter(ctx: RouteContext): Promise<void> {
	if (!window.appState.isAdmin) return;

	const editId = ctx.params.id ?? null;
	const container = document.getElementById('blog-create-container')!;

	let existingPost: BlogPost | null = null;
	let uploadingCover = false;

	if (editId) {
		try {
			const res = await fetch(`/api/blog/${editId}`);
			if (!res.ok) throw new Error('Not found');
			existingPost = await res.json() as BlogPost;
		} catch {
			container.innerHTML = `<p class="error-text">${t('blog.notFound')}</p>`;
			return;
		}
	}

	container.innerHTML = formHtml(editId, existingPost);

	// Slug auto-generation
	const titleInput = document.getElementById('blog-title') as HTMLInputElement;
	const slugPreview = document.getElementById('blog-slug-preview') as HTMLInputElement;
	titleInput.addEventListener('input', () => { slugPreview.value = slugify(titleInput.value); });

	// Live markdown preview (split view)
	const contentTextarea = document.getElementById('blog-content') as HTMLTextAreaElement;
	const previewEl = document.getElementById('editor-preview-panel')!;
	const updatePreview = () => renderMarkdown(previewEl, contentTextarea.value);
	contentTextarea.addEventListener('input', updatePreview);
	updatePreview(); // render initial content (edit mode)

	// Markdown toolbar for content editor
	initMarkdownToolbar(contentTextarea);

	// Cover image upload
	document.getElementById('blog-cover-file')!.addEventListener('change', async (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		uploadingCover = true;
		const dismissToast = showToast('Subiendo imagen…', 'info', 0);
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/upload', { method: 'PUT', body: fd });
			if (!res.ok) throw new Error();
			const data = await res.json() as { media_uuid?: string };
			const newUuid = data.media_uuid ?? '';
			(document.getElementById('blog-cover-uuid') as HTMLInputElement).value = newUuid;
			console.log('[blog] cover uploaded, media_uuid =', newUuid);
			dismissToast();
			showToast('Imagen subida correctamente', 'success');
		} catch {
			dismissToast();
			showToast(t('upload.error'), 'error');
		} finally {
			uploadingCover = false;
		}
	});

	// Form submit
	document.getElementById('blog-create-form')!.addEventListener('submit', async (e) => {
		e.preventDefault();

		if (uploadingCover) {
			showError('Espera a que termine de subir la imagen.');
			return;
		}

		const title = (document.getElementById('blog-title') as HTMLInputElement).value.trim();
		const content = (document.getElementById('blog-content') as HTMLTextAreaElement).value.trim();
		const excerpt = (document.getElementById('blog-excerpt') as HTMLTextAreaElement).value.trim() || null;
		const cover_image_uuid = (document.getElementById('blog-cover-uuid') as HTMLInputElement).value || null;
		const author_display = (document.querySelector<HTMLInputElement>('input[name="author_display"]:checked'))?.value ?? 'personal';

		console.log('[blog] submit — editId:', editId, 'cover_image_uuid:', cover_image_uuid);

		if (!title || !content) return;

		const btn = document.getElementById('blog-submit-btn') as HTMLButtonElement;
		const restore = () => { btn.disabled = false; btn.textContent = t('blog.savePost'); };

		btn.disabled = true;
		btn.textContent = t('item.sending');
		showError('', false);

		try {
			const res = await fetch(editId ? `/api/blog/${editId}` : '/api/blog', {
				method: editId ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content, excerpt, cover_image_uuid, author_display }),
			});
			const data = await res.json() as { uuid?: string; error?: string };

			if (!res.ok) { showError(data.error ?? t('common.error')); restore(); return; }

			navigateTo(`/blog/${editId ?? data.uuid}`);
		} catch {
			showError(t('common.error'));
			restore();
		}
	});
}

function showError(msg: string, visible = true): void {
	const el = document.getElementById('blog-create-error');
	if (!el) return;
	el.style.display = visible ? 'block' : 'none';
	el.textContent = msg;
}
