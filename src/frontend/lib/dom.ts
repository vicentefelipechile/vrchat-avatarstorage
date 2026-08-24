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

/** Decode HTML entities into normal text without using innerHTML (CodeQL-safe). */
export function htmlDecode(input: string): string {
	return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z0-9]+);/g, (match, entity: string) => {
		if (entity[0] === '#') {
			const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
			if (!Number.isNaN(code)) return String.fromCodePoint(code);
			return match;
		}
		switch (entity) {
			case 'amp':
				return '&';
			case 'lt':
				return '<';
			case 'gt':
				return '>';
			case 'quot':
				return '"';
			case 'apos':
			case '#39':
				return "'";
			case 'nbsp':
				return '\u00A0';
			case 'copy':
				return '©';
			case 'reg':
				return '®';
			case 'hellip':
				return '…';
			case 'mdash':
				return '—';
			case 'ndash':
				return '–';
			case 'laquo':
				return '«';
			case 'raquo':
				return '»';
			default:
				return match;
		}
	});
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
