// =========================================================================
// views/UploadView.ts — Resource upload form with chunked upload support
// =========================================================================

import { t } from '../i18n';
import { DataCache } from '../cache';
import { renderMarkdown } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';

// =========================================================================
// Helpers
// =========================================================================

interface ImageDimCheck { valid: boolean; error?: string }

const SIZE_LIMITS = {
	image: 20 * 1024 * 1024,
	video: 100 * 1024 * 1024,
	file: 1500 * 1024 * 1024,
};

const MAX_IMAGE_DIMENSION = 4096;
const VALID_EXTENSIONS = ['.rar', '.zip', '.unitypackage', '.blend'];
const CHUNK_SIZE = 30 * 1024 * 1024;

function validateImageDimensions(file: File): Promise<ImageDimCheck> {
	return new Promise((resolve) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
				resolve({ valid: false, error: `Image too large. Max: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} got ${img.width}x${img.height}` });
			} else {
				resolve({ valid: true });
			}
		};
		img.onerror = () => { URL.revokeObjectURL(url); resolve({ valid: false, error: 'Could not load image' }); };
		img.src = url;
	});
}

function createPreviewItem(tag: 'img' | 'video', url: string, name: string, onDelete: () => void): HTMLDivElement {
	const container = document.createElement('div');
	container.className = 'preview-item';
	container.style.cssText = 'display:inline-block;position:relative;border:2px solid var(--border-color);padding:10px;margin:5px;background:var(--bg-card);vertical-align:top';

	const btn = document.createElement('button');
	btn.innerHTML = '✕';
	btn.style.cssText = 'position:absolute;top:5px;right:5px;background:#dc3545;color:white;border:none;border-radius:3px;width:25px;height:25px;cursor:pointer;font-weight:bold;z-index:10';
	btn.onclick = (e) => { e.preventDefault(); onDelete(); };

	const media = document.createElement(tag) as HTMLImageElement | HTMLVideoElement;
	media.src = url;
	media.style.cssText = 'max-width:200px;max-height:200px;display:block';
	if (tag === 'video') (media as HTMLVideoElement).controls = true;

	const label = document.createElement('div');
	label.textContent = name;
	label.style.cssText = 'margin-top:5px;font-size:12px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';

	container.append(btn, media, label);
	return container;
}

function uploadWithProgress(url: string, fd: FormData, onProgress: (p: number) => void): Promise<{ r2_key: string; media_uuid: string }> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) onProgress((ev.loaded / ev.total) * 100); };
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try { resolve(JSON.parse(xhr.responseText) as { r2_key: string; media_uuid: string }); }
				catch { reject(new Error('Invalid JSON')); }
			} else { reject(new Error(`Upload failed ${xhr.status}`)); }
		};
		xhr.onerror = () => reject(new Error('Network error'));
		xhr.send(fd);
	});
}

async function uploadLargeFile(file: File, onProgress: (p: number) => void): Promise<{ r2_key: string; media_uuid: string }> {
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

	const initRes = await fetch('/api/upload/init', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ filename: file.name, media_type: 'file' }),
	});
	if (!initRes.ok) throw new Error('Failed to initialize upload');
	const { uploadId, key } = await initRes.json() as { uploadId: string; key: string };

	const parts: object[] = [];
	let loaded = 0;

	for (let i = 0; i < totalChunks; i++) {
		const start = i * CHUNK_SIZE;
		const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
		const partRes = await fetch('/api/upload/part', {
			method: 'PUT',
			headers: {
				'X-Upload-ID': uploadId,
				'X-Key': key,
				'X-Part-Number': String(i + 1),
				'Content-Type': 'application/octet-stream',
			},
			body: chunk,
		});
		if (!partRes.ok) throw new Error(`Failed to upload part ${i + 1}`);
		parts.push(await partRes.json());
		loaded += chunk.size;
		onProgress((loaded / file.size) * 100);
	}

	const completeRes = await fetch('/api/upload/complete', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ uploadId, key, parts, filename: file.name, media_type: 'file' }),
	});
	if (!completeRes.ok) throw new Error('Failed to complete upload');
	return completeRes.json() as Promise<{ r2_key: string; media_uuid: string }>;
}

// =========================================================================
// View
// =========================================================================

export async function uploadView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('upload.title')}`;

	return `
		<div style="max-width:1200px;margin:0 auto">
			<h1>${t('upload.title')}</h1>
			<form id="upload-form">
				<div class="form-group">
					<label><strong>${t('upload.name')} ${t('upload.required')}</strong></label>
					<input type="text" id="title" required placeholder="${t('upload.resourceName')}">
				</div>

				<div class="form-group">
					<label><strong>${t('upload.cat')} ${t('upload.required')}</strong></label>
					<select id="category" class="form-control" required>
						<option value="avatars">${t('cats.avatars')}</option>
						<option value="worlds">${t('cats.worlds')}</option>
						<option value="assets">${t('cats.assets')}</option>
						<option value="clothes">${t('cats.clothes')}</option>
					</select>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.tags')}</strong> <small>(${t('upload.tagsHint')})</small></label>
					<input type="text" id="tags" placeholder="anime, horror, quest, nsfw">
				</div>

				<div id="avatar-fields" style="display:none;background:var(--bg-card);padding:15px;margin-bottom:20px;border:1px solid var(--border-color)">
					<h3 style="margin-top:0;margin-bottom:15px">${t('avatar.options')}</h3>
					<div class="upload-grid">
						<div class="form-group">
							<label><strong>${t('avatar.platform')}</strong></label>
							<select id="avatar-platform" class="form-control">
								<option value="PC Only" selected>${t('avatar.pcOnly')} (${t('avatar.default')})</option>
								<option value="Quest">${t('avatar.quest')}</option>
								<option value="PC / Quest">${t('avatar.pcQuest')}</option>
							</select>
						</div>
						<div class="form-group">
							<label><strong>${t('avatar.sdk')}</strong></label>
							<select id="avatar-sdk" class="form-control">
								<option value="3.0" selected>3.0 (${t('avatar.default')})</option>
								<option value="2.0">2.0</option>
							</select>
						</div>
					</div>
					<div class="upload-grid">
						<div class="form-group">
							<label><strong>${t('avatar.version')}</strong> (e.g. v1.0)</label>
							<input type="text" id="avatar-version" placeholder="v1.0">
						</div>
						<div class="form-group" style="display:flex;align-items:center;margin-top:30px">
							<input type="checkbox" id="avatar-blend" style="width:auto;margin-right:10px">
							<label for="avatar-blend" style="margin-bottom:0"><strong>${t('avatar.blend')}</strong></label>
						</div>
					</div>
					<div class="upload-grid" style="margin-top:10px">
						<div class="form-group" style="display:flex;align-items:center">
							<input type="checkbox" id="avatar-poiyomi" style="width:auto;margin-right:10px">
							<label for="avatar-poiyomi" style="margin-bottom:0"><strong>${t('avatar.poiyomi')}</strong></label>
						</div>
						<div class="form-group" style="display:flex;align-items:center">
							<input type="checkbox" id="avatar-vrcfury" style="width:auto;margin-right:10px">
							<label for="avatar-vrcfury" style="margin-bottom:0"><strong>${t('avatar.vrcfury')}</strong></label>
						</div>
					</div>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.desc')} (Markdown)</strong></label>
					<div class="upload-grid">
						<div>
							<textarea id="description" rows="12" placeholder="${t('upload.markdownPlaceholder')}" style="width:100%;font-family:monospace;resize:vertical"></textarea>
						</div>
						<div>
							<div class="preview-container">
								<strong>${t('upload.preview')}:</strong><hr>
								<div id="markdown-preview" class="markdown-body"></div>
							</div>
						</div>
					</div>
				</div>

				<div class="form-group" style="margin-bottom:20px">
					<label><strong>${t('upload.thumbnail')} ${t('upload.required')}</strong></label>
					<input type="file" id="thumbnail" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif" required>
					<small style="color:var(--text-muted)">${t('upload.imageVideo')}</small>
					<div id="thumbnail-preview" style="margin-top:10px"></div>
				</div>

				<div class="form-group" style="margin-bottom:20px">
					<label><strong>${t('upload.reference')} (${t('upload.optional')})</strong></label>
					<input type="file" id="reference-image" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm" multiple>
					<small style="color:var(--text-muted)">${t('upload.imageVideoAdditional')}</small>
					<div id="reference-preview" style="margin-top:10px"></div>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.mainFile')} (.rar, .zip, .unitypackage, .blend) ${t('upload.required')}</strong></label>
					<input type="file" id="file" accept=".rar,.zip,.unitypackage,.blend" multiple required>
					<small style="color:var(--text-muted)">${t('upload.fileTypes')} (Max 3)</small>
					<div id="file-info" style="margin-top:10px;color:var(--text-muted)"></div>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.backupLinks')}</strong></label>
					<textarea id="backup-links" rows="3" placeholder="https://example.com/backup1&#10;https://example.com/backup2" style="width:100%;font-family:monospace;resize:vertical"></textarea>
					<small style="color:var(--text-muted)">${t('upload.backupLinksHint')}</small>
				</div>

				<div class="form-group" style="margin:20px 0">
					<label><strong>${t('upload.captcha')}</strong></label>
					<div id="turnstile-container"></div>
				</div>

				<div id="progress-container" style="display:none;margin-bottom:20px">
					<progress id="progress-bar" value="0" max="100" style="width:100%"></progress>
					<div id="progress-text" style="text-align:center;margin-top:5px">0%</div>
				</div>

				<div id="upload-error" style="color:red;margin-bottom:10px"></div>
				<button type="submit" class="btn" style="width:100%;padding:15px;font-size:16px">${t('upload.btn')}</button>
			</form>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function uploadAfter(_ctx: RouteContext): Promise<void> {
	const form = document.getElementById('upload-form') as HTMLFormElement;
	const descriptionField = document.getElementById('description') as HTMLTextAreaElement;
	const markdownPreview = document.getElementById('markdown-preview')!;
	const thumbnailInput = document.getElementById('thumbnail') as HTMLInputElement;
	const referenceInput = document.getElementById('reference-image') as HTMLInputElement;
	const fileInput = document.getElementById('file') as HTMLInputElement;
	const thumbnailPreview = document.getElementById('thumbnail-preview')!;
	const referencePreview = document.getElementById('reference-preview')!;
	const fileInfo = document.getElementById('file-info')!;
	const uploadError = document.getElementById('upload-error')!;
	const progressContainer = document.getElementById('progress-container')!;
	const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;
	const progressText = document.getElementById('progress-text')!;

	let turnstileToken: string | null = null;
	let turnstileWidgetId: string | null = null;

	// -----------------------------------------------------------------------
	// Turnstile
	// -----------------------------------------------------------------------

	try {
		const config = await fetch('/api/config').then((r) => r.json()) as { turnstileSiteKey?: string };
		if (window.turnstile && config.turnstileSiteKey) {
			turnstileWidgetId = window.turnstile.render('#turnstile-container', {
				sitekey: config.turnstileSiteKey,
				callback: (token: string) => { turnstileToken = token; },
				'expired-callback': () => { turnstileToken = null; },
			}) ?? null;
		}
	} catch { /* ignore */ }

	// -----------------------------------------------------------------------
	// Avatar fields toggle
	// -----------------------------------------------------------------------

	const categorySelect = document.getElementById('category') as HTMLSelectElement;
	const avatarFields = document.getElementById('avatar-fields')!;
	const toggleAvatarFields = () => { avatarFields.style.display = categorySelect.value === 'avatars' ? 'block' : 'none'; };
	categorySelect.addEventListener('change', toggleAvatarFields);
	toggleAvatarFields();

	// -----------------------------------------------------------------------
	// Markdown preview
	// -----------------------------------------------------------------------

	descriptionField.addEventListener('input', () => renderMarkdown(markdownPreview, descriptionField.value || `*${t('upload.noContent')}*`));
	descriptionField.dispatchEvent(new Event('input'));

	// -----------------------------------------------------------------------
	// Thumbnail preview
	// -----------------------------------------------------------------------

	thumbnailInput.addEventListener('change', async (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const isVideo = file.type.startsWith('video/');
		const maxSize = isVideo ? SIZE_LIMITS.video : SIZE_LIMITS.image;
		if (file.size > maxSize) { alert(`File too large. Max: ${(maxSize / 1024 / 1024).toFixed(0)}MB`); thumbnailInput.value = ''; thumbnailPreview.innerHTML = ''; return; }
		if (!isVideo) { const c = await validateImageDimensions(file); if (!c.valid) { alert(c.error); thumbnailInput.value = ''; thumbnailPreview.innerHTML = ''; return; } }
		const url = URL.createObjectURL(file);
		const item = createPreviewItem(isVideo ? 'video' : 'img', url, file.name, () => { thumbnailInput.value = ''; thumbnailPreview.innerHTML = ''; URL.revokeObjectURL(url); });
		thumbnailPreview.innerHTML = '';
		thumbnailPreview.appendChild(item);
	});

	// -----------------------------------------------------------------------
	// Reference image preview
	// -----------------------------------------------------------------------

	let selectedRefFiles: File[] = [];
	const renderRefPreview = () => {
		referencePreview.innerHTML = '';
		selectedRefFiles.forEach((file, idx) => {
			const isVideo = file.type.startsWith('video/');
			const url = URL.createObjectURL(file);
			const item = createPreviewItem(isVideo ? 'video' : 'img', url, file.name, () => {
				selectedRefFiles.splice(idx, 1);
				const dt = new DataTransfer();
				selectedRefFiles.forEach((f) => dt.items.add(f));
				referenceInput.files = dt.files;
				renderRefPreview();
			});
			referencePreview.appendChild(item);
		});
	};

	referenceInput.addEventListener('change', async (e) => {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		if (files.length > 8) { alert(t('upload.maxFiles')); referenceInput.value = ''; selectedRefFiles = []; renderRefPreview(); return; }
		for (const f of files) {
			const maxSize = f.type.startsWith('video/') ? SIZE_LIMITS.video : SIZE_LIMITS.image;
			if (f.size > maxSize) { alert(`File "${f.name}" too large.`); referenceInput.value = ''; selectedRefFiles = []; renderRefPreview(); return; }
			if (f.type.startsWith('image/')) { const c = await validateImageDimensions(f); if (!c.valid) { alert(`Image "${f.name}": ${c.error}`); referenceInput.value = ''; selectedRefFiles = []; renderRefPreview(); return; } }
		}
		selectedRefFiles = files;
		renderRefPreview();
	});

	// -----------------------------------------------------------------------
	// Main file validation
	// -----------------------------------------------------------------------

	fileInput.addEventListener('change', (e) => {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		fileInfo.innerHTML = '';
		uploadError.textContent = '';
		if (files.length > 3) { fileInfo.innerHTML = `<span style="color:red">✗ ${t('upload.errorMaxFiles')}</span>`; uploadError.textContent = t('upload.errorMaxFiles'); fileInput.value = ''; return; }

		let allValid = true;
		files.forEach((file) => {
			const isValidExt = VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
			const isValidSize = file.size <= SIZE_LIMITS.file;
			if (!isValidExt || !isValidSize) allValid = false;
			const mb = (file.size / 1024 / 1024).toFixed(2);
			const maxMb = (SIZE_LIMITS.file / 1024 / 1024).toFixed(0);
			let color = 'green', sym = '✓', msg = `${file.name} (${mb} MB)`;
			if (!isValidExt) { color = 'red'; sym = '✗'; msg += ` - ${t('upload.errorInvalidFileType')}`; }
			else if (!isValidSize) { color = 'red'; sym = '✗'; msg += ` - ${t('upload.errorFileTooLarge')} (max ${maxMb}MB)`; }
			const div = document.createElement('div');
			div.innerHTML = `<span style="color:${color}">${sym} ${msg}</span>`;
			fileInfo.appendChild(div);
		});
		if (!allValid) { uploadError.textContent = `${t('upload.error')}: Invalid files.`; fileInput.value = ''; }
	});

	// -----------------------------------------------------------------------
	// Progress helper
	// -----------------------------------------------------------------------

	const updateProgress = (label: string, pct: number) => {
		progressContainer.style.display = 'block';
		progressBar.value = pct;
		progressText.textContent = `${label} (${Math.round(pct)}%)`;
	};

	// -----------------------------------------------------------------------
	// Form submit
	// -----------------------------------------------------------------------

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const btn = form.querySelector<HTMLButtonElement>('button')!;
		const resetState = () => { btn.disabled = false; btn.textContent = t('upload.btn'); nav?.style.setProperty('pointer-events', 'auto'); nav?.style.setProperty('opacity', '1'); };
		const nav = document.querySelector<HTMLElement>('nav');

		btn.disabled = true;
		btn.textContent = t('upload.uploading');
		uploadError.textContent = '';
		nav?.style.setProperty('pointer-events', 'none');
		nav?.style.setProperty('opacity', '0.5');

		const preventNav = (ev: BeforeUnloadEvent) => { ev.preventDefault(); ev.returnValue = ''; };
		window.addEventListener('beforeunload', preventNav);

		const title = (document.getElementById('title') as HTMLInputElement).value;
		const category = categorySelect.value;
		const tagsInput = (document.getElementById('tags') as HTMLInputElement).value;
		const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
		let description = descriptionField.value;

		if (category === 'avatars') {
			const platform = (document.getElementById('avatar-platform') as HTMLSelectElement).value;
			const sdk = (document.getElementById('avatar-sdk') as HTMLSelectElement).value;
			const version = (document.getElementById('avatar-version') as HTMLInputElement).value;
			const blend = (document.getElementById('avatar-blend') as HTMLInputElement).checked;
			const poiyomi = (document.getElementById('avatar-poiyomi') as HTMLInputElement).checked;
			const vrcfury = (document.getElementById('avatar-vrcfury') as HTMLInputElement).checked;
			description += `\n\n---\n\n### Avatar Details\n* Platform: ${platform}\n* SDK: ${sdk}\n* Version: ${version || 'Not specified'}\n* Contains .blend: ${blend ? 'Yes' : 'No'}\n* Uses Poiyomi: ${poiyomi ? 'Yes' : 'No'}\n* Uses VRCFury: ${vrcfury ? 'Yes' : 'No'}\n`;
		}

		const mainFiles = Array.from(fileInput.files ?? []);
		const thumbnail = thumbnailInput.files?.[0];
		const referenceFiles = referenceInput.files;

		if (mainFiles.length === 0) { uploadError.textContent = `${t('upload.error')}: No file selected`; resetState(); window.removeEventListener('beforeunload', preventNav); return; }
		if (mainFiles.length > 3) { uploadError.textContent = `${t('upload.error')}: Max 3 files`; resetState(); window.removeEventListener('beforeunload', preventNav); return; }
		if (mainFiles.some((f) => !VALID_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)))) { uploadError.textContent = `${t('upload.error')}: ${t('upload.errorMainFile')}`; resetState(); window.removeEventListener('beforeunload', preventNav); return; }
		if (!thumbnail) { uploadError.textContent = `${t('upload.error')}: ${t('upload.errorThumbnail')}`; resetState(); window.removeEventListener('beforeunload', preventNav); return; }
		if (!turnstileToken) { uploadError.textContent = `${t('upload.error')}: ${t('upload.errorCaptcha')}`; resetState(); window.removeEventListener('beforeunload', preventNav); return; }

		try {
			// 1. Thumbnail
			const thumbFd = new FormData();
			thumbFd.append('file', thumbnail);
			thumbFd.append('media_type', thumbnail.type.startsWith('video/') ? 'video' : 'image');
			updateProgress(t('upload.uploadingThumbnail'), 0);
			const thumbData = await uploadWithProgress('/api/upload', thumbFd, (p) => updateProgress(t('upload.uploadingThumbnail'), p));

			// 2. Reference images
			const galleryUuids: string[] = [];
			if (referenceFiles?.length) {
				for (let i = 0; i < referenceFiles.length; i++) {
					const ref = referenceFiles[i];
					const fd = new FormData();
					fd.append('file', ref);
					fd.append('media_type', ref.type.startsWith('video/') ? 'video' : 'image');
					const label = `${t('upload.uploadingReference')} (${i + 1}/${referenceFiles.length})`;
					updateProgress(label, 0);
					const refData = await uploadWithProgress('/api/upload', fd, (p) => updateProgress(label, p));
					galleryUuids.push(refData.media_uuid);
				}
			}

			// 3. Main files
			type FileData = { r2_key: string; media_uuid: string; originalName: string; size: number };
			const uploadedFiles: FileData[] = [];
			for (let i = 0; i < mainFiles.length; i++) {
				const f = mainFiles[i];
				const label = `${t('upload.uploadingFile')} (${i + 1}/${mainFiles.length})`;
				updateProgress(label, 0);

				let fileData: { r2_key: string; media_uuid: string };
				if (f.size > CHUNK_SIZE) {
					fileData = await uploadLargeFile(f, (p) => updateProgress(label, p));
				} else {
					const fd = new FormData();
					fd.append('file', f);
					fd.append('media_type', 'file');
					fileData = await uploadWithProgress('/api/upload', fd, (p) => updateProgress(label, p));
				}
				uploadedFiles.push({ ...fileData, originalName: f.name, size: f.size });
			}

			// 4. Create resource
			updateProgress(t('upload.creating'), 100);

			const fileLinks = uploadedFiles.map((f, i) => ({
				link_url: `/api/download/${f.r2_key}`,
				link_title: f.originalName,
				link_type: 'download',
				display_order: i,
				file_size: f.size,
				version: '1.0',
			}));

			const backupLinksRaw = (document.getElementById('backup-links') as HTMLTextAreaElement).value;
			const extra = backupLinksRaw
				? backupLinksRaw.split('\n').map((u) => u.trim()).filter(Boolean).map((url, i) => ({
					link_url: url,
					link_title: 'Backup ' + (i + 1),
					link_type: 'download',
					display_order: fileLinks.length + i + 1,
				}))
				: [];

			const body = {
				title, description, category, tags,
				thumbnail_uuid: thumbData.media_uuid,
				reference_image_uuid: galleryUuids[0] ?? null,
				media_files: [thumbData.media_uuid, ...galleryUuids, ...uploadedFiles.map((f) => f.media_uuid)],
				links: [...fileLinks, ...extra],
				token: turnstileToken,
			};

			const res = await fetch('/api/resources', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (res.ok) {
				const data = await res.json() as { uuid: string };
				DataCache.clear('/api/resources/latest');
				DataCache.clear(`/api/resources?category=${category}`);
				window.removeEventListener('beforeunload', preventNav);
				navigateTo('/item/' + data.uuid);
			} else {
				const err = await res.json() as { error?: string };
				throw new Error(err.error ?? t('upload.errorCreateResource'));
			}
		} catch (err) {
			uploadError.textContent = `${t('upload.error')}: ${(err as Error).message}`;
			progressContainer.style.display = 'none';
			window.turnstile?.reset(turnstileWidgetId ?? undefined);
			turnstileToken = null;
			window.removeEventListener('beforeunload', preventNav);
			resetState();
		}
	});
}
