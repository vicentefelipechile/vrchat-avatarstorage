// =========================================================================================================
// Collections
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { FAVORITE_CACHE_PREFIXES } from './favorites';
import type { ApiOptions, CollectionsResponse, Success } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class CollectionsApi {
	constructor(private readonly client: ApiClient) {}
	List(options?: ApiOptions) {
		return this.client.get<CollectionsResponse>('/api/collections', options);
	}
	Create(data: { name: string }) {
		return this.client.post<{ uuid: string; name: string }>('/api/collections', data, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
	Update(uuid: string, data: { name: string }) {
		return this.client.put<Success>(`/api/collections/${encodeURIComponent(uuid)}`, data, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
	Delete(uuid: string) {
		return this.client.delete<Success>(`/api/collections/${encodeURIComponent(uuid)}`, undefined, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
	Reorder(orderedUuids: string[]) {
		return this.client.post<Success>('/api/collections/reorder', { ordered_uuids: orderedUuids }, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
}
