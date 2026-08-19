// =========================================================================================================
// NOTIFICATION REPOSITORY
// =========================================================================================================
// The ONLY place `user_notification_prefs` SQL lives. Returns raw DB rows; the service maps them
// to the API shape and validates subtype filters.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, execute, type DB } from '../db/client';
import type { NotificationPrefs } from '../types';

// =========================================================================================================
// Repository
// =========================================================================================================

export class NotificationRepository {
	constructor(private readonly db: DB) {}

	/** Preferences for a user, or null if the user never saved any (defaults apply). */
	findByUserUuid(userUuid: string): Promise<NotificationPrefs | null> {
		return queryOne<NotificationPrefs>(this.db, 'SELECT * FROM user_notification_prefs WHERE user_uuid = ?', [userUuid]);
	}

	/** Upsert preferences for a user. JSON arrays are stored as TEXT or NULL. */
	async upsert(userUuid: string, prefs: { enabled: number; avatars_enabled: number; avatar_types: string | null; assets_enabled: number; asset_types: string | null; clothes_enabled: number }): Promise<void> {
		await execute(
			this.db,
			`INSERT INTO user_notification_prefs (user_uuid, enabled, avatars_enabled, avatar_types, assets_enabled, asset_types, clothes_enabled, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
			 ON CONFLICT(user_uuid) DO UPDATE SET
				enabled = excluded.enabled,
				avatars_enabled = excluded.avatars_enabled,
				avatar_types = excluded.avatar_types,
				assets_enabled = excluded.assets_enabled,
				asset_types = excluded.asset_types,
				clothes_enabled = excluded.clothes_enabled,
				updated_at = unixepoch()`,
			[userUuid, prefs.enabled, prefs.avatars_enabled, prefs.avatar_types, prefs.assets_enabled, prefs.asset_types, prefs.clothes_enabled],
		);
	}
}
