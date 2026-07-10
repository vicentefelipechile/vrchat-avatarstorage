// =========================================================================
// views/FavoritesView.ts — Favorites with collections, drag-and-drop
// reorder, up/down buttons, and move-to-collection dropdown.
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { icons } from '../icons';
import { stripMarkdown, progressiveImg, showToast } from '../utils';
import type { RouteContext } from '../types';

// =========================================================================
// Types
// =========================================================================

interface Favorite {
	uuid: string;
	thumbnail_key?: string;
	thumbnail_uuid?: string;
	placeholder_blur?: string | null;
	title: string;
	category: string;
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

let activeCollection: string | null | 'all' = null;
let collections: Collection[] = [];
let reorderTimer: ReturnType<typeof setTimeout> | null = null;

// =========================================================================
// Helpers
// =========================================================================

function favoriteCard(fav: Favorite, isReadOnly: boolean): string {
	const title = stripMarkdown(fav.title).substring(0, 40);
	const categoryLabel = t('cats.' + fav.category) || fav.category;

	return `
		<div class="favorite-compact" data-resource-id="${fav.uuid}">
			${
				isReadOnly
					? '<div class="drag-handle-spacer"></div>'
					: `<div class="drag-handle" title="${t('favorites.dragToReorder')}">${icons['grip-vertical'](18)}</div>`
			}
			<a href="/item/${fav.uuid}" data-link class="favorite-thumb">
				${
					fav.thumbnail_uuid
						? progressiveImg({ uuid: fav.thumbnail_uuid, placeholder: fav.placeholder_blur ?? null, res: 'low', alt: title, size: 56 })
						: '<div class="favorite-thumb-placeholder"></div>'
				}
			</a>
			<div class="favorite-info">
				<a href="/item/${fav.uuid}" data-link class="favorite-title">${title}${fav.title.length > 40 ? '\u2026' : ''}</a>
				<span class="card-badge">${categoryLabel}</span>
			</div>
			<div class="favorite-actions-compact">
				${
					isReadOnly
						? ''
						: `<button class="btn-icon favorite-move-up" data-uuid="${fav.uuid}" title="${t('favorites.moveUp')}">${icons['chevron-up'](16)}</button>
				<button class="btn-icon favorite-move-down" data-uuid="${fav.uuid}" title="${t('favorites.moveDown')}">${icons['chevron-down'](16)}</button>`
				}
				<div class="favorite-collection-wrap">
					<button class="btn-icon favorite-collection-btn" data-uuid="${fav.uuid}" title="${t('favorites.moveToCollection')}">${icons['folder-open'](16)}</button>
				</div>
				<button class="btn-icon favorite-remove-btn" data-uuid="${fav.uuid}" title="${t('common.removeFavorite')}">${icons.x(16)}</button>
			</div>
		</div>`;
}

function tabBar(): string {
	const tabs: string[] = [];

	tabs.push(
		`<button class="favorites-tab${activeCollection === 'all' ? ' active' : ''}" data-collection="all">${t('favorites.all')}</button>`,
	);
	tabs.push(
		`<button class="favorites-tab${activeCollection === null ? ' active' : ''}" data-collection="uncategorized">${t('favorites.uncategorized')}</button>`,
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

function collectionDropdown(fav: Favorite): string {
	const options: string[] = [];

	if (activeCollection !== null && activeCollection !== 'all') {
		options.push(`<button class="collection-dropdown-item" data-target="uncategorized">${t('favorites.uncategorized')}</button>`);
	}

	for (const col of collections) {
		if (col.uuid === activeCollection) continue;
		if (col.uuid === fav.collection_uuid) continue;
		options.push(`<button class="collection-dropdown-item" data-target="${col.uuid}">${col.name}</button>`);
	}

	return `<div class="collection-dropdown">${options.join('')}</div>`;
}

function scheduleReorder(): void {
	if (activeCollection === 'all') return;
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
	const cards = document.querySelectorAll<HTMLElement>('#favorites-grid .favorite-compact');
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

// =========================================================================
// View
// =========================================================================

export async function favoritesView(ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage \u2014 ${t('nav.favorites')}`;

	const collectionParam = ctx.query.get('collection');
	activeCollection = collectionParam === 'all' ? 'all' : collectionParam ?? null;

	try {
		const colData = (await DataCache.fetch('/api/collections')) as CollectionsResponse;
		collections = colData.collections ?? [];
	} catch {
		collections = [];
	}

	const apiUrl =
		activeCollection === 'all'
			? '/api/favorites?collection=all'
			: activeCollection === null
				? '/api/favorites'
				: `/api/favorites?collection=${activeCollection}`;

	let data: FavoritesResponse = { favorites: [] };
	try {
		data = (await DataCache.fetch(`${apiUrl}&_=${Date.now()}`)) as FavoritesResponse;
	} catch {
		/* show empty */
	}

	const favs = data.favorites ?? [];
	const isReadOnly = activeCollection === 'all';

	return `
		<div class="page-header">
			<h1>${t('nav.favorites')}</h1>
		</div>

		${tabBar()}

		${
			favs.length === 0
				? `<p class="empty-message">${t('common.noFavorites')}</p>`
				: `<div id="favorites-grid">${favs.map((f) => favoriteCard(f, isReadOnly)).join('')}</div>`
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
	if (activeCollection !== 'all') wireDragAndDrop();
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
			const href = col === 'uncategorized' ? '/favorites' : `/favorites?collection=${col}`;
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

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'collection-create-input';
		input.placeholder = t('collections.namePlaceholder');
		input.maxLength = 50;
		addBtn.parentElement!.insertBefore(input, addBtn);
		input.focus();

		const submit = async () => {
			const name = input.value.trim();
			if (!name) {
				input.remove();
				return;
			}
			try {
				await fetch('/api/collections', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name }),
				});
				DataCache.clear('/api/collections');
				showToast(name, 'success');
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
			menuBtn.parentElement!.appendChild(menu);

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
			const card = btn.closest<HTMLElement>('.favorite-compact')!;
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
			const card = btn.closest<HTMLElement>('.favorite-compact')!;
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
			const card = btn.closest<HTMLElement>('.favorite-compact');
			card?.remove();

			const remaining = document.querySelectorAll('#favorites-grid .favorite-compact');
			if (remaining.length === 0) {
				const grid = document.getElementById('favorites-grid');
				if (grid) grid.outerHTML = `<p class="empty-message">${t('common.noFavorites')}</p>`;
			} else {
				updateUpDownState();
			}

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
			const wrap = btn.closest<HTMLElement>('.favorite-collection-wrap')!;

			const existing = wrap.querySelector('.collection-dropdown');
			if (existing) {
				existing.remove();
				return;
			}

			closeAllDropdowns();

			const fav: Favorite = { uuid, title: '', category: '', collection_uuid: activeCollection === 'all' ? null : activeCollection };
			wrap.insertAdjacentHTML('beforeend', collectionDropdown(fav));

			const dropdown = wrap.querySelector<HTMLElement>('.collection-dropdown')!;
			dropdown.querySelectorAll<HTMLButtonElement>('.collection-dropdown-item').forEach((item) => {
				item.addEventListener('click', async (ev) => {
					ev.stopPropagation();
					const target = item.dataset.target!;
					const collectionUuid = target === 'uncategorized' ? null : target;

					dropdown.remove();

					const card = btn.closest<HTMLElement>('.favorite-compact');
					card?.remove();

					const remaining = document.querySelectorAll('#favorites-grid .favorite-compact');
					if (remaining.length === 0) {
						const grid = document.getElementById('favorites-grid');
						if (grid) grid.outerHTML = `<p class="empty-message">${t('common.noFavorites')}</p>`;
					} else {
						updateUpDownState();
					}

					try {
						await fetch(`/api/favorites/${uuid}/collection`, {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ collection_uuid: collectionUuid }),
						});
						DataCache.clear('/api/favorites');
						DataCache.clear('/api/collections');
						showToast(t('favorites.moveToCollection'), 'success');
					} catch {
						showToast(t('common.networkError'), 'error');
					}
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

// =========================================================================
// Drag and drop (Pointer Events)
// =========================================================================

function wireDragAndDrop(): void {
	const grid = document.getElementById('favorites-grid');
	if (!grid) return;

	const handles = grid.querySelectorAll<HTMLElement>('.drag-handle');
	let dragCard: HTMLElement | null = null;
	let ghost: HTMLElement | null = null;
	let startY = 0;
	let offsetY = 0;

	handles.forEach((handle) => {
		handle.addEventListener('pointerdown', (e: PointerEvent) => {
			e.preventDefault();
			handle.setPointerCapture(e.pointerId);

			dragCard = handle.closest<HTMLElement>('.favorite-compact')!;
			const rect = dragCard.getBoundingClientRect();
			startY = e.clientY;
			offsetY = e.clientY - rect.top;

			ghost = dragCard.cloneNode(true) as HTMLElement;
			ghost.classList.add('drag-ghost');
			ghost.style.position = 'fixed';
			ghost.style.left = `${rect.left}px`;
			ghost.style.top = `${rect.top}px`;
			ghost.style.width = `${rect.width}px`;
			ghost.style.zIndex = '10000';
			ghost.style.pointerEvents = 'none';
			document.body.appendChild(ghost);

			dragCard.classList.add('dragging');
		});

		handle.addEventListener('pointermove', (e: PointerEvent) => {
			if (!dragCard || !ghost) return;

			ghost.style.top = `${e.clientY - offsetY}px`;

			const cards = Array.from(grid.querySelectorAll<HTMLElement>('.favorite-compact:not(.dragging)'));

			grid.querySelectorAll('.drag-indicator').forEach((ind) => ind.remove());

			let insertBefore: HTMLElement | null = null;
			for (const card of cards) {
				const rect = card.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				if (e.clientY < midY) {
					insertBefore = card;
					break;
				}
			}

			const indicator = document.createElement('div');
			indicator.className = 'drag-indicator';
			if (insertBefore) {
				grid.insertBefore(indicator, insertBefore);
			} else {
				grid.appendChild(indicator);
			}
		});

		handle.addEventListener('pointerup', (e: PointerEvent) => {
			if (!dragCard || !ghost) return;
			handle.releasePointerCapture(e.pointerId);

			ghost.remove();
			ghost = null;

			grid.querySelectorAll('.drag-indicator').forEach((ind) => ind.remove());
			dragCard.classList.remove('dragging');

			const cards = Array.from(grid.querySelectorAll<HTMLElement>('.favorite-compact:not(.dragging)'));
			let insertBefore: HTMLElement | null = null;
			for (const card of cards) {
				const rect = card.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				if (e.clientY < midY) {
					insertBefore = card;
					break;
				}
			}

			if (insertBefore && insertBefore !== dragCard) {
				grid.insertBefore(dragCard, insertBefore);
			} else if (!insertBefore) {
				grid.appendChild(dragCard);
			}

			dragCard = null;
			updateUpDownState();
			scheduleReorder();
		});

		handle.addEventListener('pointercancel', () => {
			if (ghost) ghost.remove();
			if (dragCard) dragCard.classList.remove('dragging');
			grid.querySelectorAll('.drag-indicator').forEach((ind) => ind.remove());
			ghost = null;
			dragCard = null;
		});
	});
}
