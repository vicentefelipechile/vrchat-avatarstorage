// =========================================================================================================
// Authors
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { RESOURCE_CACHE_PREFIXES } from './resources';
import { query, type ApiOptions, type Author, type AuthorProfile, type AuthorWrite, type Filters, type Pagination, type Success } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class AuthorsApi {
	constructor(private readonly client: ApiClient) {}
	List(filters?: Filters, options?: ApiOptions) {
		return this.client.get<{ authors: (Author & { resource_count: number; created_at: number })[]; pagination: Pagination }>(`/api/authors${query(filters)}`, options);
	}
	Search(q: string) {
		return this.client.get<Pick<Author, 'uuid' | 'name' | 'slug'>[]>(`/api/authors/search${query({ q })}`);
	}
	Get(slug: string, page = 1, options?: ApiOptions) {
		return this.client.get<AuthorProfile>(`/api/authors/${encodeURIComponent(slug)}${query({ page })}`, options);
	}
	Create(data: AuthorWrite) {
		return this.client.post<{ uuid: string; slug: string }>('/api/authors', data, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Update(slug: string, data: Partial<AuthorWrite>) {
		return this.client.put<Success>(`/api/authors/${encodeURIComponent(slug)}`, data, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Delete(slug: string) {
		return this.client.delete<Success>(`/api/authors/${encodeURIComponent(slug)}`, undefined, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	LinkResource(slug: string, uuid: string) {
		return this.client.post<Success>(`/api/authors/${encodeURIComponent(slug)}/link-resource`, { resource_uuid: uuid }, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
}
