// =========================================================================
// ad-components.ts — Community Ads display renderers
// Shared module used by HomeView, AvatarsView, AssetsView, ClothesView, ItemView.
// =========================================================================

import { t } from './i18n';
import { shouldShowAd, shouldShowSlot, openAdPrefsPanel, renderAdPrefsGearButton } from './ad-prefs';
import { DataCache } from './cache';
import { TimeUnit } from './utils';

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

const AD_TTL = TimeUnit.Minute * 10;

/** Returns the URL used as the DataCache key for a given slot. */
function slotUrl(slot: string): string {
	return `/api/ads?slot=${encodeURIComponent(slot)}`;
}

/**
 * Synchronous cache read — checks both the in-memory Map and localStorage.
 * Returns the cached ad array if still fresh, or null on a cache miss / disabled slot.
 * Used by viewFns to skip the skeleton entirely on repeat page visits AND after navigations/reloads.
 */
export function getCachedAdsForSlot(slot: string): AdPublic[] | null {
	const url = slotUrl(slot);
	const now = Date.now();

	// 1. In-memory first (fastest path)
	const memEntry = DataCache.cache.get(url);
	if (memEntry && now - memEntry.timestamp < AD_TTL) {
		return (memEntry.data as { ads: AdPublic[] }).ads;
	}

	// 2. localStorage — survives navigations and page reloads
	try {
		const raw = localStorage.getItem(`cache:${url}`);
		if (raw) {
			const parsed = JSON.parse(raw) as { data: { ads: AdPublic[] }; timestamp: number };
			if (now - parsed.timestamp < AD_TTL) {
				// Promote to in-memory so the next SPA navigation is instant
				DataCache.cache.set(url, parsed);
				return parsed.data.ads;
			}
			localStorage.removeItem(`cache:${url}`);
		}
	} catch {
		// localStorage unavailable — fall through
	}

	return null;
}

export async function fetchAdsForSlot(slot: string): Promise<AdPublic[]> {
	if (!shouldShowSlot(slot)) return [];
	try {
		// persistent:true writes to localStorage so getCachedAdsForSlot can read it
		// on the next page load / SPA navigation and skip the skeleton.
		const data = await DataCache.fetch<{ ads: AdPublic[] }>(slotUrl(slot), { ttl: AD_TTL, persistent: true });
		return data.ads;
	} catch {
		return [];
	}
}

// =========================================================================
// Skeleton renderers
// Shown immediately while the async fetch is in flight.
// Mirror the exact dimensions of each real ad slot.
// =========================================================================

export function renderSidebarBannerSkeleton(id: string): string {
	return `
	<div class="ad-zone ad-zone--sidebar" id="${id}">
		<div class="ad-skeleton--sidebar">
			<div class="sk-img ad-skeleton__block"></div>
			<div class="sk-line ad-skeleton__block"></div>
			<div class="sk-line-short ad-skeleton__block"></div>
			<div class="sk-line-short ad-skeleton__block" style="width:45%"></div>
		</div>
	</div>`;
}

export function renderSidebarBannerFixedSkeleton(id: string): string {
	return `
	<div class="ad-zone ad-zone--sidebar-fixed" id="${id}">
		<div class="ad-skeleton--sidebar">
			<div class="sk-img ad-skeleton__block"></div>
			<div class="sk-line ad-skeleton__block"></div>
			<div class="sk-line-short ad-skeleton__block"></div>
			<div class="sk-line-short ad-skeleton__block" style="width:45%"></div>
		</div>
	</div>`;
}

export function renderFeaturedArtistCardSkeleton(id: string): string {
	return `
	<div class="ad-zone ad-zone--featured ad-skeleton--featured" id="${id}">
		<div class="sk-img ad-skeleton__block"></div>
		<div class="sk-body">
			<div class="sk-line ad-skeleton__block"></div>
			<div class="sk-line-short ad-skeleton__block"></div>
		</div>
		<div class="sk-actions ad-skeleton__block"></div>
	</div>`;
}

// =========================================================================
// injectAdOrFade
// Replaces a skeleton placeholder with real ad HTML, or removes it
// immediately when no ad is available.
// Usage: injectAdOrFade(id, realHtml)
// =========================================================================

export function injectAdOrFade(placeholderId: string, html: string): void {
	const el = document.getElementById(placeholderId);
	if (!el) return;
	if (html) {
		el.outerHTML = html;
	} else {
		el.remove();
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
	fetch(`/api/ads/${uuid}/click`, { method: 'POST' }).catch(() => { });
}

export function trackAdImpression(uuid: string): void {
	fetch(`/api/ads/${uuid}/impression`, { method: 'POST' }).catch(() => { });
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
					${t('community.viewDetails')} →
				</a>
				${renderAdPrefsGearButton()}
			</div>
		</aside>
	</div>`;
}

// Fixed-position variant for category pages (Avatars / Assets / Clothes).
// The ad is taken out of the document flow so the filter+results layout
// keeps the full container width. Hidden via CSS below 1200px viewport.
export function renderSidebarBannerFixed(ads: AdPublic[]): string {
	const visible = ads.filter((a) => shouldShowAd('sidebar_left', a.service_type));
	if (visible.length === 0) return '';

	const ad = visible[0];

	const imgHtml = ad.banner_r2_key
		? `<img class="ad-sidebar__img" src="/api/download/${ad.banner_r2_key}" alt="${ad.title}" loading="lazy">`
		: `<div class="ad-sidebar__img-placeholder"></div>`;

	return `
	<div class="ad-zone ad-zone--sidebar-fixed">
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
					${t('community.viewDetails')} →
				</a>
				<!-- ${renderAdPrefsGearButton()} -->
			</div>
		</aside>
	</div>`;
}

// =========================================================================
// Featured Artist Card (horizontal, between hero and grid)
// =========================================================================

export function renderFeaturedArtistCard(ads: AdPublic[], excludeUuids: string[] = []): string {
	const visible = ads.filter((a) => shouldShowAd('featured_artist', a.service_type) && !excludeUuids.includes(a.uuid));
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
				<a href="${adHref(ad)}" ${adTarget(ad)} class="btn" data-ad-click="${ad.uuid}">${t('community.viewDetails')}</a>
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
			<a href="${adHref(ad)}" ${adTarget(ad)} class="btn" data-ad-click="${ad.uuid}">${t('community.viewDetails')}</a>
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
				<a href="${adHref(ad)}" ${adTarget(ad)} class="btn" data-ad-click="${ad.uuid}">${t('community.viewDetails')}</a>
				<!-- ${renderAdPrefsGearButton()} -->
			</div>
		</div>
	</div>`;
}

// =========================================================================
// Wire global event delegation for ad clicks and gear button
// =========================================================================

let _adEventsWired = false;

export function wireAdZoneEvents(): void {
	if (_adEventsWired) return;
	_adEventsWired = true;

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
