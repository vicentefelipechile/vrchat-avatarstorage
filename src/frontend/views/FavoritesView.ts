// =========================================================================
// views/FavoritesView.ts — Favorites grouped into collections. Card grid with
// drag-and-drop reorder, up/down buttons, and a move-to-collection dropdown.
// =========================================================================

import { DataCache } from '../core/cache';
import { t } from '../core/i18n';
import { icons } from '../lib/icons';
import { stripMarkdown, progressiveImg, showToast } from '../lib/utils';
import type { RouteContext } from '../types';

// =========================================================================
// Types
// =========================================================================

interface Favorite {
	uuid: string;
	thumbnail_key?: string;
	thumbnail_uuid?: string;
	thumbnail_media_type?: 'image' | 'video' | 'file';
	placeholder_blur?: string | null;
	processed?: number;
	title: string;
	description?: string;
	category: string;
	download_count?: number;
	created_at?: number;
	collection_uuid: string | null;
}

interface Collection {
	uuid: string;
	name: string;
	display_order: number;
	favorite_count: number;
}

interface FavoritesResponse {
	favorites: Favorite[];
}

interface CollectionsResponse {
	collections: Collection[];
}

// =========================================================================
// State
// =========================================================================

// 'all' = every favorite (default landing tab), uuid = a specific collection.
let activeCollection: string | 'all' = 'all';
let collections: Collection[] = [];
let reorderTimer: ReturnType<typeof setTimeout> | null = null;

// =========================================================================
// Helpers
// =========================================================================

/** Human name for a collection uuid, or the "no collection" label when null. */
function collectionName(uuid: string | null): string {
	if (uuid === null) return t('favorites.noCollection');
	return collections.find((c) => c.uuid === uuid)?.name ?? t('favorites.noCollection');
}

function favoriteCard(fav: Favorite): string {
	const title = stripMarkdown(fav.title).substring(0, 50);
	const categoryLabel = t('cats.' + fav.category) || fav.category;
	const colName = collectionName(fav.collection_uuid);

	return `
		<div class="card favorite-card" data-resource-id="${fav.uuid}" data-collection="${fav.collection_uuid ?? ''}">
			<div class="favorite-card-top">
				<div class="drag-handle" title="${t('favorites.dragToReorder')}">${icons['grip-vertical'](16)}</div>
				<a href="/item/${fav.uuid}" data-link class="card-link favorite-card-image-link">
					<div class="card-image${fav.thumbnail_uuid ? '' : ' card-image-placeholder'}">
						${
							fav.thumbnail_uuid
								? progressiveImg({ uuid: fav.thumbnail_uuid, placeholder: fav.placeholder_blur ?? null, res: 'low', alt: title, processed: fav.processed !== 0, format: fav.thumbnail_media_type === 'video' ? 'gif' : 'webp' })
								: ''
						}
						<span class="card-badge">${categoryLabel}</span>
					</div>
				</a>
			</div>
			<div class="card-body">
				<a href="/item/${fav.uuid}" data-link class="favorite-card-title">${title}${fav.title.length > 50 ? '…' : ''}</a>
				<span class="favorite-collection-tag">${icons['folder-open'](12)} <span class="favorite-collection-tag-name">${colName}</span></span>
				<div class="favorite-card-actions">
					<div class="favorite-order-btns">
						<button class="btn-icon favorite-move-up" data-uuid="${fav.uuid}" title="${t('favorites.moveUp')}">${icons['chevron-up'](16)}</button>
						<button class="btn-icon favorite-move-down" data-uuid="${fav.uuid}" title="${t('favorites.moveDown')}">${icons['chevron-down'](16)}</button>
					</div>
					<div class="favorite-collection-wrap">
						<button class="btn-icon favorite-collection-btn" data-uuid="${fav.uuid}" title="${t('favorites.moveToCollection')}">${icons['folder-open'](16)}</button>
					</div>
					<button class="btn-icon favorite-remove-btn" data-uuid="${fav.uuid}" title="${t('common.removeFavorite')}">${icons.x(16)}</button>
				</div>
			</div>
		</div>`;
}

function tabBar(): string {
	const tabs: string[] = [];

	tabs.push(
		`<button class="favorites-tab${activeCollection === 'all' ? ' active' : ''}" data-collection="all">${t('favorites.all')}</button>`,
	);

	for (const col of collections) {
		tabs.push(
			`<button class="favorites-tab${activeCollection === col.uuid ? ' active' : ''}" data-collection="${col.uuid}">
				<span class="favorites-tab-name">${col.name}</span>
				<span class="favorites-tab-count">${col.favorite_count}</span>
				<span class="favorites-tab-menu" data-col-uuid="${col.uuid}" title="${t('collections.rename')} / ${t('collections.delete')}">${icons['more-horizontal'](14)}</span>
			</button>`,
		);
	}

	tabs.push(`<button class="favorites-tab favorites-tab-add" title="${t('collections.create')}">${icons.plus(16)}</button>`);

	return `<div class="favorites-tabs">${tabs.join('')}</div>`;
}

/** The move-to-collection choices for a favorite currently in `currentCollection`. */
function collectionDropdown(currentCollection: string | null): string {
	const options: string[] = [];

	// Offer "no collection" only when the favorite is currently inside one.
	if (currentCollection !== null) {
		options.push(`<button class="collection-dropdown-item" data-target="uncategorized">${t('favorites.noCollection')}</button>`);
	}

	for (const col of collections) {
		if (col.uuid === currentCollection) continue;
		options.push(`<button class="collection-dropdown-item" data-target="${col.uuid}">${col.name}</button>`);
	}

	if (options.length === 0) {
		options.push(`<span class="collection-dropdown-empty">${t('favorites.noOtherCollections')}</span>`);
	}

	return `<div class="collection-dropdown">${options.join('')}</div>`;
}

function scheduleReorder(): void {
	if (reorderTimer) clearTimeout(reorderTimer);

	reorderTimer = setTimeout(async () => {
		const cards = document.querySelectorAll<HTMLElement>('#favorites-grid [data-resource-id]');
		const ordered_uuids = Array.from(cards).map((c) => c.dataset.resourceId!);
		if (ordered_uuids.length === 0) return;

		try {
			await fetch('/api/favorites/reorder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ordered_uuids, collection_uuid: activeCollection }),
			});
			DataCache.clear('/api/favorites');
		} catch {
			showToast(t('common.networkError'), 'error');
		}
	}, 500);
}

function updateUpDownState(): void {
	const cards = document.querySelectorAll<HTMLElement>('#favorites-grid .favorite-card');
	cards.forEach((card, i) => {
		const up = card.querySelector<HTMLButtonElement>('.favorite-move-up');
		const down = card.querySelector<HTMLButtonElement>('.favorite-move-down');
		if (up) {
			up.disabled = i === 0;
			up.style.opacity = i === 0 ? '0.3' : '1';
		}
		if (down) {
			down.disabled = i === cards.length - 1;
			down.style.opacity = i === cards.length - 1 ? '0.3' : '1';
		}
	});
}

/** Refresh a card's collection tag after it was moved, without re-fetching. */
function updateCardCollection(card: HTMLElement, collectionUuid: string | null): void {
	card.dataset.collection = collectionUuid ?? '';
	const nameEl = card.querySelector<HTMLElement>('.favorite-collection-tag-name');
	if (nameEl) nameEl.textContent = collectionName(collectionUuid);
}

/** Bump a collection tab's visible count by a delta, keeping local state in sync. */
function adjustCollectionCount(collectionUuid: string | null, delta: number): void {
	if (collectionUuid === null) return;
	const col = collections.find((c) => c.uuid === collectionUuid);
	if (col) col.favorite_count = Math.max(0, col.favorite_count + delta);

	const tab = document.querySelector<HTMLElement>(`.favorites-tab[data-collection="${collectionUuid}"] .favorites-tab-count`);
	if (tab && col) tab.textContent = String(col.favorite_count);
}

function showEmptyMessage(): void {
	const grid = document.getElementById('favorites-grid');
	if (grid) grid.outerHTML = `<p class="empty-message">${t('common.noFavorites')}</p>`;
}

// =========================================================================
// View
// =========================================================================

export async function favoritesView(ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('nav.favorites')}`;

	const collectionParam = ctx.query.get('collection');
	activeCollection = collectionParam && collectionParam !== 'all' ? collectionParam : 'all';

	try {
		const colData = (await DataCache.fetch('/api/collections')) as CollectionsResponse;
		collections = colData.collections ?? [];
	} catch {
		collections = [];
	}

	// A tab may have been deleted or the URL hand-edited — fall back to "all".
	if (activeCollection !== 'all' && !collections.some((c) => c.uuid === activeCollection)) {
		activeCollection = 'all';
	}

	const apiUrl = activeCollection === 'all' ? '/api/favorites?collection=all' : `/api/favorites?collection=${activeCollection}`;

	let data: FavoritesResponse = { favorites: [] };
	try {
		data = (await DataCache.fetch(`${apiUrl}&_=${Date.now()}`)) as FavoritesResponse;
	} catch {
		/* show empty */
	}

	const favs = data.favorites ?? [];
	const subtitle =
		activeCollection === 'all'
			? `${favs.length} ${favs.length === 1 ? t('favorites.itemOne') : t('favorites.itemMany')}`
			: `${favs.length} ${favs.length === 1 ? t('favorites.itemOne') : t('favorites.itemMany')} · ${collectionName(activeCollection)}`;

	return `
		<div class="favorites-header">
			<div class="favorites-header-top">
				<h1>${t('nav.favorites')}</h1>
				<span class="favorites-header-count">${subtitle}</span>
			</div>
			${tabBar()}
		</div>

		${
			favs.length === 0
				? `<p class="empty-message">${t('common.noFavorites')}</p>`
				: `<div id="favorites-grid" class="grid favorites-grid">${favs.map(favoriteCard).join('')}</div>`
		}`;
}

// =========================================================================
// After
// =========================================================================

export function favoritesAfter(_ctx: RouteContext): void {
	updateUpDownState();
	wireTabClicks();
	wireCollectionCreate();
	wireCollectionMenu();
	wireMoveUpDown();
	wireRemove();
	wireCollectionDropdowns();
	wireDragAndDrop();
}

// =========================================================================
// Tab navigation
// =========================================================================

function wireTabClicks(): void {
	document.querySelectorAll<HTMLButtonElement>('.favorites-tab:not(.favorites-tab-add)').forEach((tab) => {
		tab.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			if (target.closest('.favorites-tab-menu')) return;

			const col = tab.dataset.collection!;
			const href = col === 'all' ? '/favorites' : `/favorites?collection=${col}`;
			window.history.pushState(null, '', href);
			window.dispatchEvent(new PopStateEvent('popstate'));
		});
	});
}

// =========================================================================
// Collection CRUD
// =========================================================================

function wireCollectionCreate(): void {
	const addBtn = document.querySelector<HTMLButtonElement>('.favorites-tab-add');
	if (!addBtn) return;

	addBtn.addEventListener('click', () => {
		const existing = document.querySelector('.collection-create-input');
		if (existing) return;

		const tabs = addBtn.closest('.favorites-tabs')!;
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'collection-create-input';
		input.placeholder = t('collections.namePlaceholder');
		input.maxLength = 50;
		// Its own strip below the tab row, so it doesn't distort the tabs.
		tabs.insertAdjacentElement('afterend', input);
		input.focus();

		let submitting = false;
		const submit = async () => {
			if (submitting) return;
			const name = input.value.trim();
			if (!name) {
				input.remove();
				return;
			}
			submitting = true;
			try {
				await fetch('/api/collections', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name }),
				});
				DataCache.clear('/api/collections');
				showToast(t('collections.created').replace('{name}', name), 'success');
				window.history.pushState(null, '', '/favorites');
				window.dispatchEvent(new PopStateEvent('popstate'));
			} catch {
				showToast(t('common.networkError'), 'error');
			}
		};

		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') submit();
			if (e.key === 'Escape') input.remove();
		});
		input.addEventListener('blur', submit);
	});
}

function wireCollectionMenu(): void {
	document.querySelectorAll<HTMLElement>('.favorites-tab-menu').forEach((menuBtn) => {
		menuBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const colUuid = menuBtn.dataset.colUuid!;

			closeAllDropdowns();

			const menu = document.createElement('div');
			menu.className = 'collection-context-menu';
			menu.innerHTML = `
				<button class="collection-ctx-rename">${icons.edit(14)} ${t('collections.rename')}</button>
				<button class="collection-ctx-delete">${icons.trash(14)} ${t('collections.delete')}</button>
			`;
			// Appended to <body> and positioned via fixed coords so it escapes the tab bar's
			// horizontal scroll clipping instead of being cut off inside it.
			const rect = menuBtn.getBoundingClientRect();
			menu.style.top = `${rect.bottom + 2}px`;
			menu.style.left = `${rect.left}px`;
			document.body.appendChild(menu);

			menu.querySelector('.collection-ctx-rename')!.addEventListener('click', async (ev) => {
				ev.stopPropagation();
				menu.remove();
				const newName = prompt(t('collections.namePlaceholder'));
				if (!newName?.trim()) return;
				try {
					await fetch(`/api/collections/${colUuid}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ name: newName.trim() }),
					});
					DataCache.clear('/api/collections');
					window.dispatchEvent(new PopStateEvent('popstate'));
				} catch {
					showToast(t('common.networkError'), 'error');
				}
			});

			menu.querySelector('.collection-ctx-delete')!.addEventListener('click', async (ev) => {
				ev.stopPropagation();
				menu.remove();
				if (!confirm(t('collections.confirmDelete'))) return;
				try {
					await fetch(`/api/collections/${colUuid}`, { method: 'DELETE' });
					DataCache.clear('/api/collections');
					DataCache.clear('/api/favorites');
					window.history.pushState(null, '', '/favorites');
					window.dispatchEvent(new PopStateEvent('popstate'));
				} catch {
					showToast(t('common.networkError'), 'error');
				}
			});

			const close = (ev: MouseEvent) => {
				if (!menu.contains(ev.target as Node)) {
					menu.remove();
					document.removeEventListener('click', close);
				}
			};
			setTimeout(() => document.addEventListener('click', close), 0);
		});
	});
}

// =========================================================================
// Move up / down
// =========================================================================

function wireMoveUpDown(): void {
	document.querySelectorAll<HTMLButtonElement>('.favorite-move-up').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const card = btn.closest<HTMLElement>('.favorite-card')!;
			const prev = card.previousElementSibling as HTMLElement | null;
			if (prev) {
				card.parentElement!.insertBefore(card, prev);
				updateUpDownState();
				scheduleReorder();
			}
		});
	});

	document.querySelectorAll<HTMLButtonElement>('.favorite-move-down').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const card = btn.closest<HTMLElement>('.favorite-card')!;
			const next = card.nextElementSibling as HTMLElement | null;
			if (next) {
				card.parentElement!.insertBefore(next, card);
				updateUpDownState();
				scheduleReorder();
			}
		});
	});
}

// =========================================================================
// Remove favorite
// =========================================================================

function wireRemove(): void {
	document.querySelectorAll<HTMLButtonElement>('.favorite-remove-btn').forEach((btn) => {
		btn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();

			if (!confirm(t('common.removeFavorite') + '?')) return;

			const uuid = btn.dataset.uuid!;
			const card = btn.closest<HTMLElement>('.favorite-card');
			const prevCollection = card?.dataset.collection ? card.dataset.collection : null;
			card?.remove();

			adjustCollectionCount(prevCollection, -1);

			const remaining = document.querySelectorAll('#favorites-grid .favorite-card');
			if (remaining.length === 0) showEmptyMessage();
			else updateUpDownState();

			try {
				await fetch(`/api/favorites/${uuid}`, { method: 'DELETE' });
				DataCache.clear('/api/favorites');
				DataCache.clear('/api/collections');
			} catch {
				/* ignore */
			}
		});
	});
}

// =========================================================================
// Collection dropdown (move to collection)
// =========================================================================

function closeAllDropdowns(): void {
	document.querySelectorAll('.collection-dropdown, .collection-context-menu').forEach((d) => d.remove());
}

function wireCollectionDropdowns(): void {
	document.querySelectorAll<HTMLButtonElement>('.favorite-collection-btn').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();

			const uuid = btn.dataset.uuid!;
			const card = btn.closest<HTMLElement>('.favorite-card')!;
			const wrap = btn.closest<HTMLElement>('.favorite-collection-wrap')!;

			const existing = wrap.querySelector('.collection-dropdown');
			if (existing) {
				existing.remove();
				return;
			}

			closeAllDropdowns();

			const currentCollection = card.dataset.collection ? card.dataset.collection : null;
			wrap.insertAdjacentHTML('beforeend', collectionDropdown(currentCollection));

			const dropdown = wrap.querySelector<HTMLElement>('.collection-dropdown')!;
			dropdown.querySelectorAll<HTMLButtonElement>('.collection-dropdown-item').forEach((item) => {
				item.addEventListener('click', (ev) => {
					ev.stopPropagation();
					const target = item.dataset.target!;
					const targetCollection = target === 'uncategorized' ? null : target;
					dropdown.remove();
					moveFavoriteToCollection(uuid, card, currentCollection, targetCollection);
				});
			});

			const close = (ev: MouseEvent) => {
				if (!dropdown.contains(ev.target as Node) && ev.target !== btn) {
					dropdown.remove();
					document.removeEventListener('click', close);
				}
			};
			setTimeout(() => document.addEventListener('click', close), 0);
		});
	});
}

/**
 * Move a favorite to another collection with optimistic UI. On the "all" tab the card
 * stays put (only its collection tag + the target count update); on a collection tab the
 * card leaves the current view.
 */
async function moveFavoriteToCollection(
	uuid: string,
	card: HTMLElement,
	fromCollection: string | null,
	toCollection: string | null,
): Promise<void> {
	if (fromCollection === toCollection) return;

	if (activeCollection === 'all') {
		updateCardCollection(card, toCollection);
	} else {
		card.remove();
		const remaining = document.querySelectorAll('#favorites-grid .favorite-card');
		if (remaining.length === 0) showEmptyMessage();
		else updateUpDownState();
	}

	adjustCollectionCount(fromCollection, -1);
	adjustCollectionCount(toCollection, 1);

	const title = stripMarkdown(card.querySelector('.favorite-card-title')?.textContent ?? '').substring(0, 40);
	const destName = collectionName(toCollection);
	showToast(t('favorites.movedTo').replace('{item}', title).replace('{collection}', destName), 'success');

	try {
		await fetch(`/api/favorites/${uuid}/collection`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ collection_uuid: toCollection }),
		});
		DataCache.clear('/api/favorites');
		DataCache.clear('/api/collections');
	} catch {
		showToast(t('common.networkError'), 'error');
	}
}

// =========================================================================
// Drag and drop (Pointer Events)
// =========================================================================

// The dragged card itself is NEVER re-inserted during the drag — reordering the
// pointer-captured element mid-gesture makes the browser drop the capture and fire a
// spurious pointercancel (the "stuck cursor" bug). Instead the capture lives on the
// stable grid, a floating ghost follows the pointer, and a placeholder marks the drop
// slot. The real card only moves once, on pointerup.
function wireDragAndDrop(): void {
	const grid = document.getElementById('favorites-grid');
	if (!grid) return;

	let dragCard: HTMLElement | null = null;
	let ghost: HTMLElement | null = null;
	let placeholder: HTMLElement | null = null;
	let pointerId = -1;
	let offsetX = 0;
	let offsetY = 0;

	const cleanup = (): void => {
		ghost?.remove();
		placeholder?.remove();
		dragCard?.classList.remove('dragging');
		if (pointerId !== -1 && grid.hasPointerCapture(pointerId)) grid.releasePointerCapture(pointerId);
		ghost = null;
		placeholder = null;
		dragCard = null;
		pointerId = -1;
		document.removeEventListener('keydown', onKeyDown);
	};

	const onKeyDown = (e: KeyboardEvent): void => {
		// Escape aborts the drag and restores the normal cursor — no reload ever needed.
		if (e.key === 'Escape') cleanup();
	};

	grid.addEventListener('pointerdown', (e: PointerEvent) => {
		const handle = (e.target as HTMLElement).closest<HTMLElement>('.drag-handle');
		if (!handle) return;
		e.preventDefault();

		dragCard = handle.closest<HTMLElement>('.favorite-card')!;
		const rect = dragCard.getBoundingClientRect();
		offsetX = e.clientX - rect.left;
		offsetY = e.clientY - rect.top;
		pointerId = e.pointerId;
		grid.setPointerCapture(pointerId);

		// Placeholder occupies the card's slot so surrounding cards don't collapse.
		placeholder = document.createElement('div');
		placeholder.className = 'favorite-drop-placeholder';
		placeholder.style.height = `${rect.height}px`;
		dragCard.parentElement!.insertBefore(placeholder, dragCard.nextSibling);

		ghost = dragCard.cloneNode(true) as HTMLElement;
		ghost.classList.add('drag-ghost');
		ghost.style.position = 'fixed';
		ghost.style.left = `${rect.left}px`;
		ghost.style.top = `${rect.top}px`;
		ghost.style.width = `${rect.width}px`;
		ghost.style.margin = '0';
		ghost.style.zIndex = '10000';
		ghost.style.pointerEvents = 'none';
		document.body.appendChild(ghost);

		dragCard.classList.add('dragging');
		document.addEventListener('keydown', onKeyDown);
	});

	grid.addEventListener('pointermove', (e: PointerEvent) => {
		if (!dragCard || !ghost || !placeholder) return;

		ghost.style.left = `${e.clientX - offsetX}px`;
		ghost.style.top = `${e.clientY - offsetY}px`;

		const target = cardUnderPoint(grid, e.clientX, e.clientY);
		if (target) {
			// Grid flows left-to-right then top-to-bottom: which side of a card's midline the
			// pointer is on decides whether the placeholder lands before or after it.
			const rect = target.getBoundingClientRect();
			const after = e.clientX > rect.left + rect.width / 2;
			grid.insertBefore(placeholder, after ? target.nextElementSibling : target);
		}
	});

	const finish = (): void => {
		if (!dragCard || !placeholder) return cleanup();

		// The one and only DOM move of the real card: drop it where the placeholder sits.
		grid.insertBefore(dragCard, placeholder);
		cleanup();

		updateUpDownState();
		scheduleReorder();
	};

	grid.addEventListener('pointerup', finish);
	grid.addEventListener('pointercancel', cleanup);
}

/** The grid card whose box contains the point (skips the dragged card and the placeholder). */
function cardUnderPoint(grid: HTMLElement, x: number, y: number): HTMLElement | null {
	const cards = Array.from(grid.querySelectorAll<HTMLElement>('.favorite-card:not(.dragging)'));
	for (const card of cards) {
		const rect = card.getBoundingClientRect();
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return card;
	}
	return null;
}
