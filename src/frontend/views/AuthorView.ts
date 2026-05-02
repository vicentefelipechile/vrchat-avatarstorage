// =========================================================================
// views/AuthorView.ts — Public author profile page
// =========================================================================

// =========================================================================
// Imports
// =========================================================================

import { getIcon } from '../icons';
import { t } from '../i18n';
import type { RouteContext } from '../types';
import { DataCache } from '../cache';
import { TimeUnit } from '../utils';

interface AvatarAuthor {
	uuid: string;
	name: string;
	slug: string;
	avatar_url: string | null;
	description: string | null;
	website_url: string | null;
	twitter_url: string | null;
	booth_url: string | null;
	gumroad_url: string | null;
	patreon_url: string | null;
	discord_url: string | null;
}

// =========================================================================
// Types
// =========================================================================

interface AuthorProfileResponse {
	author: AvatarAuthor;
	avatars: {
		uuid: string;
		title: string;
		thumbnail_key: string | null;
		download_count: number;
		created_at: number;
		avatar_gender: string;
		avatar_type: string;
		platform: string;
		is_nsfw: number;
	}[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		hasNextPage: boolean;
		hasPrevPage: boolean
	};
}

// =========================================================================
// Helpers
// =========================================================================

function socialLink(url: string | null, label: string, iconName: string): string {
	if (!url) return '';
	return `<li><a href="${url}" target="_blank" rel="noopener noreferrer" class="author-social-link">
		${getIcon(iconName, 14)} ${label}
	</a></li>`;
}

function avatarMiniCard(item: AuthorProfileResponse['avatars'][number]): string {
	const title = item.title.substring(0, 50);
	const imgHtml = item.thumbnail_key
		? `<div class="card-image"><img src="/api/download/${item.thumbnail_key}" alt="${title}" loading="lazy"><span class="card-badge">${item.avatar_type}</span></div>`
		: `<div class="card-image card-image-placeholder"><span class="card-badge">${item.avatar_type}</span></div>`;

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
		// const res = await fetch(`/api/authors/${slug}?page=${page}`);
		const res = await DataCache.fetch<AuthorProfileResponse>(`/api/authors/${slug}?page=${page}`, { ttl: TimeUnit.Day });
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
	document.title = `${author.name} — VRCStorage`;

	const avatarHtml = author.avatar_url
		? `<img class="author-profile-avatar" src="${author.avatar_url}" alt="${author.name}" loading="lazy">`
		: `<div class="author-profile-avatar-placeholder">${getIcon('user', 32)}</div>`;

	const socials = [
		socialLink(author.website_url, 'Website', 'globe'),
		socialLink(author.twitter_url, 'Twitter / X', 'twitter'),
		socialLink(author.booth_url, 'Booth', 'shopping-bag'),
		socialLink(author.gumroad_url, 'Gumroad', 'credit-card'),
		socialLink(author.patreon_url, 'Patreon', 'heart'),
		socialLink(author.discord_url, 'Discord', 'message-circle'),
	].filter(Boolean);

	const socialsHtml = socials.length ? `<ul class="author-socials">${socials.join('')}</ul>` : '';

	const prevBtn = pagination.hasPrevPage
		? `<a href="/authors/${slug}?page=${page - 1}" data-link class="btn">← ${t('filterPanel.prev')}</a>`
		: '';
	const nextBtn = pagination.hasNextPage
		? `<a href="/authors/${slug}?page=${page + 1}" data-link class="btn">${t('filterPanel.next')} →</a>`
		: '';
	const pagCtrls =
		prevBtn || nextBtn
			? `<div class="pagination" style="display:flex;gap:10px;justify-content:center;margin-top:30px;">
			${prevBtn}<span style="align-self:center;">${t('filterPanel.pagePrefix')} ${pagination.page}</span>${nextBtn}
		  </div>`
			: '';

	const gridHtml =
		avatars.length === 0
			? `<div class="author-no-resources">${t('authorProfile.noResources')}</div>`
			: `<div class="grid">${avatars.map(avatarMiniCard).join('')}</div>${pagCtrls}`;

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
