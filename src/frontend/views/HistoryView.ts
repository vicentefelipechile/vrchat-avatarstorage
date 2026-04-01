// =========================================================================
// views/HistoryView.ts — Revision history with word-level diff
// =========================================================================

import { DataCache } from '../cache';
import { t } from '../i18n';
import { diffString } from '../diff';
import type { RouteContext, Resource } from '../types';

// =========================================================================
// Types
// =========================================================================

interface HistoryEntry {
	uuid: string;
	change_type: string;
	created_at: number;
	previous_data: Resource;
	actor?: { username: string; avatar_url?: string };
}

// =========================================================================
// Helpers
// =========================================================================

const AVATAR_DETAILS_RE = /\n\n---\n\n### Avatar Details\n[\s\S]*$/;
const cleanDesc = (text: string) => (text ? text.replace(AVATAR_DETAILS_RE, '') : '');

function normalizeTags(tags: unknown): string[] {
	if (!Array.isArray(tags)) return [];
	return tags.map((tag) => (typeof tag === 'object' && tag !== null ? (tag as { name: string }).name : String(tag)));
}

function historyCard(entry: HistoryEntry, current: Resource): string {
	const prev = entry.previous_data;
	const date = new Date(entry.created_at * 1000).toLocaleString();
	const actorName = entry.actor?.username ?? 'Unknown';
	const actorAvatar = entry.actor?.avatar_url ?? '';
	const changeTypeLabel = t(`history.types.${entry.change_type}`) || entry.change_type;

	let changes = '';

	if (prev.title !== current.title) {
		changes += `
			<div class="diff-block">
				<strong>${t('history.field.title')}:</strong>
				<div class="diff-content">${diffString(prev.title, current.title)}</div>
			</div>`;
	}

	const prevDesc = cleanDesc(prev.description);
	const currDesc = cleanDesc(current.description);
	if (prevDesc !== currDesc) {
		changes += `
			<div class="diff-block">
				<strong>${t('history.field.desc')}:</strong>
				<div class="diff-content markdown-body" style="font-size:0.9em;padding:10px;background:var(--bg-code);border:1px solid var(--border-color);white-space:pre-wrap!important;font-family:monospace">
					${diffString(prevDesc, currDesc)}
				</div>
			</div>`;
	}

	if (prev.category !== current.category) {
		changes += `
			<div class="diff-block">
				<strong>${t('history.field.cat')}:</strong>
				<div class="diff-content">
					<del style="background:#ffeef0;color:#b31d28">${prev.category}</del>
					&rarr;
					<ins style="background:#e6ffec;color:#22863a">${current.category}</ins>
				</div>
			</div>`;
	}

	const oldTags = normalizeTags(prev.tags);
	const newTags = normalizeTags(current.tags);
	if (JSON.stringify([...oldTags].sort()) !== JSON.stringify([...newTags].sort())) {
		changes += `
			<div class="diff-block">
				<strong>${t('history.field.tags')}:</strong>
				<div class="diff-content">
					<span style="color:#b31d28">- [${oldTags.join(', ')}]</span><br>
					<span style="color:#22863a">+ [${newTags.join(', ')}]</span>
				</div>
			</div>`;
	}

	if (!changes) changes = `<em style="color:#666">${t('history.noVisibleChanges')}</em>`;

	return `
		<div class="history-card" style="background:var(--bg-card);border:1px solid var(--border-color);padding:20px;margin-bottom:20px">
			<div class="history-header" style="display:flex;align-items:center;margin-bottom:15px;border-bottom:1px solid var(--border-color);padding-bottom:10px">
				<img src="${actorAvatar}" alt="${actorName}" style="width:32px;height:32px;margin-right:10px;background:#ddd;border-radius:50%">
				<div>
					<div style="font-weight:bold">${actorName}</div>
					<div style="font-size:0.85em;color:var(--text-muted)">${date}</div>
				</div>
				<div style="margin-left:auto">
					<span class="badge badge-blue">${changeTypeLabel}</span>
				</div>
			</div>
			<div class="history-changes">${changes}</div>
		</div>`;
}

// =========================================================================
// View
// =========================================================================

export async function historyView(ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('history.title')}`;
	const id = ctx.params.id;

	return `
		<div class="history-container" style="max-width:1000px;margin:0 auto">
			<div style="margin-bottom:20px">
				<a href="/item/${id}" data-link class="btn" style="background:#666">&larr; ${t('history.backToResource')}</a>
			</div>
			<h1>${t('history.title')}</h1>
			<div id="history-list" class="timeline">
				<p>${t('common.loading')}</p>
			</div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function historyAfter(ctx: RouteContext): Promise<void> {
	const id = ctx.params.id;
	const list = document.getElementById('history-list')!;

	try {
		const [entries, currentRes] = await Promise.all([
			fetch(`/api/resources/${id}/history`).then((r) => r.json()) as Promise<HistoryEntry[]>,
			DataCache.fetch(`/api/resources/${id}`, { ttl: 300_000, persistent: true }) as Promise<Resource>,
		]);

		if (!entries || entries.length === 0) {
			list.innerHTML = `<p>${t('history.noHistory')}</p>`;
			return;
		}

		let nextState: Resource = currentRes;
		const cardsHtml = entries.map((entry) => {
			const card = historyCard(entry, nextState);
			nextState = entry.previous_data;
			return card;
		}).join('');

		list.innerHTML = cardsHtml;
	} catch (e) {
		list.innerHTML = `<p style="color:red">Error loading history: ${(e as Error).message}</p>`;
	}
}
