import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { renderTurnstile, stripMarkdown } from '../utils.js';
import { deleteComment, approveResource, rejectResource, deactivateResource } from '../admin.js';

export default class ItemView extends AbstractView {
    async getHtml() {
        const uuid = this.params.id;
        // Fetch item details immediately
        const res = await DataCache.fetch(`/api/item/${uuid}`, { ttl: 300000, persistent: true }); // Persistent cache for immutable items

        if (!res) return `<h1>${t('item.notFound')}</h1>`;

        const user = window.appState.user;
        const isAdmin = window.appState.isAdmin;

        // --- Resource Details ---
        const category = res.category ? (t('cats.' + res.category) || res.category) : 'Unknown';
        const date = new Date(res.created_at * 1000).toLocaleString();

        let linksHtml = '';
        if (user) {
            linksHtml = `<h3>${t('item.downloads')}</h3><ul class="download-list">`;
            res.links.forEach(link => {
                let url = link.link_url;
                if (link.link_type === 'download' && !url.startsWith('http')) {
                    // It's an internal R2 link
                    url = link.link_url;
                }
                const isBackup = link.link_title.toLowerCase().includes('backup');
                const label = isBackup ? `${t('item.backup')}: ${link.link_url}` : link.link_title;
                linksHtml += `<li><a href="${url}" target="_blank" class="download-link">${label}</a></li>`;
            });
            linksHtml += '</ul>';
        } else {
            linksHtml = `
                <div class="alert alert-warning">
                    <strong>${t('item.loginReq')}</strong><br>
                    ${t('item.loginMsg')}<br>
                    <a href="/login" data-link class="btn" style="margin-top: 10px;">${t('item.goToLogin')}</a>
                </div>
            `;
        }

        // --- Gallery ---
        let galleryHtml = '';
        if (res.mediaFiles && res.mediaFiles.length > 0) {
            galleryHtml = '<div class="gallery-grid">';
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
                } else {
                    galleryHtml += `
                        <div class="gallery-item">
                            <a href="${url}" target="_blank">
                                <img src="${url}" alt="Gallery Image" loading="lazy">
                            </a>
                        </div>
                    `;
                }
            });
            galleryHtml += '</div>';
        }

        // --- Admin Actions ---
        const adminActions = this.getAdminActions(res);

        // --- Comments Section ---
        let commentsHtml = `
            <div id="comments-section" style="margin-top: 40px;">
                <h2>${t('item.comments')}</h2>
                <div id="comments-container">
                    <p>Loading comments...</p>
                </div>
                
                ${user ? `
                <form id="comment-form" style="margin-top: 20px;">
                    <div class="form-group">
                        <textarea id="comment-text" rows="3" placeholder="${t('item.commentPlaceholder')}" required style="width: 100%; font-family: inherit; padding: 10px;"></textarea>
                    </div>
                    <div id="turnstile-comment" class="mb-10"></div>
                    <button type="submit" class="btn">${t('item.send')}</button>
                </form>
                ` : `<p><a href="/login" data-link>${t('item.loginToComment')}</a></p>`}
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
                ${adminActions}
                <h1>${res.title}<span style="float: right; font-size: 0.6em; color: #666;">${date}</span></h1>
                <div class="meta" style="margin-bottom: 20px;">
                    <strong>${t('item.category')}:</strong> <a href="/category/${res.category}" data-link>${category}</a> | 
                    <strong>${t('item.uuid')}:</strong> ${res.uuid}
                </div>
                
                ${galleryHtml}

                <div class="description markdown-body" style="margin: 20px 0; padding: 15px; background: #fafafa; border: 1px solid #eee;">
                    ${descriptionHtml}
                </div>

                ${linksHtml}

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
                <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; border: 1px solid #ffeeba; margin-top: 10px; margin-bottom: 20px;">
                    <h3>${t('item.adminPanel')}</h3>
                    <p>${t('item.pendingApproval')}</p>
                    <button class="btn" style="background-color: #28a745;" id="btn-approve-${res.uuid}">${t('item.approve')}</button>
                    <button class="btn" style="background-color: #dc3545;" id="btn-reject-${res.uuid}">${t('item.reject')}</button>
                </div>
            `;
        } else {
            // Active
            buttons = `
                <div style="background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; border: 1px solid #bee5eb; margin-top: 10px; margin-bottom: 20px;">
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
            <div class="comment" id="comment-${c.uuid}">
                <div class="comment-header">
                    <img src="${c.author_avatar || 'https://placehold.co/40'}" alt="${c.author}" class="comment-avatar">
                    <strong>${c.author}</strong>
                    <span style="color: #666; font-size: 0.8em; margin-left: 10px;">${new Date(c.timestamp).toLocaleString()}</span>
                    ${isAdmin ? `<button class="btn-sm btn-danger" style="float: right;" onclick="deleteComment('${c.uuid}')">${t('admin.delete')}</button>` : ''}
                </div>
                <div class="comment-body">
                    ${c.text}
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
            const comments = await DataCache.fetch(`/api/comments/${uuid}`, 300000);
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
                const text = document.getElementById('comment-text').value;

                // Get Turnstile Token
                const formData = new FormData(form);
                const token = formData.get('cf-turnstile-response');

                const res = await fetch(`/api/comments/${uuid}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, author: 'user', token })
                });

                if (res.ok) {
                    // Clear form
                    document.getElementById('comment-text').value = '';
                    if (window.turnstile) window.turnstile.reset();

                    // Refresh comments - Bypass cache to show new comment immediately
                    const comments = await fetch(`/api/comments/${uuid}`).then(res => res.json());
                    // Update cache
                    DataCache.cache.set(`/api/comments/${uuid}`, { data: comments, timestamp: Date.now() });
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
            });
        }

        // Expose deleteComment globally just for the onclick handler in HTML string (or better, bind it properly)
        // Since we are using innerHTML for comments, binding events is tricky without re-selecting.
        // A cleaner way is to use event delegation on commentsContainer.
        window.deleteComment = deleteComment;
    }
}
