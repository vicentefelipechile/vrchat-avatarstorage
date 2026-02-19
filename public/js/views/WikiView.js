import AbstractView from './AbstractView.js';
import { t, getCurrentLang } from '../i18n.js';
import { DataCache } from '../cache.js';

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
            { id: 'haptics', label: 'wiki.haptics.title' }
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
}
