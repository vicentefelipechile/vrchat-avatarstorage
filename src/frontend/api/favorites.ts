// =========================================================================================================
// Favorites
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { query, type ApiOptions, type FavoriteWrite, type FavoriteOrder, type FavoritesResponse, type Success } from './types';

// =========================================================================================================
// Constants
// =========================================================================================================

export const FAVORITE_CACHE_PREFIXES = ['/api/favorites', '/api/collections'] as const;

// =========================================================================================================
// Domain
// =========================================================================================================

export class FavoritesApi {
	constructor(private readonly client: ApiClient) {}
	List(collection: string | null = 'all', options?: ApiOptions) {
		return this.client.get<FavoritesResponse>(`/api/favorites${query({ collection })}`, options);
	}
	Ids() {
		return this.client.get<{ favorites: string[] }>('/api/favorites/ids');
	}
	Check(uuid: string) {
		return this.client.get<{ is_favorite: boolean }>(`/api/favorites/check/${encodeURIComponent(uuid)}`);
	}
	Add(data: FavoriteWrite) {
		return this.client.post<Success>('/api/favorites', data, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
	Remove(uuid: string) {
		return this.client.delete<Success>(`/api/favorites/${encodeURIComponent(uuid)}`, undefined, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
	Reorder(data: FavoriteOrder) {
		return this.client.post<Success>('/api/favorites/reorder', data, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
	Move(uuid: string, collectionUuid: string | null) {
		return this.client.put<Success>(`/api/favorites/${encodeURIComponent(uuid)}/collection`, { collection_uuid: collectionUuid }, { invalidate: FAVORITE_CACHE_PREFIXES });
	}
}
