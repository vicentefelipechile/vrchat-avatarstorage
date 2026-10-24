// =========================================================================================================
// FRONTEND API TEST SETUP
// =========================================================================================================
// Provide only the browser globals the transport needs; no DOM or UI environment is involved.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { afterEach, beforeEach, vi } from 'vitest';

import { DataCache } from '../../src/frontend/core/cache';

// =========================================================================================================
// Storage
// =========================================================================================================

class TestStorage implements Storage {
	private readonly values = new Map<string, string>();

	get length(): number {
		return this.values.size;
	}

	clear(): void {
		for (const key of Object.keys(this)) {
			if (key.startsWith('cache:')) delete (this as unknown as Record<string, unknown>)[key];
		}
		this.values.clear();
	}

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}

	key(index: number): string | null {
		return [...this.values.keys()][index] ?? null;
	}

	removeItem(key: string): void {
		this.values.delete(key);
		delete (this as unknown as Record<string, unknown>)[key];
	}

	setItem(key: string, value: string): void {
		this.values.set(key, String(value));
		Object.defineProperty(this, key, { value: String(value), enumerable: true, configurable: true });
	}
}

const storage = new TestStorage();

// =========================================================================================================
// Hooks
// =========================================================================================================

beforeEach(() => {
	vi.stubGlobal('window', { location: { hostname: 'vrcstorage.lat', origin: 'https://vrcstorage.lat' } });
	vi.stubGlobal('localStorage', storage);
	storage.clear();
	DataCache.cache.clear();
	DataCache.pending.clear();
});

afterEach(() => {
	DataCache.cache.clear();
	DataCache.pending.clear();
	storage.clear();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
