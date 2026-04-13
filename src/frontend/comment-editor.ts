// =============================================================================
// frontend/comment-editor.ts — Reusable Markdown comment editor
//
// Exports:
//   commentEditorHtml(opts)     → Full form HTML (toolbar + textarea + Turnstile + submit)
//   initCommentEditor(opts)     → Wires up form: toolbar, paste, Turnstile, submit callback
//   markdownToolbarHtml()       → Only the toolbar HTML (no form wrapper)
//   initMarkdownToolbar(el)     → Only wires toolbar + paste/pick on an existing textarea
//
// Usage — standalone toolbar (e.g. blog content editor):
//   import { markdownToolbarHtml, initMarkdownToolbar } from '../comment-editor';
//   // inside viewFn:
//   `<div class="blog-editor">${markdownToolbarHtml()}<textarea id="my-ta">...</textarea></div>`
//   // inside afterFn:
//   initMarkdownToolbar(document.getElementById('my-ta') as HTMLTextAreaElement);
// =============================================================================

import { t } from './i18n';
import { renderTurnstile, showToast } from './utils';
import { icons } from './icons';

// -------------------------------------------------------------------------
// Markdown action definitions
// -------------------------------------------------------------------------

const MD_ACTIONS: Record<string, { prefix: string; suffix: string; placeholder: string }> = {
	bold: { prefix: '**', suffix: '**', placeholder: 'texto en negrita' },
	italic: { prefix: '*', suffix: '*', placeholder: 'texto en cursiva' },
	strike: { prefix: '~~', suffix: '~~', placeholder: 'texto tachado' },
	code: { prefix: '`', suffix: '`', placeholder: 'código' },
	codeblock: { prefix: '```\n', suffix: '\n```', placeholder: 'código aquí' },
	quote: { prefix: '> ', suffix: '', placeholder: 'cita' },
	ul: { prefix: '- ', suffix: '', placeholder: 'elemento' },
	link: { prefix: '[', suffix: '](url)', placeholder: 'texto del enlace' },
};

// -------------------------------------------------------------------------
// HTML builder
// -------------------------------------------------------------------------

export interface CommentEditorHtmlOptions {
	/** `id` attribute for the `<form>`. */
	formId: string;
	/** `id` attribute for the `<textarea>`. */
	textareaId: string;
	/** `id` attribute for the Turnstile container `<div>`. */
	turnstileId: string;
	/** Placeholder text for the textarea. Defaults to `item.commentPlaceholder`. */
	placeholder?: string;
	/** Extra HTML inserted after the submit button inside the form. */
	extraHtml?: string;
}

/**
 * Returns the full HTML string for a Markdown-powered comment form.
 * Call `initCommentEditor()` in your view's `afterFn` to activate it.
 */
export function commentEditorHtml(opts: CommentEditorHtmlOptions): string {
	const placeholder = opts.placeholder ?? t('item.commentPlaceholder');
	return `
		<form id="${opts.formId}" class="comment-form" style="margin-top:20px">
			<div class="comment-editor">
				<div class="md-toolbar" role="toolbar" aria-label="Markdown toolbar">
					<button type="button" class="md-btn" data-md-action="bold"      title="${t('item.md.bold')}">${icons.bold()}</button>
					<button type="button" class="md-btn" data-md-action="italic"    title="${t('item.md.italic')}">${icons.italic()}</button>
					<button type="button" class="md-btn" data-md-action="strike"    title="${t('item.md.strike')}">${icons.strikethrough()}</button>
					<span class="md-sep"></span>
					<button type="button" class="md-btn" data-md-action="code"      title="${t('item.md.code')}">${icons.code()}</button>
					<button type="button" class="md-btn" data-md-action="codeblock" title="${t('item.md.codeblock')}">${icons.codeBlock()}</button>
					<span class="md-sep"></span>
					<button type="button" class="md-btn" data-md-action="link"      title="${t('item.md.link')}">${icons.link()}</button>
					<button type="button" class="md-btn" data-md-action="quote"     title="${t('item.md.quote')}">${icons.quote()}</button>
					<button type="button" class="md-btn" data-md-action="ul"        title="${t('item.md.ul')}">${icons.list()}</button>
					<span class="md-sep"></span>
					<button type="button" class="md-btn" data-md-action="image"     title="${t('item.md.image')}">${icons.image()}</button>
				</div>
				<textarea id="${opts.textareaId}" rows="5" placeholder="${placeholder}" required></textarea>
			</div>
			<div id="${opts.turnstileId}" class="mb-10"></div>
			<button type="submit" class="btn">${t('item.send')}</button>
			${opts.extraHtml ?? ''}
		</form>`;
}

// -------------------------------------------------------------------------
// Initialiser
// -------------------------------------------------------------------------

export interface CommentEditorInitOptions {
	/** Must match the `formId` passed to `commentEditorHtml`. */
	formId: string;
	/** Must match the `textareaId` passed to `commentEditorHtml`. */
	textareaId: string;
	/** Must match the `turnstileId` passed to `commentEditorHtml`. */
	turnstileId: string;
	/**
	 * Called on submit with the trimmed text and the Turnstile token.
	 * Throw or return a rejected promise to show the default error toast.
	 * Return normally (resolve) to indicate success — the textarea is cleared automatically.
	 */
	onSubmit: (text: string, token: string) => Promise<void>;
	/**
	 * Called after a successful submit so the caller can refresh its comment list.
	 * Optional — noop by default.
	 */
	onSuccess?: () => Promise<void>;
}

/**
 * Wires up all interactivity for a comment editor rendered by `commentEditorHtml`.
 * Must be called inside a view's `afterFn`, after the DOM has been inserted.
 */
export function initCommentEditor(opts: CommentEditorInitOptions): void {
	const form = document.getElementById(opts.formId) as HTMLFormElement | null;
	if (!form) return;

	const textarea = document.getElementById(opts.textareaId) as HTMLTextAreaElement;

	// Render Turnstile widget
	renderTurnstile(`#${opts.turnstileId}`);

	// ---- Toolbar ----
	form.querySelectorAll<HTMLButtonElement>('[data-md-action]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const action = btn.dataset.mdAction!;
			if (action === 'image') {
				triggerImagePicker(textarea);
				return;
			}

			const def = MD_ACTIONS[action];
			if (!def) return;

			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const sel = textarea.value.slice(start, end) || def.placeholder;
			textarea.setRangeText(def.prefix + sel + def.suffix, start, end, 'select');

			// If nothing was selected, place cursor inside the inserted placeholder
			if (start === end) {
				const innerStart = start + def.prefix.length;
				textarea.setSelectionRange(innerStart, innerStart + def.placeholder.length);
			}
			textarea.focus();
		});
	});

	// ---- Paste image ----
	textarea.addEventListener('paste', async (e) => {
		const items = Array.from(e.clipboardData?.items ?? []);
		const imageItem = items.find((i) => i.type.startsWith('image/'));
		if (!imageItem) return;
		e.preventDefault();
		const file = imageItem.getAsFile();
		if (file) await uploadAndInsertImage(file, textarea);
	});

	// ---- Submit ----
	const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const text = textarea.value.trim();
		if (!text) return;

		const token = (new FormData(form).get('cf-turnstile-response') as string) ?? '';

		const restore = () => {
			submitBtn.disabled = false;
			submitBtn.textContent = t('item.send');
			submitBtn.style.opacity = '1';
		};

		submitBtn.disabled = true;
		submitBtn.textContent = t('item.sending');
		submitBtn.style.opacity = '0.6';

		try {
			await opts.onSubmit(text, token);
			textarea.value = '';
			window.turnstile?.reset();
			await opts.onSuccess?.();
		} catch (err) {
			const msg = err instanceof Error ? err.message : t('common.error');
			showToast(msg, 'error', 5000);
		} finally {
			restore();
		}
	});
}

// -------------------------------------------------------------------------
// Standalone toolbar — for editors that already have their own form
// -------------------------------------------------------------------------

/**
 * Returns only the toolbar `<div>` HTML, with no form, textarea, or Turnstile.
 * Pair with `initMarkdownToolbar()` in your afterFn.
 */
export function markdownToolbarHtml(): string {
	return `
		<div class="md-toolbar" role="toolbar" aria-label="Markdown toolbar">
			<button type="button" class="md-btn" data-md-action="bold"      title="${t('item.md.bold')}">${icons.bold()}</button>
			<button type="button" class="md-btn" data-md-action="italic"    title="${t('item.md.italic')}">${icons.italic()}</button>
			<button type="button" class="md-btn" data-md-action="strike"    title="${t('item.md.strike')}">${icons.strikethrough()}</button>
			<span class="md-sep"></span>
			<button type="button" class="md-btn" data-md-action="code"      title="${t('item.md.code')}">${icons.code()}</button>
			<button type="button" class="md-btn" data-md-action="codeblock" title="${t('item.md.codeblock')}">${icons.codeBlock()}</button>
			<span class="md-sep"></span>
			<button type="button" class="md-btn" data-md-action="link"      title="${t('item.md.link')}">${icons.link()}</button>
			<button type="button" class="md-btn" data-md-action="quote"     title="${t('item.md.quote')}">${icons.quote()}</button>
			<button type="button" class="md-btn" data-md-action="ul"        title="${t('item.md.ul')}">${icons.list()}</button>
			<span class="md-sep"></span>
			<button type="button" class="md-btn" data-md-action="image"     title="${t('item.md.image')}">${icons.image()}</button>
		</div>`;
}

/**
 * Wires up only the toolbar buttons and image paste/pick on an existing `<textarea>`.
 * Use this when you already have your own `<form>` and submit handler.
 * The toolbar buttons must live inside a container that also wraps the textarea,
 * or at least be reachable via `textarea.closest(...)` / the `root` option.
 *
 * @param textarea - The textarea element to control.
 * @param root     - The element that contains the `[data-md-action]` buttons.
 *                   Defaults to `textarea.closest('.comment-editor') ?? document`.
 */
export function initMarkdownToolbar(textarea: HTMLTextAreaElement, root: Element | Document = document): void {
	root.querySelectorAll<HTMLButtonElement>('[data-md-action]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const action = btn.dataset.mdAction!;
			if (action === 'image') {
				triggerImagePicker(textarea);
				return;
			}

			const def = MD_ACTIONS[action];
			if (!def) return;

			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const sel = textarea.value.slice(start, end) || def.placeholder;
			textarea.setRangeText(def.prefix + sel + def.suffix, start, end, 'select');

			if (start === end) {
				const innerStart = start + def.prefix.length;
				textarea.setSelectionRange(innerStart, innerStart + def.placeholder.length);
			}
			textarea.focus();
		});
	});

	textarea.addEventListener('paste', async (e) => {
		const items = Array.from(e.clipboardData?.items ?? []);
		const imageItem = items.find((i) => i.type.startsWith('image/'));
		if (!imageItem) return;
		e.preventDefault();
		const file = imageItem.getAsFile();
		if (file) await uploadAndInsertImage(file, textarea);
	});
}

// -------------------------------------------------------------------------
// Image upload helpers (internal)
// -------------------------------------------------------------------------

function triggerImagePicker(textarea: HTMLTextAreaElement): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';
	input.onchange = async () => {
		if (input.files?.[0]) await uploadAndInsertImage(input.files[0], textarea);
	};
	input.click();
}

async function uploadAndInsertImage(file: File, textarea: HTMLTextAreaElement): Promise<void> {
	const dismiss = showToast(t('item.md.uploading'), 'info', 0);
	try {
		const fd = new FormData();
		fd.append('file', file);

		const res = await fetch('/api/upload', { method: 'PUT', body: fd });
		dismiss();
		if (!res.ok) throw new Error(await res.text());

		const data = (await res.json()) as { r2_key: string };
		const markdown = `![image](/api/download/${data.r2_key})`;
		const pos = textarea.selectionStart;
		textarea.setRangeText('\n\n' + markdown + '\n\n', pos, pos, 'end');
		textarea.focus();
	} catch {
		dismiss();
		showToast(t('item.md.uploadError'), 'error', 5000);
	}
}
