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
        // Collect only image URLs for the lightbox (videos stay inline)
        const lightboxImages = [];
        let galleryHtml = '';
        const hasMedia = res.mediaFiles && res.mediaFiles.length > 0;
        const hasThumbnail = res.thumbnail_key;

        if (hasMedia || hasThumbnail) {
            galleryHtml = '<div class="gallery-grid">';

            // Thumbnail as first lightbox image
            if (hasThumbnail) {
                const thumbnailUrl = `/api/download/${res.thumbnail_key}`;
                const idx = lightboxImages.length;
                lightboxImages.push(thumbnailUrl);
                galleryHtml += `
                    <div class="gallery-item">
                        <div class="gallery-item-link" data-lightbox-index="${idx}" style="display:block;width:100%;height:100%;cursor:zoom-in;">
                            <img src="${thumbnailUrl}" alt="Thumbnail" loading="lazy">
                        </div>
                    </div>
                `;
            }

            // Other media files
            if (hasMedia) {
                res.mediaFiles.forEach(media => {
                    const url = `/api/download/${media.r2_key}`;
                    if (media.media_type === 'video') {
                        galleryHtml += `
                            <div class="gallery-item">
                                <video controls style="width:100%;height:100%;object-fit:cover;">
                                    <source src="${url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        `;
                    } else if (media.media_type === 'image') {
                        const idx = lightboxImages.length;
                        lightboxImages.push(url);
                        galleryHtml += `
                            <div class="gallery-item">
                                <div class="gallery-item-link" data-lightbox-index="${idx}" style="display:block;width:100%;height:100%;cursor:zoom-in;">
                                    <img src="${url}" alt="Gallery Image" loading="lazy">
                                </div>
                            </div>
                        `;
                    }
                });
            }

            galleryHtml += '</div>';
        }

        // Store image list on the instance for postRender
        this._lightboxImages = lightboxImages;

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
        if (window.marked && window.DOMPurify) {
            descriptionHtml = window.DOMPurify.sanitize(window.marked.parse(res.description || ''));
        } else if (window.marked) {
            descriptionHtml = window.marked.parse(res.description || ''); // Fallback
        } else {
            descriptionHtml = `<p>${(res.description || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
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

            <!-- Lightbox overlay (injected once, reused for all images) -->
            <div id="lightbox-overlay" role="dialog" aria-modal="true">
                <button id="lightbox-close" aria-label="Close">&times;</button>
                <button id="lightbox-prev" class="lightbox-btn" aria-label="Previous">&#8592;</button>
                <div id="lightbox-img-wrap">
                    <img id="lightbox-img" src="" alt="">
                </div>
                <button id="lightbox-next" class="lightbox-btn" aria-label="Next">&#8594;</button>
                <div id="lightbox-counter"></div>
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

        return comments.map(c => {
            let content = c.text;
            if (window.marked && window.DOMPurify) {
                content = window.DOMPurify.sanitize(window.marked.parse(c.text));
            } else {
                content = c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }

            return `
            <div id="comment-${c.uuid}" class="comment" style="display: flex; gap: 10px;">
                <div style="flex-shrink: 0;">
                    <img src="${c.author_avatar}" alt="${c.author}" class="comment-avatar">
                </div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${c.author} <span style="font-weight: normal; font-size: 0.8em; color: var(--text-muted);">(${new Date(c.timestamp).toLocaleString()})</span></span>
                        ${isAdmin ? `<button onclick="deleteComment('${c.uuid}')" class="btn" style="padding: 2px 5px; font-size: 0.8em; background: #ff4444; color: white;">${t('admin.delete')}</button>` : ''}
                    </div>
                    <div class="markdown-body" style="word-break: break-word;">${content}</div>
                </div>
            </div>
            `;
        }).join('');
    }

    setupLightbox() {
        const images = this._lightboxImages || [];
        if (images.length === 0) return;

        const overlay = document.getElementById('lightbox-overlay');
        const imgEl = document.getElementById('lightbox-img');
        const imgWrap = document.getElementById('lightbox-img-wrap');
        const counter = document.getElementById('lightbox-counter');
        const btnClose = document.getElementById('lightbox-close');
        const btnPrev = document.getElementById('lightbox-prev');
        const btnNext = document.getElementById('lightbox-next');

        if (!overlay) return;

        const ZOOM_SCALE = 2.5;
        let current = 0;
        let isZoomed = false;

        // Update transform-origin to the cursor position relative to the image.
        // We remap [margin, 1-margin] → [0%, 100%] so the user doesn't need to reach
        // the literal edge pixel to see a corner – reaching ~15% inside the border is enough.
        const MARGIN = 0.09;
        const remap = (v) => Math.min(Math.max((v - MARGIN) / (1 - 2 * MARGIN) * 100, 0), 100);

        const updateOrigin = (e) => {
            const rect = imgEl.getBoundingClientRect();
            const rawX = (e.clientX - rect.left) / rect.width;
            const rawY = (e.clientY - rect.top) / rect.height;
            imgEl.style.transformOrigin = `${remap(rawX)}% ${remap(rawY)}%`;
        };

        const setZoom = (zoomed, e) => {
            isZoomed = zoomed;
            if (zoomed) {
                if (e) updateOrigin(e);
                // Expand the clipping window to the full viewport so small images
                // also get a large area to pan through when zoomed
                imgWrap.style.width = '90vw';
                imgWrap.style.height = '90vh';
                imgEl.style.transform = `scale(${ZOOM_SCALE})`;
                imgWrap.style.cursor = 'zoom-out';
                imgEl.style.cursor = 'zoom-out';
            } else {
                imgEl.style.transform = 'scale(1)';
                // Delay shrinking the wrap until the CSS scale transition finishes (250ms)
                // so the container doesn't clip the image mid-animation
                setTimeout(() => {
                    if (!isZoomed) {
                        imgWrap.style.width = '';
                        imgWrap.style.height = '';
                    }
                }, 250);
                // Keep transformOrigin where the cursor was so the zoom-out
                // animates back from that point, not from the center.
                imgWrap.style.cursor = 'zoom-in';
                imgEl.style.cursor = 'zoom-in';
            }
        };

        const open = (idx) => {
            current = ((idx % images.length) + images.length) % images.length;
            imgEl.src = images[current];
            setZoom(false);
            counter.textContent = `${current + 1} / ${images.length}`;
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const close = () => {
            overlay.classList.remove('active');
            setZoom(false);
            imgEl.src = '';
            document.body.style.overflow = '';
        };

        // Open lightbox when clicking gallery thumbnails
        document.querySelectorAll('.gallery-item-link[data-lightbox-index]').forEach(el => {
            el.addEventListener('click', () => open(parseInt(el.dataset.lightboxIndex, 10)));
        });

        // Toggle zoom on click, anchored to cursor position
        imgWrap.addEventListener('click', (e) => {
            e.stopPropagation();
            setZoom(!isZoomed, e);
        });

        // While zoomed, move the zoom origin to follow the cursor
        imgEl.addEventListener('mousemove', (e) => {
            if (!isZoomed) return;
            updateOrigin(e);
        });

        // Close on dark backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        btnClose.addEventListener('click', close);
        btnPrev.addEventListener('click', (e) => { e.stopPropagation(); open(current - 1); });
        btnNext.addEventListener('click', (e) => { e.stopPropagation(); open(current + 1); });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('active')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') open(current - 1);
            if (e.key === 'ArrowRight') open(current + 1);
        });

        // Reset scroll lock if the user navigates away (browser back/forward)
        // while the lightbox is open, so the next page isn't left unscrollable
        window.addEventListener('popstate', () => {
            document.body.style.overflow = '';
        });
    }

    async postRender() {
        const uuid = this.params.id;
        const commentsContainer = document.getElementById('comments-container');

        // Set up the image lightbox
        this.setupLightbox();

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
