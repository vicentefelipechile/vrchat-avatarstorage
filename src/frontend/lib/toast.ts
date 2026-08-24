// =========================================================================
// lib/toast.ts — Toast notifications
// =========================================================================

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
export function showToast(message: string, type: ToastType = 'info', duration = 9000): () => void {
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

	toast.addEventListener('click', () => {
		if (timer) clearTimeout(timer);
		dismiss();
	});

	return dismiss;
}

/**
 * Shows a persistent progress toast for Drive transfers.
 * The toast stays until dismissed and exposes an updater for % and text.
 */
export function showProgressToast(initialMessage: string, type: ToastType = 'info'): {
	update: (pct: number, message?: string) => void;
	dismiss: () => void;
	element: HTMLElement;
} {
	const container = getToastContainer();

	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.style.minWidth = '280px';

	const textEl = document.createElement('div');
	textEl.textContent = initialMessage;
	textEl.style.wordBreak = 'break-word';

	const barWrap = document.createElement('div');
	barWrap.style.marginTop = '8px';
	barWrap.style.height = '6px';
	barWrap.style.border = '1px solid var(--border-color)';
	barWrap.style.background = 'var(--bg-code)';

	const bar = document.createElement('div');
	bar.style.height = '100%';
	bar.style.width = '0%';
	bar.style.background = 'var(--btn-bg)';
	bar.style.transition = 'width 0.3s ease';
	barWrap.appendChild(bar);

	const pctEl = document.createElement('div');
	pctEl.textContent = '0%';
	pctEl.style.fontSize = '0.75rem';
	pctEl.style.color = 'var(--text-muted)';
	pctEl.style.marginTop = '4px';
	pctEl.style.textAlign = 'right';

	toast.append(textEl, barWrap, pctEl);
	container.appendChild(toast);
	requestAnimationFrame(() => toast.classList.add('toast-visible'));

	const dismiss = () => {
		toast.classList.remove('toast-visible');
		toast.classList.add('toast-hiding');
		toast.addEventListener('transitionend', () => toast.remove(), { once: true });
	};

	const update = (pct: number, message?: string) => {
		const clamped = Math.max(0, Math.min(100, Math.round(pct)));
		bar.style.width = `${clamped}%`;
		pctEl.textContent = `${clamped}%`;
		if (message !== undefined) textEl.textContent = message;
	};

	toast.addEventListener('click', dismiss);

	return { update, dismiss, element: toast };
}
