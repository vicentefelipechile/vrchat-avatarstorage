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

        this.categories = [
            {
                id: 'informative',
                title: 'wiki.categories.informative',
                topics: [
                    { id: 'home', label: 'nav.home' },
                    { id: 'faq', label: 'wiki.faq.title' },
                    { id: 'comments', label: 'wiki.comments.title' }
                ]
            },
            {
                id: 'vrchat',
                title: 'wiki.categories.vrchat',
                topics: [
                    { id: 'parameter', label: 'wiki.parameter.title' },
                    { id: 'setup', label: 'wiki.setup.title' },
                    { id: 'unityhub-error', label: 'wiki.unityhubError.title' }
                ]
            },
            {
                id: 'dependencies',
                title: 'wiki.categories.dependencies',
                topics: [
                    { id: 'poiyomi', label: 'wiki.poiyomi.title' },
                    { id: 'vrcfury', label: 'wiki.vrcfury.title' },
                    { id: 'gogoloco', label: 'wiki.gogoloco.title' },
                    { id: 'desktop-puppeteer', label: 'wiki.desktopPuppeteer.title' }
                ]
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
                ]
            }
        ];

        // Flatten for easy validation
        this.flatTopics = this.categories.flatMap(cat => cat.topics);

        // Validate topic param
        const isValidTopic = this.flatTopics.some(t => t.id === topicParam);
        this.currentTopic = isValidTopic ? topicParam : 'home';
    }

    async getHtml() {
        // Generate sidebar items with categories
        const sidebarContent = this.categories.map(cat => {
            const catTitle = t(cat.title);
            const links = cat.topics.map(topic => {
                const label = t(topic.label);
                const activeClass = this.currentTopic === topic.id ? 'active' : '';
                return `<li><a href="#" data-topic="${topic.id}" class="${activeClass}">${label}</a></li>`;
            }).join('');

            return `
                <div class="wiki-sidebar-category">
                    <h3>${catTitle}</h3>
                    <ul>${links}</ul>
                </div>
            `;
        }).join('');

        return `
            <div class="wiki-container">
                <nav class="wiki-sidebar">
                    ${sidebarContent}
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
            <form id="wiki-comment-form" class="wiki-comment-form">
                <div class="form-group">
                    <textarea id="comment-text" rows="3" placeholder="${t('item.commentPlaceholder')}" required class="comment-textarea"></textarea>
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
            if (window.marked && window.DOMPurify) {
                // Parse markdown
                content = window.marked.parse(c.text);
                // Sanitize HTML with DOMPurify
                content = window.DOMPurify.sanitize(content);
            } else if (window.marked) {
                // Parse markdown
                content = window.marked.parse(c.text);
                // Basic sanitization (strip script tags) to prevent XSS as fallback
                content = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");
            } else {
                // Fallback to text if marked not available
                content = c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }

            return `
            <div id="comment-${c.uuid}" class="wiki-comment">
                <div class="wiki-comment-avatar-container">
                    <img src="${c.author_avatar || '/assets/default_avatar.png'}" alt="${c.author}" class="wiki-comment-avatar">
                </div>
                <div class="wiki-comment-content">
                    <div class="wiki-comment-header">
                        <span>${c.author} <span class="wiki-comment-date">(${new Date(c.timestamp).toLocaleString()})</span></span>
                        ${(isAdmin || (window.appState.user && window.appState.user.username === c.author)) ? `<button class="btn delete-comment-btn btn-danger-sm" data-uuid="${c.uuid}">${t('admin.delete')}</button>` : ''}
                    </div>
                    <div class="markdown-body wiki-comment-body">${content}</div>
                </div>
            </div>
            `;
        }).join('');
    }
}
