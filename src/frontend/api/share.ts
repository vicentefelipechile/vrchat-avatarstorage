// =========================================================================================================
// Authenticated share-link management
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import type { ShareLinkDTO, ShareWrite, Success } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class ShareApi {
	constructor(private readonly client: ApiClient) {}
	Create(data: ShareWrite) {
		return this.client.post<{ url: string; uuid: string; expires_at: number }>('/api/share', data);
	}
	Mine() {
		return this.client.get<{ links: ShareLinkDTO[] }>('/api/share/mine');
	}
	Revoke(uuid: string) {
		return this.client.delete<Success>(`/api/share/${encodeURIComponent(uuid)}`);
	}
}
