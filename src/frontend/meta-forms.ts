// =========================================================================
// frontend/meta-forms.ts — Shared metadata forms for upload & edit
// =========================================================================

export function buildAvatarMetaFields(): string {
	return `<div id="avatar-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">Detalles del Avatar <span style="color:#e05c5c;font-size:0.8em">* obligatorio</span></h3>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>Género del avatar *</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="male"> Male</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="female"> Female</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="androgynous"> Androgynous</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-gender" value="undefined"> Undefined</label>
				</div>
			</div>
			<div class="form-group">
				<label><strong>Tamaño del avatar *</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="tiny"> Tiny</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="small"> Small</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="medium"> Medium</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="tall"> Tall</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="av-body-size" value="giant"> Giant</label>
				</div>
			</div>
		</div>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>Tipo de avatar *</strong></label>
				<select id="av-avatar-type" class="form-control">
					<option value="">-- Seleccionar --</option>
					<option value="anime">Anime</option>
					<option value="kemono">Kemono</option>
					<option value="furry">Furry</option>
					<option value="human">Human</option>
					<option value="semi-realistic">Semi-Realistic</option>
					<option value="chibi">Chibi</option>
					<option value="mecha">Mecha</option>
					<option value="monster">Monster</option>
					<option value="fantasy">Fantasy</option>
					<option value="sci-fi">Sci-Fi</option>
					<option value="vtuber">VTuber</option>
					<option value="other">Other</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>Plataforma *</strong></label>
				<select id="av-platform" class="form-control">
					<option value="cross">Cross-Platform (PC + Quest)</option>
					<option value="pc">PC Only</option>
					<option value="quest">Quest Only</option>
				</select>
			</div>
		</div>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>SDK</strong></label>
				<select id="av-sdk" class="form-control">
					<option value="sdk3">SDK 3.0 (por defecto)</option>
					<option value="sdk2">SDK 2.0</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>Autor original</strong> <small style="color:var(--text-muted)">(nombre del creador del avatar)</small></label>
				<input type="text" id="av-author-input" class="form-control" placeholder="Buscar autor… o escribir nombre libre" autocomplete="off">
				<input type="hidden" id="av-author-uuid">
				<div id="av-author-suggestions" style="position:absolute;z-index:100;background:var(--bg-card);border:1px solid var(--border-color);width:300px;display:none"></div>
			</div>
		</div>

		<div class="upload-grid" style="margin-top:8px">
			<div class="form-group">
				<label><strong>Extras del avatar</strong></label>
				<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px">
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-nsfw"> NSFW</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-physbones"> PhysBones</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-dps"> DPS</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-facetracking"> Face Tracking</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-gogoloco"> GoGo Loco</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-toggles"> Toggles</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="av-questoptimized"> Quest Optimized</label>
				</div>
			</div>
		</div>
	</div>`;
}

export function buildAssetMetaFields(): string {
	return `<div id="asset-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">Detalles del Asset <span style="color:#e05c5c;font-size:0.8em">* obligatorio</span></h3>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>Tipo de asset *</strong></label>
				<select id="asset-type" class="form-control">
					<option value="">-- Seleccionar --</option>
					<option value="prop">Prop</option>
					<option value="shader">Shader</option>
					<option value="particle">Particle FX</option>
					<option value="vfx">VFX</option>
					<option value="prefab">Prefab</option>
					<option value="script">Script</option>
					<option value="animation">Animation</option>
					<option value="avatar-base">Avatar Base</option>
					<option value="texture-pack">Texture Pack</option>
					<option value="sound">Sound</option>
					<option value="tool">Tool</option>
					<option value="hud">HUD</option>
					<option value="other">Other</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>Plataforma *</strong></label>
				<select id="asset-platform" class="form-control">
					<option value="cross">Cross-Platform</option>
					<option value="pc">PC Only</option>
					<option value="quest">Quest Only</option>
				</select>
			</div>
		</div>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>SDK</strong></label>
				<select id="asset-sdk" class="form-control">
					<option value="sdk3">SDK 3.0</option>
					<option value="sdk2">SDK 2.0</option>
				</select>
			</div>
			<div class="form-group">
				<label><strong>Unity Version</strong></label>
				<select id="asset-unity" class="form-control">
					<option value="2022">Unity 2022</option>
					<option value="2019">Unity 2019</option>
				</select>
			</div>
		</div>

		<div class="form-group" style="margin-top:8px">
			<label><strong>Extras</strong></label>
			<div style="display:flex;gap:12px;margin-top:6px">
				<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="asset-nsfw"> NSFW</label>
			</div>
		</div>
	</div>`;
}

export function buildClothesMetaFields(): string {
	return `<div id="clothes-meta-fields" style="display:none;background:var(--bg-card);padding:20px;margin-bottom:20px;border:1px solid var(--border-color)">
		<h3 style="margin-top:0;margin-bottom:16px">Detalles de la Prenda <span style="color:#e05c5c;font-size:0.8em">* obligatorio</span></h3>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>Género del diseño *</strong></label>
				<div class="radio-group" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="male"> Male</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="female"> Female</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="unisex"> Unisex</label>
					<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-gender" value="kemono"> Kemono</label>
				</div>
			</div>
			<div class="form-group">
				<label><strong>Tipo de prenda *</strong></label>
				<select id="clothes-type" class="form-control">
					<option value="">-- Seleccionar --</option>
					<option value="top">Top</option>
					<option value="jacket">Jacket</option>
					<option value="bottom">Bottom</option>
					<option value="dress">Dress</option>
					<option value="fullbody">Full Body</option>
					<option value="swimwear">Swimwear</option>
					<option value="shoes">Shoes</option>
					<option value="legwear">Legwear</option>
					<option value="hat">Hat</option>
					<option value="hair">Hair</option>
					<option value="accessory">Accessory</option>
					<option value="tail">Tail</option>
					<option value="ears">Ears</option>
					<option value="wings">Wings</option>
					<option value="body-part">Body Part</option>
					<option value="underwear">Underwear</option>
					<option value="other">Other</option>
				</select>
			</div>
		</div>

		<div class="upload-grid">
			<div class="form-group">
				<label><strong>Plataforma *</strong></label>
				<select id="clothes-platform" class="form-control">
					<option value="cross">Cross-Platform</option>
					<option value="pc">PC Only</option>
					<option value="quest">Quest Only</option>
				</select>
			</div>
			<div class="form-group" style="margin-top:8px">
				<label><strong>Extras</strong></label>
				<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px">
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-nsfw"> NSFW</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-physbones"> PhysBones</label>
					<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="clothes-is-base"> Es base (incluye avatar base)</label>
				</div>
			</div>
		</div>

		<div id="clothes-base-fields" style="display:none;margin-top:12px">
			<div class="form-group">
				<label><strong>¿Para qué avatar base?</strong> <small style="color:var(--text-muted)">(autocomplete o nombre libre)</small></label>
				<input type="text" id="clothes-base-avatar-input" class="form-control" placeholder="Buscar avatar base…" autocomplete="off">
				<input type="hidden" id="clothes-base-avatar-uuid">
				<div id="clothes-base-suggestions" style="position:absolute;z-index:100;background:var(--bg-card);border:1px solid var(--border-color);width:340px;display:none"></div>
			</div>
		</div>
	</div>`;
}

export function validateMeta(category: string): string | null {
	if (category === 'avatars') {
		const gender = (document.querySelector('input[name="av-gender"]:checked') as HTMLInputElement | null)?.value;
		const bodySize = (document.querySelector('input[name="av-body-size"]:checked') as HTMLInputElement | null)?.value;
		const avatarType = (document.getElementById('av-avatar-type') as HTMLSelectElement).value;
		if (!gender) return 'Selecciona el género del avatar';
		if (!bodySize) return 'Selecciona el tamaño del avatar';
		if (!avatarType) return 'Selecciona el tipo de avatar';
		return null;
	}
	if (category === 'assets') {
		const assetType = (document.getElementById('asset-type') as HTMLSelectElement).value;
		const platform = (document.getElementById('asset-platform') as HTMLSelectElement).value;
		if (!assetType) return 'Selecciona el tipo de asset';
		if (!platform) return 'Selecciona la plataforma';
		return null;
	}
	if (category === 'clothes') {
		const genderFit = (document.querySelector('input[name="cl-gender"]:checked') as HTMLInputElement | null)?.value;
		const clothingType = (document.getElementById('clothes-type') as HTMLSelectElement).value;
		const platform = (document.getElementById('clothes-platform') as HTMLSelectElement).value;
		if (!genderFit) return 'Selecciona el género del diseño';
		if (!clothingType) return 'Selecciona el tipo de prenda';
		if (!platform) return 'Selecciona la plataforma';
		return null;
	}
	return null;
}

export function collectMeta(category: string): Record<string, unknown> {
	if (category === 'avatars') {
		return {
			gender: (document.querySelector('input[name="av-gender"]:checked') as HTMLInputElement).value,
			body_size: (document.querySelector('input[name="av-body-size"]:checked') as HTMLInputElement).value,
			avatar_type: (document.getElementById('av-avatar-type') as HTMLSelectElement).value,
			platform: (document.getElementById('av-platform') as HTMLSelectElement).value,
			sdk_version: (document.getElementById('av-sdk') as HTMLSelectElement).value,
			is_nsfw: (document.getElementById('av-nsfw') as HTMLInputElement).checked ? 1 : 0,
			has_physbones: (document.getElementById('av-physbones') as HTMLInputElement).checked ? 1 : 0,
			has_dps: (document.getElementById('av-dps') as HTMLInputElement).checked ? 1 : 0,
			has_face_tracking: (document.getElementById('av-facetracking') as HTMLInputElement).checked ? 1 : 0,
			has_gogoloco: (document.getElementById('av-gogoloco') as HTMLInputElement).checked ? 1 : 0,
			has_toggles: (document.getElementById('av-toggles') as HTMLInputElement).checked ? 1 : 0,
			is_quest_optimized: (document.getElementById('av-questoptimized') as HTMLInputElement).checked ? 1 : 0,
			author_name_raw: (document.getElementById('av-author-input') as HTMLInputElement).value.trim() || null,
			author_uuid: (document.getElementById('av-author-uuid') as HTMLInputElement).value.trim() || null,
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
		return {
			gender_fit: (document.querySelector('input[name="cl-gender"]:checked') as HTMLInputElement).value,
			clothing_type: (document.getElementById('clothes-type') as HTMLSelectElement).value,
			platform: (document.getElementById('clothes-platform') as HTMLSelectElement).value,
			is_nsfw: (document.getElementById('clothes-nsfw') as HTMLInputElement).checked ? 1 : 0,
			has_physbones: (document.getElementById('clothes-physbones') as HTMLInputElement).checked ? 1 : 0,
			is_base: (document.getElementById('clothes-is-base') as HTMLInputElement).checked ? 1 : 0,
			base_avatar_uuid: (document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value.trim() || null,
			base_avatar_name_raw: (document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value.trim() || null,
		};
	}
	return {};
}

export function populateMeta(category: string, meta: Record<string, any>): void {
	const setRadio = (name: string, val: any) => {
		const el = document.querySelector(\`input[name="\${name}"][value="\${val}"]\`) as HTMLInputElement;
		if (el) el.checked = true;
	};
	const setSelect = (id: string, val: any) => {
		const el = document.getElementById(id) as HTMLSelectElement;
		if (el && val) el.value = val;
	};
	const setCheck = (id: string, val: any) => {
		const el = document.getElementById(id) as HTMLInputElement;
		if (el) el.checked = !!val;
	};
	const setInput = (id: string, val: any) => {
		const el = document.getElementById(id) as HTMLInputElement;
		if (el && val) el.value = val;
	};

	if (category === 'avatars') {
		setRadio('av-gender', meta.gender);
		setRadio('av-body-size', meta.body_size);
		setSelect('av-avatar-type', meta.avatar_type);
		setSelect('av-platform', meta.platform);
		setSelect('av-sdk', meta.sdk_version);
		setCheck('av-nsfw', meta.is_nsfw);
		setCheck('av-physbones', meta.has_physbones);
		setCheck('av-dps', meta.has_dps);
		setCheck('av-facetracking', meta.has_face_tracking);
		setCheck('av-gogoloco', meta.has_gogoloco);
		setCheck('av-toggles', meta.has_toggles);
		setCheck('av-questoptimized', meta.is_quest_optimized);
		setInput('av-author-input', meta.author_name_raw);
		setInput('av-author-uuid', meta.author_uuid);
	} else if (category === 'assets') {
		setSelect('asset-type', meta.asset_type);
		setSelect('asset-platform', meta.platform);
		setSelect('asset-sdk', meta.sdk_version);
		setSelect('asset-unity', meta.unity_version);
		setCheck('asset-nsfw', meta.is_nsfw);
	} else if (category === 'clothes') {
		setRadio('cl-gender', meta.gender_fit);
		setSelect('clothes-type', meta.clothing_type);
		setSelect('clothes-platform', meta.platform);
		setCheck('clothes-nsfw', meta.is_nsfw);
		setCheck('clothes-physbones', meta.has_physbones);
		setCheck('clothes-is-base', meta.is_base);
		setInput('clothes-base-avatar-uuid', meta.base_avatar_uuid);
		setInput('clothes-base-avatar-input', meta.base_avatar_name_raw);

		// Trigger change event to show/hide base fields
		const isBaseEl = document.getElementById('clothes-is-base');
		if (isBaseEl) isBaseEl.dispatchEvent(new Event('change'));
	}
}

export function setupMetaInteractions(): void {
	// Clothes: "is base" toggle
	document.getElementById('clothes-is-base')?.addEventListener('change', (e) => {
		const checked = (e.target as HTMLInputElement).checked;
		const baseFields = document.getElementById('clothes-base-fields')!;
		baseFields.style.display = checked ? 'block' : 'none';
		if (!checked) {
			(document.getElementById('clothes-base-avatar-input') as HTMLInputElement).value = '';
			(document.getElementById('clothes-base-avatar-uuid') as HTMLInputElement).value = '';
		}
	});

	// Author autocomplete (avatars)
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
					const res = await fetch(\`/api/authors/search?q=\${encodeURIComponent(q)}\`);
					const data = await res.json() as { uuid: string; name: string; slug: string }[];
					if (!data.length) { authorSuggestions.style.display = 'none'; return; }
					authorSuggestions.innerHTML = data.map((a) =>
						\`<div class="suggestion-item" data-uuid="\${a.uuid}" data-name="\${a.name}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color)">\${a.name}</div>\`
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

	// Clothes base avatar autocomplete
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
					const res = await fetch(\`/api/resources?category=avatars&q=\${encodeURIComponent(q)}&limit=10\`);
					const data = await res.json() as { resources?: { uuid: string; title: string }[] };
					const items = data.resources ?? [];
					if (!items.length) { clothesBaseSuggestions.style.display = 'none'; return; }
					clothesBaseSuggestions.innerHTML = items.map((r) =>
						\`<div class="suggestion-item" data-uuid="\${r.uuid}" data-name="\${r.title}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-color)">\${r.title}</div>\`
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
}
