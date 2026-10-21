// =========================================================================================================
// Category endpoints — callers choose a domain, never an endpoint string.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AvatarMeta, AssetMeta, ClothesMeta } from '../types';
import { ApiClient } from './client';
import { RESOURCE_CACHE_PREFIXES } from './resources';
import { query, type ApiOptions, type Filters, type ResourceWrite, type Success } from './types';

// =========================================================================================================
// Types
// =========================================================================================================

export interface CategoryResource<Meta> {
	uuid: string;
	title: string;
	thumbnail_media_uuid: string | null;
	placeholder_blur: string | null;
	processed: boolean;
	download_count: number;
	created_at: number;
	meta: Meta;
}
export interface CategoryList<Meta> {
	resources: CategoryResource<Meta>[];
	pagination: { page: number; total: number; limit: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export interface AvatarListMeta {
	avatar_gender: string;
	avatar_size: string;
	avatar_type: string;
	is_nsfw: number;
	has_physbones: number;
	has_dps: number;
	has_face_tracking: number;
	has_gogoloco: number;
	has_toggles: number;
	is_quest_optimized: number;
	sdk_version: string;
	platform: string;
	author_name_raw: string | null;
	author_name: string | null;
	author_slug: string | null;
}

export interface AssetListMeta {
	asset_type: string;
	is_nsfw: number;
	unity_version: string;
	platform: string;
	sdk_version: string;
}

export interface ClothesListMeta {
	gender_fit: string;
	clothing_type: string[];
	is_base: number;
	is_nsfw: number;
	has_physbones: number;
	platform: string;
	base_avatar_uuid: string | null;
	base_avatar_name_raw: string | null;
}

// =========================================================================================================
// Domains
// =========================================================================================================

class CategoryApi<Meta, Detail> {
	constructor(
		private readonly client: ApiClient,
		private readonly path: string,
	) {}

	Invalidate(): void {
		this.client.invalidate(this.path, '/api/resources', '/api/authors');
	}

	List(filters?: Filters, options?: ApiOptions) {
		return this.client.get<CategoryList<Meta>>(`${this.path}${query(filters)}`, options);
	}
	Get(uuid: string) {
		return this.client.get<Detail>(`${this.path}/${encodeURIComponent(uuid)}`);
	}
	Create(data: ResourceWrite) {
		return this.client.post<{ uuid: string }>(this.path, data, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
	Preflight(data: ResourceWrite) {
		return this.client.post<{ valid: boolean }>(`${this.path}?validate_only=true`, data);
	}
	Update(uuid: string, data: Partial<Detail>) {
		return this.client.put<Success>(`${this.path}/${encodeURIComponent(uuid)}`, data, { invalidate: RESOURCE_CACHE_PREFIXES });
	}
}

class AvatarsApi extends CategoryApi<AvatarListMeta, AvatarMeta & { gender?: string }> {
	constructor(private readonly transport: ApiClient) {
		super(transport, '/api/avatars');
	}
	Search(q: string, limit = 10) {
		return this.transport.get<{ uuid: string; title: string }[]>(`/api/avatars/search${query({ q, limit })}`);
	}
}

export class CategoriesApi {
	readonly Avatars: AvatarsApi;
	readonly Assets: CategoryApi<AssetListMeta, AssetMeta>;
	readonly Clothes: CategoryApi<ClothesListMeta, ClothesMeta>;
	constructor(client: ApiClient) {
		this.Avatars = new AvatarsApi(client);
		this.Assets = new CategoryApi<AssetListMeta, AssetMeta>(client, '/api/assets');
		this.Clothes = new CategoryApi<ClothesListMeta, ClothesMeta>(client, '/api/clothes');
	}
}
