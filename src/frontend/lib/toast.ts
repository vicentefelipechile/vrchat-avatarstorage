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
