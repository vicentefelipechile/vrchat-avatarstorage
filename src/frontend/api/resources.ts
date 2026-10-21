// =========================================================================================================
// Resources — shared resources, history, links and private download URLs.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { Resource, HistoryEntry, ResourceLink } from '../types';
import { ApiClient } from './client';
import { resolveApiUrl } from './origin';
import { query, type ApiOptions, type Filters, type ResourceList, type ResourceWrite, type ResourceUpdate, type Success } from './types';

// =========================================================================================================
// Constants
// =========================================================================================================

export const RESOURCE_CACHE_PREFIXES = ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] as const;

// =========================================================================================================
// Domain
// =========================================================================================================

export class ResourcesApi {
	constructor(private readonly client: ApiClient) {}

	Invalidate(): void {
		this.client.invalidate(...RESOURCE_CACHE_PREFIXES);
	}

	List(filters?: Filters, options?: ApiOptions) {
		return this.client.get<ResourceList>(`/api/resources${query(filters)}`, options);
	}
	Latest(options?: ApiOptions) {
		return this.client.get<Resource[]>('/api/resources/latest', options);
	}
	Get(uuid: string, options?: ApiOptions) {
		return this.client.get<Resource>(`/api/resources/${encodeURIComponent(uuid)}`, options);
	}
	History(uuid: string, options?: ApiOptions) {
		return this.client.get<HistoryEntry[]>(`/api/resources/${encodeURIComponent(uuid)}/history`, options);
	}
	Create(data: ResourceWrite) {
		return this.client.post<Success & { uuid: string }>('/api/resources', data, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Update(uuid: string, data: ResourceUpdate) {
		return this.client.put<Success>(`/api/resources/${encodeURIComponent(uuid)}`, data, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Delete(uuid: string, code: string) {
		return this.client.delete<Success>(`/api/resources/${encodeURIComponent(uuid)}`, { code }, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	UpdateLink(uuid: string, linkUuid: string, data: Partial<ResourceLink>) {
		return this.client.put<{ ok: boolean }>(`/api/resources/${encodeURIComponent(uuid)}/links/${encodeURIComponent(linkUuid)}`, data, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	DeleteLink(uuid: string, linkUuid: string) {
		return this.client.delete<{ ok: boolean }>(`/api/resources/${encodeURIComponent(uuid)}/links/${encodeURIComponent(linkUuid)}`, undefined, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	ReorderLinks(uuid: string, orderedUuids: string[]) {
		return this.client.post<{ ok: boolean }>(`/api/resources/${encodeURIComponent(uuid)}/links/reorder`, { ordered_uuids: orderedUuids }, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	DownloadUrl(key: string) {
		return resolveApiUrl(this.DownloadPath(key));
	}
	DownloadPath(key: string) {
		return `/api/download/${encodeURIComponent(key)}`;
	}

	DownloadKey(url: string): string | null {
		let parsed: URL;
		try {
			parsed = new URL(url, window.location.origin);
		} catch {
			return null;
		}
		if (parsed.origin !== window.location.origin && parsed.origin !== 'https://vrcstorage.lat') return null;
		return /^\/api\/download\/([^/]+)\/?$/.exec(parsed.pathname)?.[1] ?? null;
	}

	ResolveDownloadUrl(url: string) {
		if (window.location.hostname !== 'vrcstorage.pages.dev') return url;
		let parsed: URL;
		try {
			parsed = new URL(url, window.location.origin);
		} catch {
			return url;
		}
		if ((parsed.origin === window.location.origin || parsed.origin === 'https://vrcstorage.lat') && parsed.pathname.startsWith('/api/download/')) return resolveApiUrl(parsed.pathname + parsed.search + parsed.hash);
		return url;
	}
}
