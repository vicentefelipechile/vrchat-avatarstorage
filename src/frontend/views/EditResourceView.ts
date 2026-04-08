// =========================================================================
// views/EditResourceView.ts — Edit resource metadata and add files
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { renderMarkdown, showToast } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext, Resource } from '../types';

// =========================================================================
// Helpers
// =========================================================================

const CHUNK_SIZE = 30 * 1024 * 1024;

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
// Meta block HTML builders
// =========================================================================

function buildAvatarMetaFields(): string {
	return `<div id="avatar-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">${t('meta.avatar.titleAdmin')} <span style="color:#e05c5c;font-size:0.8em">${t('meta.adminOnly')}</span></h3>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.avatar.gender')}</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="male"> ${t('meta.gender.male')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="female"> ${t('meta.gender.female')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="androgynous"> ${t('meta.gender.androgynous')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="undefined"> ${t('meta.gender.undefined')}</label>
				</div>
			</div>
			<div class="form-group">
				<label><strong>${t('meta.avatar.size')}</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="tiny"> ${t('meta.size.tiny')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="small"> ${t('meta.size.small')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="medium"> ${t('meta.size.medium')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="tall"> ${t('meta.size.tall')}</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="giant"> ${t('meta.size.giant')}</label>
				</div>
			</div>
		</div>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>${t('meta.avatar.type')}</strong></label>
				<select id="av-avatar-type" class="form-control">
					<option value="">${t('meta.select')}</option>
					<option value="anime">${t('meta.type.anime')}</option>
					<option value="kemono">${t('meta.type.kemono')}</option>
					<option value="furry">${t('meta.type.furry')}</option>
					<option value="human">${t('meta.type.human')}</option>
					<option value="semi-realistic">${t('meta.type.semiRealistic')}</option>
					<option value="chibi">${t('meta.type.chibi')}</option>
					<option value="mecha">${t('meta.type.mecha')}</option>
					<option value="monster">${t('meta.type.monster')}</option>
					<option value="fantasy">${t('meta.type.fantasy')}</option>
					<option value="sci-fi">${t('meta.type.sciFi')}</option>
					<option value="vtuber">${t('meta.type.vtuber')}</option>
					<option value="other">${t('meta.type.other')}</option>
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
				<label><strong>${t('meta.sdk.title')}</strong></label>
				<select id="av-sdk" class="form-control">
					<option value="sdk3">${t('meta.sdk.v3Default')}</option>
					<option value="sdk2">${t('meta.sdk.v2')}</option>
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
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-nsfw"> ${t('meta.extras.nsfw')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-physbones"> ${t('meta.extras.physbones')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-dps"> ${t('meta.extras.dps')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-facetracking"> ${t('meta.extras.facetracking')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-gogoloco"> ${t('meta.extras.gogoloco')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-toggles"> ${t('meta.extras.toggles')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-questoptimized"> ${t('meta.extras.questOptimized')}</label>
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
			<label><strong>${t('meta.extras')}</strong></label>
			<div style="display:flex;gap:12px;margin-top:6px">
				<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="asset-nsfw"> ${t('meta.extras.nsfw')}</label>
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
				<label><strong>${t('meta.extras')}</strong></label>
				<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px">
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-nsfw"> ${t('meta.extras.nsfw')}</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-physbones"> ${t('meta.extras.physbones')}</label>
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
						<option value="assets">${t('cats.assets')}</option>
						<option value="clothes">${t('cats.clothes')}</option>
					</select>
				</div>

				<div class="form-group">
					<label><strong>${t('upload.tags')}</strong> <small>(${t('upload.tagsHint')})</small></label>
					<input type="text" id="tags" placeholder="anime, horror, quest, nsfw">
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
					<h3 style="margin-top:0">${t('edit.addFileHeader')}</h3>
					<p style="font-size:0.9em;color:var(--text-muted)">${t('edit.addFileDesc')}</p>
					<label><strong>${t('upload.file')}</strong></label>
					<input type="file" id="new-file" accept=".rar,.zip,.unitypackage,.blend">
					<div id="new-file-info"></div>
					<div id="upload-progress" style="display:none;margin-top:10px">
						<progress id="upload-bar" value="0" max="100" style="width:100%"></progress>
						<span id="upload-percent">0%</span>
					</div>
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
// Helpers — set select/radio values
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
	const isAdmin = window.appState?.isAdmin ?? false;

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

	// Populate base fields
	(document.getElementById('title') as HTMLInputElement).value = resource.title;
	(document.getElementById('category') as HTMLSelectElement).value = resource.category;
	(document.getElementById('tags') as HTMLInputElement).value = resource.tags?.map((tag) => tag.name).join(', ') ?? '';
	(document.getElementById('description') as HTMLTextAreaElement).value = resource.description ?? '';

	// -----------------------------------------------------------------------
	// Category → meta block toggle + load existing meta (admin-only)
	// -----------------------------------------------------------------------

	const categorySelect = document.getElementById('category') as HTMLSelectElement;
	const avatarMetaEl = document.getElementById('avatar-meta-fields')!;
	const assetMetaEl = document.getElementById('asset-meta-fields')!;
	const clothesMetaEl = document.getElementById('clothes-meta-fields')!;

	function toggleMetaBlocks(): void {
		const cat = categorySelect.value;
		// Meta editing is admin-only
		avatarMetaEl.style.display = isAdmin && cat === 'avatars' ? 'block' : 'none';
		assetMetaEl.style.display = isAdmin && cat === 'assets' ? 'block' : 'none';
		clothesMetaEl.style.display = isAdmin && cat === 'clothes' ? 'block' : 'none';
	}
	categorySelect.addEventListener('change', toggleMetaBlocks);
	toggleMetaBlocks();

	// Load and pre-populate existing meta fields (admin only)
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
					const meta = await metaRes.json() as Record<string, unknown>;
					if (cat === 'avatars') {
						setRadioValue('av-gender', meta.gender as string);
						setRadioValue('av-body-size', meta.body_size as string);
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
							(document.getElementById('av-author-input') as HTMLInputElement).value = meta.author_name_raw as string;
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
								(document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value = meta.base_avatar_name_raw as string;
							}
							if (meta.base_avatar_uuid) {
								(document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value = meta.base_avatar_uuid as string;
							}
						}
					}
				}
			} catch { /* ignore, meta may not exist yet */ }
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
			if (q.length < 2) { authorSuggestions.style.display = 'none'; return; }
			authorDebounce = setTimeout(async () => {
				try {
					const res = await fetch(`/api/authors/search?q=${encodeURIComponent(q)}`);
					const data = await res.json() as { uuid: string; name: string; slug: string }[];
					if (!data.length) { authorSuggestions.style.display = 'none'; return; }
					authorSuggestions.innerHTML = data.map((a) =>
						`<div class="suggestion-item" data-uuid="${a.uuid}" data-name="${a.name}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color)">${a.name}</div>`,
					).join('');
					authorSuggestions.style.display = 'block';
					authorSuggestions.querySelectorAll<HTMLElement>('.suggestion-item').forEach((item) => {
						item.addEventListener('click', () => {
							authorInput.value = item.dataset.name!;
							if (authorUuidInput) authorUuidInput.value = item.dataset.uuid!;
							authorSuggestions.style.display = 'none';
						});
					});
				} catch { authorSuggestions.style.display = 'none'; }
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
			if (q.length < 2) { clothesBaseSuggestions.style.display = 'none'; return; }
			baseDebounce = setTimeout(async () => {
				try {
					const res = await fetch(`/api/resources?category=avatars&q=${encodeURIComponent(q)}&limit=10`);
					const data = await res.json() as { resources?: { uuid: string; title: string }[] };
					const items = data.resources ?? [];
					if (!items.length) { clothesBaseSuggestions.style.display = 'none'; return; }
					clothesBaseSuggestions.innerHTML = items.map((r) =>
						`<div class="suggestion-item" data-uuid="${r.uuid}" data-name="${r.title}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color)">${r.title}</div>`,
					).join('');
					clothesBaseSuggestions.style.display = 'block';
					clothesBaseSuggestions.querySelectorAll<HTMLElement>('.suggestion-item').forEach((item) => {
						item.addEventListener('click', () => {
							clothesBaseInput.value = item.dataset.name!;
							if (clothesBaseUuid) clothesBaseUuid.value = item.dataset.uuid!;
							clothesBaseSuggestions.style.display = 'none';
						});
					});
				} catch { clothesBaseSuggestions.style.display = 'none'; }
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

	loadingEl.style.display = 'none';
	form.style.display = 'block';

	// -----------------------------------------------------------------------
	// Form submit
	// -----------------------------------------------------------------------

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector<HTMLButtonElement>('#edit-submit-btn')!;
		const restore = () => { btn.disabled = false; btn.textContent = t('settings.save'); };

		btn.disabled = true;
		btn.textContent = t('edit.saving');
		errorDiv.textContent = '';

		try {
			const newFileInput = document.getElementById('new-file') as HTMLInputElement;
			const newFile = newFileInput.files?.[0];
			const uploadedFileLinks: object[] = [];

			// Upload new file if selected (chunked for large files)
			if (newFile) {
				const progressEl = document.getElementById('upload-progress')!;
				const barEl = document.getElementById('upload-bar') as HTMLProgressElement;
				const pctEl = document.getElementById('upload-percent')!;
				progressEl.style.display = 'block';

				const onProgress = (p: number) => {
					barEl.value = p;
					pctEl.textContent = `${Math.round(p)}%`;
				};

				let fileData: { r2_key: string; media_uuid: string };
				if (newFile.size > CHUNK_SIZE) {
					fileData = await uploadLargeFile(newFile, onProgress);
				} else {
					const fd = new FormData();
					fd.append('file', newFile);
					fd.append('media_type', 'file');
					fileData = await uploadWithProgress('/api/upload', fd, onProgress);
				}

				uploadedFileLinks.push({
					link_url: `/api/download/${fileData.r2_key}`,
					link_title: newFile.name,
					link_type: 'download',
					display_order: 99,
				});
			}

			const tagsRaw = (document.getElementById('tags') as HTMLInputElement).value;
			const tags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean);
			const categoryVal = (document.getElementById('category') as HTMLSelectElement).value;
			const description = descEl.value;
			const title = (document.getElementById('title') as HTMLInputElement).value;

			// 1. Update base resource fields
			const resourceRes = await fetch(`/api/resources/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					category: categoryVal,
					description,
					tags,
					new_links: uploadedFileLinks.length ? uploadedFileLinks : undefined,
				}),
			});

			if (!resourceRes.ok) {
				const data = await resourceRes.json() as { error?: string };
				throw new Error(data.error ?? 'Update failed');
			}

			// 2. Update category meta (admin only)
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
						const body_size = (document.querySelector('input[name="av-body-size"]:checked') as HTMLInputElement | null)?.value;
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
							...(body_size && { body_size }),
							...(avatar_type && { avatar_type }),
							platform, sdk_version,
							is_nsfw, has_physbones, has_dps, has_face_tracking, has_gogoloco, has_toggles, is_quest_optimized,
							author_name_raw, author_uuid,
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
							platform, is_nsfw, has_physbones, is_base, base_avatar_uuid, base_avatar_name_raw,
						};
					}

					if (Object.keys(metaBody).length > 0) {
						const metaRes = await fetch(metaEndpoint, {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(metaBody),
						});
						if (!metaRes.ok) {
							const data = await metaRes.json() as { error?: string };
							// Non-fatal: meta update failed but resource was saved
							showToast(`Meta update: ${data.error ?? 'failed'}`, 'warning');
						}
					}
				}
			}

			DataCache.clear(`/api/resources/${id}`);
			showToast(t('settings.save') + ' ✓', 'success');
			navigateTo(`/item/${id}`);
		} catch (err) {
			errorDiv.textContent = (err as Error).message;
			showToast((err as Error).message, 'error');
			restore();
		}
	});
}
