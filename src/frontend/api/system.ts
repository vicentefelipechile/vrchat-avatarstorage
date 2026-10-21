// =========================================================================================================
// Public configuration, version and API documentation
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import type { VersionInfo } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class SystemApi {
	constructor(private readonly client: ApiClient) {}
	Config() {
		return this.client.get<{ turnstileSiteKey?: string }>('/api/config');
	}
	Version() {
		return this.client.get<VersionInfo>('/api/version');
	}
	Docs() {
		return this.client.get<Record<string, unknown>>('/api/docs');
	}
}
