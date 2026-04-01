// =========================================================================
// views/EditResourceView.ts — Edit resource metadata and add files
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { renderMarkdown } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext, Resource } from '../types';

// =========================================================================
// Helpers
// =========================================================================

const AVATAR_DETAILS_RE = /\n\n---\n\n### Avatar Details\n([\s\S]*)$/;

function getAvatarDetail(details: string, key: string): string | null {
	const escaped = key.replace('.', '\\.');
	const m = details.match(new RegExp(`\\* ${escaped}: (.*)`));
	return m ? m[1].trim() : null;
}

function editFormHtml(id: string): string {
	return `
		<div style="max-width:1200px;margin:0 auto">
			<h1>${t('edit.title')}</h1>
			<div id="loading-edit" class="skeleton-text">Loading…</div>

			<form id="edit-form" style="display:none">
				<div class="form-group">
					<label><strong>${t('upload.name')}</strong></label>
					<input type="text" id="title" required>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.cat')}</strong></label>
					<select id="category" class="form-control" required>
						<option value="avatars">${t('cats.avatars')}</option>
						<option value="worlds">${t('cats.worlds')}</option>
						<option value="assets">${t('cats.assets')}</option>
						<option value="clothes">${t('cats.clothes')}</option>
					</select>
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
					<label><strong>${t('upload.tags')}</strong> <small>(${t('upload.tagsHint')})</small></label>
					<input type="text" id="tags" placeholder="anime, horror, quest, nsfw">
				</div>

				<div class="form-group">
					<label><strong>${t('upload.desc')} (Markdown)</strong></label>
					<div style="display:flex;gap:20px;align-items:stretch">
						<div style="flex:1">
							<textarea id="description" rows="20" style="width:100%;height:100%;font-family:monospace;resize:vertical;min-height:400px"></textarea>
						</div>
						<div style="flex:1;border:1px solid var(--border-color);padding:15px;background:var(--bg-card);overflow-y:auto;max-height:600px">
							<div id="markdown-preview" class="markdown-body"></div>
						</div>
					</div>
				</div>

				<div class="form-group" style="background:var(--bg-card);padding:15px;border:2px solid var(--border-color);margin-top:20px">
					<h3 style="margin-top:0">${t('edit.addFileHeader')}</h3>
					<p style="font-size:0.9em;color:var(--text-muted)">${t('edit.addFileDesc')}</p>
					<label><strong>${t('upload.file')}</strong></label>
					<input type="file" id="new-file" accept=".rar,.zip,.unitypackage,.blend">
					<div id="new-file-info"></div>
					<div id="upload-progress" style="display:none;margin-top:10px">
						<progress value="0" max="100" style="width:100%"></progress>
						<span id="upload-percent">0%</span>
					</div>
				</div>

				<div id="edit-error" style="color:red;margin:10px 0"></div>

				<div style="display:flex;gap:10px;margin-top:20px">
					<button type="submit" class="btn" style="flex:1">${t('settings.save')}</button>
					<a href="/item/${id}" data-link class="btn" style="background:#666">${t('common.cancel')}</a>
				</div>
			</form>
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function editResourceView(ctx: RouteContext): Promise<string> {
	const id = ctx.params.id;
	document.title = `VRCStorage — ${t('edit.title')}`;
	return editFormHtml(id);
}

// =========================================================================
// After
// =========================================================================

export async function editResourceAfter(ctx: RouteContext): Promise<void> {
	const id = ctx.params.id;
	const form = document.getElementById('edit-form') as HTMLFormElement;
	const loadingEl = document.getElementById('loading-edit')!;
	const errorDiv = document.getElementById('edit-error')!;

	// -----------------------------------------------------------------------
	// Load resource
	// -----------------------------------------------------------------------

	let resource: Resource;
	try {
		resource = (await DataCache.fetch(`/api/resources/${id}`, 0)) as Resource;
		if (!resource) throw new Error('Not found');
		document.title = `VRCStorage — Edit ${resource.title}`;
	} catch (e) {
		loadingEl.innerHTML = `<p style="color:red">Error: ${(e as Error).message}</p>`;
		return;
	}

	// Populate fields
	(document.getElementById('title') as HTMLInputElement).value = resource.title;
	(document.getElementById('category') as HTMLSelectElement).value = resource.category;

	// Avatar fields
	const categorySelect = document.getElementById('category') as HTMLSelectElement;
	const avatarFields = document.getElementById('avatar-fields')!;
	const toggleAvatarFields = () => {
		avatarFields.style.display = categorySelect.value === 'avatars' ? 'block' : 'none';
	};
	categorySelect.addEventListener('change', toggleAvatarFields);
	toggleAvatarFields();

	// Parse avatar details out of description
	let descText = resource.description ?? '';
	const avatarMatch = descText.match(AVATAR_DETAILS_RE);
	if (avatarMatch?.[1]) {
		descText = descText.replace(AVATAR_DETAILS_RE, '');
		const details = avatarMatch[1];
		const get = (key: string) => getAvatarDetail(details, key);

		const platform = get('Platform');
		if (platform) (document.getElementById('avatar-platform') as HTMLSelectElement).value = platform;

		const sdk = get('SDK');
		if (sdk) (document.getElementById('avatar-sdk') as HTMLSelectElement).value = sdk;

		const version = get('Version');
		if (version && version !== 'Not specified') (document.getElementById('avatar-version') as HTMLInputElement).value = version;

		const setCheck = (key: string, id: string) => {
			const v = get(key);
			if (v) (document.getElementById(id) as HTMLInputElement).checked = v === 'Yes';
		};
		setCheck('Contains .blend', 'avatar-blend');
		setCheck('Uses Poiyomi', 'avatar-poiyomi');
		setCheck('Uses VRCFury', 'avatar-vrcfury');
	}

	(document.getElementById('description') as HTMLTextAreaElement).value = descText;
	(document.getElementById('tags') as HTMLInputElement).value = resource.tags?.map((tag) => tag.name).join(', ') ?? '';

	// Markdown preview
	const descEl = document.getElementById('description') as HTMLTextAreaElement;
	const previewEl = document.getElementById('markdown-preview')!;
	const updatePreview = () => renderMarkdown(previewEl, descEl.value);
	descEl.addEventListener('input', updatePreview);
	updatePreview();

	loadingEl.style.display = 'none';
	form.style.display = 'block';

	// -----------------------------------------------------------------------
	// Form submit
	// -----------------------------------------------------------------------

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		const restore = () => { btn.disabled = false; btn.textContent = t('settings.save'); };

		btn.disabled = true;
		btn.textContent = t('edit.saving');
		errorDiv.textContent = '';

		try {
			const newFileInput = document.getElementById('new-file') as HTMLInputElement;
			const newFile = newFileInput.files?.[0];
			const uploadedFileLinks: object[] = [];

			if (newFile) {
				const fd = new FormData();
				fd.append('file', newFile);
				fd.append('media_type', 'file');
				document.getElementById('upload-progress')!.style.display = 'block';

				const uploadRes = await new Promise<{ r2_key: string }>((resolve, reject) => {
					const xhr = new XMLHttpRequest();
					xhr.open('PUT', '/api/upload');
					xhr.upload.onprogress = (ev) => {
						if (!ev.lengthComputable) return;
						const p = (ev.loaded / ev.total) * 100;
						(document.getElementById('upload-percent') as HTMLElement).textContent = Math.round(p) + '%';
						(document.querySelector<HTMLProgressElement>('progress'))!.value = p;
					};
					xhr.onload = () => xhr.status >= 200 && xhr.status < 300
						? resolve(JSON.parse(xhr.responseText) as { r2_key: string })
						: reject(new Error('Upload failed'));
					xhr.onerror = () => reject(new Error('Network error'));
					xhr.send(fd);
				});

				uploadedFileLinks.push({
					link_url: `/api/download/${uploadRes.r2_key}`,
					link_title: newFile.name,
					link_type: 'download',
					display_order: 99,
				});
			}

			const tagsRaw = (document.getElementById('tags') as HTMLInputElement).value;
			const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
			const categoryVal = (document.getElementById('category') as HTMLSelectElement).value;
			let finalDesc = (document.getElementById('description') as HTMLTextAreaElement).value;

			if (categoryVal === 'avatars') {
				const platform = (document.getElementById('avatar-platform') as HTMLSelectElement).value;
				const sdk = (document.getElementById('avatar-sdk') as HTMLSelectElement).value;
				const version = (document.getElementById('avatar-version') as HTMLInputElement).value;
				const blend = (document.getElementById('avatar-blend') as HTMLInputElement).checked;
				const poiyomi = (document.getElementById('avatar-poiyomi') as HTMLInputElement).checked;
				const vrcfury = (document.getElementById('avatar-vrcfury') as HTMLInputElement).checked;

				finalDesc += `\n\n---\n\n### Avatar Details\n`
					+ `* Platform: ${platform}\n* SDK: ${sdk}\n* Version: ${version || 'Not specified'}\n`
					+ `* Contains .blend: ${blend ? 'Yes' : 'No'}\n`
					+ `* Uses Poiyomi: ${poiyomi ? 'Yes' : 'No'}\n`
					+ `* Uses VRCFury: ${vrcfury ? 'Yes' : 'No'}\n`;
			}

			const res = await fetch(`/api/resources/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: (document.getElementById('title') as HTMLInputElement).value,
					category: categoryVal,
					description: finalDesc,
					tags,
					new_links: uploadedFileLinks,
				}),
			});

			if (res.ok) {
				DataCache.clear(`/api/resources/${id}`);
				navigateTo(`/item/${id}`);
			} else {
				const data = await res.json() as { error?: string };
				throw new Error(data.error ?? 'Update failed');
			}
		} catch (err) {
			errorDiv.textContent = (err as Error).message;
			restore();
		}
	});
}
