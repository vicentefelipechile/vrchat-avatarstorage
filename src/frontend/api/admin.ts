// =========================================================================================================
// Administration — always fresh reads, with UI prompts kept in features/admin.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { RESOURCE_CACHE_PREFIXES } from './resources';
import { query, type ApiOptions, type Filters, type Pagination, type Success } from './types';
import type { AdminStats, OrphanStats, PendingResource, UserRow, ResourceRow, AdminCommentRow, Timeseries } from './admin-types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class AdminApi {
	constructor(private readonly client: ApiClient) {}
	Pending(options?: ApiOptions) {
		return this.client.get<PendingResource[]>('/api/admin/pending', options);
	}
	Approve(uuid: string) {
		return this.client.post<Success>(`/api/admin/resource/${encodeURIComponent(uuid)}/approve`, undefined, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Reject(uuid: string, code: string) {
		return this.client.post<Success>(`/api/admin/resource/${encodeURIComponent(uuid)}/reject`, { code }, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Deactivate(uuid: string) {
		return this.client.post<Success>(`/api/admin/resource/${encodeURIComponent(uuid)}/deactivate`, undefined, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Stats(options?: ApiOptions) {
		return this.client.get<AdminStats>('/api/admin/stats', options);
	}
	Timeseries(days = 30, options?: ApiOptions) {
		return this.client.get<Timeseries>(`/api/admin/stats/timeseries${query({ days })}`, options);
	}
	OrphanStats(options?: ApiOptions) {
		return this.client.get<OrphanStats>('/api/admin/stats/orphaned-media', options);
	}
	CleanupMedia(code: string) {
		return this.client.post<Success & { deleted: number }>('/api/admin/cleanup/orphaned-media', { code });
	}
	GenerateVariants() {
		return this.client.post<{ enqueued: number }>('/api/admin/media/generate-variants');
	}
	ClearUserCache(username: string) {
		return this.client.post<Success>(`/api/admin/cache/clear/${encodeURIComponent(username)}`);
	}
	Users(filters?: Filters, options?: ApiOptions) {
		return this.client.get<{ users: UserRow[]; pagination: Pagination }>(`/api/admin/users${query(filters)}`, options);
	}
	Resources(filters?: Filters, options?: ApiOptions) {
		return this.client.get<{ resources: ResourceRow[]; pagination: Pagination }>(`/api/admin/resources${query(filters)}`, options);
	}
	Comments(filters?: Filters, options?: ApiOptions) {
		return this.client.get<{ comments: AdminCommentRow[]; pagination: Pagination }>(`/api/admin/comments${query(filters)}`, options);
	}
	ChangeRole(username: string, data: { is_admin: boolean; code: string }) {
		return this.client.post<Success>(`/api/admin/users/${encodeURIComponent(username)}/role`, data, { invalidate: ['/api/'] });
	}
	BanUser(username: string, data: { banned: boolean; code: string }) {
		return this.client.post<Success>(`/api/admin/users/${encodeURIComponent(username)}/ban`, data, { invalidate: ['/api/'] });
	}
	DeleteUser(username: string, code: string) {
		return this.client.delete<Success & { resources_removed: number }>(`/api/admin/users/${encodeURIComponent(username)}`, { code }, { invalidate: ['/api/'] });
	}
}
