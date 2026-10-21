// =========================================================================================================
// Blog posts and nested comments
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { query, type ApiComment, type BlogList, type BlogPostDto, type BlogWrite, type CommentWrite, type Success } from './types';

// =========================================================================================================
// Domains
// =========================================================================================================

class BlogCommentsApi {
	constructor(private readonly client: ApiClient) {}
	List(uuid: string) {
		return this.client.get<ApiComment[]>(`/api/blog/${encodeURIComponent(uuid)}/comments`);
	}
	Create(uuid: string, data: CommentWrite) {
		return this.client.post<ApiComment>(`/api/blog/${encodeURIComponent(uuid)}/comments`, data);
	}
	Delete(uuid: string) {
		return this.client.delete<Success>(`/api/blog/comments/${encodeURIComponent(uuid)}`);
	}
}

export class BlogApi {
	readonly Comments: BlogCommentsApi;
	constructor(private readonly client: ApiClient) {
		this.Comments = new BlogCommentsApi(client);
	}

	Invalidate(): void {
		this.client.invalidate('/api/blog');
	}

	List(page = 1, limit = 10) {
		return this.client.get<BlogList>(`/api/blog${query({ page, limit })}`);
	}
	Get(uuid: string) {
		return this.client.get<BlogPostDto>(`/api/blog/${encodeURIComponent(uuid)}`);
	}
	Create(data: BlogWrite) {
		return this.client.post<{ uuid: string; slug: string }>('/api/blog', data, { invalidate: ['/api/blog'] });
	}
	Update(uuid: string, data: Partial<BlogWrite>) {
		return this.client.put<Success & { uuid: string; slug: string }>(`/api/blog/${encodeURIComponent(uuid)}`, data, { invalidate: ['/api/blog'] });
	}
	Delete(uuid: string) {
		return this.client.delete<Success>(`/api/blog/${encodeURIComponent(uuid)}`, undefined, { invalidate: ['/api/blog'] });
	}
}
