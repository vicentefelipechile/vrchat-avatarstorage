// =========================================================================================================
// features/admin/author-form.ts — Unified create/edit author form (avatar upload + URL fields)
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast, mediaUrl } from '../../lib/utils';
import { icons } from '../../lib/icons';
import { adminGet } from './api';
import { esc, safeAvatarSrc } from './esc';

export type AuthorFormMode = 'create' | 'edit';

export interface AuthorFormData {
	slug: string;
	name: string;
	description?: string | null;
	avatar_url?: string | null;
	website_url?: string | null;
	twitter_url?: string | null;
	booth_url?: string | null;
	gumroad_url?: string | null;
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
	'image/png': 'PNG',
	'image/jpeg': 'JPEG',
	'image/gif': 'GIF',
	'image/webp': 'WEBP',
	'image/avif': 'AVIF',
};

const ALLOWED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

async function uploadAuthorImage(fileInput: HTMLInputElement, preview: HTMLElement, onUrl: (url: string) => void): Promise<void> {
	const file = fileInput.files?.[0];
	if (!file) return;

	const ext = '.' + file.name.split('.').pop()!.toLowerCase();
	if (!ALLOWED_IMAGE_TYPES[file.type] || !ALLOWED_IMAGE_EXTS.includes(ext)) {
		showToast(`${t('admin.authors.toastFormatNotAllowed')} ${Object.values(ALLOWED_IMAGE_TYPES).join(', ')}`, 'error');
		fileInput.value = '';
		return;
	}

	const dismiss = showToast(t('admin.authors.toastUploading'), 'info', 0);
	try {
		const formData = new FormData();
		formData.append('file', file);
		const r = await fetch('/api/upload', { method: 'PUT', body: formData });
		dismiss();
		if (!r.ok) {
			showToast(t('admin.authors.toastUploadError'), 'error');
			return;
		}
		const d = (await r.json()) as { r2_key?: string; media_uuid?: string };
		if (!d.media_uuid) {
			showToast(t('admin.authors.toastInvalidServerResp'), 'error');
			return;
		}
		const url = mediaUrl(d.media_uuid, 'med');
		onUrl(url);
		preview.innerHTML = `<img src="${esc(url)}" class="admin-author-preview-img" alt="">`;
	} catch {
		dismiss();
		showToast(t('admin.networkError'), 'error');
	}
}

export function showAuthorForm(sectionEl: HTMLElement, mode: AuthorFormMode, author: AuthorFormData | undefined, onSaved: () => void): void {
	sectionEl.querySelector('#author-form-panel')?.remove();

	const isEdit = mode === 'edit';
	const initialAvatar = safeAvatarSrc(isEdit ? author?.avatar_url : null);
	let resolvedAvatarUrl: string | null | undefined = isEdit ? (author?.avatar_url ?? null) : undefined;

	const form = document.createElement('div');
	form.id = 'author-form-panel';
	form.className = 'admin-form-panel admin-author-form';
	form.innerHTML = `<h3>${isEdit ? `${esc(t('admin.authors.formTitleEdit'))} ${esc(author!.name)}` : esc(t('admin.authors.formTitleNew'))}</h3>
		<div class="admin-author-form-body">
			<div class="admin-author-avatar-col">
				<div data-preview class="admin-author-preview">${initialAvatar ? `<img src="${esc(initialAvatar)}" class="admin-author-preview-img" alt="">` : esc(t('admin.authors.noImage'))}</div>
				<input type="file" data-file accept=".png,.jpg,.jpeg,.gif,.webp,.avif,image/png,image/jpeg,image/gif,image/webp,image/avif" hidden>
				<div class="admin-author-avatar-actions">
					<button type="button" class="btn btn-sm" data-upload>${esc(t('admin.authors.btnUpload'))}</button>
					<button type="button" class="btn btn-sm" data-remove${initialAvatar ? '' : ' hidden'}>${esc(t('admin.authors.btnRemove'))}</button>
				</div>
			</div>
			<div class="admin-author-fields">
				<div class="admin-form-grid">
					<div class="form-group"><label class="form-label">${esc(t('admin.authors.formName'))}</label><input data-name class="form-input" type="text" value="${isEdit ? esc(author!.name) : ''}"></div>
					<div class="form-group"><label class="form-label">Website URL</label><input data-website class="form-input" type="url" value="${isEdit ? esc(author!.website_url) : ''}"></div>
					<div class="form-group"><label class="form-label">Twitter URL</label><input data-twitter class="form-input" type="url" value="${isEdit ? esc(author!.twitter_url) : ''}"></div>
					<div class="form-group"><label class="form-label">Booth URL</label><input data-booth class="form-input" type="url" value="${isEdit ? esc(author!.booth_url) : ''}"></div>
					<div class="form-group"><label class="form-label">Gumroad URL</label><input data-gumroad class="form-input" type="url" value="${isEdit ? esc(author!.gumroad_url) : ''}"></div>
					<div class="form-group admin-form-full"><label class="form-label">${esc(t('admin.authors.formDesc'))}</label><textarea data-desc class="form-input admin-author-desc" rows="2">${isEdit ? esc(author!.description) : ''}</textarea></div>
				</div>
			</div>
		</div>
		<div class="admin-author-form-actions">
			<button type="button" class="btn btn-sm" data-submit>${icons.check(14)} ${isEdit ? esc(t('admin.authors.btnSave')) : esc(t('admin.authors.btnCreate'))}</button>
			<button type="button" class="btn btn-sm btn-outline" data-cancel>${esc(t('admin.authors.btnCancel'))}</button>
		</div>`;

	sectionEl.querySelector('.admin-form-panel')?.after(form);

	const preview = form.querySelector<HTMLElement>('[data-preview]')!;
	const fileInput = form.querySelector<HTMLInputElement>('[data-file]')!;
	const removeBtn = form.querySelector<HTMLButtonElement>('[data-remove]')!;

	const setAvatar = (url: string | null): void => {
		resolvedAvatarUrl = url;
		const safe = safeAvatarSrc(url);
		preview.innerHTML = safe ? `<img src="${esc(safe)}" class="admin-author-preview-img" alt="">` : esc(t('admin.authors.noImage'));
		removeBtn.hidden = !safe;
	};

	form.querySelector('[data-upload]')!.addEventListener('click', () => fileInput.click());
	fileInput.addEventListener('change', () => void uploadAuthorImage(fileInput, preview, (url) => setAvatar(url)));
	removeBtn.addEventListener('click', () => setAvatar(null));
	form.querySelector('[data-cancel]')!.addEventListener('click', () => form.remove());

	form.querySelector('[data-submit]')!.addEventListener('click', async () => {
		const name = form.querySelector<HTMLInputElement>('[data-name]')!.value.trim();
		if (!name) {
			showToast(t('admin.authors.toastNameRequired'), 'error');
			return;
		}
		const val = (sel: string): string | null => form.querySelector<HTMLInputElement>(sel)!.value.trim() || null;
		const payload = {
			name,
			description: form.querySelector<HTMLTextAreaElement>('[data-desc]')!.value.trim() || null,
			avatar_url: resolvedAvatarUrl ?? null,
			website_url: val('[data-website]'),
			twitter_url: val('[data-twitter]'),
			booth_url: val('[data-booth]'),
			gumroad_url: val('[data-gumroad]'),
		};
		try {
			const r = await fetch(isEdit ? `/api/authors/${author!.slug}` : '/api/authors', {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (r.ok) {
				showToast(t('admin.authors.toastSaved'), 'success');
				form.remove();
				onSaved();
			} else {
				const d = (await r.json()) as { error?: string };
				showToast(d.error ?? 'Error', 'error');
			}
		} catch {
			showToast(t('admin.networkError'), 'error');
		}
	});
}

export async function fetchAuthorForEdit(slug: string): Promise<AuthorFormData> {
	const { author } = await adminGet<{ author: AuthorFormData }>(`/api/authors/${slug}`);
	return author;
}
