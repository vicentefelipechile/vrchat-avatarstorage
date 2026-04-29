// =========================================================================
// views/HomeView.ts — Homepage: latest resources grid
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { stripMarkdown, TimeUnit } from '../utils';
import type { RouteContext, Resource } from '../types';
import {
	fetchAdsForSlot,
	getCachedAdsForSlot,
	renderSidebarBanner,
	renderFeaturedArtistCard,
	renderSidebarBannerSkeleton,
	renderFeaturedArtistCardSkeleton,
	injectAdOrFade,
	wireAdZoneEvents,
	trackVisibleAdImpressions,
	AdPublic
} from '../ad-components';
import {
	renderAdPrefsPanel,
	wireAdPrefsPanel,
	shouldShowAd,
	shouldShowSlot
} from '../ad-prefs';

// =========================================================================
// Helpers
// =========================================================================

function resourceCard(res: Resource): string {
	const title = stripMarkdown(res.title).substring(0, 50);
	const description = stripMarkdown(res.description || '').substring(0, 80);
	const categoryLabel = t('cats.' + res.category) || res.category;
	const date = new Date(res.created_at).toLocaleDateString();
	const downloads = res.download_count || 0;
	const cleanDescription = description.split('--- Avatar Details')[0];

	return `
		<div class="card">
			<a href="/item/${res.uuid}" data-link class="card-link">
				${res.thumbnail_key
			? `<div class="card-image">
						<img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
			: `<div class="card-image card-image-placeholder">
						<span class="card-badge">${categoryLabel}</span>
					</div>`
		}
			</a>
			<div class="card-body">
				<h3>${title}${res.title.length > 50 ? '...' : ''}</h3>
				<div class="card-meta">
					<span>${date}</span>
					<div class="card-stats">
						<span>📥 ${downloads}</span>
					</div>
				</div>
				<p class="card-description">${cleanDescription}${cleanDescription.length >= 80 ? '...' : ''}</p>
				<div class="card-footer">
					<a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
				</div>
			</div>
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function homeView(_ctx: RouteContext): Promise<string> {
	document.title = 'VRCStorage';

	const apiCategories = ['avatars', 'assets', 'clothes'];

	// Fetch only resources — ads load asynchronously in homeAfter
	const resources = (await DataCache.fetch('/api/resources/latest', { ttl: TimeUnit.Minute * 15 }).catch(() => [])) as Resource[];

	const categoriesHtml = apiCategories
		.map((cat) => `<a href="/${cat}" data-link class="category-btn">${t('cats.' + cat)}</a>`)
		.join('');

	// Check user preferences first — if a slot is disabled, skip skeleton and fetch entirely
	// to avoid a layout shift (skeleton appearing then immediately removed).
	const sidebarEnabled = shouldShowSlot('sidebar_left');
	const featuredEnabled = shouldShowSlot('featured_artist');

	const cachedSidebar = sidebarEnabled ? getCachedAdsForSlot('sidebar_left') : null;
	const cachedFeatured = featuredEnabled ? getCachedAdsForSlot('featured_artist') : null;

	const sidebarAd: AdPublic | null = cachedSidebar !== null
		? (cachedSidebar.find((a) => shouldShowAd('sidebar_left', a.service_type)) ?? null)
		: null;
	const sidebarExclude = sidebarAd ? [sidebarAd.uuid] : [];

	const featuredAd: AdPublic | null = cachedFeatured !== null
		? (cachedFeatured.find((a) => shouldShowAd('featured_artist', a.service_type) && !sidebarExclude.includes(a.uuid)) ?? null)
		: null;

	// Only show skeleton when the slot is enabled AND we have no cached content to show.
	// Empty string when disabled = no flex item created = no layout shift.
	const sidebarHtml = !sidebarEnabled
		? ''
		: sidebarAd !== null
			? renderSidebarBanner(cachedSidebar!)
			: renderSidebarBannerSkeleton('home-sidebar-ad-placeholder');
	const featuredHtml = !featuredEnabled
		? ''
		: featuredAd !== null
			? renderFeaturedArtistCard(cachedFeatured!, sidebarExclude)
			: renderFeaturedArtistCardSkeleton('home-featured-ad-placeholder');

	const mainContent = `
		<section class="hero-section">
			<h1>${t('home.welcome')}</h1>
			<p>${t('home.browse')}</p>
			<div class="category-nav">${categoriesHtml}</div>
		</section>
		${featuredHtml}
		<section class="latest-section">
			<h2>${t('home.latest')}</h2>
			${resources.length === 0
			? `<p class="empty-message">${t('common.noResourcesFound')}</p>`
			: `<div class="grid">${resources.map(resourceCard).join('')}</div>`
		}
		</section>`;

	return `
		${renderAdPrefsPanel()}
		<div style="display:flex;gap:20px;align-items:flex-start">
			${sidebarHtml}
			<div style="flex:1;min-width:0">${mainContent}</div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export function homeAfter(_ctx: RouteContext): void {
	wireAdPrefsPanel();
	wireAdZoneEvents();

	const hasSidebarPlaceholder = !!document.getElementById('home-sidebar-ad-placeholder');
	const hasFeaturedPlaceholder = !!document.getElementById('home-featured-ad-placeholder');

	// Fetch both slots in parallel so we can exclude the sidebar ad from the featured slot.
	if (hasSidebarPlaceholder || hasFeaturedPlaceholder) {
		Promise.all([
			hasSidebarPlaceholder ? fetchAdsForSlot('sidebar_left') : Promise.resolve([] as AdPublic[]),
			hasFeaturedPlaceholder ? fetchAdsForSlot('featured_artist') : Promise.resolve([] as AdPublic[]),
		]).then(([sidebarAds, featuredAds]) => {
			// Inject sidebar first
			if (hasSidebarPlaceholder) {
				injectAdOrFade('home-sidebar-ad-placeholder', renderSidebarBanner(sidebarAds));
			}

			// For the featured slot, exclude whatever the sidebar is showing
			if (hasFeaturedPlaceholder) {
				const sidebarAd = sidebarAds.find((a) => shouldShowAd('sidebar_left', a.service_type));
				const excludeUuids = sidebarAd ? [sidebarAd.uuid] : [];
				const html = renderFeaturedArtistCard(featuredAds, excludeUuids);
				const el = document.getElementById('home-featured-ad-placeholder');
				if (el) {
					if (html) {
						el.outerHTML = html;
					} else {
						el.remove();
					}
				}
			}

			trackVisibleAdImpressions();
		}).catch((err) => console.error('[ads] home fetch failed', err));
	}
}
