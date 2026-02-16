import AbstractView from './AbstractView.js';
import { stripMarkdown } from '../utils.js';
import { t } from '../i18n.js';

export default class AdminView extends AbstractView {
    async getHtml() {
        if (!window.appState || !window.appState.isAdmin) {
            return `<h1>Access Denied</h1>`;
        }


        // Fetch orphaned media stats
        const stats = await fetch('/api/admin/stats/orphaned-media').then(res => res.json());

        // Fetch pending resources
        const pending = await fetch('/api/admin/pending').then(res => res.json());
        let content = '';
        if (pending.length === 0) {
            content = `<p>${t('admin.noPending')}</p>`;
        } else {
            const cardsHtml = pending.map(res => `
                <div class="card">
                    ${res.thumbnail_key ? `<div class="card-image"><img src="/api/download/${res.thumbnail_key}" alt="${res.title}" loading="lazy"></div>` : ''}
                    <h3>${res.title}</h3>
                    <div class="meta">${t('cats.' + res.category) || res.category} | ${new Date(res.timestamp).toLocaleDateString()}</div>
                    <p>${stripMarkdown(res.description).substring(0, 100)}...</p>
                    <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
                </div>
            `).join('');
            content = `<div class="grid">${cardsHtml}</div>`;
        }

        return `
            <h1>${t('admin.title')}</h1>
            
            <!-- Statistics Dashboard -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: bold; color: ${stats.orphaned_count > 0 ? '#ff9800' : '#4caf50'};">
                        ${stats.orphaned_count}
                    </div>
                    <div style="color: #666; margin-top: 5px;">${t('admin.orphanedFiles')}</div>
                </div>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: bold; color: #333;">
                        ${stats.total_media}
                    </div>
                    <div style="color: #666; margin-top: 5px;">${t('admin.totalMedia')}</div>
                </div>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: bold; color: #333;">
                        ${stats.total_resources}
                    </div>
                    <div style="color: #666; margin-top: 5px;">${t('admin.totalResources')}</div>
                </div>
            </div>

            <!-- Cleanup Section -->
            ${stats.orphaned_count > 0 ? `
                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #856404;">⚠️ ${t('admin.orphanedFilesFound')}</h3>
                    <p style="color: #856404; margin-bottom: 15px;">
                        ${t('admin.orphanedFilesDesc').replace('{count}', stats.orphaned_count).replace('{hours}', stats.cutoff_hours)}
                    </p>
                    <details style="margin-bottom: 15px;">
                        <summary style="cursor: pointer; font-weight: bold; color: #856404;">${t('admin.viewFileList')}</summary>
                        <ul style="margin-top: 10px; max-height: 200px; overflow-y: auto; background: white; padding: 15px; border-radius: 4px;">
                            ${stats.orphaned_files.map(f => `
                                <li style="margin: 5px 0; font-family: monospace; font-size: 0.9em;">
                                    <strong>${f.filename}</strong> 
                                    <span style="color: #666;">(${f.type}, ${f.age_hours}h)</span>
                                </li>
                            `).join('')}
                        </ul>
                    </details>
                    <button id="cleanup-orphaned" class="btn" style="background: #dc3545; color: white;">
                        🗑️ ${t('admin.cleanupOrphaned')}
                    </button>
                </div>
            ` : `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #155724;">✅ ${t('admin.noOrphanedFiles')}</h3>
                    <p style="color: #155724; margin: 0;">${t('admin.noOrphanedFilesDesc')}</p>
                </div>
            `}

            <!-- Pending Resources -->
            <h2 style="margin-top: 30px;">${t('admin.pendingResources')}</h2>
            ${content}
        `;
    }

    async postRender() {
        const cleanupBtn = document.getElementById('cleanup-orphaned');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', async () => {
                if (!confirm(t('admin.cleanupConfirm'))) {
                    return;
                }

                cleanupBtn.disabled = true;
                cleanupBtn.innerHTML = '⏳ ' + t('admin.cleaning');

                try {
                    const res = await fetch('/api/admin/cleanup/orphaned-media', {
                        method: 'POST'
                    });
                    const data = await res.json();

                    if (res.ok) {
                        alert(t('admin.cleanupSuccess').replace('{count}', data.deleted));
                        // Reload page to update stats
                        window.location.reload();
                    } else {
                        alert(t('admin.error') + ': ' + data.error);
                    }
                } catch (e) {
                    alert(t('admin.networkError'));
                } finally {
                    cleanupBtn.disabled = false;
                    cleanupBtn.innerHTML = '🗑️ ' + t('admin.cleanupOrphaned');
                }
            });
        }
    }
}
