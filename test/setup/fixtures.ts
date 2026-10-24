// =========================================================================================================
// BACKEND TEST FIXTURES
// =========================================================================================================
// Minimal rows for integration tests; no shared development or production data.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import { sign } from 'hono/jwt';

// =========================================================================================================
// Fixtures
// =========================================================================================================

export async function createUser(username = 'tester'): Promise<{ uuid: string; cookie: string }> {
	const uuid = crypto.randomUUID();
	await env.DB.prepare('INSERT INTO users (uuid, username, password_hash) VALUES (?, ?, ?)').bind(uuid, username, 'not-a-real-hash').run();
	const token = await sign({ sub: username, jti: crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET, 'HS256');
	return { uuid, cookie: `auth_token=${token}` };
}

export async function createMedia(mediaType: 'file' | 'image' | 'video' = 'file', fileName = 'archive.zip'): Promise<string> {
	const key = crypto.randomUUID();
	await env.DB.prepare('INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)').bind(key, key, mediaType, fileName).run();
	return key;
}

export async function createAvatar(owner: string, title: string, gender: string, active = true): Promise<string> {
	const uuid = crypto.randomUUID();
	const thumbnail = await createMedia('image', 'thumbnail.png');
	await env.DB.prepare('INSERT INTO resources (uuid, title, category, thumbnail_uuid, author_uuid, is_active) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(uuid, title, 'avatars', thumbnail, owner, active ? 1 : 0).run();
	await env.DB.prepare('INSERT INTO avatar_meta (resource_uuid, gender) VALUES (?, ?)').bind(uuid, gender).run();
	return uuid;
}

export async function createClothes(owner: string, title: string, types: string[], active = true): Promise<string> {
	const uuid = crypto.randomUUID();
	const thumbnail = await createMedia('image', 'thumbnail.png');
	await env.DB.prepare('INSERT INTO resources (uuid, title, category, thumbnail_uuid, author_uuid, is_active) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(uuid, title, 'clothes', thumbnail, owner, active ? 1 : 0).run();
	await env.DB.prepare('INSERT INTO clothes_meta (resource_uuid) VALUES (?)').bind(uuid).run();
	for (const type of types) await env.DB.prepare('INSERT INTO clothes_clothing_types (resource_uuid, clothing_type) VALUES (?, ?)').bind(uuid, type).run();
	return uuid;
}

export async function createAsset(owner: string, title: string, type: string): Promise<string> {
	const uuid = crypto.randomUUID();
	const thumbnail = await createMedia('image', 'thumbnail.png');
	await env.DB.prepare('INSERT INTO resources (uuid, title, category, thumbnail_uuid, author_uuid, is_active) VALUES (?, ?, ?, ?, ?, 1)')
		.bind(uuid, title, 'assets', thumbnail, owner).run();
	await env.DB.prepare('INSERT INTO asset_meta (resource_uuid, asset_type) VALUES (?, ?)').bind(uuid, type).run();
	return uuid;
}
