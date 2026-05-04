// =========================================================================
// ad-orchestrator.ts — Community Ads loading orchestrator
//
// Establece el flujo unificado de carga de anuncios:
//   1. viewFn NO toca ningún estado de ads. El HTML renderizado es siempre estable.
//   2. afterFn llama a los mountXxx() de este módulo.
//   3. Cada función verifica prefs, consulta caché sync, y si hay datos los
//      inserta en el DOM quírúrgicamente. Si no hay datos → no-op.
//   Sin skeletons. Sin estados intermedios visibles. Sin layout shifts.
// =========================================================================

import {
	fetchAdsForSlot,
	getCachedAdsForSlot,
	renderSidebarBanner,
	renderSidebarBannerFixed,
	renderFeaturedArtistCard,
	renderDetailBanner,
	wireAdZoneEvents,
	trackVisibleAdImpressions,
	type AdPublic,
} from './ad-components';
import { renderAdPrefsPanel, wireAdPrefsPanel, shouldShowSlot, shouldShowAd, setShowAds } from './ad-prefs';
import { showToast } from './utils';
import { t } from './i18n';

// =========================================================================
// Exports de conveniencia — re-exportados para que los views no importen
// directamente de ad-components ni ad-prefs.
// =========================================================================

export { renderAdPrefsPanel, wireAdPrefsPanel };

// =========================================================================
// Helpers internos
// =========================================================================

/**
 * Inserta un elemento HTML al principio de un contenedor existente.
 * Usado para inyectar el sidebar en HomeView sin afectar el flex gap.
 */
function prependHtml(container: Element, html: string): void {
	if (!html) return;
	container.insertAdjacentHTML('afterbegin', html);
}

/**
 * Inserta un elemento HTML antes de un elemento de referencia.
 * Usado para inyectar el featured card antes de la sección "latest".
 */
function insertBeforeElement(refEl: Element, html: string): void {
	if (!html) return;
	refEl.insertAdjacentHTML('beforebegin', html);
}

/**
 * Establece el contenido HTML de un contenedor.
 * Usado para el detail_banner que vive en su propio zone div.
 */
function setHtml(container: Element, html: string): void {
	if (!html) return;
	container.innerHTML = html;
}

// =========================================================================
// mountSidebarSlot
// Slot: sidebar_left — para HomeView (inline en flex) y category views (fixed).
//
// Flujo:
//   1. Verificar prefs — si el slot está desactivado, no-op.
//   2. Verificar caché sync — si hay datos, renderizar inmediatamente.
//   3. Si no hay caché → fetch async → al resolver, insertar si hay datos.
//   4. En ningún caso se emite un skeleton ni se reserva espacio previo.
// =========================================================================

export interface MountSidebarOptions {
	/** ID del contenedor donde se va a insertar el sidebar como primer hijo.
	 *  Solo aplica a mode:'inline'. Para mode:'fixed' se ignora. */
	containerId?: string;
	/** 'inline' = se inserta como primer hijo del contenedor (HomeView flex).
	 *  'fixed' = se inserta en document.body con position:fixed via CSS. */
	mode: 'inline' | 'fixed';
	/** Callback opcional que recibe los UUIDs de ads mostrados en este slot,
	 *  para que otros slots puedan excluirlos (e.g. featured no repite sidebar). */
	onMounted?: (shownUuids: string[]) => void;
}

export function mountSidebarSlot(options: MountSidebarOptions): void {
	const { containerId, mode, onMounted } = options;

	// Always clean up both sidebar variants before mounting. The SPA router only
	// replaces the view container — elements injected directly into document.body
	// (the fixed sidebar) survive navigation and must be removed explicitly.
	document.querySelector('.ad-zone--sidebar-fixed')?.remove();
	document.querySelector('.ad-zone--sidebar')?.remove();

	if (!shouldShowSlot('sidebar_left')) {
		onMounted?.([]);
		return;
	}

	const renderFn = mode === 'fixed' ? renderSidebarBannerFixed : renderSidebarBanner;
	const insertFn = mode === 'fixed'
		? (html: string) => {
			if (!html) return;
			// Position:fixed via CSS — appended to body, outside the document flow.
			document.body.insertAdjacentHTML('beforeend', html);
		}
		: (html: string) => {
			if (!containerId) return;
			const container = document.getElementById(containerId);
			if (!container) return;
			// Avoid duplicating the sidebar if already present (e.g. fast back/forward).
			if (container.querySelector('.ad-zone--sidebar')) return;
			prependHtml(container, html);
		};

	// Extraer el uuid del primer ad visible para onMounted
	function extractShownUuids(ads: AdPublic[]): string[] {
		const visible = ads.filter((a) => shouldShowAd('sidebar_left', a.service_type));
		return visible.length > 0 ? [visible[0].uuid] : [];
	}

	// Intento sync desde caché
	const cached = getCachedAdsForSlot('sidebar_left');
	if (cached !== null) {
		const html = renderFn(cached);
		insertFn(html);
		if (html) trackVisibleAdImpressions();
		onMounted?.(extractShownUuids(cached));
		return;
	}

	// Fetch async — sin placeholder en el DOM
	fetchAdsForSlot('sidebar_left').then((ads) => {
		const html = renderFn(ads);
		insertFn(html);
		if (html) trackVisibleAdImpressions();
		onMounted?.(extractShownUuids(ads));
	}).catch(() => {
		onMounted?.([]);
	});
}

// =========================================================================
// mountFeaturedSlot
// Slot: featured_artist — se inserta antes de un elemento de referencia.
//
// Se llama DESPUÉS de mountSidebarSlot para poder excluir el uuid del sidebar.
// =========================================================================

export interface MountFeaturedOptions {
	/** ID del elemento de referencia. El featured card se inserta antes de él. */
	refElementId: string;
	/** UUIDs a excluir (los que ya muestra el sidebar). */
	excludeUuids: string[];
}

export function mountFeaturedSlot(options: MountFeaturedOptions): void {
	const { refElementId, excludeUuids } = options;
	if (!shouldShowSlot('featured_artist')) return;

	function doInsert(ads: AdPublic[]): void {
		const html = renderFeaturedArtistCard(ads, excludeUuids);
		if (!html) return;
		const ref = document.getElementById(refElementId);
		if (!ref) return;
		insertBeforeElement(ref, html);
		trackVisibleAdImpressions();
	}

	// Intento sync desde caché
	const cached = getCachedAdsForSlot('featured_artist');
	if (cached !== null) {
		doInsert(cached);
		return;
	}

	// Fetch async
	fetchAdsForSlot('featured_artist').then(doInsert).catch(() => {});
}

// =========================================================================
// mountDetailBannerSlot
// Slot: detail_banner — se inyecta en un zone div ya existente en el DOM.
// No tiene impacto en el layout porque vive dentro de un div inline.
// =========================================================================

export interface MountDetailBannerOptions {
	/** ID del contenedor zone div (e.g. 'item-detail-ad-zone'). */
	zoneId: string;
}

export function mountDetailBannerSlot(options: MountDetailBannerOptions): void {
	const { zoneId } = options;
	if (!shouldShowSlot('detail_banner')) return;

	function doInsert(ads: AdPublic[]): void {
		const html = renderDetailBanner(ads);
		if (!html) return;
		const zone = document.getElementById(zoneId);
		if (!zone) return;
		setHtml(zone, html);
		trackVisibleAdImpressions();
	}

	// Intento sync desde caché
	const cached = getCachedAdsForSlot('detail_banner');
	if (cached !== null) {
		doInsert(cached);
		return;
	}

	// Fetch async
	fetchAdsForSlot('detail_banner').then(doInsert).catch(() => {});
}

// =========================================================================
// detectAdBlock
// Detecta si el usuario tiene un bloqueador de anuncios activo (uBlock,
// AdBlock, etc.) creando un elemento señuelo con clases y dimensiones
// típicamente bloqueadas. Si el elemento es ocultado o eliminado, se
// considera que hay un bloqueador activo.
// Se ejecuta UNA VEZ por sesión (guardado en sessionStorage).
// =========================================================================

const ADBLOCK_SESSION_KEY = 'adblock_detected';

function detectAdBlock(): Promise<boolean> {
	return new Promise((resolve) => {
		// If already checked this session, return cached result.
		const cached = sessionStorage.getItem(ADBLOCK_SESSION_KEY);
		if (cached !== null) {
			resolve(cached === '1');
			return;
		}

		const decoy = document.createElement('div');
		// Class names and inline style chosen to match common adblock filter lists.
		decoy.className = 'ad-slot banner-ad adsbox ad-unit pub_300x250';
		decoy.style.cssText = 'width:1px;height:1px;position:absolute;top:-9999px;left:-9999px;pointer-events:none;';
		decoy.setAttribute('aria-hidden', 'true');
		document.body.appendChild(decoy);

		// Give the blocker a tick to apply its rules.
		requestAnimationFrame(() => {
			const computed = window.getComputedStyle(decoy);
			const blocked =
				!document.body.contains(decoy) ||
				computed.display === 'none' ||
				computed.visibility === 'hidden' ||
				computed.opacity === '0' ||
				decoy.offsetHeight === 0;

			decoy.remove();
			sessionStorage.setItem(ADBLOCK_SESSION_KEY, blocked ? '1' : '0');
			resolve(blocked);
		});
	});
}

// =========================================================================
// initAdSystem
// Inicializa el sistema de anuncios global: wires el panel de prefs y los
// eventos de click delegation. Debe llamarse UNA VEZ por navegación.
// =========================================================================

export function initAdSystem(options: { reloadOnSave?: boolean } = {}): void {
	wireAdPrefsPanel(options);
	wireAdZoneEvents();

	// Only run the adblock check on the very first call per session.
	if (sessionStorage.getItem(ADBLOCK_SESSION_KEY) === null) {
		detectAdBlock().then((blocked) => {
			if (!blocked) return;
			// Internally disable ads so slots no-op on future navigations.
			setShowAds(false);
			showToast(t('community.prefs.adblockDetected'), 'warning', 6000);
		});
	}
}
