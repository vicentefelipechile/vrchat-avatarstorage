// =========================================================================
// ad-components.ts — Community Ads display renderers
// Shared module used by HomeView, AvatarsView, AssetsView, ClothesView, ItemView.
// =========================================================================

import { t } from './i18n';
import { shouldShowAd, shouldShowSlot, openAdPrefsPanel, renderAdPrefsGearButton } from './ad-prefs';

// =========================================================================
// Types
// =========================================================================

export interface AdPublic {
	uuid: string;
	title: string;
	tagline: string;
	service_type: string;
	destination_type: 'internal' | 'external';
	external_url: string | null;
	banner_r2_key: string | null;
	card_r2_key: string | null;
	display_weight: number;
	author_username: string;
}

// =========================================================================
// Fetch
// =========================================================================

export async function fetchAdsForSlot(slot: string): Promise<AdPublic[]> {
	if (!shouldShowSlot(slot)) return [];
	try {
		const res = await fetch(`/api/ads?slot=${encodeURIComponent(slot)}`);
		if (!res.ok) return [];
		const data = (await res.json()) as { ads: AdPublic[] };
		return data.ads;
	} catch {
		return [];
	}
}

// =========================================================================
// CTA URL helper
// =========================================================================

function adHref(ad: AdPublic): string {
	return ad.destination_type === 'external' && ad.external_url ? ad.external_url : `/community/${ad.uuid}`;
}

function adTarget(ad: AdPublic): string {
	return ad.destination_type === 'external' ? 'target="_blank" rel="noopener noreferrer"' : 'data-link';
}

// =========================================================================
// Click tracking helper
// =========================================================================

export function trackAdClick(uuid: string): void {
	fetch(`/api/ads/${uuid}/click`, { method: 'POST' }).catch(() => {});
}

export function trackAdImpression(uuid: string): void {
	fetch(`/api/ads/${uuid}/impression`, { method: 'POST' }).catch(() => {});
}

// =========================================================================
// Sidebar Banner (160px-wide vertical)
// =========================================================================

export function renderSidebarBanner(ads: AdPublic[]): string {
	// Filter by type preference
	const visible = ads.filter((a) => shouldShowAd('sidebar_left', a.service_type));
	if (visible.length === 0) return '';

	const ad = visible[0];

	const imgHtml = ad.banner_r2_key
		? `<img class="ad-sidebar__img" src="/api/download/${ad.banner_r2_key}" alt="${ad.title}" loading="lazy">`
		: `<div class="ad-sidebar__img-placeholder"></div>`;

	return `
	<div class="ad-zone ad-zone--sidebar">
		<aside class="ad-sidebar" data-ad-uuid="${ad.uuid}">
			<div class="ad-sidebar__header">
				<span class="badge-community">${t('community.badge')}</span>
			</div>
			<a href="${adHref(ad)}" ${adTarget(ad)} class="ad-sidebar__img-link" data-ad-click="${ad.uuid}">
				${imgHtml}
			</a>
			<p class="ad-sidebar__title">${ad.title}</p>
			<p class="ad-sidebar__tagline">${ad.tagline}</p>
			<div class="ad-sidebar__footer">
				<a href="${adHref(ad)}" ${adTarget(ad)} class="ad-sidebar__cta" data-ad-click="${ad.uuid}">
					${t('community.visitProfile')} →
				</a>
				${renderAdPrefsGearButton()}
			</div>
		</aside>
	</div>`;
}

// =========================================================================
// Featured Artist Card (horizontal, between hero and grid)
// =========================================================================

export function renderFeaturedArtistCard(ads: AdPublic[]): string {
	const visible = ads.filter((a) => shouldShowAd('featured_artist', a.service_type));
	if (visible.length === 0) return '';

	const ad = visible[0];

	const imgHtml = ad.card_r2_key || ad.banner_r2_key
		? `<img class="ad-featured__img" src="/api/download/${ad.card_r2_key ?? ad.banner_r2_key}" alt="${ad.title}" loading="lazy">`
		: `<div class="ad-featured__img-placeholder"></div>`;

	return `
	<div class="ad-zone ad-zone--featured">
		<div class="ad-featured" data-ad-uuid="${ad.uuid}">
			${imgHtml}
			<div class="ad-featured__body">
				<div class="ad-featured__meta">
					<span class="badge-community">${t('community.badge')}</span>
					<span style="font-size:0.78rem;color:var(--text-muted)">${t('community.serviceTypes.' + ad.service_type) || ad.service_type}</span>
				</div>
				<p class="ad-featured__title">${ad.title}</p>
				<p class="ad-featured__tagline">${ad.tagline}</p>
			</div>
			<div class="ad-featured__actions">
				<a href="${adHref(ad)}" ${adTarget(ad)} class="btn" data-ad-click="${ad.uuid}">${t('community.visitProfile')}</a>
				${renderAdPrefsGearButton()}
			</div>
		</div>
	</div>`;
}

// =========================================================================
// Grid Promoted Card (shaped like a resource card)
// =========================================================================

export function renderGridPromoCard(ad: AdPublic): string {
	const imgHtml = ad.card_r2_key
		? `<img src="/api/download/${ad.card_r2_key}" alt="${ad.title}" loading="lazy">`
		: null;

	return `
	<div class="ad-grid-card" data-ad-uuid="${ad.uuid}">
		<a href="${adHref(ad)}" ${adTarget(ad)} class="ad-grid-card__image" data-ad-click="${ad.uuid}">
			${imgHtml ? imgHtml : `<div class="ad-grid-card__image-placeholder"></div>`}
			<div class="ad-grid-card__badge-wrap">
				<span class="badge-community">${t('community.badge')}</span>
			</div>
		</a>
		<div class="ad-grid-card__body">
			<p class="ad-grid-card__title">${ad.title}</p>
			<p class="ad-grid-card__tagline">${ad.tagline}</p>
		</div>
		<div class="ad-grid-card__footer">
			<a href="${adHref(ad)}" ${adTarget(ad)} class="btn" data-ad-click="${ad.uuid}">${t('community.visitProfile')}</a>
			${renderAdPrefsGearButton()}
		</div>
	</div>`;
}

// =========================================================================
// Detail Page Banner (below comments)
// =========================================================================

export function renderDetailBanner(ads: AdPublic[]): string {
	const visible = ads.filter((a) => shouldShowAd('detail_banner', a.service_type));
	if (visible.length === 0) return '';

	const ad = visible[0];

	const imgHtml = ad.banner_r2_key
		? `<img class="ad-detail-banner__img" src="/api/download/${ad.banner_r2_key}" alt="${ad.title}" loading="lazy">`
		: `<div class="ad-detail-banner__img-placeholder"></div>`;

	return `
	<div class="ad-zone ad-zone--detail">
		<div class="ad-detail-banner" data-ad-uuid="${ad.uuid}">
			${imgHtml}
			<div class="ad-detail-banner__body">
				<p class="ad-detail-banner__title">${ad.title}</p>
				<p class="ad-detail-banner__tagline">${ad.tagline}</p>
			</div>
			<div class="ad-detail-banner__actions">
				<span class="badge-community">${t('community.badge')}</span>
				<a href="${adHref(ad)}" ${adTarget(ad)} class="btn" data-ad-click="${ad.uuid}">${t('community.visitProfile')}</a>
				${renderAdPrefsGearButton()}
			</div>
		</div>
	</div>`;
}

// =========================================================================
// Wire global event delegation for ad clicks and gear button
// =========================================================================

export function wireAdZoneEvents(): void {
	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;

		// Track clicks on ad CTAs
		const clickable = target.closest<HTMLElement>('[data-ad-click]');
		if (clickable) {
			const uuid = clickable.dataset.adClick!;
			trackAdClick(uuid);
		}

		// Gear button — open preferences panel
		if (target.closest('#ad-prefs-gear-btn')) {
			openAdPrefsPanel();
		}
	});
}

// =========================================================================
// Track impressions for all visible ads on page
// =========================================================================

export function trackVisibleAdImpressions(): void {
	document.querySelectorAll<HTMLElement>('[data-ad-uuid]').forEach((el) => {
		const uuid = el.dataset.adUuid!;
		trackAdImpression(uuid);
	});
}
