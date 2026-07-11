// =========================================================================
// lib/markdown.ts — Markdown stripping and rendering
// =========================================================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** Strips common Markdown syntax to plain text (for card previews, meta descriptions, …). */
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

/** Renders Markdown into a container, sanitising the output and styling GitHub-style alert blockquotes. */
export function renderMarkdown(container: HTMLElement, raw: string): void {
	const html = DOMPurify.sanitize(marked.parse(raw) as string);
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
