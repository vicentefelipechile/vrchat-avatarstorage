// =========================================================================
// views/WikiView.ts — Wiki browser with sidebar navigation and comments
// =========================================================================

import { t, getCurrentLang } from '../i18n';
import { DataCache } from '../cache';
import { renderTurnstile, renderMarkdown, showToast } from '../utils';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { RouteContext } from '../types';

// =========================================================================
// Types
// =========================================================================

interface WikiTopic {
	id: string;
	label: string;
}
interface WikiCategory {
	id: string;
	title: string;
	topics: WikiTopic[];
}
interface WikiComment {
	uuid: string;
	text: string;
	author: string;
	author_avatar?: string;
	timestamp: number;
}

// =========================================================================
// Static data
// =========================================================================

const CATEGORIES: WikiCategory[] = [
	{
		id: 'informative',
		title: 'wiki.categories.informative',
		topics: [
			{ id: 'home', label: 'nav.home' },
			{ id: 'faq', label: 'wiki.faq.title' },
			{ id: 'comments', label: 'wiki.comments.title' },
		],
	},
	{
		id: 'vrchat',
		title: 'wiki.categories.vrchat',
		topics: [
			{ id: 'setup', label: 'wiki.setup.title' },
			{ id: 'parameter', label: 'wiki.parameter.title' },
			{ id: 'action-menu', label: 'wiki.actionMenu.title' },
			{ id: 'unityhub-error', label: 'wiki.unityhubError.title' },
		],
	},
	{
		id: 'dependencies',
		title: 'wiki.categories.dependencies',
		topics: [
			{ id: 'poiyomi', label: 'wiki.poiyomi.title' },
			{ id: 'vrcfury', label: 'wiki.vrcfury.title' },
			{ id: 'modular-avatar', label: 'wiki.modularAvatar.title' },
			{ id: 'physbones', label: 'wiki.physbones.title' },
			{ id: 'syncdances', label: 'wiki.syncdances.title' },
			{ id: 'vrcquesttools', label: 'wiki.vrcquesttools.title' },
			{ id: 'gogoloco', label: 'wiki.gogoloco.title' },
			{ id: 'desktop-puppeteer', label: 'wiki.desktopPuppeteer.title' },
			{ id: 'gesture-manager-emulator', label: 'wiki.gestureManager.title' },
		],
	},
	{
		id: 'erp',
		title: 'wiki.categories.erp',
		topics: [
			{ id: 'nsfw-essentials', label: 'wiki.nsfwEssentials.title' },
			{ id: 'gogoloco-nsfw', label: 'wiki.gogolocoNsfw.title' },
			{ id: 'sps', label: 'wiki.sps.title' },
			{ id: 'inside-view', label: 'wiki.insideView.title' },
			{ id: 'pcs', label: 'wiki.pcs.title' },
			{ id: 'haptics', label: 'wiki.haptics.title' },
			{ id: 'dps', label: 'wiki.dps.title' },
			{ id: 'justkisssfx', label: 'wiki.justkisssfx.title' },
		],
	},
];

const FLAT_TOPICS = CATEGORIES.flatMap((c) => c.topics);

function isValidTopic(id: string): boolean {
	return FLAT_TOPICS.some((t) => t.id === id);
}

// =========================================================================
// Helpers
// =========================================================================

function sidebarHtml(currentTopic: string): string {
	return CATEGORIES.map((cat) => {
		const links = cat.topics
			.map(
				(tp) => `
			<li>
				<a data-topic="${tp.id}" class="${currentTopic === tp.id ? 'active' : ''}">
					${t(tp.label)}
				</a>
			</li>`,
			)
			.join('');
		return `
			<div class="wiki-sidebar-category">
				<h3>${t(cat.title)}</h3>
				<ul>${links}</ul>
			</div>`;
	}).join('');
}

function commentRow(c: WikiComment, canDelete: boolean): string {
	const content = DOMPurify.sanitize(marked.parse(c.text) as string);

	return `
		<div id="comment-${c.uuid}" class="wiki-comment">
			<div class="wiki-comment-avatar-container">
				<img src="${c.author_avatar ?? '/assets/default_avatar.png'}" alt="${c.author}" class="wiki-comment-avatar">
			</div>
			<div class="wiki-comment-content">
				<div class="wiki-comment-header">
					<span>${c.author} <span class="wiki-comment-date">(${new Date(c.timestamp).toLocaleString()})</span></span>
					${canDelete ? `<button class="btn delete-comment-btn btn-danger-sm" data-uuid="${c.uuid}">${t('admin.delete')}</button>` : ''}
				</div>
				<div class="markdown-body wiki-comment-body">${content}</div>
			</div>
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function wikiView(ctx: RouteContext): Promise<string> {
	document.title = t('wiki.title');

	const topicParam = ctx.query.get('topic');
	const currentTopic = topicParam && isValidTopic(topicParam) ? topicParam : 'home';

	return `
		<div class="wiki-container">
			<nav class="wiki-sidebar" id="wiki-sidebar">
				${sidebarHtml(currentTopic)}
			</nav>
			<div class="wiki-content" id="wiki-content">
				<p>${t('common.loading')}</p>
			</div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function wikiAfter(ctx: RouteContext): Promise<void> {
	const topicParam = ctx.query.get('topic');
	let currentTopic = topicParam && isValidTopic(topicParam) ? topicParam : 'home';

	const contentEl = document.getElementById('wiki-content')!;

	function escapeHtml(input: string): string {
		// Use DOMPurify to strip any HTML, then escape special characters.
		const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
		return sanitized.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}

	// -----------------------------------------------------------------------
	// Load topic content
	// -----------------------------------------------------------------------

	async function loadTopic(topicId: string, updateUrl = true): Promise<void> {
		currentTopic = topicId;

		if (updateUrl) {
			const newUrl = topicId === 'home' ? '/wiki' : `/wiki?topic=${topicId}`;
			history.pushState(null, '', newUrl);
		}

		// Update sidebar active state
		document.querySelectorAll<HTMLAnchorElement>('.wiki-sidebar a[data-topic]').forEach((link) => {
			link.classList.toggle('active', link.dataset.topic === topicId);
		});

		if (topicId === 'comments') {
			await renderCommentsPage();
			return;
		}

		const lang = getCurrentLang();

		async function fetchWikiContent(langCode: string): Promise<string> {
			const text = (await DataCache.fetch(`/wiki/${langCode}/${topicId}.md`, { type: 'text', ttl: 300_000 })) as string;
			// Cloudflare returns the SPA shell (index.html) with 200 when a static file doesn't exist.
			// Detect this by checking if the response is HTML instead of Markdown.
			const trimmed = text.trimStart().toLowerCase();
			if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
				DataCache.clear(`/wiki/${langCode}/${topicId}.md`);
				throw new Error('Not a markdown file');
			}
			return text;
		}

		try {
			const text = await fetchWikiContent(lang);
			renderMarkdown(contentEl, text);
		} catch {
			if (lang !== 'en') {
				try {
					const textEn = await fetchWikiContent('en');
					renderMarkdown(contentEl, textEn);
					return;
				} catch {
					/* fall through to error */
				}
			}
			const safeTopicId = escapeHtml(topicId);
			contentEl.innerHTML = `
				<div style="padding:20px;text-align:center;color:#cc0000">
					<h3>${t('common.error')}</h3>
					<p>Could not load content for topic: ${safeTopicId}</p>
				</div>`;
		}
	}

	// -----------------------------------------------------------------------
	// Comments page
	// -----------------------------------------------------------------------

	async function loadComments(): Promise<void> {
		const container = document.getElementById('comments-container');
		if (!container) return;
		try {
			const comments = (await fetch('/api/wiki/comments').then((r) => r.json())) as WikiComment[];
			if (!comments?.length) {
				container.innerHTML = `<p>${t('item.noComments')}</p>`;
				return;
			}
			const { isAdmin, user } = window.appState;
			container.innerHTML = comments.map((c) => commentRow(c, isAdmin || user?.username === c.author)).join('');
		} catch {
			container.innerHTML = `<p>${t('common.error')}</p>`;
		}
	}

	async function renderCommentsPage(): Promise<void> {
		const { user } = window.appState;
		contentEl.innerHTML = `
			<h1>${t('wiki.comments.title')}</h1>
			<div id="comments-container"><p>${t('common.loading')}</p></div>
			${
				user
					? `<form id="wiki-comment-form" class="wiki-comment-form">
					<div class="form-group">
						<textarea id="comment-text" rows="3" placeholder="${t('item.commentPlaceholder')}" required class="comment-textarea"></textarea>
					</div>
					<div id="turnstile-wiki-comment" class="mb-10"></div>
					<button type="submit" class="btn">${t('item.send')}</button>
				</form>`
					: `<hr><h3>${t('item.loginToComment')}</h3>`
			}`;

		await loadComments();

		const form = document.getElementById('wiki-comment-form') as HTMLFormElement | null;
		if (form) {
			renderTurnstile('#turnstile-wiki-comment');

			form.addEventListener('submit', async (e) => {
				e.preventDefault();
				const textEl = document.getElementById('comment-text') as HTMLTextAreaElement;
				const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
				const restore = () => {
					textEl.disabled = false;
					btn.disabled = false;
					btn.textContent = t('item.send');
				};

				const text = textEl.value;
				textEl.disabled = true;
				btn.disabled = true;
				btn.textContent = t('item.sending');

				const token = new FormData(form).get('cf-turnstile-response') as string;
				try {
					const res = await fetch('/api/wiki/comments', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ text, token }),
					});
					if (res.ok) {
						textEl.value = '';
						window.turnstile?.reset();
						await loadComments();
					} else {
						const data = (await res.json()) as { error?: string };
						showToast('Error: ' + (data.error ?? 'Unknown'), 'error');
					}
				} catch {
					showToast('Error submitting comment', 'error');
				} finally {
					restore();
				}
			});
		}
	}

	// -----------------------------------------------------------------------
	// Event delegation on content area (internal wiki links + delete comments)
	// -----------------------------------------------------------------------

	contentEl.addEventListener('click', async (e) => {
		const target = e.target as HTMLElement;

		if (target.matches('.delete-comment-btn')) {
			if (!confirm(t('admin.deleteConfirm'))) return;
			const uuid = target.dataset.uuid!;
			target.setAttribute('disabled', 'true');
			target.textContent = '…';
			try {
				const res = await fetch(`/api/wiki/comments/${uuid}`, { method: 'DELETE' });
				if (res.ok) document.getElementById(`comment-${uuid}`)?.remove();
				else {
					const d = (await res.json()) as { error?: string };
					showToast('Error: ' + (d.error ?? 'Unknown'), 'error');
				}
			} catch {
				showToast('Error deleting comment', 'error');
			} finally {
				target.removeAttribute('disabled');
				target.textContent = t('admin.delete');
			}
			return;
		}

		const link = target.closest('a');
		const href = link?.getAttribute('href');
		if (href) {
			const match = href.match(/^\/wiki\?topic=(.+)$/);
			if (match) {
				e.preventDefault();
				loadTopic(match[1]);
			}
		}
	});

	// -----------------------------------------------------------------------
	// Sidebar clicks + prefetch
	// -----------------------------------------------------------------------

	document.querySelectorAll<HTMLAnchorElement>('.wiki-sidebar a[data-topic]').forEach((link) => {
		link.addEventListener('click', (e) => {
			e.preventDefault();
			loadTopic(link.dataset.topic!);
		});
		link.addEventListener('mouseenter', () => {
			const tp = link.dataset.topic;
			if (!tp || tp === 'comments') return;
			DataCache.prefetch(`/wiki/${getCurrentLang()}/${tp}.md`, { type: 'text', ttl: 300_000 });
		});
	});

	// Browser back/forward inside wiki
	window.onpopstate = () => {
		const rawTp = new URLSearchParams(location.search).get('topic');
		const tp = rawTp && isValidTopic(rawTp) ? rawTp : 'home';
		loadTopic(tp, false);
	};

	// Load initial topic
	await loadTopic(currentTopic, false);
}
