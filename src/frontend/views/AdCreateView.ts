// =========================================================================
// views/AdCreateView.ts — Create or edit a community ad
// Route: /community/create (create) or /community/:uuid/edit (edit)
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { t } from '../i18n';
import { showToast } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';
import { hasBudgetEggBeenSeen, markBudgetEggSeen } from '../ad-prefs';
import { markdownToolbarHtml, initMarkdownToolbar } from '../comment-editor';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// =========================================================================
// Types
// =========================================================================

interface AdData {
	uuid: string;
	title: string;
	tagline: string;
	description: string | null;
	service_type: string;
	destination_type: 'internal' | 'external';
	external_url: string | null;
	banner_r2_key: string | null;
	card_r2_key: string | null;
	banner_media_uuid?: string | null;
	card_media_uuid?: string | null;
}

const SERVICE_TYPE_IDS = [
	'avatar_creator',
	'3d_artist',
	'illustrator',
	'world_builder',
	'texture_artist',
	'rigger',
	'shader_dev',
	'animator',
	'voice_actor',
	'commissioner',
] as const;

// =========================================================================
// Helpers
// =========================================================================

function serviceTypeOptions(selected = ''): string {
	return SERVICE_TYPE_IDS.map(
		(id) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${t('community.serviceTypes.' + id)}</option>`,
	).join('');
}

// =========================================================================
// View
// =========================================================================

export async function adCreateView(ctx: RouteContext): Promise<string> {
	const isEdit = ctx.params.uuid !== undefined && ctx.path !== '/community/create';
	const uuid = ctx.params.uuid;

	if (!window.appState.isLoggedIn) {
		navigateTo('/login');
		return '';
	}

	document.title = isEdit ? `${t('community.editTitle')} — VRCStorage` : `${t('community.createTitle')} — VRCStorage`;

	let existing: AdData | null = null;
	if (isEdit && uuid) {
		try {
			const res = await fetch(`/api/ads/${uuid}`);
			if (res.ok) {
				const data = (await res.json()) as { ad: AdData };
				existing = data.ad;
			}
		} catch {
			/* ignore — will show empty form */
		}
	}

	const budgetBtnHtml = hasBudgetEggBeenSeen()
		? ''
		: `<button class="ad-create__budget-btn" id="ad-budget-btn" type="button">${t('community.budget.btnLabel')}</button>`;

	return `
	<div class="ad-create">
		<h1 class="ad-create__title">${isEdit ? t('community.editTitle') : t('community.createTitle')}</h1>

		${budgetBtnHtml}

		<form id="ad-create-form">
			<div class="form-group">
				<label class="form-label" for="ad-title">${t('community.form.title')} *</label>
				<input type="text" id="ad-title" class="form-input" maxlength="80"
					value="${existing?.title ?? ''}" placeholder="${t('community.form.titlePlaceholder')}">
			</div>

			<div class="form-group">
				<label class="form-label" for="ad-tagline">${t('community.form.tagline')} * <span style="color:var(--text-muted);font-size:0.78rem">(max 80)</span></label>
				<input type="text" id="ad-tagline" class="form-input" maxlength="80"
					value="${existing?.tagline ?? ''}" placeholder="${t('community.form.taglinePlaceholder')}">
				<span id="ad-tagline-count" style="font-size:0.75rem;color:var(--text-muted)">${(existing?.tagline ?? '').length}/80</span>
			</div>

			<div class="form-group">
				<label class="form-label" for="ad-service-type">${t('community.form.serviceType')} *</label>
				<select id="ad-service-type" class="form-input filter-select">
					<option value="">${t('meta.select')}</option>
					${serviceTypeOptions(existing?.service_type ?? '')}
				</select>
			</div>

			<div class="form-group">
				<label class="form-label" for="ad-dest-type">${t('community.form.destType')} *</label>
				<select id="ad-dest-type" class="form-input filter-select">
					<option value="internal" ${!existing || existing.destination_type === 'internal' ? 'selected' : ''}>${t('community.form.destInternal')}</option>
					<option value="external" ${existing?.destination_type === 'external' ? 'selected' : ''}>${t('community.form.destExternal')}</option>
				</select>
			</div>

			<div class="form-group" id="ad-external-url-group" style="${!existing || existing.destination_type === 'internal' ? 'display:none' : ''}">
				<label class="form-label" for="ad-external-url">${t('community.form.externalUrl')} *</label>
				<input type="url" id="ad-external-url" class="form-input"
					value="${existing?.external_url ?? ''}" placeholder="https://...">
			</div>

			<div class="form-group">
				<label class="form-label" for="ad-description">${t('community.form.description')}</label>
				<p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 8px">${t('community.form.descriptionHint')}</p>
				<div class="md-editor-wrap" id="ad-desc-editor-wrap">
					<div class="md-editor-tabs">
						<button type="button" class="md-editor-tab active" id="ad-desc-tab-write" data-desc-tab="write">${t('item.md.tabWrite')}</button>
						<button type="button" class="md-editor-tab" id="ad-desc-tab-preview" data-desc-tab="preview">${t('item.md.tabPreview')}</button>
					</div>
					<div class="comment-editor" id="ad-desc-editor-pane">
						${markdownToolbarHtml()}
						<textarea id="ad-description" rows="12" placeholder="${t('community.form.descriptionPlaceholder')}" style="width:100%;resize:vertical">${existing?.description ?? ''}</textarea>
					</div>
					<div class="markdown-body" id="ad-desc-preview-pane" style="display:none;min-height:240px;padding:12px;background:var(--bg-card)"></div>
				</div>
			</div>

			<div class="form-group">
				<label class="form-label">${t('community.form.bannerImage')}</label>
				<p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 8px">${t('community.form.bannerImageHint')}</p>
				<div id="ad-banner-preview" style="width:160px;height:196px;border:1px solid var(--border-color);background:var(--bg-body);overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:8px">
					${existing?.banner_media_uuid ? `<img src="/media/${existing.banner_media_uuid}/banner" style="width:100%;height:100%;object-fit:cover" alt="">` : `<span style="font-size:0.75rem;color:var(--text-muted)">${t('community.form.noImage')}</span>`}
				</div>
				<input type="file" id="ad-banner-file" accept="image/*" style="display:none">
				<button type="button" class="btn" id="ad-banner-btn">${t('community.form.uploadBanner')}</button>
				<input type="hidden" id="ad-banner-media-uuid" value="${existing?.banner_media_uuid ?? ''}">
			</div>

			<div class="form-group">
				<label class="form-label">${t('community.form.cardImage')}</label>
				<p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 8px">${t('community.form.cardImageHint')}</p>
				<div id="ad-card-preview" style="width:200px;height:150px;border:1px solid var(--border-color);background:var(--bg-body);overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:8px">
					${existing?.card_media_uuid ? `<img src="/media/${existing.card_media_uuid}/banner" style="width:100%;height:100%;object-fit:cover" alt="">` : `<span style="font-size:0.75rem;color:var(--text-muted)">${t('community.form.noImage')}</span>`}
				</div>
				<input type="file" id="ad-card-file" accept="image/*" style="display:none">
				<button type="button" class="btn" id="ad-card-btn">${t('community.form.uploadCard')}</button>
				<input type="hidden" id="ad-card-media-uuid" value="${existing?.card_media_uuid ?? ''}">
			</div>

			<div style="display:flex;gap:12px;margin-top:24px">
				<button type="submit" class="btn" id="ad-submit-btn">${isEdit ? t('community.form.save') : t('community.form.submit')}</button>
				<a href="/community" data-link class="btn">${t('common.cancel')}</a>
			</div>
		</form>

		<!-- Budget easter egg modal (injected by JS if needed) -->
	</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function adCreateAfter(ctx: RouteContext): Promise<void> {
	if (!window.appState.isLoggedIn) return;

	const isEdit = ctx.params.uuid !== undefined && ctx.path !== '/community/create';
	const uuid = ctx.params.uuid;

	// Tagline counter
	const taglineInput = document.getElementById('ad-tagline') as HTMLInputElement | null;
	const taglineCount = document.getElementById('ad-tagline-count');
	taglineInput?.addEventListener('input', () => {
		if (taglineCount) taglineCount.textContent = `${taglineInput.value.length}/80`;
	});

	// Destination type toggle
	const destSelect = document.getElementById('ad-dest-type') as HTMLSelectElement | null;
	const externalGroup = document.getElementById('ad-external-url-group');
	destSelect?.addEventListener('change', () => {
		if (externalGroup) externalGroup.style.display = destSelect.value === 'external' ? '' : 'none';
	});

	// ---- Markdown toolbar + live preview ----
	const descTextarea = document.getElementById('ad-description') as HTMLTextAreaElement | null;
	const editorPane = document.getElementById('ad-desc-editor-pane');
	const previewPane = document.getElementById('ad-desc-preview-pane');

	if (descTextarea) {
		// Wire up the formatting toolbar (bold, italic, link, etc.)
		initMarkdownToolbar(descTextarea, document.getElementById('ad-desc-editor-wrap') ?? document);

		// Tab switching: Write ↔ Preview
		document.querySelectorAll<HTMLButtonElement>('[data-desc-tab]').forEach((tab) => {
			tab.addEventListener('click', () => {
				document.querySelectorAll('[data-desc-tab]').forEach((t) => t.classList.remove('active'));
				tab.classList.add('active');

				const mode = tab.dataset.descTab;
				if (mode === 'preview') {
					if (editorPane) editorPane.style.display = 'none';
					if (previewPane) {
						previewPane.style.display = '';
						const raw = descTextarea.value.trim();
						if (raw) {
							try {
								previewPane.innerHTML = DOMPurify.sanitize(marked.parse(raw) as string);
							} catch {
								previewPane.textContent = raw;
							}
						} else {
							previewPane.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem">${t('item.md.previewEmpty')}</p>`;
						}
					}
				} else {
					if (previewPane) previewPane.style.display = 'none';
					if (editorPane) editorPane.style.display = '';
					descTextarea.focus();
				}
			});
		});
	}

	// Image upload helper
	async function uploadImage(file: File): Promise<{ uuid: string; r2_key: string } | null> {
		const formData = new FormData();
		formData.append('file', file);
		try {
			const res = await fetch('/api/upload', { method: 'PUT', body: formData });
			if (!res.ok) {
				showToast(t('community.form.uploadError'), 'error');
				return null;
			}
			const data = (await res.json()) as { media_uuid: string; r2_key: string };
			return { uuid: data.media_uuid, r2_key: data.r2_key };
		} catch {
			showToast(t('common.networkError'), 'error');
			return null;
		}
	}

	// Banner image
	const bannerBtn = document.getElementById('ad-banner-btn');
	const bannerFile = document.getElementById('ad-banner-file') as HTMLInputElement;
	const bannerPreview = document.getElementById('ad-banner-preview');
	const bannerUuidInput = document.getElementById('ad-banner-media-uuid') as HTMLInputElement;

	bannerBtn?.addEventListener('click', () => bannerFile?.click());
	bannerFile?.addEventListener('change', async () => {
		const file = bannerFile.files?.[0];
		if (!file) return;
		const dismiss = showToast(t('community.form.uploading'), 'info', 0);
		const result = await uploadImage(file);
		dismiss();
		if (result && bannerPreview) {
			bannerUuidInput.value = result.uuid;
			bannerPreview.innerHTML = `<img src="/media/${result.uuid}/banner" style="width:100%;height:100%;object-fit:cover" alt="">`;
		}
	});

	// Card image
	const cardBtn = document.getElementById('ad-card-btn');
	const cardFile = document.getElementById('ad-card-file') as HTMLInputElement;
	const cardPreview = document.getElementById('ad-card-preview');
	const cardUuidInput = document.getElementById('ad-card-media-uuid') as HTMLInputElement;

	cardBtn?.addEventListener('click', () => cardFile?.click());
	cardFile?.addEventListener('change', async () => {
		const file = cardFile.files?.[0];
		if (!file) return;
		const dismiss = showToast(t('community.form.uploading'), 'info', 0);
		const result = await uploadImage(file);
		dismiss();
		if (result && cardPreview) {
			cardUuidInput.value = result.uuid;
			cardPreview.innerHTML = `<img src="/media/${result.uuid}/banner" style="width:100%;height:100%;object-fit:cover" alt="">`;
		}
	});

	// Budget easter egg
	const budgetBtn = document.getElementById('ad-budget-btn');
	if (budgetBtn) {
		budgetBtn.addEventListener('click', () => {
			// Inject modal
			const overlay = document.createElement('div');
			overlay.className = 'budget-modal-overlay';
			overlay.innerHTML = `
			<div class="budget-modal" role="dialog" aria-modal="true">
				<h2 class="budget-modal__title">${t('community.budget.title')}</h2>
				<p class="budget-modal__body">${t('community.budget.body')}</p>
				<div class="budget-modal__footer">
					<button class="btn" id="budget-egg-ok">${t('community.budget.ok')}</button>
				</div>
			</div>`;
			document.body.appendChild(overlay);

			document.getElementById('budget-egg-ok')?.addEventListener('click', () => {
				markBudgetEggSeen();
				overlay.remove();
				budgetBtn.remove();
			});

			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					markBudgetEggSeen();
					overlay.remove();
					budgetBtn.remove();
				}
			});
		});
	}

	// Form submit
	document.getElementById('ad-create-form')?.addEventListener('submit', async (e) => {
		e.preventDefault();

		const title = (document.getElementById('ad-title') as HTMLInputElement).value.trim();
		const tagline = (document.getElementById('ad-tagline') as HTMLInputElement).value.trim();
		const serviceType = (document.getElementById('ad-service-type') as HTMLSelectElement).value;
		const destType = (document.getElementById('ad-dest-type') as HTMLSelectElement).value;
		const externalUrl = (document.getElementById('ad-external-url') as HTMLInputElement).value.trim();
		const description = (document.getElementById('ad-description') as HTMLTextAreaElement).value.trim();
		const bannerUuid = bannerUuidInput.value || null;
		const cardUuid = cardUuidInput.value || null;

		if (!title) { showToast(t('community.form.errorTitle'), 'error'); return; }
		if (!tagline) { showToast(t('community.form.errorTagline'), 'error'); return; }
		if (!serviceType) { showToast(t('community.form.errorServiceType'), 'error'); return; }
		if (destType === 'external' && !externalUrl) { showToast(t('community.form.errorExternalUrl'), 'error'); return; }

		const payload = {
			title,
			tagline,
			service_type: serviceType,
			destination_type: destType,
			external_url: destType === 'external' ? externalUrl : null,
			description: description || null,
			banner_media_uuid: bannerUuid,
			card_media_uuid: cardUuid,
		};

		const submitBtn = document.getElementById('ad-submit-btn') as HTMLButtonElement;
		submitBtn.disabled = true;
		const dismiss = showToast(t('community.form.submitting'), 'info', 0);

		try {
			const url = isEdit ? `/api/ads/${uuid}` : '/api/ads';
			const method = isEdit ? 'PUT' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			dismiss();

			const data = (await res.json()) as { success?: boolean; uuid?: string; error?: string; re_approval_required?: boolean };

			if (res.ok) {
				if (isEdit && data.re_approval_required) {
					showToast(t('community.form.updatedPendingReview'), 'info', 5000);
				} else {
					showToast(isEdit ? t('community.form.updateSuccess') : t('community.form.submitSuccess'), 'success', 5000);
				}
				navigateTo('/community');
			} else {
				showToast(data.error ?? t('common.error'), 'error');
				submitBtn.disabled = false;
			}
		} catch {
			dismiss();
			showToast(t('common.networkError'), 'error');
			submitBtn.disabled = false;
		}
	});
}
