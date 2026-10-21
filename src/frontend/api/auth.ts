// =========================================================================================================
// AUTHENTICATION API
// =========================================================================================================
// Session operations. OAuth authorization remains browser navigation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import type { ApiOptions, AuthStatus, LoginRequest, LoginResponse, OAuthRegistrationRequest, PasswordChange, ProfileUpdate, ProfileUpdateResponse, Success, TwoFactorLoginRequest } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class AuthApi {
	constructor(private readonly client: ApiClient) {}

	Invalidate(): void {
		this.client.invalidate('/api/');
	}

	Register(data: LoginRequest): Promise<Success> {
		return this.client.post<Success>('/api/auth/register', data, { invalidate: ['/api/'] });
	}

	Login(data: LoginRequest): Promise<LoginResponse> {
		return this.client.post<LoginResponse>('/api/auth/login', data, { invalidate: ['/api/'] });
	}

	LoginTwoFactor(data: TwoFactorLoginRequest): Promise<Success> {
		return this.client.post<Success>('/api/auth/login/2fa', data, { invalidate: ['/api/'] });
	}

	Status(options?: ApiOptions): Promise<AuthStatus> {
		return this.client.get<AuthStatus>('/api/auth/status', options);
	}

	Me(options?: ApiOptions): Promise<AuthStatus> {
		return this.Status(options);
	}

	UpdateMe(data: ProfileUpdate): Promise<ProfileUpdateResponse> {
		return this.client.put<ProfileUpdateResponse>('/api/auth/me', data, { invalidate: ['/api/'] });
	}

	ChangePassword(data: PasswordChange): Promise<Success> {
		return this.client.post<Success>('/api/auth/me/password', data, { invalidate: ['/api/'] });
	}

	Logout(): Promise<Success> {
		return this.client.post<Success>('/api/auth/logout', undefined, { invalidate: ['/api/'] });
	}

	CompleteOAuth(data: OAuthRegistrationRequest): Promise<Success> {
		return this.client.post<Success>('/api/auth/complete', data, { invalidate: ['/api/'] });
	}
}
