// =========================================================================
// views/UploadView.ts — Resource upload form with chunked upload support
// =========================================================================

import { t } from '../i18n';
import { DataCache } from '../cache';
import { renderMarkdown, showToast } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';

// =========================================================================
// Helpers
// =========================================================================

interface ImageDimCheck {
	valid: boolean;
	error?: string;
}

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
				resolve({
					valid: false,
					error: `Image too large. Max: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} got ${img.width}x${img.height}`,
				});
			} else {
				resolve({ valid: true });
			}
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve({ valid: false, error: 'Could not load image' });
		};
		img.src = url;
	});
}

function createPreviewItem(tag: 'img' | 'video', url: string, name: string, onDelete: () => void): HTMLDivElement {
	const container = document.createElement('div');
	container.className = 'preview-item';
	container.style.cssText =
		'display:inline-block;position:relative;border:2px solid var(--border-color);padding:10px;margin:5px;background:var(--bg-card);vertical-align:top';

	const btn = document.createElement('button');
	btn.innerHTML = '✕';
	btn.style.cssText =
		'position:absolute;top:5px;right:5px;background:#dc3545;color:white;border:none;border-radius:3px;width:25px;height:25px;cursor:pointer;font-weight:bold;z-index:10';
	btn.onclick = (e) => {
		e.preventDefault();
		onDelete();
	};

	const media = document.createElement(tag) as HTMLImageElement | HTMLVideoElement;
	media.src = url;
	media.style.cssText = 'max-width:200px;max-height:200px;display:block';
	if (tag === 'video') (media as HTMLVideoElement).controls = true;

	const label = document.createElement('div');
	label.textContent = name;
	label.style.cssText =
		'margin-top:5px;font-size:12px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';

	container.append(btn, media, label);
	return container;
}

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
		<h3 style="margin-top:0;margin-bottom:16px">${t('meta.avatar.title')} <span style="color:#e05c5c;font-size:0.8em">${t('meta.required')}</span></h3>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.avatar.gender')}</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="male"> ${t('meta.avatar_gender.male')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="female"> ${t('meta.avatar_gender.female')}</label>
					<!-- <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="androgynous"> ${t('meta.avatar_gender.androgynous')}</label> -->
					<!-- <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="undefined"> ${t('meta.avatar_gender.undefined')}</label> -->
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
					<option value="anime">${t('meta.avatar_type.anime')}</option>
					<option value="kemono">${t('meta.avatar_type.kemono')}</option>
					<option value="furry">${t('meta.avatar_type.furry')}</option>
					<option value="semi-realistic">${t('meta.avatar_type.semiRealistic')}</option>
					<option value="chibi">${t('meta.avatar_type.chibi')}</option>
					<option value="mecha">${t('meta.avatar_type.mecha')}</option>
					<option value="monster">${t('meta.avatar_type.monster')}</option>
					<option value="fantasy">${t('meta.avatar_type.fantasy')}</option>
					<option value="sci-fi">${t('meta.avatar_type.sciFi')}</option>
					<option value="vtuber">${t('meta.avatar_type.vtuber')}</option>
					<option value="other">${t('meta.avatar_type.other')}</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.platform.title')}</strong></label>
				<select id="av-platform" class="form-control">
					<option value="pc">${t('meta.platform.pc')}</option>
					<option value="cross">${t('meta.platform.cross')}</option>
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
				<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px">
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
		<h3 style="margin-top:0;margin-bottom:16px">${t('meta.asset.title')} <span style="color:#e05c5c;font-size:0.8em">${t('meta.required')}</span></h3>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.asset.type')}</strong></label>
				<select id="asset-type" class="form-control">
					<option value="">${t('meta.select')}</option>
					<option value="prop">${t('meta.assetType.prop')}</option>
					<option value="shader">${t('meta.assetType.shader')}</option>
					<option value="particle">${t('meta.assetType.particle')}</option>
					<option value="vfx">${t('meta.assetType.vfx')}</option>
					<option value="prefab">${t('meta.assetType.prefab')}</option>
					<option value="script">${t('meta.assetType.script')}</option>
					<option value="animation">${t('meta.assetType.animation')}</option>
					<option value="avatar-base">${t('meta.assetType.avatarBase')}</option>
					<option value="texture-pack">${t('meta.assetType.texturePack')}</option>
					<option value="sound">${t('meta.assetType.sound')}</option>
					<option value="tool">${t('meta.assetType.tool')}</option>
					<option value="hud">${t('meta.assetType.hud')}</option>
					<option value="other">${t('meta.assetType.other')}</option>
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
				<label><strong>${t('meta.sdk.title')}</strong></label>
				<select id="asset-sdk" class="form-control">
					<option value="sdk3">${t('meta.sdk.v3')}</option>
					<option value="sdk2">${t('meta.sdk.v2')}</option>
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
			<label><strong>${t('meta.features')}</strong></label>
			<div style="display:flex;gap:12px;margin-top:6px">
				<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="asset-nsfw"> ${t('meta.features.nsfw')}</label>
			</div>
		</div>
	</div>`;
}

function buildClothesMetaFields(): string {
	return `<div id="clothes-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">${t('meta.clothes.title')} <span style="color:#e05c5c;font-size:0.8em">${t('meta.required')}</span></h3>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.clothes.gender')}</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="male"> ${t('meta.gender.male')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="female"> ${t('meta.gender.female')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="unisex"> ${t('meta.gender.unisex')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="kemono"> ${t('meta.gender.kemono')}</label>
				</div>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.clothes.type')}</strong></label>
				<select id="clothes-type" class="form-control">
					<option value="">${t('meta.select')}</option>
					<option value="top">${t('meta.clothesType.top')}</option>
					<option value="jacket">${t('meta.clothesType.jacket')}</option>
					<option value="bottom">${t('meta.clothesType.bottom')}</option>
					<option value="dress">${t('meta.clothesType.dress')}</option>
					<option value="fullbody">${t('meta.clothesType.fullbody')}</option>
					<option value="swimwear">${t('meta.clothesType.swimwear')}</option>
					<option value="shoes">${t('meta.clothesType.shoes')}</option>
					<option value="legwear">${t('meta.clothesType.legwear')}</option>
					<option value="hat">${t('meta.clothesType.hat')}</option>
					<option value="hair">${t('meta.clothesType.hair')}</option>
					<option value="accessory">${t('meta.clothesType.accessory')}</option>
					<option value="tail">${t('meta.clothesType.tail')}</option>
					<option value="ears">${t('meta.clothesType.ears')}</option>
					<option value="wings">${t('meta.clothesType.wings')}</option>
					<option value="body-part">${t('meta.clothesType.bodyPart')}</option>
					<option value="underwear">${t('meta.clothesType.underwear')}</option>
					<option value="other">${t('meta.clothesType.other')}</option>
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
				<label><strong>${t('meta.features')}</strong></label>
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
				<button type="submit" id="upload-submit-btn" class="btn" style="width:100%;padding:15px;font-size:16px">${t('upload.btn')}</button>
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
		const config = (await fetch('/api/config').then((r) => r.json())) as { turnstileSiteKey?: string };
		if (window.turnstile && config.turnstileSiteKey) {
			turnstileWidgetId =
				window.turnstile.render('#turnstile-container', {
					sitekey: config.turnstileSiteKey,
					callback: (token: string) => {
						turnstileToken = token;
					},
					'expired-callback': () => {
						turnstileToken = null;
					},
				}) ?? null;
		}
	} catch {
		/* ignore */
	}

	// -----------------------------------------------------------------------
	// Category → meta block toggle
	// -----------------------------------------------------------------------

	const categorySelect = document.getElementById('category') as HTMLSelectElement;
	const avatarMetaEl = document.getElementById('avatar-meta-fields')!;
	const assetMetaEl = document.getElementById('asset-meta-fields')!;
	const clothesMetaEl = document.getElementById('clothes-meta-fields')!;

	function toggleMetaBlocks(): void {
		const cat = categorySelect.value;
		avatarMetaEl.style.display = cat === 'avatars' ? 'block' : 'none';
		assetMetaEl.style.display = cat === 'assets' ? 'block' : 'none';
		clothesMetaEl.style.display = cat === 'clothes' ? 'block' : 'none';
	}
	categorySelect.addEventListener('change', toggleMetaBlocks);
	toggleMetaBlocks();

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
	// Author autocomplete (avatars)
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
	// Clothes base avatar autocomplete
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
					const res = await fetch(`/api/resources?category=avatars&q=${encodeURIComponent(q)}&limit=10`);
					const data = (await res.json()) as { resources?: { uuid: string; title: string }[] };
					const items = data.resources ?? [];
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
		if (file.size > maxSize) {
			showToast(`File too large. Max: ${(maxSize / 1024 / 1024).toFixed(0)}MB`, 'warning');
			thumbnailInput.value = '';
			thumbnailPreview.innerHTML = '';
			return;
		}
		if (!isVideo) {
			const c = await validateImageDimensions(file);
			if (!c.valid) {
				showToast(c.error || 'Invalid dimensions', 'error');
				thumbnailInput.value = '';
				thumbnailPreview.innerHTML = '';
				return;
			}
		}
		const url = URL.createObjectURL(file);
		const item = createPreviewItem(isVideo ? 'video' : 'img', url, file.name, () => {
			thumbnailInput.value = '';
			thumbnailPreview.innerHTML = '';
			URL.revokeObjectURL(url);
		});
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
		if (files.length > 8) {
			showToast(t('upload.maxFiles') || 'Max 8 files', 'warning');
			referenceInput.value = '';
			selectedRefFiles = [];
			renderRefPreview();
			return;
		}
		for (const f of files) {
			const maxSize = f.type.startsWith('video/') ? SIZE_LIMITS.video : SIZE_LIMITS.image;
			if (f.size > maxSize) {
				showToast(`File "${f.name}" too large.`, 'warning');
				referenceInput.value = '';
				selectedRefFiles = [];
				renderRefPreview();
				return;
			}
			if (f.type.startsWith('image/')) {
				const c = await validateImageDimensions(f);
				if (!c.valid) {
					showToast(`Image "${f.name}": ${c.error}`, 'error');
					referenceInput.value = '';
					selectedRefFiles = [];
					renderRefPreview();
					return;
				}
			}
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
		if (files.length > 3) {
			fileInfo.innerHTML = `<span style="color:red">✗ ${t('upload.errorMaxFiles')}</span>`;
			uploadError.textContent = t('upload.errorMaxFiles');
			fileInput.value = '';
			return;
		}

		let allValid = true;
		files.forEach((file) => {
			const isValidExt = VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
			const isValidSize = file.size <= SIZE_LIMITS.file;
			if (!isValidExt || !isValidSize) allValid = false;
			const mb = (file.size / 1024 / 1024).toFixed(2);
			const maxMb = (SIZE_LIMITS.file / 1024 / 1024).toFixed(0);
			let color = 'green',
				sym = '✓',
				msg = `${file.name} (${mb} MB)`;
			if (!isValidExt) {
				color = 'red';
				sym = '✗';
				msg += ` - ${t('upload.errorInvalidFileType')}`;
			} else if (!isValidSize) {
				color = 'red';
				sym = '✗';
				msg += ` - ${t('upload.errorFileTooLarge')} (max ${maxMb}MB)`;
			}
			const div = document.createElement('div');
			const span = document.createElement('span');
			span.style.color = color;
			span.textContent = `${sym} ${msg}`;
			div.appendChild(span);
			fileInfo.appendChild(div);
		});
		if (!allValid) {
			uploadError.textContent = `${t('upload.error')}: Invalid files.`;
			fileInput.value = '';
		}
	});

	// -----------------------------------------------------------------------
	// Client-side meta validation
	// -----------------------------------------------------------------------

	function validateMeta(category: string): string | null {
		if (category === 'avatars') {
			const gender = (document.querySelector('input[name="av-gender"]:checked') as HTMLInputElement | null)?.value;
			const bodySize = (document.querySelector('input[name="av-body-size"]:checked') as HTMLInputElement | null)?.value;
			const avatarType = (document.getElementById('av-avatar-type') as HTMLSelectElement).value;
			if (!gender) return t('upload.val.avatarGender');
			if (!bodySize) return t('upload.val.avatarSize');
			if (!avatarType) return t('upload.val.avatarType');
			return null;
		}
		if (category === 'assets') {
			const assetType = (document.getElementById('asset-type') as HTMLSelectElement).value;
			const platform = (document.getElementById('asset-platform') as HTMLSelectElement).value;
			if (!assetType) return t('upload.val.assetType');
			if (!platform) return t('upload.val.platform');
			return null;
		}
		if (category === 'clothes') {
			const genderFit = (document.querySelector('input[name="cl-gender"]:checked') as HTMLInputElement | null)?.value;
			const clothingType = (document.getElementById('clothes-type') as HTMLSelectElement).value;
			const platform = (document.getElementById('clothes-platform') as HTMLSelectElement).value;
			if (!genderFit) return t('upload.val.clothesGender');
			if (!clothingType) return t('upload.val.clothesType');
			if (!platform) return t('upload.val.platform');
			return null;
		}
		return null;
	}

	function collectMeta(category: string): Record<string, unknown> {
		if (category === 'avatars') {
			const avatar_gender = (document.querySelector('input[name="av-gender"]:checked') as HTMLInputElement).value;
			const avatar_size = (document.querySelector('input[name="av-body-size"]:checked') as HTMLInputElement).value;
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
			const authorInput = (document.getElementById('av-author-input') as HTMLInputElement).value.trim();
			const authorUuid = (document.getElementById('av-author-uuid') as HTMLInputElement).value.trim() || null;
			return {
				avatar_gender,
				avatar_size,
				avatar_type,
				platform,
				sdk_version,
				is_nsfw,
				has_physbones,
				has_dps,
				has_face_tracking,
				has_gogoloco,
				has_toggles,
				is_quest_optimized,
				author_name_raw: authorInput || null,
				author_uuid: authorUuid,
			};
		}
		if (category === 'assets') {
			return {
				asset_type: (document.getElementById('asset-type') as HTMLSelectElement).value,
				platform: (document.getElementById('asset-platform') as HTMLSelectElement).value,
				sdk_version: (document.getElementById('asset-sdk') as HTMLSelectElement).value,
				unity_version: (document.getElementById('asset-unity') as HTMLSelectElement).value,
				is_nsfw: (document.getElementById('asset-nsfw') as HTMLInputElement).checked ? 1 : 0,
			};
		}
		if (category === 'clothes') {
			const gender_fit = (document.querySelector('input[name="cl-gender"]:checked') as HTMLInputElement).value;
			const clothing_type = (document.getElementById('clothes-type') as HTMLSelectElement).value;
			const platform = (document.getElementById('clothes-platform') as HTMLSelectElement).value;
			const is_nsfw = (document.getElementById('clothes-nsfw') as HTMLInputElement).checked ? 1 : 0;
			const has_physbones = (document.getElementById('clothes-physbones') as HTMLInputElement).checked ? 1 : 0;
			const is_base = (document.getElementById('clothes-is-base') as HTMLInputElement).checked ? 1 : 0;
			const base_avatar_uuid = (document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value.trim() || null;
			const base_avatar_name_raw = (document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value.trim() || null;
			return { gender_fit, clothing_type, platform, is_nsfw, has_physbones, is_base, base_avatar_uuid, base_avatar_name_raw };
		}
		return {};
	}

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

		const btn = form.querySelector<HTMLButtonElement>('#upload-submit-btn')!;
		const nav = document.querySelector<HTMLElement>('nav');
		const resetState = () => {
			btn.disabled = false;
			btn.textContent = t('upload.btn');
			nav?.style.setProperty('pointer-events', 'auto');
			nav?.style.setProperty('opacity', '1');
		};

		const category = categorySelect.value;

		// Client-side meta validation
		const metaError = validateMeta(category);
		if (metaError) {
			uploadError.textContent = metaError;
			showToast(metaError, 'error');
			return;
		}

		btn.disabled = true;
		btn.textContent = t('upload.uploading');
		uploadError.textContent = '';
		nav?.style.setProperty('pointer-events', 'none');
		nav?.style.setProperty('opacity', '0.5');

		const preventNav = (ev: BeforeUnloadEvent) => {
			ev.preventDefault();
			ev.returnValue = '';
		};
		window.addEventListener('beforeunload', preventNav);

		const title = (document.getElementById('title') as HTMLInputElement).value;
		const description = descriptionField.value;
		const meta = collectMeta(category);

		const mainFiles = Array.from(fileInput.files ?? []);
		const thumbnail = thumbnailInput.files?.[0];
		const referenceFiles = referenceInput.files;

		if (mainFiles.length === 0) {
			uploadError.textContent = `${t('upload.error')}: No file selected`;
			resetState();
			window.removeEventListener('beforeunload', preventNav);
			return;
		}
		if (mainFiles.length > 3) {
			uploadError.textContent = `${t('upload.error')}: Max 3 files`;
			resetState();
			window.removeEventListener('beforeunload', preventNav);
			return;
		}
		if (mainFiles.some((f) => !VALID_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)))) {
			uploadError.textContent = `${t('upload.error')}: ${t('upload.errorMainFile')}`;
			resetState();
			window.removeEventListener('beforeunload', preventNav);
			return;
		}
		if (!thumbnail) {
			uploadError.textContent = `${t('upload.error')}: ${t('upload.errorThumbnail')}`;
			resetState();
			window.removeEventListener('beforeunload', preventNav);
			return;
		}
		if (!turnstileToken) {
			uploadError.textContent = `${t('upload.error')}: ${t('upload.errorCaptcha')}`;
			resetState();
			window.removeEventListener('beforeunload', preventNav);
			return;
		}

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

			// 4. Create resource via category-specific endpoint
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
				? backupLinksRaw
						.split('\n')
						.map((u) => u.trim())
						.filter(Boolean)
						.map((url, i) => ({
							link_url: url,
							link_title: 'Backup ' + (i + 1),
							link_type: 'download',
							display_order: fileLinks.length + i + 1,
						}))
				: [];

			const endpointMap: Record<string, string> = {
				avatars: '/api/avatars',
				assets: '/api/assets',
				clothes: '/api/clothes',
			};
			const endpoint = endpointMap[category] ?? '/api/resources';

			const body = {
				title,
				description,
				category,
				thumbnail_uuid: thumbData.media_uuid,
				reference_image_uuid: galleryUuids[0] ?? null,
				media_files: [thumbData.media_uuid, ...galleryUuids, ...uploadedFiles.map((f) => f.media_uuid)],
				links: [...fileLinks, ...extra],
				meta,
				token: turnstileToken,
			};

			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (res.ok) {
				const data = (await res.json()) as { uuid: string };
				DataCache.clear('/api/resources/latest');
				DataCache.clear(`/api/resources?category=${category}`);
				window.removeEventListener('beforeunload', preventNav);
				navigateTo('/item/' + data.uuid);
			} else {
				const err = (await res.json()) as { error?: string };
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
