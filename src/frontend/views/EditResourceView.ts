// =========================================================================
// views/EditResourceView.ts — Edit resource metadata, images, and links
// =========================================================================

import type { RouteContext, Resource, ResourceLink, MediaFile } from '../types';
import { htmlDecode, renderMarkdown, showToast } from '../utils';
import { navigateTo } from '../router';
import { DataCache } from '../cache';
import { t } from '../i18n';

// =========================================================================
// Helpers — Upload
// =========================================================================

const CHUNK_SIZE = 30 * 1024 * 1024;

function uploadWithProgress(url: string, fd: FormData, onProgress: (p: number) => void): Promise<{ r2_key: string; media_uuid: string }> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		xhr.upload.onprogress = (ev) => {
			if (ev.lengthComputable) onProgress((ev.loaded / ev.total) * 100);
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					resolve(JSON.parse(xhr.responseText) as { r2_key: string; media_uuid: string });
				} catch {
					reject(new Error('Invalid JSON'));
				}
			} else {
				reject(new Error(`Upload failed ${xhr.status}`));
			}
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
	const { uploadId, key } = (await initRes.json()) as { uploadId: string; key: string };

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
// Meta block HTML builders
// =========================================================================

function buildAvatarMetaFields(): string {
	return `<div id="avatar-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">${t('meta.avatar.titleAdmin')} <span style="color:#e05c5c;font-size:0.8em">${t('meta.adminOnly')}</span></h3>
		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.avatar.gender')}</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="male"> ${t('meta.avatar_gender.male')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="female"> ${t('meta.avatar_gender.female')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="both"> ${t('meta.avatar_gender.both')}</label>
				</div>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.avatar.size')}</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="tiny"> ${t('meta.avatar_size.tiny')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="small"> ${t('meta.avatar_size.small')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="medium"> ${t('meta.avatar_size.medium')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="tall"> ${t('meta.avatar_size.tall')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="giant"> ${t('meta.avatar_size.giant')}</label>
				</div>
			</div>
		</div>
		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.avatar.type')}</strong></label>
				<select id="av-avatar-type" class="form-control">
					<option value="">${t('meta.select')}</option>
					<option value="human">${t('meta.avatar_type.human')}</option>
					<option value="furry">${t('meta.avatar_type.furry')}</option>
					<option value="anime">${t('meta.avatar_type.anime')}</option>
					<option value="chibi">${t('meta.avatar_type.chibi')}</option>
					<option value="cartoon">${t('meta.avatar_type.cartoon')}</option>
					<option value="semi-realistic">${t('meta.avatar_type.semiRealistic')}</option>
					<option value="monster">${t('meta.avatar_type.monster')}</option>
					<option value="fantasy">${t('meta.avatar_type.fantasy')}</option>
					<option value="other">${t('meta.avatar_type.other')}</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.platform.title')}</strong></label>
				<select id="av-platform" class="form-control">
					<option value="cross">${t('meta.platform.cross')}</option>
					<option value="pc">${t('meta.platform.pc')}</option>
					<option value="quest">${t('meta.platform.quest')}</option>
				</select>
			</div>
		</div>
		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.sdk_version.title')}</strong></label>
				<select id="av-sdk" class="form-control">
					<option value="sdk3">${t('meta.sdk_version.v3Default')}</option>
					<option value="sdk2">${t('meta.sdk_version.v2')}</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.avatar.author')}</strong> <small style="color:var(--text-muted)">${t('meta.avatar.authorHint')}</small></label>
				<input type="text" id="av-author-input" class="form-control" placeholder="${t('meta.avatar.authorPlaceholder')}" autocomplete="off">
				<input type="hidden" id="av-author-uuid">
				<div id="av-author-suggestions" style="position:absolute;z-index:100;background:var(--bg-card);border:1px solid var(--border-color);width:300px;display:none"></div>
			</div>
		</div>
		<div class="upload-grid" style="margin-top:8px">
			<div class="form-group">
				<label><strong>${t('meta.avatar.extras')}</strong></label>
				<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;flex-direction:column">
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-nsfw"> ${t('meta.features.nsfw')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-physbones"> ${t('meta.features.physbones')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-dps"> ${t('meta.features.dps')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-facetracking"> ${t('meta.features.facetracking')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-gogoloco"> ${t('meta.features.gogoloco')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-toggles"> ${t('meta.features.toggles')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-questoptimized"> ${t('meta.features.questOptimized')}</label>
				</div>
			</div>
		</div>
	</div>`;
}

function buildAssetMetaFields(): string {
	return `<div id="asset-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">${t('meta.asset.titleAdmin')} <span style="color:#e05c5c;font-size:0.8em">${t('meta.adminOnly')}</span></h3>
		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.asset.type')}</strong></label>
				<select id="asset-type" class="form-control">
					<option value="">${t('meta.select')}</option>
					<option value="prop">${t('meta.asset_type.prop')}</option>
					<option value="shader">${t('meta.asset_type.shader')}</option>
					<option value="particle">${t('meta.asset_type.particle')}</option>
					<option value="vfx">${t('meta.asset_type.vfx')}</option>
					<option value="prefab">${t('meta.asset_type.prefab')}</option>
					<option value="script">${t('meta.asset_type.script')}</option>
					<option value="animation">${t('meta.asset_type.animation')}</option>
					<option value="avatar-base">${t('meta.asset_type.avatarBase')}</option>
					<option value="texture-pack">${t('meta.asset_type.texturePack')}</option>
					<option value="sound">${t('meta.asset_type.sound')}</option>
					<option value="tool">${t('meta.asset_type.tool')}</option>
					<option value="hud">${t('meta.asset_type.hud')}</option>
					<option value="other">${t('meta.asset_type.other')}</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.platform.title')}</strong></label>
				<select id="asset-platform" class="form-control">
					<option value="cross">${t('meta.platform.crossSimple')}</option>
					<option value="pc">${t('meta.platform.pc')}</option>
					<option value="quest">${t('meta.platform.quest')}</option>
				</select>
			</div>
		</div>
		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.sdk_version.title')}</strong></label>
				<select id="asset-sdk" class="form-control">
					<option value="sdk3">${t('meta.sdk_version.v3')}</option>
					<option value="sdk2">${t('meta.sdk_version.v2')}</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.unityVersion')}</strong></label>
				<select id="asset-unity" class="form-control">
					<option value="2022">Unity 2022</option>
					<option value="2019">Unity 2019</option>
				</select>
			</div>
		</div>
		<div class="form-group" style="margin-top:8px">
			<label><strong>${t('meta.features.title')}</strong></label>
			<div style="display:flex;gap:12px;margin-top:6px">
				<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="asset-nsfw"> ${t('meta.features.nsfw')}</label>
			</div>
		</div>
	</div>`;
}

function buildClothesMetaFields(): string {
	return `<div id="clothes-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">${t('meta.clothes.titleAdmin')} <span style="color:#e05c5c;font-size:0.8em">${t('meta.adminOnly')}</span></h3>
		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.clothes.gender')}</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="male"> ${t('meta.avatar_gender.male')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="female"> ${t('meta.avatar_gender.female')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="unisex"> ${t('meta.avatar_gender.unisex')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="kemono"> ${t('meta.avatar_gender.kemono')}</label>
				</div>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.clothes.type')}</strong></label>
				<select id="clothes-type" class="form-control">
					<option value="">${t('meta.select')}</option>
					<option value="top">${t('meta.clothing_type.top')}</option>
					<option value="jacket">${t('meta.clothing_type.jacket')}</option>
					<option value="bottom">${t('meta.clothing_type.bottom')}</option>
					<option value="dress">${t('meta.clothing_type.dress')}</option>
					<option value="fullbody">${t('meta.clothing_type.fullbody')}</option>
					<option value="swimwear">${t('meta.clothing_type.swimwear')}</option>
					<option value="shoes">${t('meta.clothing_type.shoes')}</option>
					<option value="legwear">${t('meta.clothing_type.legwear')}</option>
					<option value="hat">${t('meta.clothing_type.hat')}</option>
					<option value="hair">${t('meta.clothing_type.hair')}</option>
					<option value="accessory">${t('meta.clothing_type.accessory')}</option>
					<option value="tail">${t('meta.clothing_type.tail')}</option>
					<option value="ears">${t('meta.clothing_type.ears')}</option>
					<option value="wings">${t('meta.clothing_type.wings')}</option>
					<option value="body-part">${t('meta.clothing_type.bodyPart')}</option>
					<option value="underwear">${t('meta.clothing_type.underwear')}</option>
					<option value="other">${t('meta.clothing_type.other')}</option>
				</select>
			</div>
		</div>
		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.platform.title')}</strong></label>
				<select id="clothes-platform" class="form-control">
					<option value="cross">${t('meta.platform.crossSimple')}</option>
					<option value="pc">${t('meta.platform.pc')}</option>
					<option value="quest">${t('meta.platform.quest')}</option>
				</select>
			</div>
			<div class="form-group" style="margin-top:8px">
				<label><strong>${t('meta.features.title')}</strong></label>
				<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px">
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-nsfw"> ${t('meta.features.nsfw')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-physbones"> ${t('meta.features.physbones')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-is-base"> ${t('meta.clothes.isBase')}</label>
				</div>
			</div>
		</div>
		<div id="clothes-base-fields" style="display:none;margin-top:12px">
			<div class="form-group">
				<label><strong>${t('meta.clothes.baseAvatar')}</strong> <small style="color:var(--text-muted)">${t('meta.clothes.baseAvatarHint')}</small></label>
				<input type="text" id="clothes-base-avatar-input" class="form-control" placeholder="${t('meta.clothes.baseAvatarPlaceholder')}" autocomplete="off">
				<input type="hidden" id="clothes-base-avatar-uuid">
				<div id="clothes-base-suggestions" style="position:absolute;z-index:100;background:var(--bg-card);border:1px solid var(--border-color);width:340px;display:none"></div>
			</div>
		</div>
	</div>`;
}

// =========================================================================
// Helpers — Image preview
// =========================================================================

function createImagePreview(src: string, mediaType: 'image' | 'video' | 'file', fileName?: string, isNew?: boolean, onRemove?: () => void): HTMLDivElement {
	if (mediaType === 'file') {
		console.warn('Image preview called with mediaType "file", which is not an image or video. This may indicate a bug.');
	}

	const wrap = document.createElement('div');
	wrap.style.cssText = 'position:relative;display:inline-block;border:2px solid var(--border-color);padding:10px;margin:5px;background:var(--bg-card);vertical-align:top';

	const media = mediaType === 'video'
		? document.createElement('video')
		: document.createElement('img');
	media.setAttribute('src', src);
	if (mediaType === 'video') {
		(media as HTMLVideoElement).controls = false;
	}
	media.style.cssText = 'max-width:200px;max-height:200px;display:block';
	wrap.appendChild(media);

	if (fileName) {
		const label = document.createElement('div');
		label.style.cssText = 'margin-top:5px;font-size:12px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
		label.textContent = fileName;
		wrap.appendChild(label);
	}

	if (onRemove) {
		const del = document.createElement('button');
		del.type = 'button';
		del.textContent = '\u2715';
		del.style.cssText = 'position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:1;z-index:10';
		del.addEventListener('click', (e) => {
			e.preventDefault();
			onRemove();
		});
		wrap.appendChild(del);
	}

	return wrap;
}

// =========================================================================
// Helpers — set select/radio/checkbox values
// =========================================================================

function setSelectValue(id: string, value: string | null | undefined): void {
	if (!value) return;
	const el = document.getElementById(id) as HTMLSelectElement | null;
	if (el) el.value = value;
}

function setRadioValue(name: string, value: string | null | undefined): void {
	if (!value) return;
	const el = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
	if (el) el.checked = true;
}

function setCheckbox(id: string, value: number | boolean | null | undefined): void {
	const el = document.getElementById(id) as HTMLInputElement | null;
	if (el) el.checked = Boolean(value);
}

// =========================================================================
// Link management helpers
// =========================================================================

function buildLinkRow(link: ResourceLink, index: number): string {
	const linkUuid = link.uuid || '';
	const title = link.link_title || '';
	const url = link.link_url;
	const isR2File = link.link_type === 'download' && url.startsWith('/api/download/');

	return `<div class="link-row" data-link-uuid="${linkUuid}" data-r2-file="${isR2File ? '1' : '0'}" style="border:1px solid var(--border-color);padding:12px;margin-bottom:8px;background:var(--bg-card)">
		<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
			<div style="flex:1;width:180px">
				<label style="font-size:0.8em;color:var(--text-muted)">${t('edit.linkTitle')}</label>
				<input type="text" class="link-title-input form-control" value="${htmlDecode(title)}" style="width:100%;${isR2File ? 'background-color:var(--bg-dropdown);' : ''}" ${isR2File ? 'readonly' : ''}>
			</div>
			<div style="flex:2;width:180px">
				<label style="font-size:0.8em;color:var(--text-muted)">${t('edit.linkUrl')}</label>
				<input type="text" class="link-url-input form-control" value="${htmlDecode(url)}" style="width:100%;${isR2File ? 'background-color:var(--bg-dropdown);' : ''}" ${isR2File ? 'readonly' : ''}>
			</div>
			<div style="display:flex;gap:6px;align-items:flex-end">
				${isR2File ? '' : `<button type="button" class="btn-link-save btn btn-sm" style="font-family:inherit">${t('edit.linkSave')}</button>`}
				<button type="button" class="btn-link-delete btn btn-sm btn-danger" style="font-family:inherit">${t('edit.linkDelete')}</button>
			</div>
		</div>
	</div>`;
}

// =========================================================================
// HTML
// =========================================================================

function editFormHtml(id: string): string {
	return `
		<div style="max-width:1200px;margin:0 auto">
			<h1>${t('edit.title')}</h1>
			<div id="loading-edit" class="skeleton-text">Loading\u2026</div>

			<form id="edit-form" style="display:none">
				<div class="form-group">
					<label><strong>${t('upload.name')}</strong></label>
					<input type="text" id="title" required>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.cat')}</strong></label>
					<select id="category" class="form-control" required>
						<option value="avatars">${t('cats.avatars')}</option>
						<option value="assets">${t('cats.assets')}</option>
						<option value="clothes">${t('cats.clothes')}</option>
					</select>
				</div>

				${buildAvatarMetaFields()}
				${buildAssetMetaFields()}
				${buildClothesMetaFields()}

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
					<h3 style="margin-top:0">${t('edit.currentThumbnail')}</h3>
					<div id="current-thumbnail"></div>
					<label style="display:block;margin-top:12px"><strong>${t('edit.changeThumbnail')}</strong></label>
					<input type="file" id="new-thumbnail" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm">
					<div id="thumbnail-preview" style="margin-top:10px"></div>
					<small style="color:var(--text-muted)">${t('upload.imageVideo')}</small>
				</div>

				<div class="form-group" style="background:var(--bg-card);padding:15px;border:2px solid var(--border-color)">
					<h3 style="margin-top:0">${t('edit.currentReference')}</h3>
					<div id="current-reference"></div>
					<label style="display:block;margin-top:12px"><strong>${t('edit.changeReference')}</strong></label>
					<input type="file" id="new-reference" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm">
					<div id="reference-preview" style="margin-top:10px"></div>
					<small style="color:var(--text-muted)">${t('upload.optional')}</small>
				</div>

				<div class="form-group" style="background:var(--bg-card);padding:15px;border:2px solid var(--border-color)">
					<h3 style="margin-top:0">${t('edit.galleryTitle')}</h3>
					<div id="current-gallery"></div>
					<label style="display:block;margin-top:12px"><strong>${t('edit.galleryAdd')}</strong></label>
					<input type="file" id="new-gallery-images" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm" multiple>
					<div id="gallery-preview" style="margin-top:10px"></div>
					<small style="color:var(--text-muted)">${t('edit.galleryMax')}</small>
				</div>

				<div class="form-group" style="background:var(--bg-card);padding:15px;border:2px solid var(--border-color)">
					<h3 style="margin-top:0">${t('edit.existingLinks')}</h3>
					<div id="existing-links"></div>
				</div>

				<div class="form-group" style="background:var(--bg-card);padding:15px;border:2px solid var(--border-color)">
					<h3 style="margin-top:0">${t('edit.backupLinksLabel')}</h3>
					<textarea id="backup-links" rows="3" placeholder="https://example.com/backup1&#10;https://example.com/backup2" style="width:100%;font-family:monospace;resize:vertical"></textarea>
					<small style="color:var(--text-muted)">${t('edit.backupLinksHint')}</small>
				</div>

				<div id="edit-error" style="color:red;margin:10px 0"></div>

				<div style="display:flex;gap:10px;margin-top:20px">
					<button type="submit" id="edit-submit-btn" class="btn" style="flex:1">${t('settings.save')}</button>
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
	document.title = `VRCStorage \u2014 ${t('edit.title')}`;
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
	const isAdmin = window.appState?.isAdmin ?? false;

	let resource: Resource;
	try {
		resource = (await DataCache.fetch(`/api/resources/${id}`)) as Resource;
		if (!resource) throw new Error('Not found');
		document.title = `VRCStorage \u2014 Edit ${resource.title}`;
	} catch (e) {
		loadingEl.innerHTML = `<p style="color:red">Error: ${(e as Error).message}</p>`;
		return;
	}

	const decodedTitle = htmlDecode(resource.title);
	const decodedDescription = htmlDecode(resource.description ?? '');
	document.title = `VRCStorage \u2014 Edit ${decodedTitle}`;
	(document.getElementById('title') as HTMLInputElement).value = decodedTitle;
	(document.getElementById('category') as HTMLSelectElement).value = resource.category;
	(document.getElementById('description') as HTMLTextAreaElement).value = decodedDescription;

	// -----------------------------------------------------------------------
	// Category meta block toggle + load existing meta (admin-only)
	// -----------------------------------------------------------------------

	const categorySelect = document.getElementById('category') as HTMLSelectElement;
	const avatarMetaEl = document.getElementById('avatar-meta-fields')!;
	const assetMetaEl = document.getElementById('asset-meta-fields')!;
	const clothesMetaEl = document.getElementById('clothes-meta-fields')!;

	function toggleMetaBlocks(): void {
		const cat = categorySelect.value;
		avatarMetaEl.style.display = isAdmin && cat === 'avatars' ? 'block' : 'none';
		assetMetaEl.style.display = isAdmin && cat === 'assets' ? 'block' : 'none';
		clothesMetaEl.style.display = isAdmin && cat === 'clothes' ? 'block' : 'none';
	}
	categorySelect.addEventListener('change', toggleMetaBlocks);
	toggleMetaBlocks();

	if (isAdmin) {
		const cat = resource.category;
		const endpointMap: Record<string, string> = {
			avatars: `/api/avatars/${id}`,
			assets: `/api/assets/${id}`,
			clothes: `/api/clothes/${id}`,
		};
		const metaEndpoint = endpointMap[cat];
		if (metaEndpoint) {
			try {
				const metaRes = await fetch(metaEndpoint);
				if (metaRes.ok) {
					const meta = (await metaRes.json()) as Record<string, unknown>;
					if (cat === 'avatars') {
						setRadioValue('av-gender', meta.gender as string);
						setRadioValue('av-body-size', meta.avatar_size as string);
						setSelectValue('av-avatar-type', meta.avatar_type as string);
						setSelectValue('av-platform', meta.platform as string);
						setSelectValue('av-sdk', meta.sdk_version as string);
						setCheckbox('av-nsfw', meta.is_nsfw as number);
						setCheckbox('av-physbones', meta.has_physbones as number);
						setCheckbox('av-dps', meta.has_dps as number);
						setCheckbox('av-facetracking', meta.has_face_tracking as number);
						setCheckbox('av-gogoloco', meta.has_gogoloco as number);
						setCheckbox('av-toggles', meta.has_toggles as number);
						setCheckbox('av-questoptimized', meta.is_quest_optimized as number);
						if (meta.author_name_raw) {
							(document.getElementById('av-author-input') as HTMLInputElement).value = htmlDecode(meta.author_name_raw as string);
						}
						if (meta.author_uuid) {
							(document.getElementById('av-author-uuid') as HTMLInputElement).value = meta.author_uuid as string;
						}
					} else if (cat === 'assets') {
						setSelectValue('asset-type', meta.asset_type as string);
						setSelectValue('asset-platform', meta.platform as string);
						setSelectValue('asset-sdk', meta.sdk_version as string);
						setSelectValue('asset-unity', meta.unity_version as string);
						setCheckbox('asset-nsfw', meta.is_nsfw as number);
					} else if (cat === 'clothes') {
						setRadioValue('cl-gender', meta.gender_fit as string);
						setSelectValue('clothes-type', meta.clothing_type as string);
						setSelectValue('clothes-platform', meta.platform as string);
						setCheckbox('clothes-nsfw', meta.is_nsfw as number);
						setCheckbox('clothes-physbones', meta.has_physbones as number);
						const isBase = Boolean(meta.is_base);
						setCheckbox('clothes-is-base', isBase);
						if (isBase) {
							document.getElementById('clothes-base-fields')!.style.display = 'block';
							if (meta.base_avatar_name_raw) {
								(document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value = htmlDecode(meta.base_avatar_name_raw as string);
							}
							if (meta.base_avatar_uuid) {
								(document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value = meta.base_avatar_uuid as string;
							}
						}
					}
				}
			} catch {
				/* ignore, meta may not exist yet */
			}
		}
	}

	// -----------------------------------------------------------------------
	// Clothes: "is base" toggle
	// -----------------------------------------------------------------------

	document.getElementById('clothes-is-base')?.addEventListener('change', (e) => {
		const checked = (e.target as HTMLInputElement).checked;
		const baseFields = document.getElementById('clothes-base-fields')!;
		baseFields.style.display = checked ? 'block' : 'none';
		if (!checked) {
			(document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value = '';
			(document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value = '';
		}
	});

	// -----------------------------------------------------------------------
	// Author autocomplete (avatars — admin only)
	// -----------------------------------------------------------------------

	const authorInput = document.getElementById('av-author-input') as HTMLInputElement | null;
	const authorUuidInput = document.getElementById('av-author-uuid') as HTMLInputElement | null;
	const authorSuggestions = document.getElementById('av-author-suggestions');

	if (authorInput && authorSuggestions) {
		let authorDebounce: ReturnType<typeof setTimeout>;
		authorInput.addEventListener('input', () => {
			clearTimeout(authorDebounce);
			if (authorUuidInput) authorUuidInput.value = '';
			const q = authorInput.value.trim();
			if (q.length < 2) {
				authorSuggestions.style.display = 'none';
				return;
			}
			authorDebounce = setTimeout(async () => {
				try {
					const res = await fetch(`/api/authors/search?q=${encodeURIComponent(q)}`);
					const data = (await res.json()) as { uuid: string; name: string; slug: string }[];
					if (!data.length) {
						authorSuggestions.style.display = 'none';
						return;
					}
					authorSuggestions.innerHTML = data
						.map(
							(a) =>
								`<div class="suggestion-item" data-uuid="${a.uuid}" data-name="${a.name}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color)">${a.name}</div>`,
						)
						.join('');
					authorSuggestions.style.display = 'block';
					authorSuggestions.querySelectorAll<HTMLElement>('.suggestion-item').forEach((item) => {
						item.addEventListener('click', () => {
							authorInput.value = item.dataset.name!;
							if (authorUuidInput) authorUuidInput.value = item.dataset.uuid!;
							authorSuggestions.style.display = 'none';
						});
					});
				} catch {
					authorSuggestions.style.display = 'none';
				}
			}, 300);
		});
		document.addEventListener('click', (e) => {
			if (!authorInput.contains(e.target as Node)) authorSuggestions.style.display = 'none';
		});
	}

	// -----------------------------------------------------------------------
	// Clothes base avatar autocomplete (admin only)
	// -----------------------------------------------------------------------

	const clothesBaseInput = document.getElementById('clothes-base-avatar-input') as HTMLInputElement | null;
	const clothesBaseUuid = document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement | null;
	const clothesBaseSuggestions = document.getElementById('clothes-base-suggestions');

	if (clothesBaseInput && clothesBaseSuggestions) {
		let baseDebounce: ReturnType<typeof setTimeout>;
		clothesBaseInput.addEventListener('input', () => {
			clearTimeout(baseDebounce);
			if (clothesBaseUuid) clothesBaseUuid.value = '';
			const q = clothesBaseInput.value.trim();
			if (q.length < 2) {
				clothesBaseSuggestions.style.display = 'none';
				return;
			}
			baseDebounce = setTimeout(async () => {
				try {
					const res = await fetch(`/api/avatars/search?q=${encodeURIComponent(q)}&limit=10`);
					const items = (await res.json()) as { uuid: string; title: string }[];
					if (!items.length) {
						clothesBaseSuggestions.style.display = 'none';
						return;
					}
					clothesBaseSuggestions.innerHTML = items
						.map(
							(r) =>
								`<div class="suggestion-item" data-uuid="${r.uuid}" data-name="${r.title}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color)">${r.title}</div>`,
						)
						.join('');
					clothesBaseSuggestions.style.display = 'block';
					clothesBaseSuggestions.querySelectorAll<HTMLElement>('.suggestion-item').forEach((item) => {
						item.addEventListener('click', () => {
							clothesBaseInput.value = item.dataset.name!;
							if (clothesBaseUuid) clothesBaseUuid.value = item.dataset.uuid!;
							clothesBaseSuggestions.style.display = 'none';
						});
					});
				} catch {
					clothesBaseSuggestions.style.display = 'none';
				}
			}, 300);
		});
		document.addEventListener('click', (e) => {
			if (!clothesBaseInput.contains(e.target as Node)) clothesBaseSuggestions.style.display = 'none';
		});
	}

	// -----------------------------------------------------------------------
	// Markdown preview
	// -----------------------------------------------------------------------

	const descEl = document.getElementById('description') as HTMLTextAreaElement;
	const previewEl = document.getElementById('markdown-preview')!;
	const updatePreview = () => renderMarkdown(previewEl, descEl.value);
	descEl.addEventListener('input', updatePreview);
	updatePreview();

	// -----------------------------------------------------------------------
	// Render current thumbnail
	// -----------------------------------------------------------------------

	const currentThumbnailEl = document.getElementById('current-thumbnail')!;
	if (resource.thumbnail_key || resource.thumbnail_media_uuid) {
		const thumbSrc = resource.thumbnail_media_uuid
			? `/media/${resource.thumbnail_media_uuid}/thumbnail`
			: `/api/download/${resource.thumbnail_key}`;
		currentThumbnailEl.appendChild(
			createImagePreview(thumbSrc, 'image', t('upload.thumbnail')),
		);
	} else {
		currentThumbnailEl.innerHTML = `<p style="color:var(--text-muted)">${t('edit.noThumbnail')}</p>`;
	}

	// -----------------------------------------------------------------------
	// Render current reference image
	// -----------------------------------------------------------------------

	const currentReferenceEl = document.getElementById('current-reference')!;
	if (resource.reference_image_key || resource.reference_image_media_uuid) {
		const refSrc = resource.reference_image_media_uuid
			? `/media/${resource.reference_image_media_uuid}/preview`
			: `/api/download/${resource.reference_image_key}`;
		currentReferenceEl.appendChild(
			createImagePreview(refSrc, 'image', t('edit.currentReference')),
		);
	} else {
		currentReferenceEl.innerHTML = `<p style="color:var(--text-muted)">${t('edit.noReference')}</p>`;
	}

	// -----------------------------------------------------------------------
	// Render gallery images
	// -----------------------------------------------------------------------

	const currentGalleryEl = document.getElementById('current-gallery')!;
	const existingMediaFiles: MediaFile[] = resource.mediaFiles || [];
	const removedMediaUuids = new Set<string>();

	function renderGallery(): void {
		currentGalleryEl.innerHTML = '';
		const visibleFiles = existingMediaFiles.filter((mf) => !removedMediaUuids.has(mf.uuid || ''));

		if (visibleFiles.length === 0) {
			currentGalleryEl.innerHTML = `<p style="color:var(--text-muted)">${t('edit.galleryEmpty')}</p>`;
			return;
		}

		for (const mf of visibleFiles) {
			const src = mf.uuid ? `/media/${mf.uuid}/preview` : `/api/download/${mf.r2_key}`;
			currentGalleryEl.appendChild(
				createImagePreview(src, mf.media_type, undefined, false, () => {
					removedMediaUuids.add(mf.uuid || '');
					renderGallery();
				}),
			);
		}
	}
	renderGallery();

	// -----------------------------------------------------------------------
	// Render existing links
	// -----------------------------------------------------------------------

	const existingLinksEl = document.getElementById('existing-links')!;
	const allLinks: ResourceLink[] = resource.links || [];

	function renderLinks(): void {
		existingLinksEl.innerHTML = '';
		if (allLinks.length === 0) {
			existingLinksEl.innerHTML = `<p style="color:var(--text-muted)">${t('edit.noLinks')}</p>`;
			return;
		}

		for (let i = 0; i < allLinks.length; i++) {
			existingLinksEl.innerHTML += buildLinkRow(allLinks[i], i);
		}

		existingLinksEl.querySelectorAll<HTMLElement>('.link-row').forEach((row) => {
			const linkUuid = row.dataset.linkUuid || '';
			const saveBtn = row.querySelector<HTMLButtonElement>('.btn-link-save');
			const deleteBtn = row.querySelector<HTMLButtonElement>('.btn-link-delete')!;
			const titleInput = row.querySelector<HTMLInputElement>('.link-title-input')!;
			const urlInput = row.querySelector<HTMLInputElement>('.link-url-input')!;

			if (saveBtn) {
				saveBtn.addEventListener('click', async () => {
					saveBtn.disabled = true;
					try {
						const res = await fetch(`/api/resources/${id}/links/${linkUuid}`, {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								link_title: titleInput.value || null,
								link_url: urlInput.value,
							}),
						});
						if (res.ok) {
							showToast(t('edit.linkSaved'), 'success');
							DataCache.clear(`/api/resources/${id}`);
						} else {
							const data = (await res.json()) as { error?: string };
							showToast(data.error ?? t('edit.linkSaveError'), 'error');
						}
					} catch {
						showToast(t('edit.linkSaveError'), 'error');
					}
					saveBtn.disabled = false;
				});
			}

			deleteBtn.addEventListener('click', async () => {
				if (!confirm(t('edit.confirmDeleteLink'))) return;
				deleteBtn.disabled = true;
				try {
					const res = await fetch(`/api/resources/${id}/links/${linkUuid}`, { method: 'DELETE' });
					if (res.ok) {
						showToast(t('edit.linkDeleted'), 'success');
						const idx = allLinks.findIndex((l) => l.uuid === linkUuid);
						if (idx !== -1) allLinks.splice(idx, 1);
						DataCache.clear(`/api/resources/${id}`);
						renderLinks();
					} else {
						const data = (await res.json()) as { error?: string };
						showToast(data.error ?? t('edit.linkDeleteError'), 'error');
						deleteBtn.disabled = false;
					}
				} catch {
					showToast(t('edit.linkDeleteError'), 'error');
					deleteBtn.disabled = false;
				}
			});
		});
	}
	renderLinks();

	// -----------------------------------------------------------------------
	// Thumbnail change preview
	// -----------------------------------------------------------------------

	const newThumbnailInput = document.getElementById('new-thumbnail') as HTMLInputElement;
	const thumbnailPreviewEl = document.getElementById('thumbnail-preview')!;
	let newThumbnailFile: File | null = null;

	newThumbnailInput.addEventListener('change', () => {
		thumbnailPreviewEl.innerHTML = '';
		const file = newThumbnailInput.files?.[0];
		if (!file) {
			newThumbnailFile = null;
			return;
		}
		newThumbnailFile = file;
		const url = URL.createObjectURL(file);
		const isVideo = file.type.startsWith('video/');
		thumbnailPreviewEl.appendChild(
			createImagePreview(url, isVideo ? 'video' : 'image', file.name, true, () => {
				newThumbnailInput.value = '';
				thumbnailPreviewEl.innerHTML = '';
				newThumbnailFile = null;
			}),
		);
	});

	// -----------------------------------------------------------------------
	// Reference image change preview
	// -----------------------------------------------------------------------

	const newReferenceInput = document.getElementById('new-reference') as HTMLInputElement;
	const referencePreviewEl = document.getElementById('reference-preview')!;
	let newReferenceFile: File | null = null;

	newReferenceInput.addEventListener('change', () => {
		referencePreviewEl.innerHTML = '';
		const file = newReferenceInput.files?.[0];
		if (!file) {
			newReferenceFile = null;
			return;
		}
		newReferenceFile = file;
		const url = URL.createObjectURL(file);
		const isVideo = file.type.startsWith('video/');
		referencePreviewEl.appendChild(
			createImagePreview(url, isVideo ? 'video' : 'image', file.name, true, () => {
				newReferenceInput.value = '';
				referencePreviewEl.innerHTML = '';
				newReferenceFile = null;
			}),
		);
	});

	// -----------------------------------------------------------------------
	// Gallery image add preview
	// -----------------------------------------------------------------------

	const newGalleryInput = document.getElementById('new-gallery-images') as HTMLInputElement;
	const galleryPreviewEl = document.getElementById('gallery-preview')!;
	const newGalleryFiles: File[] = [];

	function countGalleryTotal(): number {
		return existingMediaFiles.filter((mf) => !removedMediaUuids.has(mf.uuid || '')).length + newGalleryFiles.length;
	}

	function renderNewGalleryPreview(): void {
		galleryPreviewEl.innerHTML = '';
		for (let i = 0; i < newGalleryFiles.length; i++) {
			const file = newGalleryFiles[i];
			const url = URL.createObjectURL(file);
			const isVideo = file.type.startsWith('video/');
			galleryPreviewEl.appendChild(
				createImagePreview(url, isVideo ? 'video' : 'image', file.name, true, () => {
					newGalleryFiles.splice(i, 1);
					renderNewGalleryPreview();
				}),
			);
		}
	}

	newGalleryInput.addEventListener('change', () => {
		const files = Array.from(newGalleryInput.files || []);
		const currentCount = countGalleryTotal();
		const limit = 8;

		if (currentCount + files.length > limit) {
			showToast(t('edit.galleryMax'), 'warning');
			newGalleryInput.value = '';
			return;
		}

		for (const file of files) {
			if (newGalleryFiles.length + currentCount >= limit) break;
			newGalleryFiles.push(file);
		}
		renderNewGalleryPreview();
		newGalleryInput.value = '';
	});

	// -----------------------------------------------------------------------
	// Upload progress bar (hidden by default)
	// -----------------------------------------------------------------------

	const progressEl = document.getElementById('upload-progress');
	const progressContainer = document.createElement('div');
	progressContainer.id = 'upload-progress';
	progressContainer.style.cssText = 'display:none;margin-top:10px;padding:10px;background:var(--bg-card);border:1px solid var(--border-color)';
	progressContainer.innerHTML = `<div id="progress-label" style="margin-bottom:5px;font-weight:bold"></div>
		<progress id="progress-bar" value="0" max="100" style="width:100%"></progress>
		<span id="progress-pct" style="font-size:0.85em;color:var(--text-muted)">0%</span>`;
	form.appendChild(progressContainer);

	function showProgress(label: string): void {
		document.getElementById('upload-progress')!.style.display = 'block';
		document.getElementById('progress-label')!.textContent = label;
	}

	function updateProgressBar(pct: number): void {
		(document.getElementById('progress-bar') as HTMLProgressElement).value = pct;
		document.getElementById('progress-pct')!.textContent = `${Math.round(pct)}%`;
	}

	function hideProgress(): void {
		document.getElementById('upload-progress')!.style.display = 'none';
	}

	// -----------------------------------------------------------------------
	// Show form
	// -----------------------------------------------------------------------

	loadingEl.style.display = 'none';
	form.style.display = 'block';

	// -----------------------------------------------------------------------
	// Form submit
	// -----------------------------------------------------------------------

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector<HTMLButtonElement>('#edit-submit-btn')!;
		const restore = () => {
			btn.disabled = false;
			btn.textContent = t('settings.save');
		};

		btn.disabled = true;
		btn.textContent = t('edit.saving');
		errorDiv.textContent = '';

		try {
			let newThumbnailUuid: string | undefined;
			let newReferenceUuid: string | null | undefined;
			const newGalleryUuids: string[] = [];

			// Upload new thumbnail
			if (newThumbnailFile) {
				showProgress(t('edit.uploadingThumbnail'));
				const fd = new FormData();
				fd.append('file', newThumbnailFile);
				fd.append('media_type', newThumbnailFile.type.startsWith('video/') ? 'video' : 'image');
				const thumbData = await uploadWithProgress('/api/upload', fd, updateProgressBar);
				newThumbnailUuid = thumbData.media_uuid;
			}

			// Upload new reference image
			if (newReferenceFile) {
				showProgress(t('edit.uploadingReference'));
				const fd = new FormData();
				fd.append('file', newReferenceFile);
				fd.append('media_type', newReferenceFile.type.startsWith('video/') ? 'video' : 'image');
				const refData = await uploadWithProgress('/api/upload', fd, updateProgressBar);
				newReferenceUuid = refData.media_uuid;
			}

			// Upload new gallery images
			if (newGalleryFiles.length > 0) {
				showProgress(t('edit.uploadingGallery'));
				for (let i = 0; i < newGalleryFiles.length; i++) {
					const file = newGalleryFiles[i];
					const fd = new FormData();
					fd.append('file', file);
					fd.append('media_type', file.type.startsWith('video/') ? 'video' : 'image');
					updateProgressBar(0);
					const data = await uploadWithProgress('/api/upload', fd, updateProgressBar);
					newGalleryUuids.push(data.media_uuid);
				}
			}

			hideProgress();

			// Compute final gallery list
			const keptMediaFiles = existingMediaFiles.filter((mf) => !removedMediaUuids.has(mf.uuid || ''));
			const galleryMediaUuids: string[] | undefined =
				newThumbnailFile || newReferenceFile !== undefined || newGalleryFiles.length > 0 || removedMediaUuids.size > 0
					? [...keptMediaFiles.map((mf) => mf.uuid!).filter(Boolean), ...newGalleryUuids]
					: undefined;

			// Parse backup links from textarea
			const backupText = (document.getElementById('backup-links') as HTMLTextAreaElement).value.trim();
			const newLinks: object[] = [];
			if (backupText) {
				const lines = backupText.split('\n').map((l) => l.trim()).filter(Boolean);
				for (const line of lines) {
					newLinks.push({
						link_url: line,
						link_type: 'download',
						display_order: 99,
					});
				}
			}

			const categoryVal = (document.getElementById('category') as HTMLSelectElement).value;
			const description = descEl.value;
			const title = (document.getElementById('title') as HTMLInputElement).value;

			const resourceBody: Record<string, unknown> = {
				title,
				category: categoryVal,
				description,
			};

			if (newThumbnailUuid) resourceBody.thumbnail_uuid = newThumbnailUuid;
			if (newReferenceUuid !== undefined) resourceBody.reference_image_uuid = newReferenceUuid;
			if (galleryMediaUuids !== undefined) resourceBody.gallery_media_uuids = galleryMediaUuids;
			if (newLinks.length > 0) resourceBody.new_links = newLinks;

			const resourceRes = await fetch(`/api/resources/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(resourceBody),
			});

			if (!resourceRes.ok) {
				const data = (await resourceRes.json()) as { error?: string };
				throw new Error(data.error ?? 'Update failed');
			}

			// Update category meta (admin only)
			if (isAdmin) {
				const metaEndpointMap: Record<string, string> = {
					avatars: `/api/avatars/${id}`,
					assets: `/api/assets/${id}`,
					clothes: `/api/clothes/${id}`,
				};
				const metaEndpoint = metaEndpointMap[categoryVal];

				if (metaEndpoint) {
					let metaBody: Record<string, unknown> = {};

					if (categoryVal === 'avatars') {
						const gender = (document.querySelector('input[name="av-gender"]:checked') as HTMLInputElement | null)?.value;
						const avatar_size = (document.querySelector('input[name="av-body-size"]:checked') as HTMLInputElement | null)?.value;
						const avatar_type = (document.getElementById('av-avatar-type') as HTMLSelectElement).value;
						const platform = (document.getElementById('av-platform') as HTMLSelectElement).value;
						const sdk_version = (document.getElementById('av-sdk') as HTMLSelectElement).value;
						const is_nsfw = (document.getElementById('av-nsfw') as HTMLInputElement).checked ? 1 : 0;
						const has_physbones = (document.getElementById('av-physbones') as HTMLInputElement).checked ? 1 : 0;
						const has_dps = (document.getElementById('av-dps') as HTMLInputElement).checked ? 1 : 0;
						const has_face_tracking = (document.getElementById('av-facetracking') as HTMLInputElement).checked ? 1 : 0;
						const has_gogoloco = (document.getElementById('av-gogoloco') as HTMLInputElement).checked ? 1 : 0;
						const has_toggles = (document.getElementById('av-toggles') as HTMLInputElement).checked ? 1 : 0;
						const is_quest_optimized = (document.getElementById('av-questoptimized') as HTMLInputElement).checked ? 1 : 0;
						const author_name_raw = (document.getElementById('av-author-input') as HTMLInputElement).value.trim() || null;
						const author_uuid = (document.getElementById('av-author-uuid') as HTMLInputElement).value.trim() || null;
						metaBody = {
							...(gender && { gender }),
							...(avatar_size && { avatar_size }),
							...(avatar_type && { avatar_type }),
							platform,
							sdk_version,
							is_nsfw,
							has_physbones,
							has_dps,
							has_face_tracking,
							has_gogoloco,
							has_toggles,
							is_quest_optimized,
							author_name_raw,
							author_uuid,
						};
					} else if (categoryVal === 'assets') {
						metaBody = {
							asset_type: (document.getElementById('asset-type') as HTMLSelectElement).value || undefined,
							platform: (document.getElementById('asset-platform') as HTMLSelectElement).value,
							sdk_version: (document.getElementById('asset-sdk') as HTMLSelectElement).value,
							unity_version: (document.getElementById('asset-unity') as HTMLSelectElement).value,
							is_nsfw: (document.getElementById('asset-nsfw') as HTMLInputElement).checked ? 1 : 0,
						};
					} else if (categoryVal === 'clothes') {
						const gender_fit = (document.querySelector('input[name="cl-gender"]:checked') as HTMLInputElement | null)?.value;
						const clothing_type = (document.getElementById('clothes-type') as HTMLSelectElement).value;
						const platform = (document.getElementById('clothes-platform') as HTMLSelectElement).value;
						const is_nsfw = (document.getElementById('clothes-nsfw') as HTMLInputElement).checked ? 1 : 0;
						const has_physbones = (document.getElementById('clothes-physbones') as HTMLInputElement).checked ? 1 : 0;
						const is_base = (document.getElementById('clothes-is-base') as HTMLInputElement).checked ? 1 : 0;
						const base_avatar_uuid = (document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value.trim() || null;
						const base_avatar_name_raw = (document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value.trim() || null;
						metaBody = {
							...(gender_fit && { gender_fit }),
							...(clothing_type && { clothing_type }),
							platform,
							is_nsfw,
							has_physbones,
							is_base,
							base_avatar_uuid,
							base_avatar_name_raw,
						};
					}

					if (Object.keys(metaBody).length > 0) {
						const metaRes = await fetch(metaEndpoint, {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(metaBody),
						});
						if (!metaRes.ok) {
							const data = (await metaRes.json()) as { error?: string };
							showToast(`Meta update: ${data.error ?? 'failed'}`, 'warning');
						}
					}
				}
			}

			DataCache.clear(`/api/resources/${id}`);
			showToast(t('settings.save') + ' \u2713', 'success');
			navigateTo(`/item/${id}`);
		} catch (err) {
			hideProgress();
			errorDiv.textContent = (err as Error).message;
			showToast((err as Error).message, 'error');
			restore();
		}
	});
}
