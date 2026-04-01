// =========================================================================
// utils.ts — Shared frontend utilities
// =========================================================================

// -------------------------------------------------------------------------
// Image resizing
// -------------------------------------------------------------------------

export function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<File> {
	return new Promise((resolve, reject) => {
		const img = document.createElement('img');
		const reader = new FileReader();

		reader.onload = (e) => {
			img.src = e.target!.result as string;
			img.onload = () => {
				let { width, height } = img;

				if (width > height) {
					if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
				} else {
					if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => blob
						? resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }))
						: reject(new Error('Canvas to Blob failed')),
					file.type,
				);
			};
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// -------------------------------------------------------------------------
// Markdown stripping
// -------------------------------------------------------------------------

export function stripMarkdown(md: string): string {
	if (!md) return '';
	return md
		.replace(/^#+\s+/gm, '')
		.replace(/(\*\*|__)(.*?)\1/g, '$2')
		.replace(/(\*|_)(.*?)\1/g, '$2')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/!\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^>\s+/gm, '')
		.replace(/^[+\-*]\s+/gm, '')
		.replace(/`([^`]+)`/g, '$1');
}

// -------------------------------------------------------------------------
// Markdown rendering (with GitHub-style alert post-processing)
// -------------------------------------------------------------------------

export function renderMarkdown(container: HTMLElement, raw: string): void {
	if (!window.marked) { container.textContent = raw; return; }

	const html = window.DOMPurify ? window.DOMPurify.sanitize(window.marked.parse(raw)) : window.marked.parse(raw);
	container.innerHTML = html;

	// Post-process > [!NOTE / TIP / WARNING / …] blockquotes
	container.querySelectorAll<HTMLElement>('blockquote').forEach((bq) => {
		const firstP = bq.querySelector('p');
		if (!firstP) return;
		const match = firstP.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
		if (!match) return;

		const type = match[1].toLowerCase();
		bq.classList.add('markdown-alert', `markdown-alert-${type}`);
		firstP.innerHTML = firstP.innerHTML.replace(match[0], '').trim();

		const title = document.createElement('p');
		title.className = 'markdown-alert-title';
		title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
		bq.insertBefore(title, firstP);
	});
}

// -------------------------------------------------------------------------
// Turnstile
// -------------------------------------------------------------------------

let _cachedSiteKey: string | null = null;

async function getSiteKey(): Promise<string | null> {
	if (_cachedSiteKey) return _cachedSiteKey;
	try {
		const res = await fetch('/api/config');
		const data = await res.json() as { turnstileSiteKey?: string };
		_cachedSiteKey = data.turnstileSiteKey ?? null;
		return _cachedSiteKey;
	} catch {
		return null;
	}
}

export async function renderTurnstile(selector: string): Promise<void> {
	if (!window.turnstile) { console.warn('Turnstile not loaded yet.'); return; }

	const key = await getSiteKey();
	if (!key) { console.error('Turnstile site key missing'); return; }

	const container = document.querySelector(selector);
	if (!container) return;

	container.innerHTML = '';
	window.turnstile.render(selector, { sitekey: key.trim() });
}

// -------------------------------------------------------------------------
// DOM helpers
// -------------------------------------------------------------------------

/** Query a typed element, throws if missing. */
export function $<T extends HTMLElement>(selector: string, root: ParentNode = document): T {
	const el = root.querySelector<T>(selector);
	if (!el) throw new Error(`Element not found: ${selector}`);
	return el;
}

/** Query a typed element, returns null if missing. */
export function $$<T extends HTMLElement>(selector: string, root: ParentNode = document): T | null {
	return root.querySelector<T>(selector);
}

/** Set button to loading state, returns restore function. */
export function loadingBtn(btn: HTMLButtonElement, text = '…'): () => void {
	const orig = btn.innerHTML;
	btn.disabled = true;
	btn.textContent = text;
	return () => { btn.disabled = false; btn.innerHTML = orig; };
}

// -------------------------------------------------------------------------
// Toast notifications
// -------------------------------------------------------------------------

export type ToastType = 'info' | 'success' | 'error' | 'warning';

let _toastContainer: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
	if (_toastContainer && document.body.contains(_toastContainer)) return _toastContainer;
	const el = document.createElement('div');
	el.id = 'toast-container';
	document.body.appendChild(el);
	_toastContainer = el;
	return el;
}

/**
 * Shows a toast notification.
 * @param message  Text to display
 * @param type     'info' | 'success' | 'error' | 'warning'  (default: 'info')
 * @param duration Auto-dismiss delay in ms (default: 3000). Pass 0 to keep until manually dismissed.
 * @returns        A dismiss function you can call to remove the toast early.
 */
export function showToast(message: string, type: ToastType = 'info', duration = 3000): () => void {
	const container = getToastContainer();

	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.textContent = message;

	container.appendChild(toast);

	// Trigger enter animation on next frame
	requestAnimationFrame(() => toast.classList.add('toast-visible'));

	const dismiss = () => {
		toast.classList.remove('toast-visible');
		toast.classList.add('toast-hiding');
		toast.addEventListener('transitionend', () => toast.remove(), { once: true });
	};

	let timer: ReturnType<typeof setTimeout> | null = null;
	if (duration > 0) timer = setTimeout(dismiss, duration);

	toast.addEventListener('click', () => { if (timer) clearTimeout(timer); dismiss(); });

	return dismiss;
}
