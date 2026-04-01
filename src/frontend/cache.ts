import type { CacheOptions, CacheEntry } from './types';

export const DataCache = {
	cache: new Map<string, CacheEntry>(),
	pending: new Map<string, Promise<unknown>>(),

	async fetch(url: string, options: CacheOptions | number = 60000): Promise<unknown> {
		const now = Date.now();
		let ttl = 60000;
		let persistent = false;
		let type: 'json' | 'text' = 'json';

		if (typeof options === 'object') {
			ttl = options.ttl ?? 60000;
			persistent = options.persistent ?? false;
			type = options.type ?? 'json';
		} else {
			ttl = options;
		}

		// 1. Memory cache
		if (this.cache.has(url)) {
			const { data, timestamp } = this.cache.get(url)!;
			if (persistent || now - timestamp < ttl) return data;
		}

		// 2. localStorage cache
		try {
			const key = `cache:${url}`;
			const cached = localStorage.getItem(key);
			if (cached) {
				const parsed: CacheEntry = JSON.parse(cached);
				const age = now - parsed.timestamp;
				if (persistent || age < ttl) {
					this.cache.set(url, parsed);
					return parsed.data;
				} else {
					localStorage.removeItem(key);
				}
			}
		} catch (e) {
			console.warn('LocalStorage read error', e);
		}

		// 3. Deduplicate in-flight requests
		if (this.pending.has(url)) return this.pending.get(url)!;

		const promise = (async () => {
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`Fetch error: ${res.status}`);

				let data: unknown;
				if (type === 'text') {
					data = await res.text();
				} else {
					data = await res.json();
				}

				const cacheEntry: CacheEntry = { data, timestamp: Date.now() };
				this.cache.set(url, cacheEntry);

				if (persistent) {
					try {
						localStorage.setItem(`cache:${url}`, JSON.stringify(cacheEntry));
					} catch (e: unknown) {
						if (e instanceof DOMException && e.name === 'QuotaExceededError') {
							console.warn('LocalStorage full, clearing old entries...');
							Object.keys(localStorage)
								.filter((k) => k.startsWith('cache:'))
								.forEach((k) => localStorage.removeItem(k));
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

	prefetch(url: string, options: CacheOptions | number = 60000): void {
		let ttl = 60000;
		let persistent = false;

		if (typeof options === 'object') {
			ttl = options.ttl ?? 60000;
			persistent = options.persistent ?? false;
		} else {
			ttl = options;
		}

		if (this.cache.has(url)) {
			const { timestamp } = this.cache.get(url)!;
			if (persistent || Date.now() - timestamp < ttl) return;
		}

		try {
			const key = `cache:${url}`;
			const cached = localStorage.getItem(key);
			if (cached) {
				const parsed: CacheEntry = JSON.parse(cached);
				this.cache.set(url, parsed);
				return;
			}
		} catch (e) {
			console.warn('LocalStorage read error', e);
		}

		this.fetch(url, options).catch((err) => console.error('Prefetch failed', err));
	},

	clear(url?: string): void {
		if (url) {
			this.cache.delete(url);
			localStorage.removeItem(`cache:${url}`);
		} else {
			this.cache.clear();
			Object.keys(localStorage)
				.filter((k) => k.startsWith('cache:'))
				.forEach((k) => localStorage.removeItem(k));
		}
	},
};
