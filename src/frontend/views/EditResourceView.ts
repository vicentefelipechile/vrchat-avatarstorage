// =========================================================================
// views/EditResourceView.ts — Edit resource metadata, images, and links
// =========================================================================

import type { RouteContext, Resource, ResourceLink, MediaFile } from '../types';
import { htmlDecode, renderMarkdown, showToast, mediaUrl, videoUrl, uploadChunked, CHUNK_SIZE } from '../lib/utils';
import { navigateTo } from '../core/router';
import { DataCache } from '../core/cache';
import { t } from '../core/i18n';

const SIZE_LIMITS = {
	image: 20 * 1024 * 1024,
	video: 100 * 1024 * 1024,
	file: 1500 * 1024 * 1024,
};
const MAX_GALLERY_FILES = 8;
const MAX_MAIN_FILES = 3;
const VALID_EXTENSIONS = ['.rar', '.zip', '.unitypackage', '.blend'];

function syncInputFiles(input: HTMLInputElement, files: File[]): void {
	const dt = new DataTransfer();
	files.forEach((f) => dt.items.add(f));
	input.files = dt.files;
}

// =========================================================================
// Helpers — Upload
// =========================================================================

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
			<div class="form-group" style="grid-column:1/-1">
				<label><strong>${t('meta.clothes.type')}</strong> <small style="color:var(--text-muted)">(1-8)</small></label>
				<div class="chip-toggle-grid" id="clothes-types">
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="top"><span>${t('meta.clothing_type.top')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="jacket"><span>${t('meta.clothing_type.jacket')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="bottom"><span>${t('meta.clothing_type.bottom')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="dress"><span>${t('meta.clothing_type.dress')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="fullbody"><span>${t('meta.clothing_type.fullbody')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="swimwear"><span>${t('meta.clothing_type.swimwear')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="shoes"><span>${t('meta.clothing_type.shoes')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="legwear"><span>${t('meta.clothing_type.legwear')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="hat"><span>${t('meta.clothing_type.hat')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="hair"><span>${t('meta.clothing_type.hair')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="accessory"><span>${t('meta.clothing_type.accessory')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="tail"><span>${t('meta.clothing_type.tail')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="ears"><span>${t('meta.clothing_type.ears')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="wings"><span>${t('meta.clothing_type.wings')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="body-part"><span>${t('meta.clothing_type.bodyPart')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="underwear"><span>${t('meta.clothing_type.underwear')}</span></label>
					<label class="chip-toggle"><input type="checkbox" name="clothes-type" value="other"><span>${t('meta.clothing_type.other')}</span></label>
				</div>
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
	// Allow only browser-generated blob: URLs and our own CDN / R2 download URLs — blocks javascript:/data: injection
	const isSafeSrc = src.startsWith('blob:') || src.startsWith('https://cdn.vrcstorage.lat/') || src.startsWith('http://localhost:8788/') || src.startsWith('/api/download/');
	if (isSafeSrc) media.setAttribute('src', src);
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

function buildLinkRow(link: ResourceLink, _index: number): string {
	const linkUuid = link.uuid || '';
	const title = link.link_title || '';
	const url = link.link_url;
	const isR2File = link.link_type === 'download' && url.startsWith('/api/download/');
	// Legacy string builder — kept for reference. Values are escaped; prefer createLinkRow() which avoids HTML-interpreting tainted data entirely.
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `<div class="link-row" data-link-uuid="${esc(linkUuid)}" data-r2-file="${isR2File ? '1' : '0'}" style="border:1px solid var(--border-color);padding:12px;margin-bottom:8px;background:var(--bg-card)">
		<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
			<div style="display:flex;flex-direction:column;gap:4px">
				<button type="button" class="btn-link-up btn btn-sm" style="padding:2px 6px;font-family:inherit" title="${t('edit.moveUp') ?? 'Up'}">▲</button>
				<button type="button" class="btn-link-down btn btn-sm" style="padding:2px 6px;font-family:inherit" title="${t('edit.moveDown') ?? 'Down'}">▼</button>
			</div>
			<div style="flex:1;min-width:140px">
				<label style="font-size:0.8em;color:var(--text-muted)">${t('edit.linkTitle')}</label>
				<input type="text" class="link-title-input form-control" value="${esc(htmlDecode(title))}" style="width:100%;${isR2File ? 'background-color:var(--bg-dropdown);' : ''}" ${isR2File ? 'readonly' : ''}>
			</div>
			<div style="flex:2;min-width:180px">
				<label style="font-size:0.8em;color:var(--text-muted)">${t('edit.linkUrl')}</label>
				<input type="text" class="link-url-input form-control" value="${esc(htmlDecode(url))}" style="width:100%;${isR2File ? 'background-color:var(--bg-dropdown);' : ''}" ${isR2File ? 'readonly' : ''}>
			</div>
			<div style="display:flex;gap:6px;align-items:flex-end">
				${isR2File ? '' : `<button type="button" class="btn-link-save btn btn-sm" style="font-family:inherit">${t('edit.linkSave')}</button>`}
				<button type="button" class="btn-link-delete btn btn-sm btn-danger" style="font-family:inherit">${t('edit.linkDelete')}</button>
			</div>
		</div>
	</div>`;
}

function createLinkRow(link: ResourceLink): HTMLElement {
	const title = htmlDecode(link.link_title || '');
	const url = htmlDecode(link.link_url);
	const isR2File = link.link_type === 'download' && url.startsWith('/api/download/');
	const row = document.createElement('div');
	row.className = 'link-row';
	row.dataset.linkUuid = link.uuid || '';
	row.dataset.r2File = isR2File ? '1' : '0';
	row.style.cssText = 'border:1px solid var(--border-color);padding:12px;margin-bottom:8px;background:var(--bg-card)';
	// Static layout only — tainted title/url are set via .value below, never as HTML
	row.innerHTML = `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
			<div style="display:flex;flex-direction:column;gap:4px">
				<button type="button" class="btn-link-up btn btn-sm" style="padding:2px 6px;font-family:inherit" title="${t('edit.moveUp') ?? 'Up'}">▲</button>
				<button type="button" class="btn-link-down btn btn-sm" style="padding:2px 6px;font-family:inherit" title="${t('edit.moveDown') ?? 'Down'}">▼</button>
			</div>
			<div style="flex:1;min-width:140px">
				<label style="font-size:0.8em;color:var(--text-muted)">${t('edit.linkTitle')}</label>
				<input type="text" class="link-title-input form-control" style="width:100%">
			</div>
			<div style="flex:2;min-width:180px">
				<label style="font-size:0.8em;color:var(--text-muted)">${t('edit.linkUrl')}</label>
				<input type="text" class="link-url-input form-control" style="width:100%">
			</div>
			<div style="display:flex;gap:6px;align-items:flex-end">
				${isR2File ? '' : `<button type="button" class="btn-link-save btn btn-sm" style="font-family:inherit">${t('edit.linkSave')}</button>`}
				<button type="button" class="btn-link-delete btn btn-sm btn-danger" style="font-family:inherit">${t('edit.linkDelete')}</button>
			</div>
		</div>`;
	const titleInput = row.querySelector<HTMLInputElement>('.link-title-input')!;
	const urlInput = row.querySelector<HTMLInputElement>('.link-url-input')!;
	titleInput.value = title;
	urlInput.value = url;
	if (isR2File) {
		titleInput.readOnly = true;
		urlInput.readOnly = true;
		titleInput.style.backgroundColor = 'var(--bg-dropdown)';
		urlInput.style.backgroundColor = 'var(--bg-dropdown)';
	}
	return row;
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
				<fieldset id="edit-fieldset" style="border:0;margin:0;padding:0;min-width:0">
				<div class="form-group">
					<label><strong>${t('upload.name')} ${t('upload.required')}</strong></label>
					<input type="text" id="title" required placeholder="${t('upload.resourceName')}" style="width:100%">
				</div>

				<div class="form-group">
					<label><strong>${t('upload.cat')} ${t('upload.required')}</strong></label>
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
					<div class="upload-grid">
						<div><textarea id="description" rows="12" placeholder="${t('upload.markdownPlaceholder')}" style="width:100%;font-family:monospace;resize:vertical"></textarea></div>
						<div><div class="preview-container"><strong>${t('upload.preview')}:</strong><hr><div id="markdown-preview" class="markdown-body"></div></div></div>
					</div>
				</div>

				<div class="form-group" style="margin-bottom:20px">
					<label><strong>${t('edit.currentThumbnail')}</strong></label>
					<div id="current-thumbnail" style="margin-bottom:8px"></div>
					<label><strong>${t('edit.changeThumbnail')}</strong></label>
					<input type="file" id="new-thumbnail" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm">
					<small style="color:var(--text-muted)">${t('upload.imageVideo')}</small>
					<div id="thumbnail-preview" style="margin-top:10px"></div>
				</div>

				<div class="form-group" style="margin-bottom:20px">
					<label><strong>${t('edit.currentReference')}</strong></label>
					<div id="current-reference" style="margin-bottom:8px"></div>
					<label><strong>${t('edit.changeReference')}</strong></label>
					<input type="file" id="new-reference" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm">
					<small style="color:var(--text-muted)">${t('upload.optional')}</small>
					<div id="reference-preview" style="margin-top:10px"></div>
				</div>

				<div class="form-group" style="margin-bottom:20px">
					<label><strong>${t('edit.galleryTitle')}</strong></label>
					<div id="current-gallery" style="margin-bottom:8px"></div>
					<label><strong>${t('edit.galleryAdd')}</strong></label>
					<input type="file" id="new-gallery-images" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm" multiple>
					<small style="color:var(--text-muted)">${t('edit.galleryMax')}</small>
					<div id="gallery-preview" style="margin-top:10px"></div>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.mainFile')} (.rar, .zip, .unitypackage, .blend) (${t('upload.optional')})</strong></label>
					<input type="file" id="new-main-files" accept=".rar,.zip,.unitypackage,.blend" multiple>
					<small style="color:var(--text-muted)">${t('upload.fileTypes')} (Max ${MAX_MAIN_FILES})</small>
					<div id="new-main-file-info" style="margin-top:10px;color:var(--text-muted)"></div>
				</div>

				<div class="form-group">
					<label><strong>${t('edit.existingLinks')}</strong></label>
					<div id="existing-links" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px"></div>
					<label><strong>${t('upload.backupLinks')}</strong></label>
					<div id="new-links-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px"></div>
					<button type="button" id="add-new-link" class="btn" style="padding:8px 14px">+ ${t('upload.addBackup')}</button>
					<small style="display:block;margin-top:6px;color:var(--text-muted)">${t('upload.backupLinksHint')}</small>
				</div>

				<div id="edit-error" style="color:red;margin:10px 0"></div>

				<div style="display:flex;gap:10px;margin-top:20px">
					<button type="submit" id="edit-submit-btn" class="btn" style="flex:1">${t('settings.save')}</button>
					<a href="/item/${id}" data-link class="btn" style="background:#666">${t('common.cancel')}</a>
				</div>
				</fieldset>
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
						const cTypes = (meta.clothing_type as unknown) as string[] | string | undefined;
						const arr = Array.isArray(cTypes) ? cTypes : cTypes ? [cTypes] : [];
						for (const ct of arr) {
							const el = document.querySelector<HTMLInputElement>(`input[name="clothes-type"][value="${ct}"]`);
							if (el) el.checked = true;
						}
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
	if (resource.thumbnail_media_uuid) {
		const thumbSrc = mediaUrl(resource.thumbnail_media_uuid, 'med');
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
	if (resource.reference_image_media_uuid) {
		const refSrc = mediaUrl(resource.reference_image_media_uuid, 'med');
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
			// Media → CDN by uuid: a video plays from its normalized MP4, an image from its `med` variant;
			// a private 'file' would stay on /api/download.
			const src =
				mf.uuid && mf.media_type === 'video'
					? videoUrl(mf.uuid)
					: mf.uuid && mf.media_type === 'image'
						? mediaUrl(mf.uuid, 'med')
						: `/api/download/${mf.r2_key}`;
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
	const allLinks: ResourceLink[] = [...(resource.links || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
	const initialOrder = allLinks.map((l) => l.uuid!);
	let reorderDirty = false;

	function updateMoveButtons(): void {
		const rows = Array.from(existingLinksEl.querySelectorAll<HTMLElement>('.link-row'));
		rows.forEach((row, idx) => {
			const up = row.querySelector<HTMLButtonElement>('.btn-link-up');
			const down = row.querySelector<HTMLButtonElement>('.btn-link-down');
			if (up) up.disabled = idx === 0;
			if (down) down.disabled = idx === rows.length - 1;
		});
	}

	function renderLinks(): void {
		existingLinksEl.innerHTML = '';
		if (allLinks.length === 0) {
			existingLinksEl.innerHTML = `<p style="color:var(--text-muted)">${t('edit.noLinks')}</p>`;
			return;
		}

		for (let i = 0; i < allLinks.length; i++) {
			existingLinksEl.appendChild(createLinkRow(allLinks[i]));
		}

		existingLinksEl.querySelectorAll<HTMLElement>('.link-row').forEach((row) => {
			const linkUuid = row.dataset.linkUuid || '';
			const saveBtn = row.querySelector<HTMLButtonElement>('.btn-link-save');
			const deleteBtn = row.querySelector<HTMLButtonElement>('.btn-link-delete')!;
			const upBtn = row.querySelector<HTMLButtonElement>('.btn-link-up')!;
			const downBtn = row.querySelector<HTMLButtonElement>('.btn-link-down')!;
			const titleInput = row.querySelector<HTMLInputElement>('.link-title-input')!;
			const urlInput = row.querySelector<HTMLInputElement>('.link-url-input')!;

			upBtn.addEventListener('click', async () => {
				const idx = allLinks.findIndex((l) => l.uuid === linkUuid);
				if (idx > 0) {
					const [m] = allLinks.splice(idx, 1);
					allLinks.splice(idx - 1, 0, m);
					reorderDirty = true;
					renderLinks();
				}
			});
			downBtn.addEventListener('click', async () => {
				const idx = allLinks.findIndex((l) => l.uuid === linkUuid);
				if (idx !== -1 && idx < allLinks.length - 1) {
					const [m] = allLinks.splice(idx, 1);
					allLinks.splice(idx + 1, 0, m);
					reorderDirty = true;
					renderLinks();
				}
			});

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
							const idx = allLinks.findIndex((l) => l.uuid === linkUuid);
							if (idx !== -1) {
								allLinks[idx].link_title = titleInput.value || null;
								allLinks[idx].link_url = urlInput.value;
							}
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
						reorderDirty = true;
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
		updateMoveButtons();
	}
	renderLinks();

	// -----------------------------------------------------------------------
	// New backup links (dynamic, like UploadView)
	// -----------------------------------------------------------------------

	const newLinksList = document.getElementById('new-links-list')!;
	const addNewLinkBtn = document.getElementById('add-new-link')!;

	const addNewLinkRow = (value = '') => {
		const row = document.createElement('div');
		row.className = 'new-link-row';
		row.style.cssText = 'display:flex;gap:8px;align-items:center';
		const input = document.createElement('input');
		input.type = 'url';
		input.className = 'form-control new-link-input';
		input.placeholder = t('upload.backupUrlPlaceholder');
		input.value = value;
		input.style.flex = '1';
		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'btn';
		remove.textContent = t('upload.removeBackup');
		remove.style.cssText = 'padding:8px 12px;flex:none';
		remove.onclick = () => row.remove();
		row.append(input, remove);
		newLinksList.appendChild(row);
		input.focus();
	};

	addNewLinkBtn.addEventListener('click', () => addNewLinkRow());

	const collectNewLinks = () =>
		Array.from(newLinksList.querySelectorAll<HTMLInputElement>('.new-link-input'))
			.map((el) => el.value.trim())
			.filter(Boolean);

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
		return existingMediaFiles.filter((mf) => !removedMediaUuids.has(mf.uuid || '') && (mf.media_type === 'image' || mf.media_type === 'video')).length + newGalleryFiles.length;
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
		const limit = MAX_GALLERY_FILES;

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
	// Main file upload (additional files, like UploadView)
	// -----------------------------------------------------------------------

	const newMainFilesInput = document.getElementById('new-main-files') as HTMLInputElement;
	const newMainFileInfo = document.getElementById('new-main-file-info')!;
	const selectedNewMainFiles: File[] = [];

	const renderNewMainFileInfo = () => {
		newMainFileInfo.innerHTML = '';
		if (selectedNewMainFiles.length > MAX_MAIN_FILES) {
			const warn = document.createElement('div');
			warn.textContent = t('upload.tooManyFiles');
			warn.style.cssText = 'color:#e05c5c;font-weight:bold;margin-bottom:8px';
			newMainFileInfo.appendChild(warn);
		}
		const maxMb = (SIZE_LIMITS.file / 1024 / 1024).toFixed(0);
		selectedNewMainFiles.forEach((file, idx) => {
			const isValidExt = VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
			const isValidSize = file.size <= SIZE_LIMITS.file;
			const mb = (file.size / 1024 / 1024).toFixed(2);
			let color = 'green', sym = '✓', msg = `${file.name} (${mb} MB)`;
			if (!isValidExt) { color = 'red'; sym = '✗'; msg += ` - ${t('upload.errorInvalidFileType')}`; }
			else if (!isValidSize) { color = 'red'; sym = '✗'; msg += ` - ${t('upload.errorFileTooLarge')} (max ${maxMb}MB)`; }
			const row = document.createElement('div');
			row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:2px 0';
			if (idx >= MAX_MAIN_FILES) row.style.opacity = '0.45';
			const remove = document.createElement('button');
			remove.type = 'button';
			remove.textContent = '✕';
			remove.style.cssText = 'background:#dc3545;color:white;border:none;border-radius:3px;width:20px;height:20px;cursor:pointer;font-weight:bold;flex:none';
			remove.onclick = () => {
				selectedNewMainFiles.splice(idx, 1);
				syncInputFiles(newMainFilesInput, selectedNewMainFiles);
				renderNewMainFileInfo();
			};
			const span = document.createElement('span');
			span.style.color = color;
			span.textContent = `${sym} ${msg}`;
			row.append(remove, span);
			newMainFileInfo.appendChild(row);
		});
	};

	newMainFilesInput.addEventListener('change', (e) => {
		const incoming = Array.from((e.target as HTMLInputElement).files ?? []);
		selectedNewMainFiles.push(...incoming);
		(e.target as HTMLInputElement).value = '';
		syncInputFiles(newMainFilesInput, selectedNewMainFiles);
		if (selectedNewMainFiles.length > MAX_MAIN_FILES) showToast(t('upload.tooManyFiles'), 'warning');
		renderNewMainFileInfo();
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

			// Upload new main files (additional downloadable archives, mirrors UploadView)
			const newMainFileData: { r2_key: string; media_uuid: string; originalName: string; size: number }[] = [];
			if (selectedNewMainFiles.length > 0) {
				if (selectedNewMainFiles.length > MAX_MAIN_FILES) {
					hideProgress();
					throw new Error(t('upload.tooManyFiles'));
				}
				if (selectedNewMainFiles.some((f) => !VALID_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)))) {
					hideProgress();
					throw new Error(t('upload.errorInvalidFileType'));
				}
				for (let i = 0; i < selectedNewMainFiles.length; i++) {
					const f = selectedNewMainFiles[i];
					const label = `${t('upload.uploadingFile')} (${i + 1}/${selectedNewMainFiles.length})`;
					showProgress(label);
					updateProgressBar(0);
					let fileData: { r2_key: string; media_uuid: string };
					if (f.size > CHUNK_SIZE) {
						fileData = await uploadChunked(f, 'file', (p) => updateProgressBar(p));
					} else {
						const fd = new FormData();
						fd.append('file', f);
						fd.append('media_type', 'file');
						fileData = await uploadWithProgress('/api/upload', fd, updateProgressBar);
					}
					newMainFileData.push({ ...fileData, originalName: f.name, size: f.size });
				}
			}

			hideProgress();

			// Persist link order if changed (before adding new links so display_order stays sequential)
			if (reorderDirty) {
				const orderedUuids = allLinks.map((l) => l.uuid!).filter(Boolean) as string[];
				const orderChanged = orderedUuids.length !== initialOrder.length || orderedUuids.some((u, i) => u !== initialOrder[i]);
				if (orderChanged && orderedUuids.length > 0) {
					const reorderRes = await fetch(`/api/resources/${id}/links/reorder`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ ordered_uuids: orderedUuids }),
					});
					if (!reorderRes.ok) {
						const data = (await reorderRes.json()) as { error?: string };
						showToast(data.error ?? t('edit.reorderError') ?? 'Reorder failed', 'warning');
					} else {
						DataCache.clear(`/api/resources/${id}`);
					}
				}
			}

			// Compute final gallery list (keep all existing media including file media, plus new gallery + new main file media to avoid orphan cleanup)
			const keptMediaFiles = existingMediaFiles.filter((mf) => !removedMediaUuids.has(mf.uuid || ''));
			const newMainFileMediaUuids = newMainFileData.map((f) => f.media_uuid);
			const hasMediaChanges =
				newThumbnailFile ||
				newReferenceFile !== undefined ||
				newGalleryFiles.length > 0 ||
				newMainFileData.length > 0 ||
				removedMediaUuids.size > 0;
			const galleryMediaUuids: string[] | undefined = hasMediaChanges
				? [...keptMediaFiles.map((mf) => mf.uuid!).filter(Boolean), ...newGalleryUuids, ...newMainFileMediaUuids]
				: undefined;

			// Collect new links: uploaded main files (R2) + external backup URLs (mirrors UploadView)
			const fileLinks = newMainFileData.map((f) => ({
				link_url: `/api/download/${f.r2_key}`,
				link_title: f.originalName,
				link_type: 'download' as const,
			}));
			const newLinkUrls = collectNewLinks();
			const backupLinks = newLinkUrls.map((url) => ({
				link_url: url,
				link_type: 'download' as const,
				link_title: null,
			}));
			const newLinks: object[] = [...fileLinks, ...backupLinks];

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
						const clothing_type = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="clothes-type"]:checked')).map((el) => el.value);
						const platform = (document.getElementById('clothes-platform') as HTMLSelectElement).value;
						const is_nsfw = (document.getElementById('clothes-nsfw') as HTMLInputElement).checked ? 1 : 0;
						const has_physbones = (document.getElementById('clothes-physbones') as HTMLInputElement).checked ? 1 : 0;
						const is_base = (document.getElementById('clothes-is-base') as HTMLInputElement).checked ? 1 : 0;
						const base_avatar_uuid = (document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value.trim() || null;
						const base_avatar_name_raw = (document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value.trim() || null;
						metaBody = {
							...(gender_fit && { gender_fit }),
							...(clothing_type.length && { clothing_type }),
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
