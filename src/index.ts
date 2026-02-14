/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from 'hono';
import { resources, categories, Resource, comments, Comment, users } from './data';
import { getCookie, setCookie } from 'hono/cookie';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono<{ Bindings: Env }>();

// --- Middleware ---
// Simple auth check for download links
app.use('/download/*', async (c, next) => {
	const auth = getCookie(c, 'auth');
	if (auth !== 'true') {
		return c.redirect('/login');
	}
	await next();
});

// --- API Routes ---

app.get('/api/latest', (c) => {
	const latestResources = resources.slice(0, 6);
	return c.json(latestResources);
});

app.get('/api/category/:category', (c) => {
	const category = c.req.param('category');
	const filtered = resources.filter(r => r.category === category);
	return c.json({ resources: filtered });
});

app.get('/api/item/:uuid', (c) => {
	const uuid = c.req.param('uuid');
	const resource = resources.find(r => r.uuid === uuid);

	if (!resource) return c.json({ error: 'Not found' }, 404);

	const isLoggedIn = getCookie(c, 'auth') === 'true';
	return c.json({
		...resource,
		canDownload: isLoggedIn
	});
});

// --- Middleware & Helpers ---

app.get('/api/config', (c) => {
	return c.json({
		turnstileSiteKey: (c.env.TURNSTILE_SITE_KEY || '').trim()
	});
});

async function verifyTurnstile(token: string, secret: string) {
	// If no secret is provided (dev mode), skip validation or mock it. 
	// For production, this MUST be a real check.
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

// --- API Routes ---
// ... (latest, category, item routes UNCHANGED) ...

app.post('/api/register', async (c) => {
	const body = await c.req.json();
	const { username, password, token } = body;

	if (!username || !password) return c.json({ error: 'Missing fields' }, 400);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	// User Check
	if (users.find(u => u.username === username)) {
		return c.json({ error: 'Username taken' }, 409);
	}

	// Create User
	users.push({ username, password });
	return c.json({ success: true });
});

app.post('/api/login', async (c) => {
	const body = await c.req.json();
	const { username, password, token } = body;

	// Turnstile Verification
	const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const user = users.find(u => u.username === username && u.password === password);
	if (user) {
		// Secure: false for localhost development
		setCookie(c, 'auth', 'true', { httpOnly: true, secure: false, path: '/' });
		return c.json({ success: true });
	}
	return c.json({ error: 'Invalid credentials' }, 401);
});

// Comments Endpoints

app.get('/api/comments/:uuid', (c) => {
	const uuid = c.req.param('uuid');
	const resourceComments = comments.filter(cm => cm.resourceUuid === uuid);
	return c.json(resourceComments);
});

app.post('/api/comments/:uuid', async (c) => {
	const auth = getCookie(c, 'auth');
	if (auth !== 'true') return c.json({ error: 'Unauthorized' }, 401);

	const uuid = c.req.param('uuid');
	const body = await c.req.json();

	if (!body.text || !body.author) {
		return c.json({ error: 'Missing fields' }, 400);
	}

	// Turnstile Verification for Comments (Optional but requested)
	const isValid = await verifyTurnstile(body.token, c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const newComment: Comment = {
		uuid: crypto.randomUUID(),
		resourceUuid: uuid,
		author: body.author,
		text: body.text,
		timestamp: new Date().toISOString()
	};

	comments.push(newComment);
	return c.json(newComment);
});


// Serve Static Files (SPA Fallback)
app.get('/*', async (c) => {
	return (c.env as any).ASSETS.fetch(new URL('/index.html', c.req.url));
});


export default app;
