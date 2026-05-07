// =========================================================================
// views/AdDetailView.ts — Internal advertiser page (/community/:uuid)
// =========================================================================

import { t } from '../i18n';
import type { RouteContext } from '../types';
import { wireAdZoneEvents } from '../ad-components';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// =========================================================================
// Types
// =========================================================================

interface AdDetail {
	uuid: string;
	title: string;
	tagline: string;
	description: string | null;
	service_type: string;
	destination_type: 'internal' | 'external';
	external_url: string | null;
	banner_r2_key: string | null;
	banner_media_uuid: string | null;
	card_r2_key: string | null;
	card_media_uuid: string | null;
	author_username: string;
	internal_page_content: string | null;
}

// =========================================================================
// View
// =========================================================================

export async function adDetailView(ctx: RouteContext): Promise<string> {
	const uuid = ctx.params.uuid;
	if (!uuid) {
		return `<p class="error-message">${t('common.error')}</p>`;
	}

	let ad: AdDetail | null = null;
	try {
		const res = await fetch(`/api/ads/${uuid}`);
		if (res.ok) {
			const data = (await res.json()) as { ad: AdDetail };
			ad = data.ad;
		}
	} catch { /* show not found */ }

	if (!ad) {
		document.title = `VRCStorage — ${t('common.error')}`;
		return `
		<div style="padding:60px;text-align:center">
			<h2>${t('community.detail.notFound')}</h2>
			<a href="/community" data-link class="btn" style="margin-top:16px">${t('community.directory.title')}</a>
		</div>`;
	}

	document.title = `${ad.title} — VRCStorage Community`;

	const href = ad.destination_type === 'external' && ad.external_url ? ad.external_url : '#';
	const target = ad.destination_type === 'external' ? 'target="_blank" rel="noopener noreferrer"' : '';

	const bannerHtml = ad.banner_media_uuid
		? `<img class="community-page__banner" src="/media/${ad.banner_media_uuid}/banner" alt="${ad.title}" loading="lazy" decoding="async">`
		: `<div class="community-page__banner-placeholder"></div>`;

	// Render Markdown body using the existing marked library if available
	let bodyHtml = '';
	if (ad.internal_page_content) {
		// Use same markdown-body class as resource descriptions
		bodyHtml = `
		<div class="community-page__body">
			<div class="markdown-body" id="ad-page-content" data-raw="${encodeURIComponent(ad.internal_page_content)}"></div>
		</div>`;
	}

	return `
	<div class="community-page">
		<div style="margin-bottom:16px">
			<a href="/community" data-link style="font-size:0.85rem;color:var(--text-muted)">← ${t('community.directory.title')}</a>
		</div>

		<div class="community-page__header">
			${bannerHtml}
			<div>
				<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
					<span class="badge-community">${t('community.badge')}</span>
					<span style="font-size:0.78rem;color:var(--text-muted)">${t('community.serviceTypes.' + ad.service_type) || ad.service_type}</span>
				</div>
				<h1 class="community-page__title">${ad.title}</h1>
				<p class="community-page__tagline">${ad.tagline}</p>
				<div class="community-page__actions">
					${ad.destination_type === 'external' && ad.external_url
			? `<a href="${href}" ${target} class="btn" data-ad-click="${ad.uuid}">${t('community.visitWebsite')}</a>`
			: ''
		}
					<span style="font-size:0.8rem;color:var(--text-muted)">${t('community.by')} ${ad.author_username}</span>
				</div>
			</div>
		</div>

		${bodyHtml}
	</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function adDetailAfter(_ctx: RouteContext): Promise<void> {
	wireAdZoneEvents();

	// Render Markdown body
	const contentEl = document.getElementById('ad-page-content');
	if (contentEl) {
		const raw = decodeURIComponent(contentEl.dataset.raw ?? '');
		if (raw) {
			try {
				contentEl.innerHTML = DOMPurify.sanitize(marked.parse(raw) as string);
			} catch {
				contentEl.textContent = raw;
			}
		}
	}
}
