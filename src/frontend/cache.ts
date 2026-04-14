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
// Persistent entries skip the TTL check and are kept until explicitly cleared via `clear()`.
// =========================================================================================================

import { TimeUnit } from "./utils";

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

/** localStorage key prefix used for all cache entries. Centralised to avoid scattered literals. */
const CACHE_PREFIX = 'cache:';

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
	// Resolves data for a given URL through the two-layer cache, then falls back to a live network request.
	// =========================================================================================================

	/**
	 * Fetches data for the given URL, returning a cached result when available and still valid.
	 *
	 * Resolution order:
	 *   1. In-memory `cache` Map — returned immediately if the entry exists and has not expired.
	 *   2. `localStorage` — deserialized and promoted to in-memory if not expired; stale entries are pruned.
	 *   3. Network — a real `fetch()` call is made. Concurrent requests for the same URL are deduplicated
	 *      via the `pending` map so only one HTTP request is ever in flight at a time.
	 *
	 * After a successful network response the result is stored in:
	 *   - `this.cache` (always)
	 *   - `localStorage` (only when `persistent: true`; TTL is still enforced on subsequent reads)
	 *
	 * @param url - The URL to fetch. Used as the cache key.
	 * @param options - Either a `CacheOptions` object or a plain TTL number in milliseconds.
	 *                  Defaults to `60000` ms (1 minute).
	 * @returns A Promise that resolves to `T` — a parsed JSON object or raw text string depending on `options.type`.
	 * @throws Re-throws any network error or non-OK HTTP response as an `Error`.
	 *
	 * @example
	 * // 1. Explicit type — TypeScript knows the shape of `data` without any cast.
	 * interface Category { uuid: string; name: string; }
	 * const data = await DataCache.fetch<Category[]>('/api/categories');
	 * //    ^? Category[]
	 * console.log(data[0].name);
	 *
	 * @example
	 * // 2. Omitting T altogether — resolves to `unknown`; you must narrow the type yourself.
	 * const raw = await DataCache.fetch('/api/categories');
	 * //    ^? unknown  →  narrow before use
	 * const categories = raw as Category[];
	 *
	 * @example
	 * // 3. Plain TTL shorthand (number) — 30 s cache, no localStorage persistence.
	 * const tags = await DataCache.fetch<Tag[]>('/api/tags', 30000);
	 *
	 * @example
	 * // 4. Full CacheOptions object — persistent across reloads, 5 min TTL.
	 * const config = await DataCache.fetch<AppConfig>('/api/config', {
	 * 	ttl: 300000,
	 * 	persistent: true,
	 * });
	 *
	 * @example
	 * // 5. Text response — useful for Markdown wiki pages.
	 * const markdown = await DataCache.fetch<string>('/wiki/en/home.md', {
	 * 	ttl: 120000,
	 * 	type: 'text',
	 * });
	 */
	async fetch<T = unknown>(url: string, options: CacheOptions | number = 60000 | TimeUnit.Minute): Promise<T> {
		const now = Date.now();
		const { ttl, persistent, type } = resolveOptions(options);

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

		const promise = (async () => {
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`Fetch error: ${res.status}`);

				// Parse the response body according to the requested type.
				const data: unknown = type === 'text' ? await res.text() : await res.json();
				const entry: CacheEntry = { data, timestamp: Date.now() };

				// Always store in memory.
				this.cache.set(url, entry);

				// Optionally persist across page reloads via localStorage.
				if (persistent) persistToStorage(url, entry);

				return data;
			} finally {
				// Always remove from pending map once the request settles (success or error).
				this.pending.delete(url);
			}
		})();

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
		const { ttl, persistent } = resolveOptions(options);

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
			// Targeted eviction — removes only the specified URL from both layers.
			this.cache.delete(url);
			localStorage.removeItem(`${CACHE_PREFIX}${url}`);
		} else {
			// Full flush — clears the in-memory Map and every `cache:*` localStorage key.
			this.cache.clear();
			Object.keys(localStorage)
				.filter((k) => k.startsWith(CACHE_PREFIX))
				.forEach((k) => localStorage.removeItem(k));
		}
	},
};