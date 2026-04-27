// =========================================================================
// views/CommunityView.ts — Community ads directory (/community)
// =========================================================================

import { t } from '../i18n';
import type { RouteContext } from '../types';
import { navigateTo } from '../router';
import { showToast } from '../utils';
import { trackAdClick } from '../ad-components';
import { renderAdPrefsPanel, wireAdPrefsPanel } from '../ad-prefs';

// =========================================================================
// Types
// =========================================================================

interface DirectoryAd {
	uuid: string;
	title: string;
	tagline: string;
	service_type: string;
	destination_type: 'internal' | 'external';
	external_url: string | null;
	banner_r2_key: string | null;
	card_r2_key: string | null;
	author_username: string;
}

const SERVICE_TYPE_IDS = [
	'avatar_creator', '3d_artist', 'illustrator', 'world_builder',
	'texture_artist', 'rigger', 'shader_dev', 'animator', 'voice_actor', 'commissioner',
] as const;

// =========================================================================
// Helpers
// =========================================================================

function adHref(ad: DirectoryAd): string {
	return ad.destination_type === 'external' && ad.external_url ? ad.external_url : `/community/${ad.uuid}`;
}

function adTarget(ad: DirectoryAd): string {
	return ad.destination_type === 'external' ? 'target="_blank" rel="noopener noreferrer"' : 'data-link';
}

function communityCard(ad: DirectoryAd): string {
	const imgSrc = ad.card_r2_key ?? ad.banner_r2_key;
	const imgHtml = imgSrc
		? `<img class="community-card__img" src="/api/download/${imgSrc}" alt="${ad.title}" loading="lazy">`
		: `<div class="community-card__img-placeholder"></div>`;

	return `
	<div class="community-card" data-service-type="${ad.service_type}">
		<a href="${adHref(ad)}" ${adTarget(ad)} data-ad-click="${ad.uuid}">
			${imgHtml}
		</a>
		<div class="community-card__body">
			<div class="community-card__meta">
				<span class="badge-community">${t('community.badge')}</span>
				<span style="font-size:0.75rem;color:var(--text-muted)">${t('community.serviceTypes.' + ad.service_type) || ad.service_type}</span>
			</div>
			<p class="community-card__title">${ad.title}</p>
			<p class="community-card__tagline">${ad.tagline}</p>
		</div>
		<div class="community-card__footer">
			<a href="${adHref(ad)}" ${adTarget(ad)} class="btn" data-ad-click="${ad.uuid}">${t('community.visitProfile')}</a>
		</div>
	</div>`;
}

function filterOptions(currentType: string): string {
	const opts = SERVICE_TYPE_IDS.map(
		(id) => `<option value="${id}" ${currentType === id ? 'selected' : ''}>${t('community.serviceTypes.' + id)}</option>`,
	).join('');
	return `<option value="">${t('community.directory.allTypes')}</option>${opts}`;
}

// =========================================================================
// View
// =========================================================================

export async function communityView(ctx: RouteContext): Promise<string> {
	document.title = `${t('community.directory.title')} — VRCStorage`;

	let ads: DirectoryAd[] = [];
	try {
		const res = await fetch('/api/ads?slot=all');
		if (res.ok) {
			const data = (await res.json()) as { ads: DirectoryAd[] };
			ads = data.ads;
		}
	} catch { /* show empty */ }

	const typeFilter = ctx.query.get('type') || '';
	const search = ctx.query.get('q') || '';

	const filtered = ads.filter((a) => {
		if (typeFilter && a.service_type !== typeFilter) return false;
		if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.tagline.toLowerCase().includes(search.toLowerCase())) return false;
		return true;
	});

	const cardsHtml = filtered.length === 0
		? `<p class="empty-message">${t('community.directory.noAds')}</p>`
		: filtered.map(communityCard).join('');

	return `
	<div class="community-directory">
		${renderAdPrefsPanel()}

		<div class="community-directory__header">
			<h1 class="community-directory__title">${t('community.directory.title')}</h1>
			<p class="community-directory__subtitle">${t('community.directory.subtitle')}</p>
			${window.appState.isLoggedIn
				? `<a href="/community/create" data-link class="btn">${t('community.directory.submitAd')}</a>`
				: `<p style="font-size:0.85rem;color:var(--text-muted)">${t('community.directory.loginToSubmit')}</p>`
			}
		</div>

		<div class="community-directory__filters">
			<input type="text" id="community-search" class="form-input" placeholder="${t('community.directory.searchPlaceholder')}" value="${search}" style="max-width:240px">
			<select id="community-type-filter" class="filter-select">
				${filterOptions(typeFilter)}
			</select>
		</div>

		<div class="community-directory__grid" id="community-grid">
			${cardsHtml}
		</div>
	</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function communityAfter(_ctx: RouteContext): Promise<void> {
	wireAdPrefsPanel();

	// Click tracking
	document.addEventListener('click', (e) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>('[data-ad-click]');
		if (el) trackAdClick(el.dataset.adClick!);
	});

	// Client-side filter (all ads are already loaded in the DOM)
	const searchInput = document.getElementById('community-search') as HTMLInputElement | null;
	const typeSelect = document.getElementById('community-type-filter') as HTMLSelectElement | null;
	const grid = document.getElementById('community-grid');

	function applyFilters() {
		const query = searchInput?.value.toLowerCase() ?? '';
		const type = typeSelect?.value ?? '';
		grid?.querySelectorAll<HTMLElement>('.community-card').forEach((card) => {
			const stype = card.dataset.serviceType ?? '';
			const text = card.textContent?.toLowerCase() ?? '';
			const typeMatch = !type || stype === type;
			const searchMatch = !query || text.includes(query);
			card.style.display = typeMatch && searchMatch ? '' : 'none';
		});
	}

	let debounce: ReturnType<typeof setTimeout>;
	searchInput?.addEventListener('input', () => {
		clearTimeout(debounce);
		debounce = setTimeout(applyFilters, 250);
	});
	typeSelect?.addEventListener('change', applyFilters);
}
