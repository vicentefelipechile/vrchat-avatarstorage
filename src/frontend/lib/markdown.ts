// =========================================================================
// lib/markdown.ts — Markdown stripping and rendering
// =========================================================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Ensure GFM (tables, fenced code, etc.) and proper blockquote/code handling.
// `marked` v17 defaults to GFM, but we set it explicitly so a future upgrade never breaks `>` / `` ` ``.
marked.setOptions({ gfm: true, breaks: false, pedantic: false });

/** Decode HTML entities for legacy rows that were stored as `&gt;`/`&lt;` via old sanitizeHtml. Handles double-encoding. CodeQL-safe: no innerHTML. */
function decodeEntityOnce(input: string): string {
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

function decodeLegacyEntities(input: string): string {
	if (!input.includes('&')) return input;
	let prev = input;
	let decoded = input;
	// Loop to handle double-encoded `&amp;gt;` → `&gt;` → `>`
	for (let i = 0; i < 3; i++) {
		decoded = decodeEntityOnce(decoded);
		if (decoded === prev) break;
		prev = decoded;
		if (!decoded.includes('&')) break;
	}
	return decoded;
}

/** Parse markdown to sanitized HTML. Centralizes marked + DOMPurify config so inline `code` / `>` / fences work everywhere. */
export function parseMarkdownToHtml(raw: string): string {
	const decoded = decodeLegacyEntities(raw);
	const html = marked.parse(decoded) as string;
	// Explicit allowlist keeps `<code>`, `<pre>`, `<blockquote>` etc. while still stripping XSS.
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true },
		ADD_TAGS: ['iframe'],
		ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
	});
}

/** Strips common Markdown syntax to plain text (for card previews, meta descriptions, …). */
export function stripMarkdown(md: string): string {
	if (!md) return '';
	// Decode first so `&gt;` from legacy rows doesn't survive as literal text.
	const decoded = decodeLegacyEntities(md);
	return decoded
		.replace(/^#+\s+/gm, '')
		.replace(/(\*\*|__)(.*?)\1/g, '$2')
		.replace(/(\*|_)(.*?)\1/g, '$2')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/!\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^>\s+/gm, '')
		.replace(/^[+\-*]\s+/gm, '')
		.replace(/`([^`]+)`/g, '$1');
}

/** Renders Markdown into a container, sanitising the output and styling GitHub-style alert blockquotes. */
export function renderMarkdown(container: HTMLElement, raw: string): void {
	const html = parseMarkdownToHtml(raw);
	container.innerHTML = html;

	// Post-process > [!NOTE / TIP / WARNING / …] blockquotes (also handles bare `[!NOTE]` without `>` for UX)
	container.querySelectorAll<HTMLElement>('blockquote').forEach((bq) => {
		const firstP = bq.querySelector('p');
		if (!firstP) return;
		const match = firstP.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
		if (!match) return;

		const type = match[1].toLowerCase();
		bq.classList.add('markdown-alert', `markdown-alert-${type}`);
		firstP.innerHTML = firstP.innerHTML.replace(match[0], '').trim();
		if (!firstP.textContent?.trim()) firstP.remove();

		const title = document.createElement('p');
		title.className = 'markdown-alert-title';
		title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
		bq.insertBefore(title, firstP.parentElement?.contains(firstP) ? firstP : null);
	});

	// Handle bare `[!NOTE] text` paragraphs (user forgot `> `) — wrap them as alerts too
	container.querySelectorAll<HTMLElement>('p').forEach((p) => {
		if (p.closest('blockquote')) return; // already handled
		const match = p.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)/i);
		if (!match) return;
		const type = match[1].toLowerCase();
		const rest = match[2] ?? '';
		const alert = document.createElement('blockquote');
		alert.className = `markdown-alert markdown-alert-${type}`;
		const title = document.createElement('p');
		title.className = 'markdown-alert-title';
		title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
		const body = document.createElement('p');
		body.innerHTML = rest || '';
		alert.append(title, body);
		p.replaceWith(alert);
	});
}
