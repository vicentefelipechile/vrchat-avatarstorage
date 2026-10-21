// =========================================================================================================
// DATA CACHE
// =========================================================================================================
// A two-layer, in-memory + localStorage caching utility for the frontend SPA.
//
// Cache resolution order for every `fetch()` call:
//   1. In-memory Map (fastest, ephemeral — cleared on page reload)
//   2. localStorage (survives page reload, keyed as `cache:<url>`)
//   3. Live network fetch (deduplicates concurrent in-flight requests)
//
// Entries are stored with a Unix timestamp and considered valid while `Date.now() - timestamp < ttl`.
// Persistent entries survive reloads but still obey their TTL.
// =========================================================================================================

// =========================================================================================================
// Constants
// =========================================================================================================

const DEFAULT_TTL = 60000;
const CACHE_PREFIX = 'cache:';

// =========================================================================================================
// Interfaces
// =========================================================================================================

export interface CacheOptions {
	/** Time-to-live in milliseconds. Defaults to 60 000 ms (1 minute). */
	ttl?: number;
	/** When true, the entry is written to localStorage and survives page reloads. TTL is still enforced. */
	persistent?: boolean;
	/** Expected response body format. Defaults to `'json'`. */
	type?: 'json' | 'text';
}

export interface CacheEntry {
	/** The cached payload — either a parsed JSON value or a raw string. */
	data: unknown;
	/** Unix timestamp (ms) recorded at the moment the entry was stored. */
	timestamp: number;
}

/** Resolved, fully-populated form of `CacheOptions` with no optional fields. */
interface ResolvedOptions {
	ttl: number;
	persistent: boolean;
	type: 'json' | 'text';
}

export enum CacheErrorType {
	StorageFull,
	StorageUnavailable,
	NetworkError,
	HTTPError,
	ParseError,
}

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Normalises the `options` argument accepted by `fetch()` and `prefetch()` into a `ResolvedOptions`
 * object, filling in defaults where values are absent.
 *
 * @param options - Either a `CacheOptions` object or a plain TTL number in milliseconds.
 * @returns A fully-resolved options object with no optional fields.
 */
function resolveOptions(options: CacheOptions | number): ResolvedOptions {
	if (typeof options === 'object') {
		return {
			ttl: options.ttl ?? 60000,
			persistent: options.persistent ?? false,
			type: options.type ?? 'json',
		};
	}
	return { ttl: options, persistent: false, type: 'json' };
}

/**
 * Writes a `CacheEntry` to localStorage under `cache:<url>`.
 * Handles `QuotaExceededError` by evicting all `cache:*` keys and retrying once.
 * If the retry also fails, the data is silently kept in-memory only.
 *
 * @param url - The URL that was fetched, used as part of the storage key.
 * @param entry - The cache entry to serialise and store.
 */
function persistToStorage(url: string, entry: CacheEntry): void {
	const serialised = JSON.stringify(entry);
	try {
		localStorage.setItem(`${CACHE_PREFIX}${url}`, serialised);
	} catch (e: unknown) {
		if (e instanceof DOMException && e.name === 'QuotaExceededError') {
			// Storage is full — evict all cached entries and retry once.
			console.warn('LocalStorage full, clearing old entries...');
			Object.keys(localStorage)
				.filter((k) => k.startsWith(CACHE_PREFIX))
				.forEach((k) => localStorage.removeItem(k));
			try {
				localStorage.setItem(`${CACHE_PREFIX}${url}`, serialised);
			} catch (retryErr) {
				// Still fails after cleanup — data lives in memory only for this session.
				console.warn('LocalStorage still full after cleanup', retryErr);
			}
		} else {
			console.warn('LocalStorage write error', e);
		}
	}
}

// =========================================================================================================
// DataCache
// =========================================================================================================

export const DataCache = {
	/**
	 * In-memory cache layer. Maps a URL string to its cached `CacheEntry`.
	 * This map is the fastest lookup path and is checked before localStorage.
	 * Cleared on every full page navigation (not preserved across reloads).
	 */
	cache: new Map<string, CacheEntry>(),

	/**
	 * In-flight request deduplication map. Maps a URL string to its pending Promise.
	 * If two callers request the same URL simultaneously, only one HTTP request is made
	 * and both callers receive the same Promise. The entry is deleted once the request settles.
	 */
	pending: new Map<string, Promise<unknown>>(),

	// =========================================================================================================
	// fetch<T>(url, options?)
	// Static content only; API domains supply their own transport through load().
	// =========================================================================================================

	async fetch<T = unknown>(url: string, options: CacheOptions | number = DEFAULT_TTL): Promise<T> {
		const type = resolveOptions(options).type;
		return this.load<T>(
			url,
			async () => {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
				return (type === 'text' ? await res.text() : await res.json()) as T;
			},
			options,
		);
	},

	// =========================================================================================================
	// load<T>(key, loader, options?)
	// Keeps cache policy independent of the API transport.
	// =========================================================================================================

	async load<T>(url: string, loader: () => Promise<T>, options: CacheOptions | number = DEFAULT_TTL): Promise<T> {
		const now = Date.now();
		const { ttl, persistent } = resolveOptions(options);

		// 1. Memory cache — fastest path, no I/O required.
		if (this.cache.has(url)) {
			const { data, timestamp } = this.cache.get(url)!;
			// `persistent` only controls storage location, not expiry — TTL is always enforced.
			if (now - timestamp < ttl) return data as T;
			// Entry has expired — evict from memory so the network fetch can refresh it.
			this.cache.delete(url);
		}

		// 2. localStorage cache — survives page reloads but requires JSON parsing.
		try {
			const cached = localStorage.getItem(`${CACHE_PREFIX}${url}`);
			if (cached) {
				const parsed: CacheEntry = JSON.parse(cached);
				const age = now - parsed.timestamp;
				if (age < ttl) {
					// Promote the valid entry to in-memory so subsequent reads skip localStorage.
					this.cache.set(url, parsed);
					return parsed.data as T;
				} else {
					// Prune the stale entry immediately to keep localStorage tidy.
					localStorage.removeItem(`${CACHE_PREFIX}${url}`);
				}
			}
		} catch (e) {
			console.warn('LocalStorage read error', e);
		}

		// 3. Deduplicate in-flight requests — if the same URL is already being fetched, reuse its Promise.
		if (this.pending.has(url)) return this.pending.get(url)! as Promise<T>;

		const promise: Promise<T> = Promise.resolve()
			.then(loader)
			.then((data) => {
				// An invalidation can retire this request while its response is still in flight.
				if (this.pending.get(url) !== promise) return data;
				const entry: CacheEntry = { data, timestamp: Date.now() };

				// Always store in memory.
				this.cache.set(url, entry);

				// Optionally persist across page reloads via localStorage.
				if (persistent) persistToStorage(url, entry);

				return data;
			})
			.finally(() => {
				if (this.pending.get(url) === promise) this.pending.delete(url);
			});

		this.pending.set(url, promise);
		return promise as Promise<T>;
	},

	// =========================================================================================================
	// prefetch(url, options?)
	// Warms the cache for a URL without returning the result.
	// =========================================================================================================

	/**
	 * Warms the cache for the given URL without returning the fetched data.
	 * Intended to be called speculatively (e.g. on hover or route transition) so that a subsequent
	 * `fetch()` call for the same URL can be served instantly from the in-memory or localStorage cache.
	 *
	 * Resolution order mirrors `fetch()`:
	 *   1. If a valid in-memory entry already exists, returns immediately (no-op).
	 *   2. If a valid localStorage entry exists, promotes it to memory and returns (no-op).
	 *   3. Otherwise, delegates to `fetch()` in fire-and-forget mode (errors are swallowed).
	 *
	 * @param url - The URL to prefetch. Used as the cache key.
	 * @param options - Either a `CacheOptions` object or a plain TTL number in milliseconds.
	 *                  Defaults to `60000` ms (1 minute).
	 */
	prefetch(url: string, options: CacheOptions | number = 60000): void {
		const now = Date.now();
		const { ttl } = resolveOptions(options);

		// 1. In-memory check — nothing to do if the entry is still valid.
		if (this.cache.has(url)) {
			const { timestamp } = this.cache.get(url)!;
			if (now - timestamp < ttl) return;
			// Entry has expired — evict so the fire-and-forget fetch can refresh it.
			this.cache.delete(url);
		}

		// 2. localStorage check — promote to memory if the entry is still valid (avoids a network round-trip).
		try {
			const cached = localStorage.getItem(`${CACHE_PREFIX}${url}`);
			if (cached) {
				const parsed: CacheEntry = JSON.parse(cached);
				if (now - parsed.timestamp < ttl) {
					this.cache.set(url, parsed);
					return;
				} else {
					// Prune the stale entry immediately to keep localStorage tidy.
					localStorage.removeItem(`${CACHE_PREFIX}${url}`);
				}
			}
		} catch (e) {
			console.warn('LocalStorage read error', e);
		}

		// 3. Fire-and-forget fetch — errors are intentionally swallowed; callers do not need to await.
		this.fetch(url, options).catch((err) => console.error('Prefetch failed', err));
	},

	// =========================================================================================================
	// clear(url?)
	// Evicts one specific URL or the entire cache from both memory and localStorage.
	// =========================================================================================================

	/**
	 * Evicts cache entries from both in-memory storage and localStorage.
	 *
	 * - When `url` is provided: removes only the entry for that specific URL.
	 * - When `url` is omitted: removes **all** cached entries (full cache flush).
	 *
	 * This should be called after write operations (POST / PUT / DELETE) that invalidate
	 * previously cached data, ensuring subsequent reads reflect the latest server state.
	 *
	 * @param url - Optional URL to evict. Omit to flush the entire cache.
	 */
	clear(url?: string): void {
		if (url) {
			this.clearScope(`${url}|`);
			// Targeted eviction — removes only the specified URL from both layers.
			this.cache.delete(url);
			this.pending.delete(url);
			try {
				localStorage.removeItem(`${CACHE_PREFIX}${url}`);
			} catch (error) {
				console.warn('LocalStorage eviction error', error);
			}
		} else {
			// Full flush — clears the in-memory Map and every `cache:*` localStorage key.
			this.cache.clear();
			this.pending.clear();
			try {
				Object.keys(localStorage)
					.filter((k) => k.startsWith(CACHE_PREFIX))
					.forEach((k) => localStorage.removeItem(k));
			} catch (error) {
				console.warn('LocalStorage eviction error', error);
			}
		}
	},

	// =========================================================================================================
	// clearScope(prefix)
	// Evicts every cached URL that starts with `prefix` from both memory and localStorage.
	// =========================================================================================================

	/**
	 * Evicts all cache entries whose URL begins with `prefix`, across both the in-memory Map and
	 * localStorage. This covers keys carrying query params — e.g. `clearScope('/api/avatars')` drops
	 * `/api/avatars?page=1`, `/api/avatars?gender=female`, and every other filtered variant at once.
	 *
	 * A remote change arrives as a coarse scope, not an exact URL, so per-URL `clear()` cannot reach
	 * the paginated/filtered keys it invalidated. `clearScope` bridges that granularity gap: the next
	 * read of any matching URL misses the cache and re-fetches fresh data from the API.
	 *
	 * @param prefix - URL prefix to match. All keys where `key.startsWith(prefix)` are evicted.
	 */
	clearScope(prefix: string): void {
		// In-memory layer — collect first, then delete, to avoid mutating the Map mid-iteration.
		for (const url of [...this.cache.keys()]) {
			if (url.startsWith(prefix)) this.cache.delete(url);
		}
		for (const url of [...this.pending.keys()]) {
			if (url.startsWith(prefix)) this.pending.delete(url);
		}

		// localStorage layer — keys are stored as `cache:<url>`, so match against the prefixed form.
		const storagePrefix = `${CACHE_PREFIX}${prefix}`;
		try {
			Object.keys(localStorage)
				.filter((k) => k.startsWith(storagePrefix))
				.forEach((k) => localStorage.removeItem(k));
		} catch (error) {
			console.warn('LocalStorage eviction error', error);
		}
	},
};
