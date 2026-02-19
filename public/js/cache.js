export const DataCache = {
    cache: new Map(),
    pending: new Map(),
    async fetch(url, options = 60000) {
        const now = Date.now();
        let ttl = 60000;
        let persistent = false;
        let type = 'json';

        if (typeof options === 'object') {
            ttl = options.ttl || 60000;
            persistent = options.persistent;
            type = options.type || 'json';
        } else {
            ttl = options;
        }

        // 1. Memory Cache
        if (this.cache.has(url)) {
            const { data, timestamp } = this.cache.get(url);
            if (persistent || now - timestamp < ttl) {
                return data;
            }
        }

        // 2. Persistent Cache (localStorage)
        if (persistent) {
            try {
                const key = `cache:${url}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Since resources are immutable, valid JSON in localStorage is always fresh enough
                    this.cache.set(url, parsed);
                    return parsed.data;
                }
            } catch (e) {
                console.warn('LocalStorage read error', e);
            }
        }

        // Check if there is a pending promise for this URL
        if (this.pending.has(url)) {
            return this.pending.get(url);
        }

        const promise = (async () => {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Fetch error: ${res.status}`);

                let data;
                if (type === 'text') {
                    data = await res.text();
                } else {
                    data = await res.json();
                }

                const cacheEntry = { data, timestamp: Date.now() };
                this.cache.set(url, cacheEntry);

                if (persistent) {
                    try {
                        localStorage.setItem(`cache:${url}`, JSON.stringify(cacheEntry));
                    } catch (e) {
                        if (e.name === 'QuotaExceededError') {
                            console.warn('LocalStorage full, clearing old entries...');
                            // Simple strategy: clear all cache entries starting with 'cache:'
                            Object.keys(localStorage)
                                .filter(k => k.startsWith('cache:'))
                                .forEach(k => localStorage.removeItem(k));
                            // Try saving again once
                            try {
                                localStorage.setItem(`cache:${url}`, JSON.stringify(cacheEntry));
                            } catch (retryErr) {
                                console.warn('LocalStorage still full after cleanup', retryErr);
                            }
                        } else {
                            console.warn('LocalStorage write error', e);
                        }
                    }
                }

                return data;
            } finally {
                this.pending.delete(url);
            }
        })();

        this.pending.set(url, promise);

        return promise;
    },
    prefetch(url, options = 60000) {
        let ttl = 60000;
        let persistent = false;
        let type = 'json'; // default

        if (typeof options === 'object') {
            ttl = options.ttl || 60000;
            persistent = options.persistent;
            type = options.type || 'json';
        } else {
            ttl = options;
        }

        if (this.cache.has(url)) {
            const { timestamp } = this.cache.get(url);
            if (persistent || Date.now() - timestamp < ttl) return;
        }

        // Also check persistent cache if needed before fetching
        if (persistent) {
            if (localStorage.getItem(`cache:${url}`)) return;
        }

        this.fetch(url, options).catch(err => console.error('Prefetch failed', err));
    },
    clear(url) {
        if (url) {
            this.cache.delete(url);
            localStorage.removeItem(`cache:${url}`);
        } else {
            this.cache.clear();
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache:'))
                .forEach(k => localStorage.removeItem(k));
        }
    }
};
