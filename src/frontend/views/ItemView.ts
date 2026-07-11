// =========================================================================
// views/ItemView.ts — Resource detail page with gallery, comments, lightbox
// =========================================================================

import { t } from '../i18n';
import { DataCache } from '../cache';
import { TimeUnit, mediaUrl, progressiveImg, downloadHost, htmlDecode, initLazyImages, type HostInfo } from '../utils';
import { deleteComment, approveResource, rejectResource, deactivateResource } from '../admin';
import { icons, getIcon } from '../icons';
import { commentEditorHtml, initCommentEditor } from '../comment-editor';
import { navigateTo } from '../router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { RouteContext, Resource, Comment, ResourceLink, AvatarMeta, AssetMeta, ClothesMeta } from '../types';

// =========================================================================
// Helpers
// =========================================================================

/** Render a boolean flag chip. */
function flagChip(label: string, val: number | null | undefined): string {
	if (val === 1) return `<span class="meta-flag-chip meta-flag-chip--yes">${label} ${icons.check(14)}</span>`;
	if (val === 0) return `<span class="meta-flag-chip meta-flag-chip--no">${label} ${icons.x(14)}</span>`;
	return ''; // Don't render unknown states to save space
}

/** Render a labelled row inside the meta panel. */
function metaRow(label: string, value: string): string {
	return `
		<div class="meta-row">
			<span class="meta-row-label">${label}</span>
			<span class="meta-row-value">${value}</span>
		</div>`;
}

/** Render a text value as a chip. */
function chip(val: string | null | undefined, fallback = '—'): string {
	if (!val) return `<span class="meta-chip meta-chip--empty">${fallback}</span>`;
	return `<span class="meta-chip">${val}</span>`;
}

/**
 * Renders a category-specific metadata panel for the item detail page.
 * Returns an empty string if there is no metadata.
 */
function renderCategoryMeta(res: Resource): string {
	if (!res.meta) return '';

	const textRows: string[] = [];
	const flagChips: string[] = [];

	if (res.category === 'avatars') {
		const m = res.meta as AvatarMeta;
		if (m.author_name || m.author_name_raw) {
			const name = m.author_name ?? m.author_name_raw ?? '';
			const val = m.author_slug
				? `<a href="/authors/${m.author_slug}" data-link class="meta-chip meta-chip--link">${name}</a>`
				: chip(name);
			textRows.push(metaRow(t('meta.avatar.author').replace(/\s*\*/g, ''), val));
		}
		if (m.avatar_gender) textRows.push(metaRow(t('meta.avatar.gender').replace(/\s*\*/g, ''), chip(t('meta.avatar_gender.' + m.avatar_gender) || m.avatar_gender)));
		if (m.avatar_size)
			textRows.push(metaRow(t('meta.avatar.size').replace(/\s*\*/g, ''), chip(t('meta.avatar_size.' + m.avatar_size) || m.avatar_size)));
		if (m.avatar_type)
			textRows.push(
				metaRow(t('meta.avatar.type').replace(/\s*\*/g, ''), chip(t('meta.avatar_type.' + m.avatar_type.replace('-', '')) || m.avatar_type)),
			);
		if (m.platform)
			textRows.push(metaRow(t('meta.platform.title').replace(/\s*\*/g, ''), chip(t('meta.platform.' + m.platform) || m.platform)));
		if (m.sdk_version) textRows.push(metaRow('SDK', chip(m.sdk_version.toUpperCase())));

		flagChips.push(flagChip('NSFW', m.is_nsfw));
		flagChips.push(flagChip('PhysBones', m.has_physbones));
		flagChips.push(flagChip('Face Tracking', m.has_face_tracking));
		flagChips.push(flagChip('DPS', m.has_dps));
		flagChips.push(flagChip('GoGo Loco', m.has_gogoloco));
		flagChips.push(flagChip(t('meta.features.toggles').replace(/\s*\*/g, ''), m.has_toggles));
		flagChips.push(flagChip(t('meta.features.questOptimized').replace(/\s*\*/g, ''), m.is_quest_optimized));
	} else if (res.category === 'assets') {
		const m = res.meta as AssetMeta;
		if (m.asset_type)
			textRows.push(
				metaRow(t('meta.asset.type').replace(/\s*\*/g, ''), chip(t('meta.asset_type.' + m.asset_type.replace('-', '')) || m.asset_type)),
			);
		if (m.platform)
			textRows.push(metaRow(t('meta.platform.title').replace(/\s*\*/g, ''), chip(t('meta.platform.' + m.platform) || m.platform)));
		if (m.sdk_version) textRows.push(metaRow('SDK', chip(m.sdk_version.toUpperCase())));
		if (m.unity_version) textRows.push(metaRow('Unity', chip(m.unity_version)));

		flagChips.push(flagChip('NSFW', m.is_nsfw));
	} else if (res.category === 'clothes') {
		const m = res.meta as ClothesMeta;
		if (m.clothing_type)
			textRows.push(
				metaRow(
					t('meta.clothes.type').replace(/\s*\*/g, ''),
					chip(t('meta.clothing_type.' + m.clothing_type.replace('-', '')) || m.clothing_type),
				),
			);
		if (m.gender_fit)
			textRows.push(metaRow(t('meta.clothes.gender').replace(/\s*\*/g, ''), chip(t('meta.avatar_gender.' + m.gender_fit) || m.gender_fit)));
		if (m.platform)
			textRows.push(metaRow(t('meta.platform.title').replace(/\s*\*/g, ''), chip(t('meta.platform.' + m.platform) || m.platform)));
		if (m.base_avatar_name_raw) {
			const name = m.base_avatar_name_raw;
			const val = m.base_avatar_uuid
				? `<a href="/item/${m.base_avatar_uuid}" data-link class="meta-chip meta-chip--link">${name}</a>`
				: chip(name);
			textRows.push(metaRow(t('meta.clothes.baseAvatar').replace(/\s*\*/g, ''), val));
		}

		flagChips.push(flagChip(t('meta.clothes.isBase').replace(/\s*\*/g, ''), m.is_base));
		flagChips.push(flagChip('NSFW', m.is_nsfw));
		flagChips.push(flagChip('PhysBones', m.has_physbones));
	}

	const renderFlags = flagChips.filter(Boolean).join('');
	if (!textRows.length && !renderFlags) return '';

	return `
		<div class="item-meta-panel">
			<h3 class="item-meta-title">
				${t('item.specifications')}
			</h3>
			<div class="item-meta-grid">
				${textRows.join('')}
			</div>
			${renderFlags ? `<div class="meta-flags-container">${renderFlags}</div>` : ''}
		</div>
		<hr>`;
}
// Older resources stored an auto-generated "Backup N" as the link title; it is treated as no title so the
// host name still wins over that placeholder.
const GENERIC_BACKUP_TITLE = /^backup\s*\d+$/i;

/** The caption under a download button, naming what kind of source it is. */
function kindCaption(kind: HostInfo['kind']): string {
	if (kind === 'local') return t('item.localServer');
	if (kind === 'article') return t('item.originalArticle');
	return t('item.downloadServer');
}

/** One download button. Links served from our own R2 ('local') are highlighted as the files we host; every
 *  other link is a secondary source that surfaces its origin site's brand mark and name. `label` names the
 *  button — a link's own title, else its recognised host, else "Backup N". */
function downloadButton(url: string, title: string | null | undefined, fallbackIndex: number): string {
	const host = downloadHost(url);
	const highlighted = host.kind === 'local';

	let label: string;
	if (title && !GENERIC_BACKUP_TITLE.test(title.trim())) {
		label = title;
	} else if (host.label && host.icon !== 'globe') {
		label = host.label;
	} else {
		label = `${t('item.backup')} ${fallbackIndex}`;
	}

	// A local file leads with the download glyph; external sources show their host mark.
	const icon = getIcon(highlighted ? 'download' : host.icon, 18);
	const sub = `<span class="download-host">${kindCaption(host.kind)}</span>`;
	return `
		<a href="${url}" target="_blank" rel="noopener" class="download-btn${highlighted ? '' : ' secondary'}">
			${icon}
			<span class="download-file-name">${label}</span>
			${sub}
		</a>`;
}

function downloadSection(res: Resource): string {
	const { user } = window.appState;
	if (!user) {
		return `
			<div class="login-req-box">
				<p><strong>${t('item.loginReq')}</strong></p>
				<p>${t('item.loginMsg')}</p>
				<a href="/login" data-link class="btn">${t('item.goToLogin')}</a>
			</div>`;
	}

	const downloadLinks: ResourceLink[] = (res.links ?? []).filter((l) => l.link_type === 'download');
	let buttons: string;

	if (downloadLinks.length > 0) {
		buttons = downloadLinks.map((link, i) => downloadButton(link.link_url, link.link_title, i + 1)).join('');
	} else {
		// Legacy fallback: a single main URL plus loose backup URLs.
		const main = res.downloadUrl ? downloadButton(res.downloadUrl, null, 1) : '';
		const backups = (res.backupUrls ?? []).map((url, i) => downloadButton(url, null, i + 1)).join('');
		buttons = main + backups;
	}

	if (!buttons) return `<p class="download-empty">${t('item.noDownloads')}</p>`;
	return `<div class="download-buttons">${buttons}</div>`;
}

/** A lightbox slide: `preview` is the low-res variant (already cached by the gallery thumbnail, shown
 *  instantly) and `full` is the full-res original swapped in once it finishes loading. */
interface LightboxImage {
	preview: string;
	full: string;
}

function buildGallery(res: Resource): { html: string; images: LightboxImage[] } {
	const images: LightboxImage[] = [];
	let html = '';

	const hasMedia = (res.mediaFiles?.length ?? 0) > 0;
	// const hasThumbnail = !!res.thumbnail_key;
	const hasThumbnail = false;

	if (!hasMedia && !hasThumbnail) return { html, images };

	html = '<div class="gallery-grid">';

	if (hasThumbnail) {
		const url = `/api/download/${res.thumbnail_key}`;
		const idx = images.length;
		images.push({ preview: url, full: url });
		html += `
			<div class="gallery-item">
				<div class="gallery-item-link" data-lightbox-index="${idx}" data-full-src="${url}">
					<img src="${url}" alt="Thumbnail" loading="lazy">
				</div>
			</div>`;
	}

	if (hasMedia) {
		res.mediaFiles!.forEach((media) => {
			const fallbackUrl = `/api/download/${media.r2_key}`;
			if (media.media_type === 'video') {
				// Video is public media → served by the CDN (uuid). The CDN's fallback path
				// streams the original from BUCKET when no image variant exists.
				const videoUrl = media.uuid ? mediaUrl(media.uuid, 'original') : fallbackUrl;
				html += `
					<div class="gallery-item">
						<video controls style="width:100%;height:100%;object-fit:cover">
							<source src="${videoUrl}" type="video/mp4">
						</video>
					</div>`;
			} else if (media.media_type === 'image') {
				const fullUrl = media.uuid ? mediaUrl(media.uuid, 'original', 'png') : fallbackUrl;
				const previewUrl = media.uuid ? mediaUrl(media.uuid, 'low') : fallbackUrl;
				const idx = images.length;
				images.push({ preview: previewUrl, full: fullUrl });
				const imgHtml = media.uuid
					? progressiveImg({ uuid: media.uuid, placeholder: media.placeholder_blur ?? null, res: 'low', alt: 'Gallery Image' })
					: `<img src="${fallbackUrl}" alt="Gallery Image" loading="lazy">`;
				html += `
					<div class="gallery-item">
						<div class="gallery-item-link" data-lightbox-index="${idx}" data-full-src="${fullUrl}">
							${imgHtml}
						</div>
					</div>`;
			}
		});
	}

	html += '</div>';
	return { html, images };
}

function adminActionsHtml(res: Resource): string {
	const { isAdmin, user } = window.appState;
	const isOwner = user && res.author && user.username === res.author.username;
	const pending = !res.is_active || res.is_active === 0;

	if (pending) {
		if (isAdmin) {
			return `
				<div class="admin-panel admin-panel--pending">
					<h3 class="admin-panel-title">${icons.monitor(16)} ${t('item.adminPanel')}</h3>
					<p class="admin-panel-note">${t('item.pendingApproval')}</p>
					<div class="admin-panel-actions">
						<button class="btn" id="btn-approve-${res.uuid}">${icons.check(16)} ${t('item.approve')}</button>
						<button class="btn btn-danger" id="btn-reject-${res.uuid}">${icons.x(16)} ${t('item.reject')}</button>
					</div>
				</div>`;
		}
		if (isOwner) {
			return `
				<div class="admin-panel admin-panel--pending">
					<p class="admin-panel-note">${t('item.underReview')}</p>
				</div>`;
		}
		return '';
	}

	if (isAdmin) {
		return `
			<div class="admin-panel">
				<h3 class="admin-panel-title">${icons.monitor(16)} ${t('item.adminPanel')}</h3>
				<div class="admin-panel-actions">
					<button class="btn btn-danger" id="btn-deactivate-${res.uuid}">${t('item.deactivate')}</button>
				</div>
			</div>`;
	}
	return '';
}

function renderCommentsList(comments: Comment[], isAdmin: boolean): string {
	if (!comments?.length) return `<p class="comments-empty">${t('item.noComments')}</p>`;

	return comments
		.map((c) => {
			const content = DOMPurify.sanitize(marked.parse(c.text) as string);
			const when = new Date(c.timestamp).toLocaleString();

			const del = isAdmin
				? `<button type="button" class="comment-delete" data-comment-id="${c.uuid}" title="${t('admin.delete')}" aria-label="${t('admin.delete')}">${icons.trash(15)}</button>`
				: '';

			return `
			<div id="comment-${c.uuid}" class="comment">
				<img src="${c.author_avatar}" alt="${c.author}" class="comment-avatar">
				<div class="comment-body">
					<div class="comment-meta">
						<div class="comment-byline">
							<span class="comment-author">${c.author}</span>
							<time class="comment-date">${when}</time>
						</div>
						${del}
					</div>
					<div class="markdown-body comment-content">${content}</div>
				</div>
			</div>`;
		})
		.join('');
}

function setupLightbox(images: LightboxImage[]): void {
	if (!images.length) return;

	const overlay = document.getElementById('lightbox-overlay')!;
	const imgEl = document.getElementById('lightbox-img') as HTMLImageElement;
	const imgWrap = document.getElementById('lightbox-img-wrap')!;
	const counter = document.getElementById('lightbox-counter')!;
	const btnClose = document.getElementById('lightbox-close')!;
	const btnPrev = document.getElementById('lightbox-prev')!;
	const btnNext = document.getElementById('lightbox-next')!;

	const ZOOM_SCALE = 2.5;
	let current = 0;
	let isZoomed = false;

	// Full-res URLs that have finished downloading — reopening one of these skips the low-res preview.
	const loadedFull = new Set<string>();

	const MARGIN = 0.09;
	const remap = (v: number) => Math.min(Math.max(((v - MARGIN) / (1 - 2 * MARGIN)) * 100, 0), 100);

	const updateOrigin = (e: MouseEvent) => {
		const rect = imgEl.getBoundingClientRect();
		const rawX = (e.clientX - rect.left) / rect.width;
		const rawY = (e.clientY - rect.top) / rect.height;
		imgEl.style.transformOrigin = `${remap(rawX)}% ${remap(rawY)}%`;
	};

	const setZoom = (zoomed: boolean, e?: MouseEvent) => {
		isZoomed = zoomed;
		if (zoomed) {
			if (e) updateOrigin(e);
			imgWrap.style.width = '90vw';
			imgWrap.style.height = '90vh';
			imgEl.style.transform = `scale(${ZOOM_SCALE})`;
			imgWrap.style.cursor = 'zoom-out';
			imgEl.style.cursor = 'zoom-out';
		} else {
			imgEl.style.transform = 'scale(1)';
			setTimeout(() => {
				if (!isZoomed) {
					imgWrap.style.width = '';
					imgWrap.style.height = '';
				}
			}, 250);
			imgWrap.style.cursor = 'zoom-in';
			imgEl.style.cursor = 'zoom-in';
		}
	};

	const open = (idx: number) => {
		current = ((idx % images.length) + images.length) % images.length;
		const slide = images[current];

		// Once a slide's full-res original has downloaded it stays cached, so reopening or paging back
		// to it shows the sharp image directly — no low-res flash. Only the first view of a slide falls
		// back to its preview (instant, already cached by the gallery thumbnail) and swaps to full on
		// load. Guarding the swap on `current` keeps a slow original from overwriting a slide the user
		// paged past.
		if (slide.full === slide.preview || loadedFull.has(slide.full)) {
			imgEl.src = slide.full;
		} else {
			imgEl.src = slide.preview;
			const target = current;
			const full = new Image();
			full.onload = () => {
				loadedFull.add(slide.full);
				if (current === target) imgEl.src = slide.full;
			};
			full.src = slide.full;
		}

		setZoom(false);
		counter.textContent = `${current + 1} / ${images.length}`;
		overlay.classList.add('active');
		document.body.style.overflow = 'hidden';
	};

	const close = () => {
		overlay.classList.remove('active');
		setZoom(false);
		imgEl.src = '';
		document.body.style.overflow = '';
	};

	document.querySelectorAll<HTMLElement>('.gallery-item-link[data-lightbox-index]').forEach((el) => {
		el.addEventListener('click', () => open(parseInt(el.dataset.lightboxIndex!, 10)));
	});

	imgWrap.addEventListener('click', (e) => {
		e.stopPropagation();
		setZoom(!isZoomed, e as MouseEvent);
	});
	imgEl.addEventListener('mousemove', (e) => {
		if (isZoomed) updateOrigin(e as MouseEvent);
	});
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) close();
	});
	btnClose.addEventListener('click', close);
	btnPrev.addEventListener('click', (e) => {
		e.stopPropagation();
		open(current - 1);
	});
	btnNext.addEventListener('click', (e) => {
		e.stopPropagation();
		open(current + 1);
	});

	document.addEventListener('keydown', (e) => {
		if (!overlay.classList.contains('active')) return;
		if (e.key === 'Escape') close();
		if (e.key === 'ArrowLeft') open(current - 1);
		if (e.key === 'ArrowRight') open(current + 1);
	});

	window.addEventListener('popstate', () => {
		document.body.style.overflow = '';
	});
}

// =========================================================================
// View
// =========================================================================

export async function itemView(ctx: RouteContext): Promise<string> {
	const uuid = ctx.params.id;

	let res: Resource;
	try {
		res = (await DataCache.fetch(`/api/resources/${uuid}`, { ttl: TimeUnit.Hour, persistent: true })) as Resource;
		if (!res) throw new Error('Not found');
	} catch {
		return `<h1>${t('item.notFound')}</h1>`;
	}

	document.title = `VRCStorage — ${htmlDecode(res.title)}`;

	const { user, isAdmin } = window.appState;
	const category = res.category ? t('cats.' + res.category) || res.category : t('common.unknown');
	const date = new Date(res.created_at * 1000).toLocaleString();
	const { html: galleryHtml, images: lightboxImages } = buildGallery(res);
	const isOwner = user && res.author && user.username === res.author.username;
	const canEdit = isAdmin || (isOwner && res.is_active === 0);

	// Render description
	const descEl = document.createElement('div');
	const rawDesc = res.description ?? '';
	descEl.innerHTML = DOMPurify.sanitize(marked.parse(rawDesc) as string);
	const descriptionHtml = descEl.innerHTML;

	// Header tools
	const headerTools = `
		<div style="display:flex;gap:10px;flex-shrink:0;margin-top:5px;align-items:center">
			${
				user
					? `
				<button type="button" class="btn-favorite" id="btn-favorite" data-uuid="${uuid}" style="display:flex;align-items:center;gap:5px;background:transparent;border:1px solid var(--border-color);padding:5px 12px;cursor:pointer">
					${icons.heart(18, 'class="favorite-icon"')}
					<span class="hide-mobile">${t('nav.favorites')}</span>
				</button>`
					: ''
			}
			${canEdit ? `<a href="/resource/${uuid}/edit" data-link class="btn" style="display:flex;align-items:center;gap:5px;background:#17a2b8;padding:5px 15px">${icons.edit(18)}<span class="hide-mobile">${t('item.edit')}</span></a>` : ''}
			<a href="/resource/${uuid}/history" data-link class="btn" style="display:flex;align-items:center;gap:5px;background:#6c757d;padding:5px 15px">${icons.history(18)}<span class="hide-mobile">${t('item.history')}</span></a>
		</div>`;

	// Store lightbox images in a data attribute for after()
	const lightboxData = encodeURIComponent(JSON.stringify(lightboxImages));

	return `
		<div class="details-box" data-lightbox="${lightboxData}">
			<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:15px;margin-bottom:15px">
				<h1 style="margin:0;line-height:1.2;word-break:break-word">${res.title}</h1>
				${headerTools}
			</div>
			<div class="meta" style="margin-bottom:20px">
				<strong>${t('item.category')}:</strong> <a href="/category/${res.category}" data-link>${category}</a> |
				<strong>${t('item.uploaded')}:</strong> ${date} |
				<strong>${t('item.uuid')}:</strong> ${uuid}
			</div>
			<hr>
			<h3>${t('upload.reference')}</h3>
			${galleryHtml}
			${renderCategoryMeta(res)}
			<h3>${t('upload.desc')}</h3>
			<div class="description-box markdown-body">${descriptionHtml}</div>
			<hr>
			<h3>${t('item.downloads')}</h3>
			${downloadSection(res)}
			${adminActionsHtml(res)}
			<hr>
			<div id="comments-section" style="margin-top:40px">
				<h2>${t('item.comments')}</h2>
				<div id="comments-container"><p>${t('common.loadingComments')}</p></div>
				${
					user
						? commentEditorHtml({ formId: 'comment-form', textareaId: 'comment-text', turnstileId: 'turnstile-comment' })
						: `<hr><h3>${t('item.loginToComment')}</h3>`
				}
			</div>
		</div>

		<!-- Lightbox -->
		<div id="lightbox-overlay" role="dialog" aria-modal="true">
			<button id="lightbox-close" aria-label="Close">&times;</button>
			<button id="lightbox-prev" class="lightbox-btn" aria-label="Previous">&#8592;</button>
			<div id="lightbox-img-wrap"><img id="lightbox-img" src="" alt=""></div>
			<button id="lightbox-next" class="lightbox-btn" aria-label="Next">&#8594;</button>
			<div id="lightbox-counter"></div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function itemAfter(ctx: RouteContext): Promise<void> {
	const uuid = ctx.params.id;
	const commentsContainer = document.getElementById('comments-container')!;

	// Recover lightbox images from data attribute
	const box = document.querySelector<HTMLElement>('.details-box');
	const lightboxData = box?.dataset.lightbox;
	const lightboxImages: LightboxImage[] = lightboxData ? JSON.parse(decodeURIComponent(lightboxData)) : [];

	// Resolve the gallery thumbnails against the browser cache now, in the same tick the DOM lands, rather
	// than waiting for the trailing `route-changed`. On a return visit the low-res variant is already
	// cached, so this drops the blur before the first paint — no low-res flash when reopening an item.
	// Idempotent, so the later `route-changed` pass is a no-op here.
	initLazyImages();

	setupLightbox(lightboxImages);

	// Warm the full-res original into the browser cache on first hover, so opening the lightbox is
	// instant. `once` fires the fetch a single time per thumbnail; the browser cache dedupes it against
	// the lightbox's own later request.
	document.querySelectorAll<HTMLElement>('.gallery-item-link[data-full-src]').forEach((el) => {
		el.addEventListener(
			'mouseenter',
			() => {
				if (el.dataset.fullSrc) new Image().src = el.dataset.fullSrc;
			},
			{ once: true },
		);
	});

	// Admin actions — re-render the view in place (the DataCache entry is cleared by the action, so this
	// re-fetches the fresh resource) instead of a full page reload.
	const rerender = () => navigateTo(location.pathname, true);
	document.getElementById(`btn-approve-${uuid}`)?.addEventListener('click', () => approveResource(uuid, rerender));
	document.getElementById(`btn-reject-${uuid}`)?.addEventListener('click', () => rejectResource(uuid));
	document.getElementById(`btn-deactivate-${uuid}`)?.addEventListener('click', () => deactivateResource(uuid, rerender));

	// Comment deletion (admin) — delegated so it survives comment-list re-renders.
	commentsContainer.addEventListener('click', (e) => {
		const btn = (e.target as HTMLElement).closest<HTMLElement>('.comment-delete');
		if (btn?.dataset.commentId) deleteComment(btn.dataset.commentId);
	});

	// Favorite button
	const btnFavorite = document.getElementById('btn-favorite') as HTMLButtonElement | null;
	if (btnFavorite) {
		const icon = btnFavorite.querySelector<SVGElement>('.favorite-icon');
		try {
			const res = await fetch(`/api/favorites/check/${uuid}`);
			const data = (await res.json()) as { is_favorite?: boolean };
			if (data.is_favorite) {
				icon?.setAttribute('fill', 'currentColor');
				btnFavorite.classList.add('is-favorite');
			}
		} catch {
			/* ignore */
		}

		btnFavorite.addEventListener('click', async (e) => {
			e.preventDefault();
			const isFavorite = btnFavorite.classList.contains('is-favorite');
			if (isFavorite) {
				icon?.removeAttribute('fill');
				btnFavorite.classList.remove('is-favorite');
				fetch(`/api/favorites/${uuid}`, { method: 'DELETE' }).catch(() => {});
			} else {
				icon?.setAttribute('fill', 'currentColor');
				btnFavorite.classList.add('is-favorite');
				fetch('/api/favorites', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ resource_uuid: uuid }),
				}).catch(() => {});
			}
		});
	}

	// Load comments — always fresh, never cached
	try {
		const res = await fetch(`/api/comments/${uuid}`);
		const comments = (await res.json()) as Comment[];
		commentsContainer.innerHTML = renderCommentsList(comments, window.appState.isAdmin);
	} catch {
		commentsContainer.innerHTML = `<p>${t('item.errorLoadingComments')}</p>`;
	}

	// Comment form
	initCommentEditor({
		formId: 'comment-form',
		textareaId: 'comment-text',
		turnstileId: 'turnstile-comment',
		onSubmit: async (text, token) => {
			const res = await fetch(`/api/comments/${uuid}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, token }),
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string; details?: { message: string }[] };
				let msg = data.error ?? 'Unknown';
				if (data.details?.length) msg += ': ' + data.details.map((d) => d.message).join(', ');
				throw new Error(msg);
			}
		},
		onSuccess: async () => {
			const updated = (await fetch(`/api/comments/${uuid}`).then((r) => r.json())) as Comment[];
			commentsContainer.innerHTML = renderCommentsList(updated, window.appState.isAdmin);
		},
	});
}
