import AbstractView from './AbstractView.js';
import { stripMarkdown } from '../utils.js';
import { t } from '../i18n.js';

export default class AdminView extends AbstractView {
    async getHtml() {
        if (!window.appState || !window.appState.isAdmin) {
            return `<h1>${t('common.accessDenied')}</h1>`;
        }

        // Return loading skeleton immediately, fetch data in postRender
        return `
            <h1>${t('admin.title')}</h1>
            
            <!-- Statistics Dashboard -->
            <div id="admin-stats" class="admin-grid">
                <div class="stat-card">
                    <div class="stat-value skeleton-text">...</div>
                    <div class="stat-label">${t('common.loading')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value skeleton-text">...</div>
                    <div class="stat-label">${t('common.loading')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value skeleton-text">...</div>
                    <div class="stat-label">${t('common.loading')}</div>
                </div>
            </div>

            <!-- Cache Management -->
            <div class="admin-card" style="margin-bottom: 20px; background: var(--card-bg); padding: 20px; border: 1px solid var(--border-color);">
                <h3 style="margin-top: 0;">${t('admin.cacheClear')}</h3>
                <div style="display: flex; gap: 10px; max-width: 400px;">
                    <input type="text" id="cache-username" class="form-input" placeholder="${t('admin.usernamePlaceholder')}" style="flex: 1; padding: 10px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color);">
                    <button id="btn-clear-cache" class="btn">${t('admin.clearCacheBtn')}</button>
                </div>
            </div>

            <!-- Cleanup Section -->
            <div id="cleanup-section">
                <div class="cleanup-card loading">
                    <p>${t('common.loadingCleanup')}</p>
                </div>
            </div>

            <!-- Pending Resources -->
            <h2 style="margin-top: 30px;">${t('admin.pendingResources')}</h2>
            <div id="pending-resources">
                <div class="pending-loading">
                    <p>${t('common.loadingPending')}</p>
                </div>
            </div>
        `;
    }

    async postRender() {
        // Fetch data in parallel
        const [stats, pending] = await Promise.all([
            fetch('/api/admin/stats/orphaned-media').then(res => res.json()),
            fetch('/api/admin/pending').then(res => res.json())
        ]);

        // Update statistics
        const statsContainer = document.getElementById('admin-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value" style="color: ${stats.orphaned_count > 0 ? '#ff9800' : '#4caf50'};">
                        ${stats.orphaned_count}
                    </div>
                    <div class="stat-label">${t('admin.orphanedFiles')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">
                        ${stats.total_media}
                    </div>
                    <div class="stat-label">${t('admin.totalMedia')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">
                        ${stats.total_resources}
                    </div>
                    <div class="stat-label">${t('admin.totalResources')}</div>
                </div>
            `;
        }

        // Update cleanup section
        const cleanupSection = document.getElementById('cleanup-section');
        if (cleanupSection) {
            cleanupSection.innerHTML = stats.orphaned_count > 0 ? `
                <div class="cleanup-card warning">
                    <h3 class="cleanup-title">⚠️ ${t('admin.orphanedFilesFound')}</h3>
                    <p class="cleanup-desc">
                        ${t('admin.orphanedFilesDesc').replace('{count}', stats.orphaned_count).replace('{hours}', stats.cutoff_hours)}
                    </p>
                    <details class="cleanup-details">
                        <summary>${t('admin.viewFileList')}</summary>
                        <ul class="file-list">
                            ${stats.orphaned_files.map(f => `
                                <li>
                                    <strong>${f.filename}</strong> 
                                    <span>(${f.type}, ${f.age_hours}h)</span>
                                </li>
                            `).join('')}
                        </ul>
                    </details>
                    <button id="cleanup-orphaned" class="btn btn-danger">
                        🗑️ ${t('admin.cleanupOrphaned')}
                    </button>
                </div>
            ` : `
                <div class="cleanup-card success">
                    <h3 class="cleanup-title">✅ ${t('admin.noOrphanedFiles')}</h3>
                    <p class="cleanup-desc">${t('admin.noOrphanedFilesDesc')}</p>
                </div>
            `;
        }

        // Update pending resources
        const pendingContainer = document.getElementById('pending-resources');
        if (pendingContainer) {
            if (pending.length === 0) {
                pendingContainer.innerHTML = `<p>${t('admin.noPending')}</p>`;
            } else {
                const cardsHtml = pending.map(res => this.renderCard(res)).join('');
                pendingContainer.innerHTML = `<div class="grid">${cardsHtml}</div>`;
            }
        }

        // Setup cleanup button event listener
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

        // Setup Cache Clear Button
        const clearCacheBtn = document.getElementById('btn-clear-cache');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', async () => {
                const usernameInput = document.getElementById('cache-username');
                const username = usernameInput.value.trim();
                
                if (!username) return;

                const originalText = clearCacheBtn.innerText;
                clearCacheBtn.disabled = true;
                clearCacheBtn.innerText = '...';

                try {
                    const res = await fetch(`/api/admin/cache/clear/${encodeURIComponent(username)}`, {
                        method: 'POST'
                    });
                    const data = await res.json();

                    if (res.ok) {
                        alert(t('admin.cacheClearSuccess').replace('{user}', username));
                        usernameInput.value = '';
                    } else {
                        alert(t('admin.error') + ': ' + (data.error || t('admin.cacheClearError')));
                    }
                } catch (e) {
                    alert(t('admin.networkError'));
                } finally {
                    clearCacheBtn.disabled = false;
                    clearCacheBtn.innerText = originalText;
                }
            });
        }
    }

    renderCard(res) {
        const title = stripMarkdown(res.title).substring(0, 50);
        const description = stripMarkdown(res.description || '').substring(0, 80);
        const categoryLabel = t('cats.' + res.category) || res.category;
        const date = new Date(res.timestamp).toLocaleDateString();
        
        const authorName = res.author?.username || 'Unknown';
        const authorAvatar = res.author?.avatar_url || '';
        const avatarImg = authorAvatar 
            ? `<img src="${authorAvatar}" alt="${authorName}" class="card-author-avatar" onerror="this.style.display='none'">`
            : `<div class="card-author-avatar-placeholder">${authorName.charAt(0).toUpperCase()}</div>`;

        return `
            <div class="card">
                <a href="/item/${res.uuid}" data-link class="card-link">
                    ${res.thumbnail_key ? `
                        <div class="card-image">
                            <img src="/api/download/${res.thumbnail_key}" alt="${title}" loading="lazy">
                            <span class="card-badge">${categoryLabel}</span>
                        </div>
                    ` : `
                        <div class="card-image card-image-placeholder">
                            <span class="card-badge">${categoryLabel}</span>
                        </div>
                    `}
                </a>
                <div class="card-body">
                    <h3>${title}${res.title.length > 50 ? '...' : ''}</h3>
                    
                    <div class="card-author">
                        ${avatarImg}
                        <span class="card-author-name">${authorName}</span>
                    </div>
                    
                    <div class="card-meta">
                        <span>${date}</span>
                    </div>
                    
                    <p class="card-description">${description}${description.length >= 80 ? '...' : ''}</p>
                    
                    <div class="card-footer">
                        <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
                    </div>
                </div>
            </div>
        `;
    }
}
