// =========================================================================================================
// Resource comments
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { Comment } from '../types';
import { ApiClient } from './client';
import type { ApiOptions, CommentWrite, CreatedResourceComment, Success } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class CommentsApi {
	constructor(private readonly client: ApiClient) {}

	Invalidate(): void {
		this.client.invalidate('/api/comments');
	}

	List(uuid: string, options?: ApiOptions) {
		return this.client.get<Comment[]>(`/api/comments/${encodeURIComponent(uuid)}`, options);
	}
	Create(uuid: string, data: CommentWrite) {
		return this.client.post<CreatedResourceComment>(`/api/comments/${encodeURIComponent(uuid)}`, data, { invalidate: ['/api/comments'] });
	}
	Delete(uuid: string) {
		return this.client.delete<Success>(`/api/comments/${encodeURIComponent(uuid)}`, undefined, { invalidate: ['/api/comments'] });
	}
}
