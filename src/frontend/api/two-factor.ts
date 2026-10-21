// =========================================================================================================
// Two-factor authentication
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';

// =========================================================================================================
// Types
// =========================================================================================================

interface TwoFactorStatus {
	enabled: boolean;
}

interface SetupRequest {
	password?: string;
	token?: string;
}

interface SetupResponse {
	secret: string;
	otpauthUrl: string;
}

interface VerifyRequest {
	code: string;
}

interface VerifyResponse {
	message: string;
	backupCodes: string[];
}

interface DisableRequest {
	password?: string;
	code?: string;
	token?: string;
}

interface DisableResponse {
	message: string;
	adminRevoked: boolean;
}

// =========================================================================================================
// Domain
// =========================================================================================================

export class TwoFactorApi {
	constructor(private readonly client: ApiClient) {}

	Status(): Promise<TwoFactorStatus> {
		return this.client.get<TwoFactorStatus>('/api/2fa/status');
	}

	Setup(data: SetupRequest): Promise<SetupResponse> {
		return this.client.post<SetupResponse>('/api/2fa/setup', data);
	}

	Verify(data: VerifyRequest): Promise<VerifyResponse> {
		return this.client.post<VerifyResponse>('/api/2fa/verify', data, { invalidate: ['/api/'] });
	}

	Disable(data: DisableRequest): Promise<DisableResponse> {
		return this.client.post<DisableResponse>('/api/2fa/disable', data, { invalidate: ['/api/'] });
	}
}
