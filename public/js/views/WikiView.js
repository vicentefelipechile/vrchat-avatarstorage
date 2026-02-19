import AbstractView from './AbstractView.js';
import { t, getCurrentLang } from '../i18n.js';
import { DataCache } from '../cache.js';
import { renderTurnstile } from '../utils.js';

export default class WikiView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle(t('wiki.title'));

        // Check for topic in URL
        const urlParams = new URLSearchParams(window.location.search);
        const topicParam = urlParams.get('topic');

        this.topics = [
            { id: 'home', label: 'nav.home' },
            { id: 'poiyomi', label: 'wiki.poiyomi.title' },
            { id: 'vrcfury', label: 'wiki.vrcfury.title' },
            { id: 'setup', label: 'wiki.setup.title' },
            { id: 'faq', label: 'wiki.faq.title' },
            { id: 'gogoloco', label: 'wiki.gogoloco.title' },
            { id: 'gogoloco-nsfw', label: 'wiki.gogolocoNsfw.title' },
            { id: 'sps', label: 'wiki.sps.title' },
            { id: 'dps', label: 'wiki.dps.title' },
            { id: 'nsfw-essentials', label: 'wiki.nsfwEssentials.title' },
            { id: 'haptics', label: 'wiki.haptics.title' },
            { id: 'comments', label: 'wiki.comments.title' }
        ];

        // Validate topic param
        const isValidTopic = this.topics.some(t => t.id === topicParam);
        this.currentTopic = isValidTopic ? topicParam : 'home';
    }

    async getHtml() {
        // Generate sidebar items
        const sidebarItems = this.topics.map(topic => {
            const label = t(topic.label);
            return `<li><a href="#" data-topic="${topic.id}" class="${this.currentTopic === topic.id ? 'active' : ''}">${label}</a></li>`;
        }).join('');

        return `
            <div class="wiki-container">
                <nav class="wiki-sidebar">
                    <ul>${sidebarItems}</ul>
                </nav>
                <div class="wiki-content" id="wiki-content">
                    <div style="text-align: center; padding: 50px;">
                        <p>${t('common.loading')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    async postRender() {
        this.contentContainer = document.getElementById('wiki-content');
        this.sidebarLinks = document.querySelectorAll('.wiki-sidebar a');

        // Add event listeners
        this.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const topic = e.target.getAttribute('data-topic');
                this.loadTopic(topic);
            });

            // Prefetch on hover
            link.addEventListener('mouseenter', () => {
                const topic = link.getAttribute('data-topic');
                if (topic === 'comments') return; // Don't prefetch markdown for comments
                const lang = getCurrentLang();
                DataCache.prefetch(`/wiki/${lang}/${topic}.md`, { type: 'text', ttl: 300000 }); // 5 min cache
            });
        });

        // Handle browser back/forward
        window.onpopstate = (event) => {
            const urlParams = new URLSearchParams(window.location.search);
            const topic = urlParams.get('topic') || 'home';
            this.loadTopic(topic, false); // false = don't push state
        };

        // Load initial topic
        this.loadTopic(this.currentTopic, false); // Initial load doesn't need pushState

        // Setup delete comment delegation
        this.contentContainer.addEventListener('click', async (e) => {
            if (e.target.matches('.delete-comment-btn')) {
                const uuid = e.target.getAttribute('data-uuid');
                await this.deleteComment(uuid, e.target);
            }
        });
    }

    async loadTopic(topicId, updateUrl = true) {
        // Update state
        this.currentTopic = topicId;

        // Update URL
        if (updateUrl) {
            const newUrl = topicId === 'home' ? '/wiki' : `/wiki?topic=${topicId}`;
            history.pushState(null, '', newUrl);
        }

        // Update sidebar active state
        this.sidebarLinks.forEach(link => {
            if (link.getAttribute('data-topic') === topicId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        if (topicId === 'comments') {
            await this.renderCommentsPage();
            return;
        }

        const lang = getCurrentLang();
        const url = `/wiki/${lang}/${topicId}.md`;

        // Fetch markdown with cache
        try {
            const text = await DataCache.fetch(url, { type: 'text', ttl: 300000 });
            this.renderMarkdown(text);
        } catch (error) {
            // Fallback to English if file not found
            if (lang !== 'en') {
                console.warn(`Wiki page not found for ${lang}, trying 'en'`);
                try {
                    const textEn = await DataCache.fetch(`/wiki/en/${topicId}.md`, { type: 'text', ttl: 300000 });
                    this.renderMarkdown(textEn);
                    return;
                } catch (e) {
                    console.error('Fallback failed', e);
                }
            }

            console.error('Error loading wiki content:', error);
            this.contentContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #cc0000;">
                    <h3>${t('common.error') || 'Error'}</h3>
                    <p>Could not load content for topic: ${topicId}</p>
                    <p>Refer to the console for more details.</p>
                </div>`;
        }
    }

    renderMarkdown(text) {
        if (window.marked) {
            // Configure marked if needed (e.g. for security or options)
            // marked.use({ breaks: true, gfm: true });
            this.contentContainer.innerHTML = window.marked.parse(text);

            // Post-process for GitHub-style alerts
            // Syntax: > [!NOTE] ...
            const blockquotes = this.contentContainer.querySelectorAll('blockquote');
            blockquotes.forEach(bq => {
                const firstP = bq.querySelector('p');
                if (!firstP) return;

                const html = firstP.innerHTML;
                const match = html.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

                if (match) {
                    const type = match[1].toLowerCase();
                    bq.classList.add('markdown-alert', `markdown-alert-${type}`);

                    // Remove the marker from the text
                    firstP.innerHTML = html.replace(match[0], '').trim();

                    // Add title element with icon (optional, can be done in CSS too, but explicit element is nicer)
                    const titleDiv = document.createElement('p');
                    titleDiv.className = 'markdown-alert-title';
                    // We can map type to a specific icon or localized text if needed
                    // For now, let's just capitalize the type
                    titleDiv.textContent = type.charAt(0).toUpperCase() + type.slice(1);

                    bq.insertBefore(titleDiv, firstP);
                }
            });

        } else {
            console.error('Marked library not found');
            this.contentContainer.innerHTML = `<pre>${text}</pre>`;
        }
    }

    async renderCommentsPage() {
        const user = window.appState.user;

        this.contentContainer.innerHTML = `
            <h1>${t('wiki.comments.title')}</h1>
            <div id="comments-container">
                <p>${t('common.loading')}</p>
            </div>
            ${user ? `
            <form id="wiki-comment-form" style="margin-top: 20px;">
                <div class="form-group">
                    <textarea id="comment-text" rows="3" placeholder="${t('item.commentPlaceholder')}" required style="width: 100%; font-family: inherit; padding: 10px;"></textarea>
                </div>
                <div id="turnstile-wiki-comment" class="mb-10"></div>
                <button type="submit" class="btn">${t('item.send')}</button>
            </form>
            ` : `<hr><h3>${t('item.loginToComment')}</h3>`}
        `;

        // Wrapper for comments fetching
        const loadComments = async () => {
            const container = document.getElementById('comments-container');
            if (!container) return;
            try {
                // Determine if user is admin
                const isAdmin = window.appState && window.appState.isAdmin;
                // Fetch comments (no cache or short cache)
                const comments = await fetch('/api/wiki/comments').then(res => res.json());
                container.innerHTML = this.renderCommentsList(comments, isAdmin);
            } catch (e) {
                console.error('Failed to load wiki comments', e);
                container.innerHTML = `<p>${t('common.error')}</p>`;
            }
        };

        // Initial load
        await loadComments();

        // Bind form
        const form = document.getElementById('wiki-comment-form');
        if (form) {
            renderTurnstile('#turnstile-wiki-comment');
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                const textContainer = document.getElementById('comment-text');
                const text = textContainer.value;

                textContainer.disabled = true;
                submitBtn.disabled = true;
                submitBtn.textContent = t('item.sending') || 'Sending...';

                try {
                    const formData = new FormData(form);
                    const token = formData.get('cf-turnstile-response');

                    const res = await fetch('/api/wiki/comments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text, token })
                    });

                    if (res.ok) {
                        textContainer.value = '';
                        if (window.turnstile) window.turnstile.reset();
                        await loadComments(); // Reload comments
                    } else {
                        const data = await res.json();
                        alert('Error: ' + (data.error || 'Unknown'));
                    }
                } catch (err) {
                    console.error(err);
                    alert('Error submitting comment');
                } finally {
                    textContainer.disabled = false;
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }
    }

    async deleteComment(uuid, btn) {
        console.log('Attempting to delete comment:', uuid);
        const response = await confirm(t('admin.deleteConfirm'))
        if (!response) return;

        if (btn) {
            btn.disabled = true;
            btn.innerText = '...';
        }

        try {
            const res = await fetch(`/api/wiki/comments/${uuid}`, { method: 'DELETE' });
            if (res.ok) {
                console.log('Comment deleted successfully');
                // Remove from DOM immediately for feedback
                const el = document.getElementById(`comment-${uuid}`);
                if (el) el.remove();
            } else {
                const data = await res.json();
                console.error('Delete failed:', data);
                alert('Error: ' + (data.error || 'Unknown'));
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = t('admin.delete');
                }
            }
        } catch (e) {
            console.error('Delete exception:', e);
            alert('Error deleting comment');
            if (btn) {
                btn.disabled = false;
                btn.innerText = t('admin.delete');
            }
        }
    }

    renderCommentsList(comments, isAdmin) {
        if (!comments || comments.length === 0) return `<p>${t('item.noComments')}</p>`;

        return comments.map(c => {
            // Render markdown content
            let content = c.text;
            if (window.marked) {
                // Parse markdown
                content = window.marked.parse(c.text);
                // Basic sanitization (strip script tags) to prevent XSS
                // Ideally use DOMPurify, but for now simple regex
                content = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");
            } else {
                // Fallback to text if marked not available
                content = c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }

            return `
            <div id="comment-${c.uuid}" style="border: 2px solid #000; padding: 10px; margin-bottom: 15px; background: #fff; box-shadow: 5px 5px 0px #888; display: flex; gap: 10px;">
                <div style="flex-shrink: 0;">
                    <img src="${c.author_avatar || '/assets/default_avatar.png'}" alt="${c.author}" style="width: 50px; height: 50px; object-fit: cover; border: 2px solid #000;">
                </div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${c.author} <span style="font-weight: normal; font-size: 0.8em; color: #666;">(${new Date(c.timestamp).toLocaleString()})</span></span>
                        ${(isAdmin || (window.appState.user && window.appState.user.username === c.author)) ? `<button class="btn delete-comment-btn" data-uuid="${c.uuid}" style="padding: 2px 5px; font-size: 0.8em; background: #ff4444; color: white;">${t('admin.delete')}</button>` : ''}
                    </div>
                    <div class="markdown-body" style="font-size: 0.95em;">${content}</div>
                </div>
            </div>
            `;
        }).join('');
    }
}
