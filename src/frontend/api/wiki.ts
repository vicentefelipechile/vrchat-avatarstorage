// =========================================================================================================
// Wiki comments only — Markdown articles remain static content.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import type { WikiCommentDto, CommentWrite, Success } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class WikiApi {
	constructor(private readonly client: ApiClient) {}
	ListComments() {
		return this.client.get<WikiCommentDto[]>('/api/wiki/comments');
	}
	CreateComment(data: CommentWrite) {
		return this.client.post<WikiCommentDto>('/api/wiki/comments', data);
	}
	DeleteComment(uuid: string) {
		return this.client.delete<Success>(`/api/wiki/comments/${encodeURIComponent(uuid)}`);
	}
}
