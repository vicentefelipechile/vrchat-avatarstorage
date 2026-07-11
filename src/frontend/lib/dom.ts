// =========================================================================
// lib/dom.ts — Small DOM helpers
// =========================================================================

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

/** Decode HTML entities into normal text. */
export function htmlDecode(input: string): string {
	const textarea = document.createElement('textarea');
	textarea.innerHTML = input;
	return textarea.value;
}

/** Set button to loading state, returns restore function. */
export function loadingBtn(btn: HTMLButtonElement, text = '…'): () => void {
	const orig = btn.innerHTML;
	btn.disabled = true;
	btn.textContent = text;
	return () => {
		btn.disabled = false;
		btn.innerHTML = orig;
	};
}
