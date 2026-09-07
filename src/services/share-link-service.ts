// =========================================================================================================
// SHARE LINK SERVICE
// =========================================================================================================
// Business rules for temporary share links over PRIVATE files (archives: zip/rar/...):
//   - creation is authenticated; the token is opaque (crypto.randomUUID) and the expiry /
//     max-uses live in D1, never in the URL, so the recipient cannot tamper with them
//   - consumption is anonymous (the token IS the authorization) and atomic (repository)
//   - only private files can be shared — public media (image/video) goes through the CDN
//
// Error mapping (all bubble to app.onError):
//   - unknown r2_key / public media        → NotFoundError (404)
//   - revoke of someone else's link        → ForbiddenError (403)
//   - consume of dead link (expired/used)  → NotFoundError (404, same as unknown)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { ShareLinkRepository, type ShareLinkRow, type ShareLinkListRow } from '../repositories/share-link-repository';
import { MediaRepository } from '../repositories/media-repository';
import { NotFoundError, ForbiddenError } from '../domain/errors';

// =========================================================================================================
// Crawler detection
// =========================================================================================================
// Link-preview fetchers (Discord/Telegram/WhatsApp/...) GET every shared URL within seconds
// to build the embed card. That fetch must never consume a use — a 1-use link would die to
// the preview before any human clicks it. Tokens below verified against vendor docs and UA
// directories (Meta docs 2026-05 for facebookexternalhit; knownagents for Discordbot 2.0 and
// TelegramBot; crawlercheck/dev-toolbox for the rest). Best-effort: neither Discordbot nor
// TelegramBot reliably honor robots.txt and none publish verification, so server-side UA
// matching (not robots.txt) is the enforcement point. Spoofing is safe: the crawler branch
// never serves file bytes, so faking the UA only yields the preview HTML, never the file.

const CRAWLER_PATTERN = /discordbot|telegrambot|facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|pinterest/i;

/** True when the User-Agent belongs to a link-preview fetcher rather than a human browser. */
export function isCrawler(userAgent: string | undefined | null): boolean {
	if (!userAgent) return false;
	return CRAWLER_PATTERN.test(userAgent);
}

// =========================================================================================================
// Service
// =========================================================================================================

export class ShareLinkService {
	private readonly links: ShareLinkRepository;
	private readonly media: MediaRepository;

	constructor(db: DB) {
		this.links = new ShareLinkRepository(db);
		this.media = new MediaRepository(db);
	}

	/**
	 * Create a share link for a private file. Throws NotFoundError for unknown keys and for
	 * public media (image/video) — those are served by the CDN, not shared as downloads.
	 */
	async create(userUuid: string, r2Key: string, expiresIn: number, maxUses: number | null): Promise<ShareLinkRow> {
		const media = await this.media.findByKey(r2Key);
		if (!media) throw new NotFoundError('Not found');
		if (media.media_type === 'image' || media.media_type === 'video') throw new NotFoundError('Not found');

		const now = Math.floor(Date.now() / 1000);
		const row: Omit<ShareLinkRow, 'uses' | 'revoked' | 'created_at'> = {
			uuid: crypto.randomUUID(),
			token: crypto.randomUUID(),
			media_uuid: media.uuid,
			r2_key: r2Key,
			created_by: userUuid,
			expires_at: now + expiresIn,
			max_uses: maxUses,
		};
		await this.links.insert(row);
		return { ...row, uses: 0, revoked: 0, created_at: now };
	}

	/** Live-ness check shared by the preview and the consume path (no side effects). */
	isLive(link: ShareLinkRow, now: number): boolean {
		if (link.revoked !== 0) return false;
		if (link.expires_at <= now) return false;
		if (link.max_uses !== null && link.uses >= link.max_uses) return false;
		return true;
	}

	/** Look up a link for the crawler preview. Throws NotFoundError when dead. */
	async preview(token: string): Promise<ShareLinkRow> {
		const link = await this.links.findByToken(token);
		if (!link || !this.isLive(link, Math.floor(Date.now() / 1000))) throw new NotFoundError('Not found');
		return link;
	}

	/**
	 * Consume one use and return the link when live. Throws NotFoundError when dead —
	 * indistinguishable from an unknown token, so expiry cannot be probed apart.
	 */
	async consume(token: string): Promise<ShareLinkRow> {
		const now = Math.floor(Date.now() / 1000);
		const ok = await this.links.consume(token, now);
		if (!ok) throw new NotFoundError('Not found');
		const link = await this.links.findByToken(token);
		if (!link) throw new NotFoundError('Not found');
		return link;
	}

	/** All links owned by the user, newest first. */
	listMine(userUuid: string): Promise<ShareLinkListRow[]> {
		return this.links.listByOwner(userUuid);
	}

	/** Revoke an owned link (force-expire). Throws ForbiddenError when not the owner's. */
	async revoke(uuid: string, userUuid: string): Promise<void> {
		const revoked = await this.links.revoke(uuid, userUuid);
		if (!revoked) throw new ForbiddenError('Forbidden');
	}
}
