import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { diffString } from '../diff.js';

export default class HistoryView extends AbstractView {
	async getHtml() {
		return `
            <div class="history-container" style="max-width: 1000px; margin: 0 auto;">
                <div class="header-actions" style="margin-bottom: 20px;">
                    <a href="/item/${this.params.id}" data-link class="btn" style="background: #666;">&larr; ${t('history.backToResource')}</a>
                </div>
                <h1>${t('history.title')}</h1>
                <div id="history-list" class="timeline">
                    <div class="skeleton-text">Loading history...</div>
                </div>
            </div>
        `;
	}

	async postRender() {
		const uuid = this.params.id;
		const list = document.getElementById('history-list');

		try {
			const history = await fetch(`/api/resources/${uuid}/history`).then((res) => res.json());

			if (!history || history.length === 0) {
				list.innerHTML = `<p>${t('history.noHistory')}</p>`;
				return;
			}

			// Let's fetch current resource to start the chain.
			const currentRes = await DataCache.fetch(`/api/resources/${uuid}`, { ttl: 300000, persistent: true });

			let nextState = currentRes;

			const html = history
				.map((entry) => {
					const prev = entry.previous_data; // This is the state BEFORE this edit.
					const current = nextState; // This is the state AFTER this edit.

					// Update nextState for the next iteration (going backwards in time)
					nextState = prev;

					const date = new Date(entry.created_at * 1000).toLocaleString();
					const actorName = entry.actor?.username || 'Unknown';
					const actorAvatar = entry.actor?.avatar_url || '';

					// Calculate Diffs
					let changes = '';

					const AVATAR_DETAILS_REGEX = /\n\n---\n\n### Avatar Details\n([\s\S]*)$/;
					const cleanDesc = (t) => (t ? t.replace(AVATAR_DETAILS_REGEX, '') : '');

					// Title Diff
					if (prev.title !== current.title) {
						changes += `
                        <div class="diff-block">
                            <strong>${t('history.field.title')}:</strong>
                            <div class="diff-content">
                                ${diffString(prev.title, current.title)}
                            </div>
                        </div>`;
					}

					// Description Diff
					const prevDesc = cleanDesc(prev.description);
					const currDesc = cleanDesc(current.description);

					if (prevDesc !== currDesc) {
						changes += `
                        <div class="diff-block">
                            <strong>${t('history.field.desc')}:</strong>
                            <div class="diff-content markdown-body" style="font-size: 0.9em; padding: 10px; background: var(--bg-code); border: 1px solid var(--border-color); white-space: pre-wrap !important; font-family: monospace;">
                                ${diffString(prevDesc, currDesc)}
                            </div>
                        </div>`;
					}

					// Category Diff
					if (prev.category !== current.category) {
						changes += `
                        <div class="diff-block">
                            <strong>${t('history.field.cat')}:</strong>
                            <div class="diff-content">
                                <del style="background:#ffeef0; color:#b31d28;">${prev.category}</del> &rarr; <ins style="background:#e6ffec; color:#22863a;">${current.category}</ins>
                            </div>
                        </div>`;
					}

					// Tags Diff (Array comparison)
					const prevTags = Array.isArray(prev.tags) ? prev.tags : [];

					const normalizeTags = (t) => {
						if (!t) return [];
						if (Array.isArray(t)) {
							return t.map((tag) => (typeof tag === 'object' ? tag.name : tag));
						}
						return [];
					};

					const oldTagsList = normalizeTags(prev.tags);
					const newTagsList = normalizeTags(current.tags);

					if (JSON.stringify(oldTagsList.sort()) !== JSON.stringify(newTagsList.sort())) {
						changes += `
                        <div class="diff-block">
                            <strong>${t('history.field.tags')}:</strong>
                            <div class="diff-content">
                                <span style="color:#b31d28;">- [${oldTagsList.join(', ')}]</span><br>
                                <span style="color:#22863a;">+ [${newTagsList.join(', ')}]</span>
                            </div>
                        </div>`;
					}

					if (changes === '') {
						changes = `<em style="color:#666;">${t('history.noVisibleChanges')}</em>`;
					}

					const changeTypeLabel = t(`history.types.${entry.change_type}`) || entry.change_type;

					return `
                    <div class="history-card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; margin-bottom: 20px;">
                        <div class="history-header" style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                            <img src="${actorAvatar}" alt="${actorName}" style="width: 32px; height: 32px; margin-right: 10px; background: #ddd;">
                            <div>
                                <div style="font-weight: bold;">${actorName}</div>
                                <div style="font-size: 0.85em; color: var(--text-muted);">${date}</div>
                            </div>
                            <div style="margin-left: auto;">
                                <span class="badge badge-blue">${changeTypeLabel}</span>
                            </div>
                        </div>
                        <div class="history-changes">
                            ${changes}
                        </div>
                    </div>
                `;
				})
				.join('');

			list.innerHTML = html;
		} catch (e) {
			console.error(e);
			list.innerHTML = `<p style="color: red;">Error loading history: ${e.message}</p>`;
		}
	}
}
