// =========================================================================================================
// Notification preferences
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import type { NotificationPrefsDTO } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class NotificationsApi {
	constructor(private readonly client: ApiClient) {}
	Preferences() {
		return this.client.get<NotificationPrefsDTO>('/api/notifications/preferences');
	}
	UpdatePreferences(data: NotificationPrefsDTO) {
		return this.client.put<NotificationPrefsDTO>('/api/notifications/preferences', data);
	}
}
