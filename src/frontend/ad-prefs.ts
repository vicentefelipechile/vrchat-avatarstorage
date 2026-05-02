// =========================================================================
// ad-prefs.ts — Community Ads preference manager (blacklist model)
// All data is stored in localStorage. No server involvement.
// =========================================================================

// =========================================================================
// Types & Constants
// =========================================================================

export interface AdPrefs {
	show_ads: boolean;
	disabled_slots: string[]; // slots the user has explicitly disabled
	blocked_types: string[]; // service types the user has blocked
}

const STORAGE_KEY = 'ad_prefs';

const DEFAULT_PREFS: AdPrefs = {
	show_ads: true,
	disabled_slots: [],
	blocked_types: [],
};

export const AD_SLOTS = [
	{ id: 'sidebar_left', labelKey: 'community.prefs.slotSidebar' },
	{ id: 'featured_artist', labelKey: 'community.prefs.slotFeatured' },
	{ id: 'grid_card', labelKey: 'community.prefs.slotGrid' },
	{ id: 'detail_banner', labelKey: 'community.prefs.slotDetail' },
] as const;

export const AD_SERVICE_TYPES = [
	{ id: 'avatar_creator', labelKey: 'community.serviceTypes.avatar_creator' },
	{ id: '3d_artist', labelKey: 'community.serviceTypes.3d_artist' },
	{ id: 'illustrator', labelKey: 'community.serviceTypes.illustrator' },
	{ id: 'world_builder', labelKey: 'community.serviceTypes.world_builder' },
	{ id: 'texture_artist', labelKey: 'community.serviceTypes.texture_artist' },
	{ id: 'rigger', labelKey: 'community.serviceTypes.rigger' },
	{ id: 'shader_dev', labelKey: 'community.serviceTypes.shader_dev' },
	{ id: 'animator', labelKey: 'community.serviceTypes.animator' },
	{ id: 'voice_actor', labelKey: 'community.serviceTypes.voice_actor' },
	{ id: 'commissioner', labelKey: 'community.serviceTypes.commissioner' },
] as const;

// =========================================================================
// Read / Write
// =========================================================================

export function getAdPrefs(): AdPrefs {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_PREFS };
		const parsed = JSON.parse(raw) as Partial<AdPrefs>;
		return {
			show_ads: parsed.show_ads ?? DEFAULT_PREFS.show_ads,
			disabled_slots: Array.isArray(parsed.disabled_slots) ? parsed.disabled_slots : [],
			blocked_types: Array.isArray(parsed.blocked_types) ? parsed.blocked_types : [],
		};
	} catch {
		return { ...DEFAULT_PREFS };
	}
}

function saveAdPrefs(prefs: AdPrefs): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	window.dispatchEvent(new CustomEvent('ad-prefs-changed', { detail: prefs }));
}

export function setShowAds(value: boolean): void {
	const prefs = getAdPrefs();
	prefs.show_ads = value;
	saveAdPrefs(prefs);
}

export function toggleSlot(slot: string, enabled: boolean): void {
	const prefs = getAdPrefs();
	if (enabled) {
		prefs.disabled_slots = prefs.disabled_slots.filter((s) => s !== slot);
	} else {
		if (!prefs.disabled_slots.includes(slot)) prefs.disabled_slots.push(slot);
	}
	saveAdPrefs(prefs);
}

export function toggleType(type: string, blocked: boolean): void {
	const prefs = getAdPrefs();
	if (blocked) {
		if (!prefs.blocked_types.includes(type)) prefs.blocked_types.push(type);
	} else {
		prefs.blocked_types = prefs.blocked_types.filter((t) => t !== type);
	}
	saveAdPrefs(prefs);
}

// =========================================================================
// Visibility Checks
// =========================================================================

export function shouldShowSlot(slot: string): boolean {
	const prefs = getAdPrefs();
	if (!prefs.show_ads) return false;
	return !prefs.disabled_slots.includes(slot);
}

export function shouldShowType(type: string): boolean {
	const prefs = getAdPrefs();
	if (!prefs.show_ads) return false;
	return !prefs.blocked_types.includes(type);
}

export function shouldShowAd(slot: string, serviceType: string): boolean {
	return shouldShowSlot(slot) && shouldShowType(serviceType);
}

// =========================================================================
// Budget Easter Egg
// =========================================================================

const BUDGET_EGG_KEY = 'budget_easter_egg_seen';

export function hasBudgetEggBeenSeen(): boolean {
	return localStorage.getItem(BUDGET_EGG_KEY) === 'true';
}

export function markBudgetEggSeen(): void {
	localStorage.setItem(BUDGET_EGG_KEY, 'true');
}

// =========================================================================
// Preferences Panel (slide-in)
// =========================================================================

import { t } from './i18n';
import { getIcon } from './icons';
import { showToast } from './utils';

export function renderAdPrefsPanel(): string {
	const prefs = getAdPrefs();

	const slotsHtml = AD_SLOTS.map(
		(s) => `
		<div class="ad-prefs-row">
			<label for="prefs-slot-${s.id}">${t(s.labelKey)}</label>
			<input type="checkbox" id="prefs-slot-${s.id}" data-prefs-slot="${s.id}" class="clear-form"
				${!prefs.disabled_slots.includes(s.id) ? 'checked' : ''}>
		</div>`,
	).join('');

	const typesHtml = AD_SERVICE_TYPES.map(
		(st) => `
		<div class="ad-prefs-row">
			<label for="prefs-type-${st.id}">${t(st.labelKey)}</label>
			<input type="checkbox" id="prefs-type-${st.id}" data-prefs-type="${st.id}" class="clear-form"
				${!prefs.blocked_types.includes(st.id) ? 'checked' : ''}>
		</div>`,
	).join('');

	return `
	<div class="ad-prefs-overlay" id="ad-prefs-overlay"></div>
	<div class="ad-prefs-panel" id="ad-prefs-panel">
		<button class="ad-prefs-panel__close" id="ad-prefs-close" aria-label="${t('community.prefs.close')}">✕</button>
		<div class="ad-prefs-panel__title">${t('community.prefs.title')}</div>

		<div class="ad-prefs-section">
			<div class="ad-prefs-row">
				<label for="prefs-show-ads"><strong>${t('community.prefs.showAds')}</strong></label>
				<input type="checkbox" id="prefs-show-ads" class="clear-form" ${prefs.show_ads ? 'checked' : ''}>
			</div>
		</div>

		<div class="ad-prefs-section">
			<div class="ad-prefs-section__title">${t('community.prefs.slotsTitle')}</div>
			${slotsHtml}
		</div>

		<div class="ad-prefs-section">
			<div class="ad-prefs-section__title">${t('community.prefs.typesTitle')}</div>
			${typesHtml}
		</div>

		<div class="ad-prefs-footer">
			<button class="btn" id="ad-prefs-save">${t('community.prefs.saveBtn')}</button>
		</div>
	</div>`;
}

export interface WireAdPrefsPanelOptions {
	/** If true (default), the page reloads after saving so ad slots re-evaluate the new prefs. */
	reloadOnSave?: boolean;
}

export function wireAdPrefsPanel(options: WireAdPrefsPanelOptions = {}): void {
	const { reloadOnSave = true } = options;

	const panel = document.getElementById('ad-prefs-panel');
	const overlay = document.getElementById('ad-prefs-overlay');
	const closeBtn = document.getElementById('ad-prefs-close');
	const saveBtn = document.getElementById('ad-prefs-save');
	const showAdsCheckbox = document.getElementById('prefs-show-ads') as HTMLInputElement | null;

	if (!panel || !overlay) return;

	const close = () => {
		panel.classList.remove('open');
		overlay.classList.remove('open');
	};

	/** Disable/enable all slot + type checkboxes based on the master toggle. */
	const syncSubCheckboxes = (enabled: boolean) => {
		document.querySelectorAll<HTMLInputElement>('[data-prefs-slot], [data-prefs-type]').forEach((input) => {
			input.disabled = !enabled;
		});
	};

	// Run once on mount to reflect the stored state.
	if (showAdsCheckbox) {
		syncSubCheckboxes(showAdsCheckbox.checked);
		showAdsCheckbox.addEventListener('change', () => syncSubCheckboxes(showAdsCheckbox.checked));
	}

	closeBtn?.addEventListener('click', close);
	overlay.addEventListener('click', close);

	// Save button — reads all checkbox states at once and persists them.
	// This avoids the _prefsWired guard bug where re-rendered DOM elements
	// after SPA navigation would not receive per-change event listeners.
	saveBtn?.addEventListener('click', () => {
		const showAds = showAdsCheckbox?.checked ?? true;

		const disabledSlots: string[] = [];
		document.querySelectorAll<HTMLInputElement>('[data-prefs-slot]').forEach((input) => {
			if (!input.checked) disabledSlots.push(input.dataset.prefsSlot!);
		});

		const blockedTypes: string[] = [];
		document.querySelectorAll<HTMLInputElement>('[data-prefs-type]').forEach((input) => {
			if (!input.checked) blockedTypes.push(input.dataset.prefsType!);
		});

		saveAdPrefs({ show_ads: showAds, disabled_slots: disabledSlots, blocked_types: blockedTypes });
		showToast(t('community.prefs.saved'), 'success', 3000);
		close();

		if (reloadOnSave) {
			// Short delay so the toast is visible before the page refreshes.
			setTimeout(() => location.reload(), 800);
		}
	});
}

export function openAdPrefsPanel(): void {
	const panel = document.getElementById('ad-prefs-panel');
	const overlay = document.getElementById('ad-prefs-overlay');
	panel?.classList.add('open');
	overlay?.classList.add('open');
}

export function renderAdPrefsGearButton(label?: string): string {
	return `<button class="ad-prefs-btn" id="ad-prefs-gear-btn" aria-label="${t('community.prefs.adjust')}">${getIcon('settings', 12)} ${label ?? t('community.prefs.adjust')}</button>`;
}
