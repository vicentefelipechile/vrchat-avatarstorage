import { t } from '../i18n.js';
import { navigateTo } from '../router.js';

export default class BlogCreateView {
	constructor(params) {
		this.params = params;
		// ID is present when editing an existing post
		this.editId = params.id || null;
		this.existingPost = null;
	}

	async getHtml() {
		return `
			<div class="blog-create-page">
				<div id="blog-create-container">
					<p class="loading-text">${t('common.loading')}</p>
				</div>
			</div>
		`;
	}

	async postRender() {
		// Redirect non-admins
		if (!window.appState?.isAdmin) {
			navigateTo('/');
			return;
		}

		if (this.editId) {
			await this._loadExistingPost();
		} else {
			this._renderForm();
		}
	}

	async _loadExistingPost() {
		try {
			const res = await fetch(`/api/blog/${this.editId}`);
			if (!res.ok) throw new Error('Not found');
			this.existingPost = await res.json();
			this._renderForm();
		} catch {
			document.getElementById('blog-create-container').innerHTML = `<p class="error-text">${t('blog.notFound')}</p>`;
		}
	}

	_renderForm() {
		const p = this.existingPost;
		const container = document.getElementById('blog-create-container');
		const pageTitle = this.editId ? t('blog.editPost') : t('blog.createPost');

		container.innerHTML = `
			<div class="blog-create-header">
				<h1>${pageTitle}</h1>
				<a href="${this.editId ? `/blog/${this.editId}` : '/blog'}" data-link class="btn btn-outline">← ${t('item.history').includes('History') ? 'Back' : t('pagination.prev')}</a>
			</div>
			<form id="blog-create-form" class="blog-create-form">

				<!-- Title -->
				<div class="form-group">
					<label for="blog-title">${t('blog.titleLabel')} *</label>
					<input type="text" id="blog-title" class="form-input" maxlength="200" required
						value="${p ? this._escAttr(p.title) : ''}" placeholder="Mi nuevo artículo..." />
				</div>

				<!-- Slug (auto-generated, read-only hint) -->
				<div class="form-group">
					<label>Slug (URL)</label>
					<input type="text" id="blog-slug-preview" class="form-input" readonly
						value="${p ? this._escAttr(p.slug) : ''}" style="opacity:0.6;" />
					<small>Se genera automáticamente del título</small>
				</div>

				<!-- Excerpt -->
				<div class="form-group">
					<label for="blog-excerpt">${t('blog.excerptLabel')}</label>
					<textarea id="blog-excerpt" class="form-input" rows="2" maxlength="500"
						placeholder="Resumen breve del artículo...">${p ? this._escHtml(p.excerpt || '') : ''}</textarea>
				</div>

				<!-- Cover Image -->
				<div class="form-group">
					<label>${t('blog.coverImageLabel')}</label>
					${p?.cover_image_key ? `<div class="current-cover"><img src="/api/download/${p.cover_image_key}" alt="cover" style="max-height:120px;border-radius:8px;" /></div>` : ''}
					<input type="file" id="blog-cover-file" accept="image/*" class="form-input" />
					<input type="hidden" id="blog-cover-uuid" value="${p?.cover_image_uuid || ''}" />
				</div>

				<!-- Author Display Toggle -->
				<div class="form-group">
					<label>${t('blog.authorDisplayLabel')}</label>
					<div class="toggle-group">
						<label class="toggle-option">
							<input type="radio" name="author_display" value="personal" ${!p || p.author_display === 'personal' ? 'checked' : ''} />
							<span>${t('blog.authorPersonal')} (${window.appState?.username || 'admin'})</span>
						</label>
						<label class="toggle-option">
							<input type="radio" name="author_display" value="team" ${p?.author_display === 'team' ? 'checked' : ''} />
							<span>🌐 ${t('blog.authorTeam')}</span>
						</label>
					</div>
				</div>

				<!-- Content with live preview -->
				<div class="form-group blog-editor-group">
					<div class="blog-editor-tabs">
						<button type="button" id="tab-write" class="editor-tab active">${t('blog.write')}</button>
						<button type="button" id="tab-preview" class="editor-tab">${t('blog.preview')}</button>
					</div>
					<div id="editor-write-panel">
						<label for="blog-content">${t('blog.contentLabel')} *</label>
						<textarea id="blog-content" class="form-input blog-content-textarea" rows="20"
							placeholder="## Mi artículo\n\nEscribe en **Markdown**...">${p ? this._escHtml(p.content) : ''}</textarea>
					</div>
					<div id="editor-preview-panel" class="markdown-body blog-preview-panel" style="display:none; min-height:200px; padding:16px;"></div>
				</div>

				<div id="blog-create-error" class="error-box" style="display:none;"></div>
				<div class="blog-create-actions">
					<button type="submit" id="blog-submit-btn" class="btn btn-primary">
						${t('blog.savePost')}
					</button>
				</div>
			</form>
		`;

		this._attachFormListeners();
	}

	_attachFormListeners() {
		// Auto-generate slug from title
		const titleInput = document.getElementById('blog-title');
		const slugPreview = document.getElementById('blog-slug-preview');
		titleInput.addEventListener('input', () => {
			slugPreview.value = this._slugify(titleInput.value);
		});

		// Editor tabs
		document.getElementById('tab-write').addEventListener('click', () => {
			document.getElementById('editor-write-panel').style.display = 'block';
			document.getElementById('editor-preview-panel').style.display = 'none';
			document.getElementById('tab-write').classList.add('active');
			document.getElementById('tab-preview').classList.remove('active');
		});
		document.getElementById('tab-preview').addEventListener('click', () => {
			const content = document.getElementById('blog-content').value;
			const previewEl = document.getElementById('editor-preview-panel');
			if (window.marked && window.DOMPurify) {
				previewEl.innerHTML = window.DOMPurify.sanitize(window.marked.parse(content));
			} else {
				previewEl.textContent = content;
			}
			document.getElementById('editor-write-panel').style.display = 'none';
			previewEl.style.display = 'block';
			document.getElementById('tab-preview').classList.add('active');
			document.getElementById('tab-write').classList.remove('active');
		});

		// Cover image upload on change
		document.getElementById('blog-cover-file').addEventListener('change', async (e) => {
			const file = e.target.files[0];
			if (!file) return;
			await this._uploadCoverImage(file);
		});

		// Form submit
		document.getElementById('blog-create-form').addEventListener('submit', async (e) => {
			e.preventDefault();
			await this._submitForm();
		});
	}

	async _uploadCoverImage(file) {
		const label = document.querySelector('label[for="blog-cover-file"]') || document.getElementById('blog-cover-file');
		const origText = label.textContent;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: formData });
			if (!res.ok) throw new Error('Upload failed');
			const data = await res.json();
			document.getElementById('blog-cover-uuid').value = data.uuid || '';
		} catch (e) {
			console.error('Cover upload error:', e);
			this._showError(t('upload.error'));
		}
	}

	async _submitForm() {
		const title = document.getElementById('blog-title').value.trim();
		const content = document.getElementById('blog-content').value.trim();
		const excerpt = document.getElementById('blog-excerpt').value.trim() || null;
		const cover_image_uuid = document.getElementById('blog-cover-uuid').value || null;
		const author_display = document.querySelector('input[name="author_display"]:checked')?.value || 'personal';

		if (!title || !content) return;

		const btn = document.getElementById('blog-submit-btn');
		btn.disabled = true;
		btn.textContent = t('item.sending');
		this._showError('', false);

		const body = { title, content, excerpt, cover_image_uuid, author_display };
		const url = this.editId ? `/api/blog/${this.editId}` : '/api/blog';
		const method = this.editId ? 'PUT' : 'POST';

		try {
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const data = await res.json();

			if (!res.ok) {
				this._showError(data.error || t('common.error'));
				return;
			}

			// Navigate to the post
			const targetId = this.editId || data.uuid;
			navigateTo(`/blog/${targetId}`);
		} catch (e) {
			this._showError(t('common.error'));
		} finally {
			btn.disabled = false;
			btn.textContent = t('blog.savePost');
		}
	}

	_showError(msg, show = true) {
		const el = document.getElementById('blog-create-error');
		if (!el) return;
		el.style.display = show ? 'block' : 'none';
		el.textContent = msg;
	}

	_slugify(title) {
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

	_escHtml(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	_escAttr(str) {
		return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}
