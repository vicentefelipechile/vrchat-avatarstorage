import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { renderTurnstile, stripMarkdown } from '../utils.js';
import { deleteComment, approveResource, rejectResource, deactivateResource } from '../admin.js';

export default class ItemView extends AbstractView {
    async getHtml() {
        const uuid = this.params.id;
        // Fetch item details immediately
        const res = await DataCache.fetch(`/api/resources/${uuid}`, { ttl: 300000, persistent: true }); // Persistent cache for immutable items

        if (!res) return `<h1>${t('item.notFound')}</h1>`;

        // Auth is already loaded from localStorage, no need to wait
        const user = window.appState.user;
        const isAdmin = window.appState.isAdmin;

        // --- Resource Details ---
        const category = res.category ? (t('cats.' + res.category) || res.category) : 'Unknown';
        const date = new Date(res.created_at * 1000).toLocaleString();

        let linksHtml = '';
        if (user) {
            // Get download links from the full links array
            const downloadLinks = res.links ? res.links.filter(l => l.link_type === 'download') : [];

            if (downloadLinks.length > 0) {
                linksHtml = `<div style="display: flex; gap: 10px; flex-wrap: wrap;">`;

                downloadLinks.forEach((link, index) => {
                    // If link has a title (filename), use it - these are official downloads
                    // Links without title are external backups (Google Drive, etc.)
                    let linkText;
                    if (link.link_title) {
                        linkText = link.link_title;
                    } else {
                        const backupNum = downloadLinks.slice(0, index).filter(l => !l.link_title).length + 1;
                        linkText = `${t('item.backup')} ${backupNum}`;
                    }

                    const buttonStyle = link.link_title ? '' : ' style="background: #555;"';
                    linksHtml += `<a href="${link.link_url}" target="_blank" class="btn"${buttonStyle}>${linkText}</a>`;
                });

                linksHtml += `</div>`;
            } else {
                // Fallback to old structure if links array is not available
                linksHtml = `
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <a href="${res.downloadUrl}" target="_blank" class="btn">${t('item.downloadMain')}</a>
                        ${res.backupUrls.map((url, i) => `
                            <a href="${url}" target="_blank" class="btn" style="background: #666;">${t('item.backup')} ${i + 1}</a>
                        `).join('')}
                    </div>`;
            }
        } else {
            linksHtml = `
                <div class="login-req-box">
                    <p><strong>${t('item.loginReq')}</strong></p>
                    <p>${t('item.loginMsg')}</p>
                    <a href="/login" data-link class="btn">${t('item.goToLogin')}</a>
                </div>`;
        }

        // --- Gallery ---
        let galleryHtml = '';
        const hasMedia = res.mediaFiles && res.mediaFiles.length > 0;
        const hasThumbnail = res.thumbnail_key;

        if (hasMedia || hasThumbnail) {
            galleryHtml = '<div class="gallery-grid">';

            // Add thumbnail as first item if it exists
            if (hasThumbnail) {
                const thumbnailUrl = `/api/download/${res.thumbnail_key}`;
                galleryHtml += `
                    <div class="gallery-item">
                        <a href="${thumbnailUrl}" target="_blank">
                            <img src="${thumbnailUrl}" alt="Thumbnail" loading="lazy">
                        </a>
                    </div>
                `;
            }

            // Add other media files
            if (hasMedia) {
                res.mediaFiles.forEach(media => {
                    const url = `/api/download/${media.r2_key}`;
                    // If it's a video
                    if (media.media_type === 'video') {
                        galleryHtml += `
                            <div class="gallery-item">
                                <video controls style="width: 100%; height: 100%; object-fit: cover;">
                                    <source src="${url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        `;
                    } else if (media.media_type === 'image') {
                        galleryHtml += `
                            <div class="gallery-item">
                                <a href="${url}" target="_blank">
                                    <img src="${url}" alt="Gallery Image" loading="lazy">
                                </a>
                            </div>
                        `;
                    }
                });
            }

            galleryHtml += '</div>';
        }

        // --- Admin Actions ---
        const adminActions = this.getAdminActions(res);

        // --- Comments Section ---
        let commentsHtml = `
            <div id="comments-section" style="margin-top: 40px;">
                <h2>${t('item.comments')}</h2>
                <div id="comments-container">
                    <p>${t('common.loadingComments')}</p>
                </div>
                
                ${user ? `
                <form id="comment-form" style="margin-top: 20px;">
                    <div class="form-group">
                        <textarea id="comment-text" rows="3" placeholder="${t('item.commentPlaceholder')}" required style="width: 100%; font-family: inherit; padding: 10px;"></textarea>
                    </div>
                    <div id="turnstile-comment" class="mb-10"></div>
                    <button type="submit" class="btn">${t('item.send')}</button>
                </form>
                ` : `<hr><h3>${t('item.loginToComment')}</h3>`}
            </div>
        `;

        // Render Markdown Description
        let descriptionHtml = '';
        if (window.marked) {
            descriptionHtml = window.marked.parse(res.description || '');
        } else {
            descriptionHtml = `<p>${res.description}</p>`;
        }

        return `
            <div class="details-box">
                <h1>${res.title}</h1>
                <div class="meta" style="margin-bottom: 20px;">
                    <strong>${t('item.category')}:</strong> <a href="/category/${res.category}" data-link>${category}</a> | 
                    <strong>${t('item.uploaded')}:</strong> ${date} | 
                    <strong>${t('item.uuid')}:</strong> ${res.uuid}
                </div>
                <hr>
                <h3>${t('upload.reference')}</h3>
                ${galleryHtml}
                <hr>
                <h3>${t('upload.desc')}</h3>
                <div class="description-box markdown-body">
                    ${descriptionHtml}
                </div>

                <hr>
                <h3>${t('item.downloads')}</h3>
                ${linksHtml}
                ${adminActions}
                <hr>
                ${commentsHtml}
            </div>
        `;
    }

    getAdminActions(res) {
        if (!window.appState || !window.appState.isAdmin) return '';

        let buttons = '';
        if (!res.is_active || res.is_active === 0) {
            // Pending
            buttons = `
                <hr>
                <div style="background: #fff3cd; color: #856404; padding: 15px; border: 2px solid #ffeeba; margin-top: 10px; margin-bottom: 20px;">
                    <h3>${t('item.adminPanel')}</h3>
                    <p>${t('item.pendingApproval')}</p>
                    <button class="btn" style="background-color: #28a745;" id="btn-approve-${res.uuid}">${t('item.approve')}</button>
                    <button class="btn" style="background-color: #dc3545;" id="btn-reject-${res.uuid}">${t('item.reject')}</button>
                </div>
            `;
        } else {
            // Active
            buttons = `
                <div style="background: #d1ecf1; color: #0c5460; padding: 15px; border: 2px solid #bee5eb; margin-top: 10px; margin-bottom: 20px;">
                    <h3>${t('item.adminPanel')}</h3>
                    <button class="btn" style="background-color: #ffc107; color: black;" id="btn-deactivate-${res.uuid}">${t('item.deactivate')}</button>
                </div>
            `;
        }
        return buttons;
    }

    renderComments(comments, isAdmin) {
        if (!comments || comments.length === 0) return `<p>${t('item.noComments')}</p>`;

        return comments.map(c => `
            <div id="comment-${c.uuid}" class="comment" style="display: flex; gap: 10px;">
                <div style="flex-shrink: 0;">
                    <img src="${c.author_avatar}" alt="${c.author}" class="comment-avatar">
                </div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${c.author} <span style="font-weight: normal; font-size: 0.8em; color: var(--text-muted);">(${new Date(c.timestamp).toLocaleString()})</span></span>
                        ${isAdmin ? `<button onclick="deleteComment('${c.uuid}')" class="btn" style="padding: 2px 5px; font-size: 0.8em; background: #ff4444; color: white;">${t('admin.delete')}</button>` : ''}
                    </div>
                    <div style="white-space: pre-wrap;">${c.text}</div>
                </div>
            </div>
        `).join('');
    }

    async postRender() {
        const uuid = this.params.id;
        const commentsContainer = document.getElementById('comments-container');

        // Bind Admin Actions
        const btnApprove = document.getElementById(`btn-approve-${uuid}`);
        if (btnApprove) btnApprove.addEventListener('click', () => approveResource(uuid));

        const btnReject = document.getElementById(`btn-reject-${uuid}`);
        if (btnReject) btnReject.addEventListener('click', () => rejectResource(uuid));

        const btnDeactivate = document.getElementById(`btn-deactivate-${uuid}`);
        if (btnDeactivate) btnDeactivate.addEventListener('click', () => deactivateResource(uuid));

        // Fetch and render comments asynchronously
        try {
            const comments = await DataCache.fetch(`/api/resources/${uuid}/comments`, 300000);
            const isAdmin = window.appState && window.appState.isAdmin;
            commentsContainer.innerHTML = this.renderComments(comments, isAdmin);
        } catch (e) {
            console.error('Failed to load comments', e);
            commentsContainer.innerHTML = `<p>Error loading comments.</p>`;
        }

        const form = document.getElementById('comment-form');
        if (form) {
            renderTurnstile('#turnstile-comment');
            form.addEventListener('submit', async e => {
                e.preventDefault();

                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                const text = document.getElementById('comment-text').value;

                // Disable button and show loading state
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enviando...';
                submitBtn.style.opacity = '0.6';

                try {
                    // Get Turnstile Token
                    const formData = new FormData(form);
                    const token = formData.get('cf-turnstile-response');

                    const res = await fetch(`/api/resources/${uuid}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text, author: 'user', token })
                    });

                    if (res.ok) {
                        // Clear form
                        document.getElementById('comment-text').value = '';
                        if (window.turnstile) window.turnstile.reset();

                        // Refresh comments - Bypass cache to show new comment immediately
                        const comments = await fetch(`/api/resources/${uuid}/comments`).then(res => res.json());
                        // Update cache
                        DataCache.cache.set(`/api/resources/${uuid}/comments`, { data: comments, timestamp: Date.now() });
                        const isAdmin = window.appState && window.appState.isAdmin;
                        commentsContainer.innerHTML = this.renderComments(comments, isAdmin);
                    } else {
                        const data = await res.json();
                        let msg = data.error || 'Unknown';
                        if (data.details && Array.isArray(data.details)) {
                            msg += ': ' + data.details.map(d => d.message).join(', ');
                        }
                        alert('Error: ' + msg);
                    }
                } finally {
                    // Re-enable button and restore original text
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.style.opacity = '1';
                }
            });
        }
        window.deleteComment = deleteComment;
    }
}
