// =========================================================================================================
// VRCHAT AVATAR STORAGE - API
// =========================================================================================================
// Este archivo define las interfaces TypeScript que reflejan la estructura
// de la base de datos definida en schema.sql
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { hashPassword, verifyPassword, createSession, getAuthUser, deleteSession } from './auth';
import {
	Resource,
	ResourceCategory,
	RESOURCE_CATEGORIES,
	User,
	Media,
	ResourceLink,
} from './types';
import { z } from 'zod';
import { RegisterSchema, LoginSchema, ResourceSchema, CommentSchema, UserUpdateSchema } from './validators';
import { securityMiddleware } from './middleware/security';
import { rateLimit } from './middleware/rate-limit';

// =========================================================================================================
// Variables
// =========================================================================================================

const app = new Hono<{ Bindings: Env }>();

// Security Headers & CORS
securityMiddleware(app);

// =========================================================================================================
// Rate Limiting
// =========================================================================================================

// Auth Rate Limits (Stricter)
app.use('/api/login', rateLimit({ limit: 10, windowSeconds: 60 * 15, keyPrefix: 'auth_login' }));
app.use('/api/register', rateLimit({ limit: 5, windowSeconds: 60 * 60, keyPrefix: 'auth_register' }));
app.use('/api/comments/*', async (c, next) => {
	if (c.req.method === 'POST') {
		return rateLimit({ limit: 10, windowSeconds: 60 * 5, keyPrefix: 'comments_post' })(c, next);
	}
	return rateLimit({ limit: 50, windowSeconds: 60 * 5, keyPrefix: 'comments_get' })(c, next);
});

// Global Rate Limit
app.use('*', rateLimit({ limit: 500, windowSeconds: 60 * 5 })); // 100 req / 5 min

// Error Handler for Zod
app.onError((err, c) => {
	if (err instanceof z.ZodError) {
		return c.json({ error: 'Validation error', details: err.issues }, 400);
	}
	console.error(err);
	return c.json({ error: 'Internal Server Error' }, 500);
});


// =========================================================================================================
// Middleware
// =========================================================================================================
// Simple auth check for download links
// Simple auth check for download links
app.use('/download/*', async (c, next) => {
	const user = await getAuthUser(c);
	if (!user) {
		return c.redirect('/login');
	}
	await next();
});

// =========================================================================================================
// API Routes
// =========================================================================================================

/**
 * Endpoint: /api/latest
 * Este endpoint existe para que la pagina principal "/" pueda mostrar los ultimos 6 recursos subidos.
 * 
 * Solo enviar:
 * - r.category
 * - r.uuid
 * - r.title
 * - m.r2_key => r.thumbnail_key
 * - r.created_at
 * - r.download_count
 */
app.get('/api/latest', async (c) => {
	// 1. Try KV
	const cached = await c.env.VRCSTORAGE_KV.get('resource:latest', 'json');
	if (cached) {
		return c.json(cached);
	}

	const stmt = c.env.DB.prepare(`
        SELECT
            r.category,
            r.uuid,
            r.title,
            r.thumbnail_uuid,
            r.created_at,
            r.download_count,
            m.r2_key as thumbnail_key
        FROM resources r
        INNER JOIN media m ON r.thumbnail_uuid = m.uuid
        WHERE r.is_active = 1
        ORDER BY r.created_at DESC
        LIMIT 6
    `);

	const { results } = await stmt.all();
	c.header('Cache-Control', 'public, max-age=60');

	// 2. Update KV
	await c.env.VRCSTORAGE_KV.put('resource:latest', JSON.stringify(results), { expirationTtl: 60 });

	return c.json(results);
});

/**
 * Endpoint: /api/category/:category
 * Solo muestra los ultimos 25 recursos de la categoria solicitada.
 */
app.get('/api/category/:category', async (c) => {
	const category = c.req.param('category');
	if (!category) return c.json({ error: 'Missing category' }, 400);

	if (!RESOURCE_CATEGORIES.includes(category as ResourceCategory)) return c.json({ error: 'Invalid category' }, 400);

	// 1. Try KV
	const cached = await c.env.VRCSTORAGE_KV.get(`resource:category:${category}`, 'json');
	if (cached) {
		return c.json(cached);
	}

	const stmt = c.env.DB.prepare(`
		SELECT r.*, m.r2_key as thumbnail_key 
		FROM resources r 
		LEFT JOIN media m ON r.thumbnail_uuid = m.uuid 
		WHERE r.category = ? AND r.is_active = 1 
		ORDER BY r.created_at DESC
	`).bind(category);
	const { results } = await stmt.all<Resource & { thumbnail_key: string | null }>();

	const mapped = results.map(r => ({
		...r,
		timestamp: r.created_at * 1000
	}));

	const response = { resources: mapped };

	// 2. Update KV
	await c.env.VRCSTORAGE_KV.put(`resource:category:${category}`, JSON.stringify(response), { expirationTtl: 300 }); // 5 mins

	return c.json(response);
});

/**
 * Endpoint: /api/item/:uuid
 * Muestra en detalle la informacion de un recurso para su descarga.
 */
app.get('/api/item/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	if (!uuid) return c.json({ error: 'Missing uuid' }, 400);

	// 1. Try KV
	const cached = await c.env.VRCSTORAGE_KV.get(`resource:${uuid}`, 'json');
	if (cached) {
		return c.json(cached);
	}

	const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();
	if (!resource) return c.json({ error: 'Not found' }, 404);

	// Get author
	const author = await c.env.DB.prepare('SELECT uuid, username, avatar_url FROM users WHERE uuid = ?')
		.bind(resource.author_uuid).first<User>();

	// Get thumbnail media
	const thumbnail = await c.env.DB.prepare('SELECT * FROM media WHERE uuid = ?')
		.bind(resource.thumbnail_uuid).first<Media>();

	// Get reference image if exists
	let referenceImage: Media | null = null;
	if (resource.reference_image_uuid) {
		referenceImage = await c.env.DB.prepare('SELECT * FROM media WHERE uuid = ?')
			.bind(resource.reference_image_uuid).first<Media>();
	}

	// Get all associated media files
	const mediaFiles = await c.env.DB.prepare(
		`SELECT m.* FROM media m
		 JOIN resource_n_media rm ON m.uuid = rm.media_uuid
		 WHERE rm.resource_uuid = ?`
	).bind(uuid).all<Media>();

	// Get all resource links
	const links = await c.env.DB.prepare(
		'SELECT * FROM resource_links WHERE resource_uuid = ? ORDER BY display_order ASC'
	).bind(uuid).all<ResourceLink>();

	const isLoggedIn = !!(await getAuthUser(c));

	// Construct download URLs from links
	const downloadLinks = links.results.filter(l => l.link_type === 'download');
	const downloadUrl = downloadLinks.length > 0 ? downloadLinks[0].link_url : null;
	const backupUrls = downloadLinks.slice(1).map(l => l.link_url);

	return c.json({
		...resource,
		resourceUuid: resource.uuid,
		timestamp: resource.created_at * 1000,
		author: author ? { uuid: author.uuid, username: author.username, avatar_url: author.avatar_url } : null,
		thumbnail: thumbnail ? { uuid: thumbnail.uuid, r2_key: thumbnail.r2_key, media_type: thumbnail.media_type } : null,
		referenceImage: referenceImage,
		mediaFiles: mediaFiles.results,
		links: links.results,
		canDownload: isLoggedIn,
		downloadUrl,
		backupUrls
	});
});

// =========================================================================================================
// Middleware & Helpers
// =========================================================================================================

/**
 * Endpoint: /api/config
 * Devuelve la configuracion del sitio web. De momento solo el site key de turnstile para el captcha.
 */
app.get('/api/config', (c) => {
	return c.json({
		turnstileSiteKey: (c.env.TURNSTILE_SITE_KEY || '').trim()
	});
});

async function verifyTurnstile(token: string, secret: string) {
	if (!secret) return true;

	const formData = new FormData();
	formData.append('secret', secret);
	formData.append('response', token);

	const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
	const result = await fetch(url, {
		body: formData,
		method: 'POST',
	});

	const outcome = await result.json<any>();

	return outcome.success;
}

// =========================================================================================================
// User Routes
// =========================================================================================================

/**
 * Endpoint: /api/register
 * Registra un nuevo usuario.
 */
app.post('/api/register', async (c) => {
	const body = await c.req.json();

	// Validation
	const { username, password, token } = RegisterSchema.parse(body);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	// User Check
	const existingUser = await c.env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
	if (existingUser) {
		return c.json({ error: 'Username taken' }, 409);
	}

	const { hash } = await hashPassword(password);
	const uuid = crypto.randomUUID();
	const avatarUrl = 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';

	try {
		await c.env.DB.prepare(
			'INSERT INTO users (uuid, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)'
		).bind(uuid, username, hash, avatarUrl).run();

		return c.json({ success: true });
	} catch (e) {
		console.error('Registration error:', e);
		return c.json({ error: 'Registration failed' }, 500);
	}
});

/**
 * Endpoint: /api/login
 * Inicia sesion de un usuario.
 */
app.post('/api/login', async (c) => {
	const body = await c.req.json();

	// Validation
	const { username, password, token } = LoginSchema.parse(body);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();

	if (user) {
		const isMatch = await verifyPassword(password, user.password_hash);
		if (isMatch) {
			// Secure: false for localhost development
			// Secure session
			await createSession(c, { username: user.username, is_admin: user.is_admin });

			// Cache user in KV
			const sessionUser = { username: user.username, is_admin: user.is_admin === 1 };
			await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

			return c.json({ success: true });
		}
	}
	return c.json({ error: 'Invalid credentials' }, 401);
});

/**
 * Endpoint: /api/user
 * Actualiza el perfil del usuario (username, avatar).
 */
app.put('/api/user', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { username, avatar_url, token } = UserUpdateSchema.parse(body); // Use UserUpdateSchema (needs import)

	// Turnstile check if provided (optional for updates but good for security)
	if (token) {
		const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET_KEY);
		if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);
	}

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(authUser.username).first<User>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	let newUsername = user.username;
	let newAvatarUrl = user.avatar_url;

	if (username && username !== user.username) {
		// Check uniqueness
		const existing = await c.env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
		if (existing) return c.json({ error: 'Username taken' }, 409);
		newUsername = username;
	}

	if (avatar_url) {
		newAvatarUrl = avatar_url;
	}

	try {
		await c.env.DB.prepare(
			'UPDATE users SET username = ?, avatar_url = ? WHERE uuid = ?'
		).bind(newUsername, newAvatarUrl, user.uuid).run();

		// Update Session if username changed
		if (newUsername !== user.username) {
			await createSession(c, { username: newUsername, is_admin: user.is_admin });
		}

		// If username changed, delete old key
		if (newUsername !== user.username) {
			await c.env.VRCSTORAGE_KV.delete(`user:${user.username}`);
		}
		const sessionUser = { username: newUsername, is_admin: user.is_admin === 1 };
		await c.env.VRCSTORAGE_KV.put(`user:${newUsername}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

		return c.json({ success: true, username: newUsername, avatar_url: newAvatarUrl });
	} catch (e) {
		console.error('Update user error:', e);
		return c.json({ error: 'Failed to update user' }, 500);
	}
});

/**
 * Endpoint: /api/auth/status
 * Verifica si el usuario esta logueado.
 */
app.get('/api/auth/status', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({ loggedIn: false, username: null, is_admin: false, avatar_url: null });
	}

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(authUser.username).first<User>();

	return c.json({
		loggedIn: !!user,
		username: user ? user.username : null,
		is_admin: user ? !!user.is_admin : false,
		avatar_url: user ? user.avatar_url : null
	});
});

/**
 * Endpoint: /api/logout
 * Cierra sesion de un usuario.
 */
app.post('/api/logout', (c) => {
	deleteSession(c);
	return c.json({ success: true });
});

// =========================================================================================================
// Resource Routes
// =========================================================================================================

/**
 * Endpoint: /api/resources
 * Sube un nuevo recurso.
 */
app.post('/api/resources', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	// Get author
	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<User>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const body = await c.req.json();

	// Validation
	const { title, description, category, thumbnail_uuid, reference_image_uuid, links, media_files, token } = ResourceSchema.parse(body);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const resourceUuid = crypto.randomUUID();
	try {
		// Insert resource
		await c.env.DB.prepare(
			'INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid) VALUES (?, ?, ?, ?, ?, ?, ?)'
		).bind(resourceUuid, title, description || null, category, thumbnail_uuid, reference_image_uuid || null, user.uuid).run();

		// Insert resource links if provided
		if (links && Array.isArray(links)) {
			for (let i = 0; i < links.length; i++) {
				const link = links[i];
				const linkUuid = crypto.randomUUID();
				await c.env.DB.prepare(
					'INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order) VALUES (?, ?, ?, ?, ?, ?)'
				).bind(
					linkUuid,
					resourceUuid,
					link.link_url,
					link.link_title || null,
					link.link_type || 'general',
					link.display_order ?? i
				).run();
			}
		}

		// Insert media file associations if provided
		if (media_files && Array.isArray(media_files)) {
			for (const mediaUuid of media_files) {
				const relationUuid = crypto.randomUUID();
				await c.env.DB.prepare(
					'INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid) VALUES (?, ?, ?)'
				).bind(relationUuid, resourceUuid, mediaUuid).run();
			}
		}

		// Invalidate KV Caches
		await c.env.VRCSTORAGE_KV.delete('resource:latest');
		await c.env.VRCSTORAGE_KV.delete(`resource:category:${category}`);

		return c.json({ success: true, uuid: resourceUuid });
	} catch (e) {
		console.error('Create resource error:', e);
		return c.json({ error: 'Failed to create resource' }, 500);
	}
});

/**
 * Endpoint: /api/upload
 * Sube un nuevo archivo y crea un registro en la tabla media.
 */
app.put('/api/upload', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const formData = await c.req.parseBody();
	const file = formData['file'];
	const mediaType = formData['media_type'] as string || 'file';
	if (file instanceof File) {
		// Validate File Size (e.g., 100MB max)
		if (file.size > 100 * 1024 * 1024) {
			return c.json({ error: 'File too large (max 100MB)' }, 400);
		}

		// Validate Magic Bytes
		const buffer = await file.arrayBuffer();
		const bytes = new Uint8Array(buffer).slice(0, 4);
		const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

		let isValidType = false;
		// PNG
		if (hex.startsWith('89504E47')) isValidType = true;
		// JPEG
		if (hex.startsWith('FFD8FF')) isValidType = true;
		// WEBP
		if (hex.startsWith('52494646') && [...new Uint8Array(buffer).slice(8, 12)].map(b => String.fromCharCode(b)).join('') === 'WEBP') isValidType = true;
		// GIF
		if (hex.startsWith('47494638')) isValidType = true;
		// ZIP / UnityPackage (Standard Zip)
		if (hex.startsWith('504B0304')) isValidType = true;
		// UnityPackage (GZIP/Tar.gz)
		if (hex.startsWith('1F8B')) isValidType = true;
		// 7z
		if (hex.startsWith('377ABCAF271C')) isValidType = true;
		// RAR
		if (hex.startsWith('52617221')) isValidType = true;

		if (!isValidType) {
			return c.json({ error: 'Invalid file type. Only images and Unity Packages/Zips are allowed.' }, 400);
		}

		const filename = file.name;
		const r2Key = crypto.randomUUID();
		const mediaUuid = crypto.randomUUID();

		try {
			// Upload to R2
			await c.env.BUCKET.put(r2Key, file);

			// Create media record
			await c.env.DB.prepare(
				'INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)'
			).bind(mediaUuid, r2Key, mediaType, filename).run();

			return c.json({
				media_uuid: mediaUuid,
				r2_key: r2Key,
				media_type: mediaType,
				file_name: filename
			});
		} catch (e) {
			console.error('Upload error:', e);
			return c.json({ error: 'Upload failed' }, 500);
		}
	}
	return c.json({ error: 'No file uploaded' }, 400);
});

/**
 * Endpoint: /api/upload/init
 * Inicia una carga multiparte para archivos grandes.
 */
app.post('/api/upload/init', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { filename, media_type } = body;

	if (!filename || !media_type) {
		return c.json({ error: 'Missing filename or media_type' }, 400);
	}

	const r2Key = crypto.randomUUID();
	try {
		const multipartUpload = await c.env.BUCKET.createMultipartUpload(r2Key);
		return c.json({
			uploadId: multipartUpload.uploadId,
			key: r2Key
		});
	} catch (e) {
		console.error('Init multipart upload error:', e);
		return c.json({ error: 'Failed to init upload' }, 500);
	}
});

/**
 * Endpoint: /api/upload/part
 * Sube una parte de un archivo grande.
 */
app.put('/api/upload/part', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const uploadId = c.req.header('X-Upload-ID');
	const key = c.req.header('X-Key');
	const partNumberStr = c.req.header('X-Part-Number');

	if (!uploadId || !key || !partNumberStr) {
		return c.json({ error: 'Missing upload headers' }, 400);
	}

	const partNumber = parseInt(partNumberStr);
	if (isNaN(partNumber)) {
		return c.json({ error: 'Invalid part number' }, 400);
	}

	if (!c.req.raw.body) {
		return c.json({ error: 'Missing request body' }, 400);
	}


	const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
	try {
		const uploadedPart = await multipartUpload.uploadPart(partNumber, c.req.raw.body);
		return c.json(uploadedPart);
	} catch (e) {
		await multipartUpload.abort();
		console.error('Upload part error:', e);
		return c.json({ error: 'Failed to upload part' }, 500);
	}
});

/**
 * Endpoint: /api/upload/complete
 * Completa una carga multiparte.
 */
app.post('/api/upload/complete', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { key, uploadId, parts, filename, media_type } = body;

	if (!key || !uploadId || !parts || !Array.isArray(parts) || !filename || !media_type) {
		return c.json({ error: 'Missing required fields' }, 400);
	}

	try {
		const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
		await multipartUpload.complete(parts);

		const mediaUuid = crypto.randomUUID();

		// Create media record
		await c.env.DB.prepare(
			'INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)'
		).bind(mediaUuid, key, media_type, filename).run();

		return c.json({
			media_uuid: mediaUuid,
			r2_key: key,
			media_type: media_type,
			file_name: filename
		});

	} catch (e) {
		console.error('Complete multipart upload error:', e);
		return c.json({ error: 'Failed to complete upload' }, 500);
	}
});

// =========================================================================================================
// Download Routes
// =========================================================================================================

/**
 * Endpoint: /api/download/:key
 * Descarga un archivo.
 */
app.get('/api/download/:key', async (c) => {
	const key = c.req.param('key');

	const stmt = c.env.DB.prepare('SELECT * FROM media WHERE r2_key = ?').bind(key);
	const result = await stmt.first<Media>();

	if (!result) return c.json({ error: 'Not found' }, 404);
	const isMedia: boolean = result.media_type === 'image' || result.media_type === 'video';

	if (!isMedia) {
		const user = await getAuthUser(c);
		if (!user) return c.json({ error: 'Unauthorized' }, 401);
	}

	const object = await c.env.BUCKET.get(key);
	if (!object) return c.json({ error: 'Not found' }, 404);

	const disposition = isMedia ? 'inline' : 'attachment';
	const filename = result.file_name.replace(/"/g, '');

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	headers.set('Content-Disposition', `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);

	return new Response(object.body, {
		headers,
	});
});

// =========================================================================================================
// Comments Routes
// =========================================================================================================

/**
 * Endpoint: /api/comments/:uuid
 * Obtiene los comentarios de un recurso.
 */
app.get('/api/comments/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	// Join with users to get username
	const { results } = await c.env.DB.prepare(
		`SELECT
			c.uuid,
			c.text,
			(c.created_at * 1000) as timestamp,
			u.username as author,
			u.avatar_url as author_avatar
         FROM comments c 
         JOIN users u ON c.author_uuid = u.uuid 
         WHERE c.resource_uuid = ? 
         ORDER BY c.created_at ASC`
	).bind(uuid).all<any>(); // any because of join

	return c.json(results);
});

/**
 * Endpoint: /api/comments/:uuid
 * Crea un nuevo comentario.
 */
app.post('/api/comments/:uuid', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	// Get author
	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const uuid = c.req.param('uuid');
	const body = await c.req.json();

	// Validation
	const { text, token } = CommentSchema.parse(body);

	// Turnstile Verification for Comments (Optional but requested)
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const commentUuid = crypto.randomUUID();

	try {
		await c.env.DB.prepare(
			'INSERT INTO comments (uuid, resource_uuid, author_uuid, text) VALUES (?, ?, ?, ?)'
		).bind(commentUuid, uuid, user.uuid, text).run();

		const newComment = {
			commentUuid,
			resourceUuid: uuid,
			author: authUser.username,
			author_avatar: user.avatar_url,
			text: text,
			created_at: new Date().toISOString()
		};

		return c.json(newComment);
	} catch (e) {
		console.error('Comment error:', e);
		return c.json({ error: 'Failed to post comment' }, 500);
	}
});

/**
 * Endpoint: /api/comments/:uuid
 * Elimina un comentario.
 */
app.delete('/api/comments/:uuid', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const uuid = c.req.param('uuid');
	try {
		await c.env.DB.prepare('DELETE FROM comments WHERE uuid = ?').bind(uuid).run();
		return c.json({ success: true });
	} catch (e) {
		console.error('Comment error:', e);
		return c.json({ error: 'Failed to delete comment' }, 500);
	}
});


// =========================================================================================================
// Admin Routes
// =========================================================================================================

/**
 * Endpoint: /api/admin/pending
 * Obtiene todos los recursos pendientes de aprobación.
 */
app.get('/api/admin/pending', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	try {
		const resources = await c.env.DB.prepare(`
			SELECT r.*, m.r2_key as thumbnail_key 
			FROM resources r 
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid 
			WHERE r.is_active = 0 
			ORDER BY r.created_at DESC
		`).all<Resource & { thumbnail_key: string | null }>();

		return c.json(resources.results);
	} catch (e) {
		console.error('Admin pending fetch error:', e);
		return c.json({ error: 'Failed to fetch pending resources' }, 500);
	}
});

/**
 * Endpoint: /api/admin/resource/:uuid/approve
 * Aprueba un recurso pendiente.
 */
app.post('/api/admin/resource/:uuid/approve', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		await c.env.DB.prepare('UPDATE resources SET is_active = 1 WHERE uuid = ?').bind(uuid).run();
		return c.json({ success: true });
	} catch (e) {
		console.error('Admin approve error:', e);
		return c.json({ error: 'Failed to approve resource' }, 500);
	}
});

/**
 * Endpoint: /api/admin/resource/:uuid/reject
 * Rechaza y elimina un recurso pendiente.
 */
app.post('/api/admin/resource/:uuid/reject', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		const mediaFiles = await c.env.DB.prepare(
			`SELECT m.r2_key FROM media m
			 JOIN resource_n_media rm ON m.uuid = rm.media_uuid
			 WHERE rm.resource_uuid = ?`
		).bind(uuid).all<Media>();

		const thumbnail = await c.env.DB.prepare('SELECT m.r2_key FROM media m JOIN resources r ON m.uuid = r.thumbnail_uuid WHERE r.uuid = ?').bind(uuid).first<Media>();

		// Delete from R2
		if (thumbnail) await c.env.BUCKET.delete(thumbnail.r2_key);
		for (const media of mediaFiles.results) {
			await c.env.BUCKET.delete(media.r2_key);
		}

		await c.env.DB.prepare('DELETE FROM resources WHERE uuid = ?').bind(uuid).run();

		return c.json({ success: true });
	} catch (e) {
		console.error('Admin reject error:', e);
		return c.json({ error: 'Failed to reject resource' }, 500);
	}
});

/**
 * Endpoint: /api/admin/resource/:uuid/deactivate
 * Desactiva un recurso aprobado (lo oculta).
 */
app.post('/api/admin/resource/:uuid/deactivate', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		await c.env.DB.prepare('UPDATE resources SET is_active = 0 WHERE uuid = ?').bind(uuid).run();
		return c.json({ success: true });
	} catch (e) {
		console.error('Admin deactivate error:', e);
		return c.json({ error: 'Failed to deactivate resource' }, 500);
	}
});


// =========================================================================================================
// SEO / OG Tags Route
// =========================================================================================================

/**
 * Endpoint: /item/:uuid
 * Sirve el HTML principal pero con los metadatos OG inyectados para el recurso especifico.
 */
app.get('/item/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	if (!uuid) return c.json({ error: 'UUID is required' }, 400);

	const cached = await c.env.VRCSTORAGE_KV.get(`og:${uuid}`);
	if (cached) return c.html(cached);

	try {
		const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();

		if (resource && resource.is_active) {
			// Get thumbnail
			const thumbnail = await c.env.DB.prepare('SELECT * FROM media WHERE uuid = ?').bind(resource.thumbnail_uuid).first<Media>();

			// Fetch original index.html
			const indexResponse = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
			let html = await indexResponse.text();

			// Replace Meta Tags
			const title = resource.title;
			const description = resource.description || 'VRChat Avatar & Asset Storage';
			const imageUrl = thumbnail ? `${new URL(c.req.url).origin}/api/download/${thumbnail.r2_key}` : `${new URL(c.req.url).origin}/favicon.svg`;
			const url = `${new URL(c.req.url).origin}/item/${uuid}`;

			// Simple replacements (asegurandose que coincidan con lo que hay en public/index.html)
			html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
			html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
			html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
			html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${imageUrl}">`);
			html = html.replace(/<title>[^<]*<\/title>/, `<title>${title} - VRCStorage</title>`);

			c.env.VRCSTORAGE_KV.put(`og:${uuid}`, html);

			return c.html(html);
		}
	} catch (e) {
		console.error('Error injecting OG tags:', e);
	}

	// Fallback to normal serving if not found or error
	return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
});

// =========================================================================================================
// Serve Static Files (SPA Fallback)
// =========================================================================================================

app.get('/*', async (c) => {
	return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
});


export default app;
