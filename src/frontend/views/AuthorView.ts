// =========================================================================
// views/AuthorView.ts — Public author profile page
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { getIcon } from '../lib/icons';
import { t } from '../core/i18n';
import type { RouteContext } from '../types';
import { api } from '../api';
import type { AuthorProfile as AuthorProfileResponse } from '../api/types';
import { TimeUnit, progressiveImg, htmlDecode, metaLabel, safeHttpUrl } from '../lib/utils';

// =========================================================================
// Helpers
// =========================================================================

function socialLink(url: string | null, label: string, iconName: string): string {
	const safeUrl = safeHttpUrl(url);
	if (!safeUrl) return '';
	return `<li><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="author-social-link">
		${getIcon(iconName, 14)} ${label}
	</a></li>`;
}

function avatarMiniCard(item: AuthorProfileResponse['avatars'][number]): string {
	const title = item.title.substring(0, 50);
	const badge = metaLabel('avatar_type', item.avatar_type);
	const imgHtml = item.thumbnail_media_uuid
		? `<div class="card-image">${progressiveImg({ uuid: item.thumbnail_media_uuid, placeholder: item.placeholder_blur, res: 'low', alt: title, processed: item.processed === 1, format: item.thumbnail_media_type === 'video' ? 'gif' : 'webp' })}<span class="card-badge">${badge}</span></div>`
		: `<div class="card-image card-image-placeholder"><span class="card-badge">${badge}</span></div>`;

	return `<div class="card">
		<a href="/item/${item.uuid}" data-link class="card-link">${imgHtml}</a>
		<div class="card-body">
			<h3>${title}${item.title.length > 50 ? '…' : ''}</h3>
			<div class="card-meta">
				<span>${new Date(item.created_at * 1000).toLocaleDateString()}</span>
				<div class="card-stats"><span>📥 ${item.download_count}</span></div>
			</div>
			<div class="card-footer">
				<a href="/item/${item.uuid}" data-link class="btn">${t('card.view')}</a>
			</div>
		</div>
	</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function authorView(ctx: RouteContext): Promise<string> {
	const slug = ctx.params.slug;
	const page = parseInt(ctx.query.get('page') || '1', 10);

	let data: AuthorProfileResponse | null = null;
	try {
		const res = await api.Authors.Get(slug, page, { cache: { ttl: TimeUnit.Day } });
		if (res) {
			data = res;
		} else {
			document.title = t('authorProfile.notFoundTitle');
			return `<p class="error-message">${t('authorProfile.notFound')}</p>`;
		}
	} catch {
		document.title = 'Error — VRCStorage';
		return `<p class="error-message">${t('common.loadError')}</p>`;
	}

	if (!data) return `<p class="error-message">${t('common.loadError')}</p>`;

	const { author, avatars, pagination } = data;
	document.title = `${htmlDecode(author.name)} — VRCStorage`;

	const avatarUrl = safeHttpUrl(author.avatar_url);
	const avatarHtml = avatarUrl ? `<img class="author-profile-avatar" src="${avatarUrl}" alt="${htmlDecode(author.name)}" loading="lazy">` : `<div class="author-profile-avatar-placeholder">${getIcon('user', 32)}</div>`;

	const socials = [
		socialLink(author.website_url, 'Website', 'globe'),
		socialLink(author.twitter_url, 'Twitter / X', 'twitter'),
		socialLink(author.booth_url, 'Booth', 'shopping-bag'),
		socialLink(author.gumroad_url, 'Gumroad', 'credit-card'),
		socialLink(author.patreon_url, 'Patreon', 'heart'),
		socialLink(author.discord_url, 'Discord', 'message-circle'),
	].filter(Boolean);

	const socialsHtml = socials.length ? `<ul class="author-socials">${socials.join('')}</ul>` : '';

	const prevBtn = pagination.hasPrevPage ? `<a href="/authors/${slug}?page=${page - 1}" data-link class="btn">← ${t('filterPanel.prev')}</a>` : '';
	const nextBtn = pagination.hasNextPage ? `<a href="/authors/${slug}?page=${page + 1}" data-link class="btn">${t('filterPanel.next')} →</a>` : '';
	const pagCtrls =
		prevBtn || nextBtn
			? `<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			${prevBtn}<span style="align-self:center;">${t('filterPanel.pagePrefix')} ${pagination.page}</span>${nextBtn}
		  </div>`
			: '';

	const gridHtml = avatars.length === 0 ? `<div class="author-no-resources">${t('authorProfile.noResources')}</div>` : `<div class="grid">${avatars.map(avatarMiniCard).join('')}</div>${pagCtrls}`;

	return `<div class="author-profile-header">
		${avatarHtml}
		<div class="author-profile-info">
			<h1 class="author-profile-name">${author.name}</h1>
			${author.description ? `<p class="author-profile-description">${author.description}</p>` : ''}
			${socialsHtml}
		</div>
	</div>
	<div class="author-resources-section">
		<h2 class="author-resources-title">${t('authorProfile.avatarsTitle')} (${pagination.total})</h2>
		${gridHtml}
	</div>`;
}

// =========================================================================
// After
// =========================================================================

export function authorAfter(_ctx: RouteContext): void {
	// No interactive elements required beyond SPA navigation links
}
