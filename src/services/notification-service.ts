// =========================================================================================================
// NOTIFICATION SERVICE
// =========================================================================================================
// Business rules for browser notification preferences. Validates subtype filters against the
// canonical AVATAR_TYPE / ASSETS_TYPE enums so a crafted payload cannot store arbitrary values.
// The repository owns SQL; this layer owns defaults, validation, and JSON serialisation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { NotificationRepository } from '../repositories/notification-repository';
import { ValidationError } from '../domain/errors';
import { AVATAR_TYPE, ASSETS_TYPE } from '../validators';

// =========================================================================================================
// Types
// =========================================================================================================

export interface NotificationPrefsDTO {
	enabled: boolean;
	avatars_enabled: boolean;
	avatar_types: string[] | null;
	assets_enabled: boolean;
	asset_types: string[] | null;
	clothes_enabled: boolean;
	updated_at: number | null;
}

// =========================================================================================================
// Constants
// =========================================================================================================

const AVATAR_TYPE_SET = new Set<string>(AVATAR_TYPE as readonly string[]);
const ASSET_TYPE_SET = new Set<string>(ASSETS_TYPE as readonly string[]);

// =========================================================================================================
// Service
// =========================================================================================================

export class NotificationService {
	private readonly repo: NotificationRepository;

	constructor(db: DB) {
		this.repo = new NotificationRepository(db);
	}

	/** Preferences for a user, with defaults when no row exists yet. */
	async getPrefs(userUuid: string): Promise<NotificationPrefsDTO> {
		const row = await this.repo.findByUserUuid(userUuid);
		if (!row) {
			return {
				enabled: false,
				avatars_enabled: true,
				avatar_types: null,
				assets_enabled: true,
				asset_types: null,
				clothes_enabled: true,
				updated_at: null,
			};
		}
		return {
			enabled: !!row.enabled,
			avatars_enabled: !!row.avatars_enabled,
			avatar_types: row.avatar_types ? (JSON.parse(row.avatar_types) as string[]) : null,
			assets_enabled: !!row.assets_enabled,
			asset_types: row.asset_types ? (JSON.parse(row.asset_types) as string[]) : null,
			clothes_enabled: !!row.clothes_enabled,
			updated_at: row.updated_at,
		};
	}

	/** Validate and persist preferences. */
	async setPrefs(userUuid: string, input: NotificationPrefsDTO): Promise<NotificationPrefsDTO> {
		const avatarTypes = this.validateList(input.avatar_types, AVATAR_TYPE_SET, 'avatar_types');
		const assetTypes = this.validateList(input.asset_types, ASSET_TYPE_SET, 'asset_types');

		await this.repo.upsert(userUuid, {
			enabled: input.enabled ? 1 : 0,
			avatars_enabled: input.avatars_enabled ? 1 : 0,
			avatar_types: avatarTypes ? JSON.stringify(avatarTypes) : null,
			assets_enabled: input.assets_enabled ? 1 : 0,
			asset_types: assetTypes ? JSON.stringify(assetTypes) : null,
			clothes_enabled: input.clothes_enabled ? 1 : 0,
		});

		return this.getPrefs(userUuid);
	}

	private validateList(list: string[] | null | undefined, allowed: Set<string>, field: string): string[] | null {
		if (list === null || list === undefined) return null;
		if (!Array.isArray(list)) throw new ValidationError(`${field} must be an array or null`);
		if (list.length === 0) return null;
		if (list.length > 20) throw new ValidationError(`${field} too many values`);
		const seen = new Set<string>();
		for (const v of list) {
			if (typeof v !== 'string' || !allowed.has(v)) throw new ValidationError(`Invalid value in ${field}: ${v}`);
			seen.add(v);
		}
		return [...seen];
	}
}
