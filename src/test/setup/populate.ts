#!/usr/bin/env tsx
// ============================================================================
// SEED — VRCStorage local/remote database + R2 seeder
// ============================================================================
// Refactored seed (2026): project outgrew the original ad-hoc seeder.
// Now uses .wrangler/img-seed/*.png|jpg|jpeg|webp|mp4 for variety, always
// creates a test user "user"/"user" and a SINGLE admin "admin"/"admin",
// and seeds diverse resources across avatars/assets/clothes.
//
// Usage:
//   npm run seed                 -> local D1 + local R2 (.wrangler/state)
//   npm run seed -- --remote     -> remote D1/R2 (prod, use with care)
//   npm run seed -- --help       -> help
//   npm run seed -- --no-r2      -> DB only, skip R2 uploads (faster, no queue)
//   npm run seed -- --keep       -> keep existing data, only ensure users
//
// Images: .wrangler/img-seed/*.{png,jpg,jpeg,webp,avif,gif,zip} — videos (mp4/webm) omitidos
//         falls back to public/test/* if empty.
// Requires: wrangler 4.x, bcryptjs, Node 18+
// ============================================================================

import { hash } from 'bcryptjs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, extname, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const DB_NAME = 'vrcstorage';
const BUCKET_NAME = 'vrcstorage';
const MEDIA_BUCKET_NAME = 'vrcstorage-media';
const SEED_DIR = resolve('.wrangler/img-seed');
const FALLBACK_DIR = resolve('public/test');
const ALLOWED_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.zip', '.rar', '.7z']);

const DEFAULT_COUNT = 400;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const noR2 = args.includes('--no-r2');
const keepExisting = args.includes('--keep');
const help = args.includes('--help') || args.includes('-h');
const countArg = args.find((a) => a.startsWith('--count='));
const countOverride = countArg ? parseInt(countArg.split('=')[1] as string, 10) : NaN;

if (help) {
	console.log(`
Seed — VRCStorage

Usage:
  npm run seed                 Local DB + R2 (default 120 resources, 40% clothes / 30% avatars / 30% assets)
  npm run seed -- --count=120  Custom total (e.g. 30, 90, 150, 300) — distribution stays weighted
  npm run seed -- --remote     Remote (prod) DB + R2
  npm run seed -- --no-r2      DB only, skip R2 uploads
  npm run seed -- --keep       Keep existing data, only ensure users

Images: .wrangler/img-seed/*.{png,jpg,jpeg,webp,avif,gif,zip} (videos omitidos)
        fallback: public/test/*
Users:  user/user (is_admin=0), admin/admin (is_admin=1) — always
`);
	process.exit(0);
}

const mode = isRemote ? 'REMOTE' : 'LOCAL';
console.log(`\n[seed] Mode: ${mode} | R2: ${noR2 ? 'skip' : 'upload'} | Keep: ${keepExisting ? 'yes' : 'clear'}\n`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sqlQuote(v: string): string {
	return `'${String(v).replace(/'/g, "''")}'`;
}

const WRANGLER_BIN = join(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wranglerExec(cmd: string[], input?: string): { ok: boolean; out: string; err: string } {
	const res = spawnSync(process.execPath, [WRANGLER_BIN, ...cmd], {
		shell: false,
		encoding: 'utf8',
		input,
		maxBuffer: 20 * 1024 * 1024,
	});
	const out = (res.stdout ?? '').toString();
	const err = (res.stderr ?? '').toString();
	return { ok: res.status === 0, out, err };
}

function d1Exec(sql: string): void {
	const flag = isRemote ? '--remote' : '--local';
	// Use temp file to avoid shell-quoting issues with "DELETE FROM ..."
	const tmp = join(tmpdir(), `vrc-d1-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
	writeFileSync(tmp, sql, 'utf8');
	try {
		const result = spawnSync(process.execPath, [WRANGLER_BIN, 'd1', 'execute', DB_NAME, flag, '--yes', '--file', tmp], {
			shell: false,
			encoding: 'utf8',
		});
		if (result.status !== 0) {
			const out = (result.stdout ?? '').toString() + (result.stderr ?? '').toString();
			// Ignore "no such table" for fresh DBs where some tables haven't been created yet
			if (out.includes('no such table')) return;
			console.error(`[seed] D1 execute failed:\n`, out.slice(0, 2000));
			throw new Error('D1 execute failed');
		}
	} finally {
		try { unlinkSync(tmp); } catch {}
	}
}

function d1ExecFile(filePath: string): void {
	const flag = isRemote ? '--remote' : '--local';
	const result = spawnSync(process.execPath, [WRANGLER_BIN, 'd1', 'execute', DB_NAME, flag, '--yes', '--file', filePath], {
		shell: false,
		stdio: 'inherit',
	});
	if (result.status !== 0) throw new Error('D1 execute file failed');
}

function r2Put(key: string, filePath: string): void {
	if (noR2) return;
	const flag = isRemote ? '--remote' : '--local';
	const result = spawnSync(process.execPath, [WRANGLER_BIN, 'r2', 'object', 'put', `${BUCKET_NAME}/${key}`, `--file=${filePath}`, flag], {
		shell: false,
		encoding: 'utf8',
	});
	if (result.status !== 0) {
		console.warn(`[seed] R2 put failed for ${key}:`, (result.stderr ?? '').toString().slice(0, 500));
		// Don't throw — DB seed can still be useful without R2 (shows processing placeholder)
	}
}

function r2PutBuffer(key: string, buffer: Buffer, contentType = 'application/octet-stream'): void {
	if (noR2) return;
	const tmp = join(tmpdir(), `vrc-seed-${key}.tmp`);
	writeFileSync(tmp, buffer);
	try {
		r2Put(key, tmp);
	} finally {
		try { unlinkSync(tmp); } catch {}
	}
}

function r2PutMedia(key: string, filePath: string): void {
	if (noR2) return;
	if (!isRemote) {
		// Local fast path is batched in main(); this sync helper is legacy — fire-and-forget via batch
		r2PutLocalBatch([{ key, filePath, isMedia: true }]).catch(() => {});
		return;
	}
	const flag = '--remote';
	const result = spawnSync(process.execPath, [WRANGLER_BIN, 'r2', 'object', 'put', `${MEDIA_BUCKET_NAME}/${key}`, `--file=${filePath}`, flag], {
		shell: false,
		encoding: 'utf8',
	});
	if (result.status !== 0) {
		console.warn(`[seed] R2 media put failed for ${key}:`, (result.stderr ?? '').toString().slice(0, 500));
	}
}

async function r2PutLocalBatch(entries: Array<{ key: string; filePath: string; isMedia: boolean }>): Promise<{ ok: number; fail: number }> {
	if (noR2 || entries.length === 0) return { ok: 0, fail: 0 };
	try {
		const { readFileSync } = await import('node:fs');
		// Use wrangler's getPlatformProxy — the only portable way to get the real R2 bindings for any account/bucket name.
		// It reads wrangler.jsonc, creates the correct Durable Object IDs and persists to .wrangler/state/v3, no hard-coded hashes.
		const { getPlatformProxy } = await import('wrangler');
		const { env, dispose } = await getPlatformProxy({ configPath: 'wrangler.jsonc', persistTo: '.wrangler/state/v3' } as unknown as never) as unknown as { env: Record<string, unknown>; dispose: () => Promise<void> };
		// Binding names are BUCKET / MEDIA_BUCKET (not the bucket_name values vrcstorage / vrcstorage-media)
		const bucketMain = (env as Record<string, unknown>)['BUCKET'] as unknown as { put: (key: string, value: Uint8Array | Buffer) => Promise<unknown> } | undefined;
		const bucketMedia = (env as Record<string, unknown>)['MEDIA_BUCKET'] as unknown as { put: (key: string, value: Uint8Array | Buffer) => Promise<unknown> } | undefined;
		if (!bucketMain || !bucketMedia) throw new Error('R2 bindings not found via getPlatformProxy');
		let ok = 0, fail = 0;
		for (const { key, filePath, isMedia } of entries) {
			try {
				const buf = readFileSync(filePath);
				const bucket = isMedia ? bucketMedia : bucketMain;
				await bucket.put(key, buf);
				ok++;
			} catch {
				fail++;
			}
		}
		await dispose();
		return { ok, fail };
	} catch (e) {
		console.warn(`[seed] r2PutLocalBatch via getPlatformProxy failed, falling back to wrangler:`, String(e).slice(0, 500));
		return { ok: 0, fail: entries.length };
	}
}

function r2PutAsync(key: string, filePath: string, isMedia = false): Promise<boolean> {
	if (noR2) return Promise.resolve(true);
	if (!isRemote) {
		return r2PutLocalBatch([{ key, filePath, isMedia }]).then((res) => res.ok === 1).catch(() => false);
	}
	const flag = '--remote';
	const bucket = isMedia ? MEDIA_BUCKET_NAME : BUCKET_NAME;
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [WRANGLER_BIN, 'r2', 'object', 'put', `${bucket}/${key}`, `--file=${filePath}`, flag], {
			shell: false,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let err = '';
		child.stderr?.on('data', (d) => (err += d.toString()));
		child.on('close', (code) => {
			if (code !== 0) console.warn(`[seed] R2 put failed for ${key}:`, err.slice(0, 500));
			resolve(code === 0);
		});
		child.on('error', () => resolve(false));
	});
}

function getSeedFiles(): string[] {
	const dirs = [SEED_DIR, FALLBACK_DIR].filter((d) => existsSync(d));
	if (dirs.length === 0) {
		console.warn(`[seed] No seed dirs found. Tried: ${SEED_DIR}, ${FALLBACK_DIR}`);
		return [];
	}
	const files: string[] = [];
	for (const dir of dirs) {
		const entries = readdirSync(dir);
		for (const e of entries) {
			const full = join(dir, e);
			try {
				if (statSync(full).isDirectory()) continue;
				const ext = extname(e).toLowerCase();
				if (!ALLOWED_EXTS.has(ext)) continue;
				files.push(full);
			} catch {}
		}
		if (files.length > 0) break; // prefer .wrangler/img-seed if non-empty
	}
	// Shuffle for variety
	for (let i = files.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[files[i], files[j]] = [files[j] as string, files[i] as string];
	}
	return files;
}

function mediaTypeFor(ext: string): 'image' | 'video' | 'file' {
	const e = ext.toLowerCase();
	if (['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'].includes(e)) return 'image';
	if (['.mp4', '.webm'].includes(e)) return 'video';
	return 'file';
}

function randomCategory(): string {
	const cats = ['avatars', 'assets', 'clothes'] as const;
	return cats[Math.floor(Math.random() * cats.length)] as string;
}

function randomTitle(cat: string, idx: number): string {
	const prefixes: Record<string, string[]> = {
		avatars: ['Mystic Avatar', 'Cyber Neko', 'Frost Guardian', 'Neon Phantom', 'Sakura Doll'],
		assets: ['Particle FX', 'Shader Pack', 'Props Set', 'VFX Bundle', 'Tool Kit'],
		clothes: ['Street Hoodie', 'Gothic Dress', 'Techwear Set', 'Casual Outfit', 'Armor Pack'],
	};
	const list = prefixes[cat] ?? prefixes['avatars'] as string[];
	const pre = list[Math.floor(Math.random() * list.length)];
	return `${pre} #${idx} — Seeded`;
}

function randomDescription(): string {
	const descs = [
		'Seeded resource for local development. Contains sample media from .wrangler/img-seed.',
		'Auto-generated seed. Use this to test gallery, downloads and comments.',
		'Demo content — variety pack. Thumbnail and gallery from img-seed.',
		'Seeded file — curated for testing filters, favorites and collections.',
	];
	return descs[Math.floor(Math.random() * descs.length)] as string;
}

function pick<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)] as T;
}
function coin(p = 0.5): number {
	return Math.random() < p ? 1 : 0;
}
function coinBool(p = 0.5): boolean {
	return Math.random() < p;
}

// Real enum pools mirrored from src/validators.ts — keeps seed in sync with allowed values
// 'undefined' = internal fallback (missing data), 'androgynous' = legacy retrocompat, neither used as standard — excluded from seed
const AVATAR_GENDERS = ['male', 'female', 'both'] as const;
const AVATAR_SIZES = ['tiny', 'small', 'medium', 'tall', 'giant'] as const;
const AVATAR_TYPES = ['human', 'anime', 'furry', 'chibi', 'cartoon', 'semi-realistic', 'monster', 'fantasy', 'mecha', 'kemono', 'other'] as const;
const ASSET_TYPES = ['prop', 'shader', 'particle', 'vfx', 'prefab', 'script', 'animation', 'avatar-base', 'texture-pack', 'sound', 'tool', 'hud', 'other'] as const;
const CLOTHES_GENDERS = ['male', 'female', 'unisex', 'kemono'] as const;
const CLOTHES_TYPES = ['top', 'jacket', 'bottom', 'dress', 'fullbody', 'swimwear', 'shoes', 'legwear', 'hat', 'hair', 'accessory', 'tail', 'ears', 'wings', 'body-part', 'underwear', 'other'] as const;
const PLATFORMS = ['pc', 'quest', 'cross'] as const;
const SDK_VERSIONS = ['sdk3', 'sdk2'] as const;
const UNITY_VERSIONS = ['2019', '2022'] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const seedFiles = getSeedFiles();
	console.log(`[seed] Found ${seedFiles.length} seed files`);
	if (seedFiles.length > 0) {
		console.log(`[seed] Sample: ${seedFiles.slice(0, 3).map((p) => basename(p)).join(', ')}`);
	}

	// Ensure migrations are applied (so 0021 drive tables exist)
	console.log('\n[seed] Ensuring DB migrations...');
	const migFlag = isRemote ? '--remote' : '--local';
	const migRes = spawnSync(process.execPath, [WRANGLER_BIN, 'd1', 'migrations', 'apply', DB_NAME, migFlag], { shell: false, encoding: 'utf8' });
	if (migRes.status !== 0) {
		console.warn('[seed] Migration apply warning (may already be up to date):', (migRes.stderr ?? '').toString().slice(0, 800));
	} else {
		console.log('[seed] Migrations ok');
	}

	// 1) Ensure users: user/user and admin/admin (upsert)
	console.log('\n[seed] Preparing users...');

	const userHash = await hash('user', 12);
	const adminHash = await hash('admin', 12);
	const now = Math.floor(Date.now() / 1000);
	const userUuid = '00000000-0000-4000-a000-000000000001';
	const adminUuid = '00000000-0000-4000-a000-000000000002';

	// We use a temp SQL file for atomic batch
	let sql = '';

	if (!keepExisting) {
		console.log('[seed] Clearing existing data (keep=false)...');
		// Use foreign_keys=OFF to avoid ordering issues during bulk clear
		let clearSql = 'PRAGMA foreign_keys=OFF;\n';
		const tablesInOrder = [
			'clothes_clothing_types',
			'avatar_meta',
			'asset_meta',
			'clothes_meta',
			'resource_n_media',
			'resource_links',
			'resource_history',
			'comments',
			'blog_comments',
			'blog_posts',
			'user_favorites',
			'user_collections',
			'media_variants',
			'resource_tags',
			'tags',
			'change_feed',
			'drive_transfer_jobs',
			'user_oauth_providers',
			'user_notification_prefs',
			'wiki_comments',
			'resources',
			'media',
			'users',
		];
		for (const t of tablesInOrder) clearSql += `DELETE FROM ${t};\n`;
		clearSql += 'PRAGMA foreign_keys=ON;\n';
		const tmpClear = join(tmpdir(), `vrc-clear-${Date.now()}.sql`);
		writeFileSync(tmpClear, clearSql, 'utf8');
		try {
			const flag = isRemote ? '--remote' : '--local';
			const res = spawnSync(process.execPath, [WRANGLER_BIN, 'd1', 'execute', DB_NAME, flag, '--yes', '--file', tmpClear], {
				shell: false,
				encoding: 'utf8',
			});
			if (res.status !== 0) {
				const out = ((res.stdout ?? '') + (res.stderr ?? '')).toString();
				if (!out.includes('no such table')) {
					console.error('[seed] Clear failed:', out.slice(0, 2000));
					throw new Error('Clear failed');
				}
				// ignore missing tables (fresh DB)
			}
		} finally {
			try { unlinkSync(tmpClear); } catch {}
		}
		console.log('[seed] Cleared');
	}

	// Upsert users (INSERT OR REPLACE) — single file for atomicity
	let userSql = '';
	userSql += `INSERT OR REPLACE INTO users (uuid, username, password_hash, avatar_url, created_at, is_admin, is_anonymous) VALUES (${sqlQuote(userUuid)}, 'user', ${sqlQuote(userHash)}, NULL, ${now}, 0, 0);\n`;
	userSql += `INSERT OR REPLACE INTO users (uuid, username, password_hash, avatar_url, created_at, is_admin, is_anonymous) VALUES (${sqlQuote(adminUuid)}, 'admin', ${sqlQuote(adminHash)}, NULL, ${now}, 1, 0);\n`;

	const tmpSql = join(tmpdir(), `vrc-seed-${Date.now()}.sql`);
	writeFileSync(tmpSql, userSql, 'utf8');
	try {
		d1ExecFile(tmpSql);
	} finally {
		try { unlinkSync(tmpSql); } catch {}
	}
	console.log('[seed] Users ready: user/user, admin/admin');

	if (seedFiles.length === 0) {
		console.log('[seed] No images to seed resources. Done. Users only.');
		return;
	}

	// 2) Seed resources with variety — production-like volume so pagination + filters are testable
	// Default 200 gives ~36 avatars / 36 assets / 48 clothes (clothes weighted larger, mirrors 50/100/150 example).
	// Override with --count=N (e.g. --count=30 for fast run, --count=200 for full prod scale). Files are reused via modulo.
	const requestedCount = Number.isFinite(countOverride) && countOverride > 0 ? countOverride : DEFAULT_COUNT;
	const RESOURCE_COUNT = Math.min(requestedCount, 400);
	if (seedFiles.length > 0 && RESOURCE_COUNT > seedFiles.length * 4) {
		console.log(`[seed] Requested ${RESOURCE_COUNT} resources but only ${seedFiles.length} seed files available — files will be reused cyclically.`);
	}
	// Weighted distribution: 60% avatars / 15% assets / 25% clothes (clothes intentionally largest)
	const avatarsN = Math.max(1, Math.round(RESOURCE_COUNT * 0.65));
	const assetsN = Math.max(1, Math.round(RESOURCE_COUNT * 0.15));
	const clothesN = Math.max(1, RESOURCE_COUNT - avatarsN - assetsN);
	const pool: string[] = [
		...Array(avatarsN).fill('avatars'),
		...Array(assetsN).fill('assets'),
		...Array(clothesN).fill('clothes'),
	];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j] as string, pool[i] as string];
	}
	console.log(`\n[seed] Seeding ${RESOURCE_COUNT} resources (${avatarsN} avatars / ${assetsN} assets / ${clothesN} clothes) with variety...`);

	let resourceSql = '';
	const r2Uploads: Array<{ key: string; filePath: string }> = [];
	const pendingR2Buffers: Array<{ key: string; buffer: Buffer }> = [];
	const mediaBucketUploads: Array<{ key: string; filePath: string }> = [];

	// Helper to track created media for R2 upload + variant for images
	function addMedia(uuid: string, filePath: string, type: 'image' | 'video' | 'file', fileName: string): void {
		const safeName = fileName.replace(/'/g, "''");
		resourceSql += `INSERT INTO media (uuid, r2_key, media_type, file_name, created_at) VALUES (${sqlQuote(uuid)}, ${sqlQuote(uuid)}, '${type}', ${sqlQuote(safeName)}, ${now});\n`;
		r2Uploads.push({ key: uuid, filePath });
		// For images, seed a variant so "Procesando" disappears immediately (queue would normally do this)
		if (type === 'image') {
			try {
				const size = statSync(filePath).size;
				const variantKey = `${uuid}/low.webp`;
				resourceSql += `INSERT INTO media_variants (media_uuid, res, format, r2_key, file_size, created_at) VALUES (${sqlQuote(uuid)}, 'low', 'webp', ${sqlQuote(variantKey)}, ${size}, ${now});\n`;
				// Also add original variant for CDN fallback
				const origKey = `${uuid}/original.webp`;
				resourceSql += `INSERT INTO media_variants (media_uuid, res, format, r2_key, file_size, created_at) VALUES (${sqlQuote(uuid)}, 'original', 'webp', ${sqlQuote(origKey)}, ${size}, ${now});\n`;
				mediaBucketUploads.push({ key: variantKey, filePath });
				mediaBucketUploads.push({ key: origKey, filePath });
			} catch {}
		}
	}

	for (let i = 0; i < RESOURCE_COUNT; i++) {
		const cat = pool[i] as string;
		const title = randomTitle(cat, i + 1);
		const desc = randomDescription();
		const resUuid = crypto.randomUUID();
		const authorUuid = Math.random() < 0.7 ? userUuid : adminUuid;

		// Pick thumbnail: prefer image, fallback to any
		const thumbCandidates = seedFiles.filter((p) => mediaTypeFor(extname(p)) === 'image');
		const thumbSrc = (thumbCandidates.length > 0 ? thumbCandidates[i % thumbCandidates.length] : seedFiles[i % seedFiles.length]) as string;
		const thumbExt = extname(thumbSrc).toLowerCase();
		const thumbType = mediaTypeFor(thumbExt);
		const thumbUuid = crypto.randomUUID();
		addMedia(thumbUuid, thumbSrc, thumbType === 'file' ? 'image' : thumbType, basename(thumbSrc));

		// Gallery: 1-2 extra images
		const galleryCount = 1 + Math.floor(Math.random() * 2);
		const galleryUuids: string[] = [];
		for (let g = 0; g < galleryCount; g++) {
			const src = seedFiles[(i + 1 + g) % seedFiles.length] as string;
			const ext = extname(src).toLowerCase();
			const t = mediaTypeFor(ext);
			// Only use images/videos for gallery
			if (t === 'file') continue;
			const gUuid = crypto.randomUUID();
			addMedia(gUuid, src, t, basename(src));
			galleryUuids.push(gUuid);
		}

		// File media (downloadable archive) — dummy zip content
		const fileUuid = crypto.randomUUID();
		const fileName = `${title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}_${i + 1}.zip`;
		const dummyZip = Buffer.from(`PK\x03\x04 seeded dummy for ${title} - ${resUuid}`);
		resourceSql += `INSERT INTO media (uuid, r2_key, media_type, file_name, created_at) VALUES (${sqlQuote(fileUuid)}, ${sqlQuote(fileUuid)}, 'file', ${sqlQuote(fileName)}, ${now});\n`;
		pendingR2Buffers.push({ key: fileUuid, buffer: dummyZip });

		// Resource
		const safeTitle = title.replace(/'/g, "''");
		const safeDesc = desc.replace(/'/g, "''");
		resourceSql += `INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid, download_count, is_active, created_at, updated_at) VALUES (${sqlQuote(resUuid)}, ${sqlQuote(safeTitle)}, ${sqlQuote(safeDesc)}, ${sqlQuote(cat)}, ${sqlQuote(thumbUuid)}, NULL, ${sqlQuote(authorUuid)}, ${Math.floor(Math.random() * 200)}, 1, ${now - i * 3600}, ${now - i * 3600});\n`;

		// Category meta — varied so every faceted filter has coverage (mirrors production distribution)
		if (cat === 'avatars') {
			const gender = pick(AVATAR_GENDERS);
			const size = pick(AVATAR_SIZES);
			const type = pick(AVATAR_TYPES);
			const platform = pick(PLATFORMS);
			const sdk = pick(SDK_VERSIONS);
			// ~15% NSFW, ~60% physbones, flags varied
			resourceSql += `INSERT INTO avatar_meta (resource_uuid, gender, avatar_size, avatar_type, is_nsfw, has_physbones, has_face_tracking, has_dps, has_gogoloco, has_toggles, is_quest_optimized, sdk_version, platform) VALUES (${sqlQuote(resUuid)}, ${sqlQuote(gender)}, ${sqlQuote(size)}, ${sqlQuote(type)}, ${coin(0.15)}, ${coin(0.6)}, ${coin(0.35)}, ${coin(0.25)}, ${coin(0.4)}, ${coin(0.5)}, ${coin(0.3)}, ${sqlQuote(sdk)}, ${sqlQuote(platform)});\n`;
		} else if (cat === 'assets') {
			const atype = pick(ASSET_TYPES);
			const platform = pick(PLATFORMS);
			const unity = pick(UNITY_VERSIONS);
			const sdk = pick(SDK_VERSIONS);
			resourceSql += `INSERT INTO asset_meta (resource_uuid, asset_type, is_nsfw, unity_version, platform, sdk_version) VALUES (${sqlQuote(resUuid)}, ${sqlQuote(atype)}, ${coin(0.12)}, ${sqlQuote(unity)}, ${sqlQuote(platform)}, ${sqlQuote(sdk)});\n`;
		} else if (cat === 'clothes') {
			const gfit = pick(CLOTHES_GENDERS);
			const platform = pick(PLATFORMS);
			resourceSql += `INSERT INTO clothes_meta (resource_uuid, gender_fit, is_base, is_nsfw, has_physbones, platform) VALUES (${sqlQuote(resUuid)}, ${sqlQuote(gfit)}, ${coin(0.1)}, ${coin(0.15)}, ${coin(0.35)}, ${sqlQuote(platform)});\n`;
			// 1-8 types per clothes item (weighted to 1-2, occasional 3-4, rare 5-8 to test max)
			const rr = Math.random();
			let nTypes: number;
			if (rr < 0.6) nTypes = 1;
			else if (rr < 0.8) nTypes = 2;
			else if (rr < 0.9) nTypes = 3;
			else if (rr < 0.95) nTypes = 4;
			else nTypes = 5 + Math.floor(Math.random() * 4); // 5-8
			const shuffled = [...CLOTHES_TYPES].sort(() => Math.random() - 0.5);
			const chosen = shuffled.slice(0, Math.min(nTypes, CLOTHES_TYPES.length));
			for (const ct of chosen) {
				resourceSql += `INSERT OR IGNORE INTO clothes_clothing_types (resource_uuid, clothing_type) VALUES (${sqlQuote(resUuid)}, ${sqlQuote(ct)});\n`;
			}
		}

		// Link gallery via resource_n_media
		for (const gUuid of galleryUuids) {
			const linkUuid = crypto.randomUUID();
			resourceSql += `INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid, created_at) VALUES (${sqlQuote(linkUuid)}, ${sqlQuote(resUuid)}, ${sqlQuote(gUuid)}, ${now});\n`;
		}

		// Download link (local R2)
		const linkUuid = crypto.randomUUID();
		const dlUrl = `/api/download/${fileUuid}`;
		resourceSql += `INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order, created_at) VALUES (${sqlQuote(linkUuid)}, ${sqlQuote(resUuid)}, ${sqlQuote(dlUrl)}, ${sqlQuote(fileName)}, 'download', 0, ${now});\n`;

		// Extra external link for variety (mirrors downloadHost table)
		if (Math.random() < 0.4) {
			const extUuid = crypto.randomUUID();
			const extUrl = i % 2 === 0 ? 'https://drive.google.com/file/d/1FAKESEED/view' : 'https://mega.nz/file/SEED123#fake';
			resourceSql += `INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order, created_at) VALUES (${sqlQuote(extUuid)}, ${sqlQuote(resUuid)}, ${sqlQuote(extUrl)}, 'Mirror', 'download', 1, ${now});\n`;
		}
	}

	// Write and apply resource SQL
	const tmpResSql = join(tmpdir(), `vrc-seed-res-${Date.now()}.sql`);
	writeFileSync(tmpResSql, resourceSql, 'utf8');
	try {
		console.log(`[seed] Applying ${RESOURCE_COUNT} resources + ${r2Uploads.length + pendingR2Buffers.length} media rows...`);
		d1ExecFile(tmpResSql);
	} finally {
		try { unlinkSync(tmpResSql); } catch {}
	}

	// R2 uploads: images + dummy files
	if (!noR2 && (r2Uploads.length > 0 || pendingR2Buffers.length > 0)) {
		if (!isRemote) {
			// Fast local path: single getPlatformProxy + batch put, no wrangler spawn, no internet, portable across accounts
			console.log(`\n[seed] Uploading ${r2Uploads.length} images + ${pendingR2Buffers.length} dummy files to R2 bucket "${BUCKET_NAME}" (${mode} direct)...`);
			const allEntries: Array<{ key: string; filePath: string; isMedia: boolean }> = [];
			for (const u of r2Uploads) allEntries.push({ key: u.key, filePath: u.filePath, isMedia: false });
			const tmpFiles: string[] = [];
			for (const b of pendingR2Buffers) {
				const tmp = join(tmpdir(), `vrc-seed-buf-${b.key}.tmp`);
				writeFileSync(tmp, b.buffer);
				tmpFiles.push(tmp);
				allEntries.push({ key: b.key, filePath: tmp, isMedia: false });
			}
			const { ok, fail } = await r2PutLocalBatch(allEntries);
			for (const t of tmpFiles) try { unlinkSync(t); } catch {}
			console.log(`\n[seed] R2 done: ${ok} ok, ${fail} failed (local direct)`);
		} else {
			console.log(`\n[seed] Uploading ${r2Uploads.length} images + ${pendingR2Buffers.length} dummy files to R2 bucket "${BUCKET_NAME}" (${mode})...`);
			const tasks: Array<() => Promise<boolean>> = [];
			for (const u of r2Uploads) tasks.push(() => r2PutAsync(u.key, u.filePath, false));
			for (const b of pendingR2Buffers) {
				const tmp = join(tmpdir(), `vrc-seed-buf-${b.key}.tmp`);
				writeFileSync(tmp, b.buffer);
				tasks.push(() => r2PutAsync(b.key, tmp, false).finally(() => { try { unlinkSync(tmp); } catch {} }) as Promise<boolean>);
			}
			let ok = 0, fail = 0;
			const concurrency = 8;
			for (let i = 0; i < tasks.length; i += concurrency) {
				const batch = tasks.slice(i, i + concurrency);
				const results = await Promise.all(batch.map((fn) => fn()));
				for (const r of results) if (r) ok++; else fail++;
				process.stdout.write(`\r[seed] R2 ${ok + fail}/${tasks.length}`);
			}
			console.log(`\n[seed] R2 done: ${ok} ok, ${fail} failed`);
		}
	} else if (noR2) {
		console.log('[seed] Skipped R2 uploads (--no-r2). Resources will show processing placeholder until queue runs.');
	}

	// Media bucket variants (so CDN shows images instead of "Procesando")
	if (!noR2 && mediaBucketUploads.length > 0) {
		if (!isRemote) {
			console.log(`\n[seed] Uploading ${mediaBucketUploads.length} variants to R2 bucket "${MEDIA_BUCKET_NAME}" (${mode} direct)...`);
			const entries = mediaBucketUploads.map((u) => ({ key: u.key, filePath: u.filePath, isMedia: true }));
			const { ok, fail } = await r2PutLocalBatch(entries);
			console.log(`\n[seed] MEDIA R2 done: ${ok} ok, ${fail} failed (local direct)`);
		} else {
			console.log(`\n[seed] Uploading ${mediaBucketUploads.length} variants to R2 bucket "${MEDIA_BUCKET_NAME}"...`);
			let ok = 0;
			const concurrency = 8;
			for (let i = 0; i < mediaBucketUploads.length; i += concurrency) {
				const batch = mediaBucketUploads.slice(i, i + concurrency);
				const results = await Promise.all(batch.map((u) => r2PutAsync(u.key, u.filePath, true)));
				for (const r of results) if (r) ok++;
				process.stdout.write(`\r[seed] MEDIA R2 ${ok}/${mediaBucketUploads.length}`);
			}
			console.log(`\n[seed] MEDIA R2 done: ${ok}/${mediaBucketUploads.length}`);
		}
	}

	console.log('\n[seed] Done ✔');
	console.log('  Users: user/user  (is_admin=0)');
	console.log('  Admin: admin/admin (is_admin=1) — SINGLE admin as requested');
	console.log(`  Resources: ${RESOURCE_COUNT} seeded across avatars/assets/clothes with variety from ${seedFiles.length} files`);
	console.log(`  Mode: ${mode} | R2: ${noR2 ? 'skipped' : 'uploaded'}`);
	console.log('\n  Tip: npm run dev to see seeded content at http://localhost:8787\n');
}

main().catch((e) => {
	console.error('\n[seed] Failed:', e);
	process.exit(1);
});
