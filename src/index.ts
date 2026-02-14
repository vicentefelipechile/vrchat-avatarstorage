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
import { getCookie, setCookie } from 'hono/cookie';
import { hashPassword, verifyPassword } from './auth';
import {
	Resource,
	ResourceCategory,
	RESOURCE_CATEGORIES,
	User,
	Media,
	ResourceLink,
} from './types';

// =========================================================================================================
// Variables
// =========================================================================================================

const app = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// Middleware
// =========================================================================================================
// Simple auth check for download links
app.use('/download/*', async (c, next) => {
	const auth = getCookie(c, 'auth');
	if (auth !== 'true') {
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
 */
app.get('/api/latest', async (c) => {
	const stmt = c.env.DB.prepare('SELECT * FROM resources ORDER BY created_at DESC LIMIT 6');
	const { results } = await stmt.all<Resource>();

	const mapped = results.map(r => ({
		...r,
		timestamp: r.created_at * 1000
	}));
	return c.json(mapped);
});

/**
 * Endpoint: /api/category/:category
 * Solo muestra los ultimos 25 recursos de la categoria solicitada.
 */
app.get('/api/category/:category', async (c) => {
	const category = c.req.param('category');
	if (!category) return c.json({ error: 'Missing category' }, 400);

	if (!RESOURCE_CATEGORIES.includes(category as ResourceCategory)) return c.json({ error: 'Invalid category' }, 400);

	const stmt = c.env.DB.prepare('SELECT * FROM resources WHERE category = ? ORDER BY created_at DESC').bind(category);
	const { results } = await stmt.all<Resource>();

	const mapped = results.map(r => ({
		...r,
		timestamp: r.created_at * 1000
	}));

	return c.json({ resources: mapped });
});

/**
 * Endpoint: /api/item/:uuid
 * Muestra en detalle la informacion de un recurso para su descarga.
 */
app.get('/api/item/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	if (!uuid) return c.json({ error: 'Missing uuid' }, 400);

	// Get resource with author info
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

	const isLoggedIn = !!getCookie(c, 'auth');

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
	const { username, password, token } = body;

	if (!username || !password) return c.json({ error: 'Missing fields' }, 400);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	// User Check
	const existingUser = await c.env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
	if (existingUser) {
		return c.json({ error: 'Username taken' }, 409);
	}

	const { hash } = await hashPassword(password);
	const uuid = crypto.randomUUID();
	const avatarUrl = 'https://example.com/avatar.png';

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
	const { username, password, token } = body;

	// Turnstile Verification
	const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<any>();

	if (user) {
		const isMatch = await verifyPassword(password, user.password_hash);
		if (isMatch) {
			// Secure: false for localhost development
			// In a real app, use a session token or JWT here
			setCookie(c, 'auth', username, { httpOnly: true, secure: false, path: '/' });
			return c.json({ success: true });
		}
	}
	return c.json({ error: 'Invalid credentials' }, 401);
});

/**
 * Endpoint: /api/auth/status
 * Verifica si el usuario esta logueado.
 */
app.get('/api/auth/status', async (c) => {
	const username = getCookie(c, 'auth');
	if (!username) {
		return c.json({ loggedIn: false, username: null });
	}

	// Verify user exists
	const user = await c.env.DB.prepare('SELECT username FROM users WHERE username = ?').bind(username).first<any>();

	return c.json({
		loggedIn: !!user,
		username: user ? user.username : null
	});
});

/**
 * Endpoint: /api/logout
 * Cierra sesion de un usuario.
 */
app.post('/api/logout', (c) => {
	setCookie(c, 'auth', '', { maxAge: 0, path: '/' });
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
	const auth = getCookie(c, 'auth');
	if (!auth) return c.json({ error: 'Unauthorized' }, 401);

	// Get author
	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(auth).first<User>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const body = await c.req.json();
	const { title, description, category, thumbnail_uuid, reference_image_uuid, links, media_files, token } = body;

	// Turnstile Verification
	const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	if (!title || !category || !thumbnail_uuid) {
		return c.json({ error: 'Missing required fields: title, category, thumbnail_uuid' }, 400);
	}

	// Validate category
	if (!RESOURCE_CATEGORIES.includes(category as ResourceCategory)) {
		return c.json({ error: 'Invalid category' }, 400);
	}

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
	const auth = getCookie(c, 'auth');
	if (!auth) return c.json({ error: 'Unauthorized' }, 401);

	const formData = await c.req.parseBody();
	const file = formData['file'];
	const mediaType = formData['media_type'] as string || 'file';

	if (file instanceof File) {
		const r2Key = crypto.randomUUID();
		const mediaUuid = crypto.randomUUID();

		try {
			// Upload to R2
			await c.env.BUCKET.put(r2Key, file);

			// Create media record
			await c.env.DB.prepare(
				'INSERT INTO media (uuid, r2_key, media_type) VALUES (?, ?, ?)'
			).bind(mediaUuid, r2Key, mediaType).run();

			return c.json({
				media_uuid: mediaUuid,
				r2_key: r2Key,
				media_type: mediaType
			});
		} catch (e) {
			console.error('Upload error:', e);
			return c.json({ error: 'Upload failed' }, 500);
		}
	}
	return c.json({ error: 'No file uploaded' }, 400);
});

// =========================================================================================================
// Download Routes
// =========================================================================================================

/**
 * Endpoint: /api/download/:key
 * Descarga un archivo.
 */
app.get('/api/download/:key', async (c) => {
	const auth = getCookie(c, 'auth');
	if (!auth) return c.json({ error: 'Unauthorized' }, 401);

	const key = c.req.param('key');
	const object = await c.env.BUCKET.get(key);

	if (!object) return c.json({ error: 'Not found' }, 404);

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);

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
		`SELECT c.text, c.created_at, u.username as author 
         FROM comments c 
         JOIN users u ON c.author_uuid = u.uuid 
         WHERE c.resource_uuid = ? 
         ORDER BY c.created_at DESC`
	).bind(uuid).all<any>(); // any because of join

	const mapped = results.map(c => ({
		text: c.text,
		author: c.author,
		timestamp: c.created_at * 1000 // Convert unixepoch to ms for frontend
	}));
	return c.json(mapped);
});

/**
 * Endpoint: /api/comments/:uuid
 * Crea un nuevo comentario.
 */
app.post('/api/comments/:uuid', async (c) => {
	const auth = getCookie(c, 'auth');
	if (!auth) return c.json({ error: 'Unauthorized' }, 401);

	// Get author
	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(auth).first<any>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const uuid = c.req.param('uuid');
	const body = await c.req.json();

	if (!body.text) {
		return c.json({ error: 'Missing fields' }, 400);
	}

	// Turnstile Verification for Comments (Optional but requested)
	const isValid = await verifyTurnstile(body.token, c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const commentUuid = crypto.randomUUID();

	try {
		await c.env.DB.prepare(
			'INSERT INTO comments (uuid, resource_uuid, author_uuid, text) VALUES (?, ?, ?, ?)'
		).bind(commentUuid, uuid, user.uuid, body.text).run();

		const newComment = {
			commentUuid,
			resourceUuid: uuid,
			author: auth,
			text: body.text,
			timestamp: new Date().toISOString()
		};

		return c.json(newComment);
	} catch (e) {
		console.error('Comment error:', e);
		return c.json({ error: 'Failed to post comment' }, 500);
	}
});


// =========================================================================================================
// Serve Static Files (SPA Fallback)
// =========================================================================================================

app.get('/*', async (c) => {
	return (c.env as any).ASSETS.fetch(new URL('/index.html', c.req.url));
});


export default app;
