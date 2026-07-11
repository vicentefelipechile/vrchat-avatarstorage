// =========================================================================================================
// frontend/confirm.ts — On-brand confirmation modal
// =========================================================================================================
// A promise-based replacement for the native `confirm()`. Renders a single reusable overlay that follows
// the design system (square corners, token colors, solid borders). Resolves `true` on confirm, `false` on
// cancel / backdrop click / Escape.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { t } from '../core/i18n';

// =========================================================================================================
// Types
// =========================================================================================================

interface ConfirmOptions {
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	/** Styles the confirm button as destructive (red). */
	danger?: boolean;
}

// =========================================================================================================
// Helpers
// =========================================================================================================

/** The single overlay reused across every call, built lazily on first use. */
let overlay: HTMLElement | null = null;

function buildOverlay(): HTMLElement {
	const el = document.createElement('div');
	el.className = 'confirm-overlay';
	el.setAttribute('role', 'dialog');
	el.setAttribute('aria-modal', 'true');
	el.innerHTML = `
		<div class="confirm-modal">
			<h3 class="confirm-title"></h3>
			<p class="confirm-message"></p>
			<div class="confirm-actions">
				<button type="button" class="btn btn-outline confirm-cancel"></button>
				<button type="button" class="btn confirm-ok"></button>
			</div>
		</div>`;
	document.body.appendChild(el);
	return el;
}

// =========================================================================================================
// Public API
// =========================================================================================================

/**
 * Shows an on-brand confirmation modal and resolves to the user's choice.
 * Backdrop click, Escape and the cancel button all resolve `false`; the confirm button resolves `true`.
 */
export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
	if (!overlay) overlay = buildOverlay();
	const root = overlay;

	const titleEl = root.querySelector<HTMLElement>('.confirm-title')!;
	const messageEl = root.querySelector<HTMLElement>('.confirm-message')!;
	const okBtn = root.querySelector<HTMLButtonElement>('.confirm-ok')!;
	const cancelBtn = root.querySelector<HTMLButtonElement>('.confirm-cancel')!;

	titleEl.textContent = opts.title ?? t('confirm.title');
	titleEl.style.display = opts.title === '' ? 'none' : '';
	messageEl.textContent = opts.message;
	okBtn.textContent = opts.confirmText ?? t('confirm.confirm');
	cancelBtn.textContent = opts.cancelText ?? t('confirm.cancel');
	okBtn.classList.toggle('btn-danger', !!opts.danger);

	return new Promise<boolean>((resolve) => {
		const close = (result: boolean) => {
			root.classList.remove('active');
			document.body.style.overflow = '';
			okBtn.removeEventListener('click', onOk);
			cancelBtn.removeEventListener('click', onCancel);
			root.removeEventListener('click', onBackdrop);
			document.removeEventListener('keydown', onKey);
			resolve(result);
		};

		const onOk = () => close(true);
		const onCancel = () => close(false);
		const onBackdrop = (e: MouseEvent) => {
			if (e.target === root) close(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close(false);
			if (e.key === 'Enter') close(true);
		};

		okBtn.addEventListener('click', onOk);
		cancelBtn.addEventListener('click', onCancel);
		root.addEventListener('click', onBackdrop);
		document.addEventListener('keydown', onKey);

		root.classList.add('active');
		document.body.style.overflow = 'hidden';
		okBtn.focus();
	});
}
