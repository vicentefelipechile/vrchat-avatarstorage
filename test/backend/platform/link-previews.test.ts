// =========================================================================================================
// DISCORD LINK PREVIEW TESTS
// =========================================================================================================
// Check server-rendered metadata and component payloads on public pages.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { componentEmbed } from '../../../src/http/component-embed';
import { createAvatar, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('Discord component link previews', () => {
	it('serves a resource-specific payload with safe text, media, a link and Open Graph fallback', async () => {
		const owner = await createUser();
		const uuid = await createAvatar(owner.uuid, 'Fox </script> @everyone *special*', 'male');
		await env.DB.prepare('UPDATE resources SET description = ? WHERE uuid = ?').bind('First <b>fox</b> avatar', uuid).run();
		const response = await exports.default.fetch(`http://localhost:8787/item/${uuid}`);
		const html = await response.text();
		expect(response.status).toBe(200);
		expect(html).toContain('og:title" content="Fox &lt;/script&gt; @everyone *special*"');
		expect(html).toContain('og:description" content="First &lt;b&gt;fox&lt;/b&gt; avatar"');
		expect(html.match(/id="discord:component-embed"/g)).toHaveLength(1);
		const json = html.match(/<script id="discord:component-embed" type="application\/json">(.*?)<\/script>/s)?.[1];
		const payload = JSON.parse(json!) as { component: { type: number; components: { type: number; content?: string; items?: { media: { url: string } }[]; components?: { url: string }[] }[] } };
		expect(payload.component.type).toBe(17);
		expect(payload.component.components[0].content).toContain('Fox \\</script\\> @\u200beveryone \\*special\\*');
		expect(payload.component.components[1].items?.[0].media.url).toContain('cdn.vrcstorage.lat/');
		expect(payload.component.components[2].components?.[0].url).toBe(`http://localhost:8787/item/${uuid}`);
	});

	it('uses page-specific metadata for the wiki and falls back to the static site card elsewhere', async () => {
		const wiki = await (await exports.default.fetch('http://localhost:8787/wiki?topic=setup')).text();
		expect(wiki).toContain('id="discord:component-embed"');
		expect(wiki).toContain('setup');
		expect(wiki.match(/id="discord:component-embed"/g)).toHaveLength(1);
		const home = await (await exports.default.fetch('http://localhost:8787/')).text();
		expect(home).toContain('id="discord:component-embed"');
	});

	it('serves a blog-specific preview without duplicating the homepage payload', async () => {
		const admin = await createUser('blog-admin');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const created = await exports.default.fetch('http://localhost:8787/api/blog', {
			method: 'POST', headers: { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'New post', content: 'Post body' }),
		});
		expect(created.status).toBe(200);
		const { uuid } = (await created.json()) as { uuid: string };
		const html = await (await exports.default.fetch(`http://localhost:8787/blog/${uuid}`)).text();
		expect(html.match(/id="discord:component-embed"/g)).toHaveLength(1);
		expect(html).toContain('New post - VRCStorage Blog');
		expect(html).toContain(`http://localhost:8787/blog/${uuid}`);
	});

	it('omits oversize payloads instead of breaking the Open Graph fallback', () => {
		expect(componentEmbed({ title: 'test', description: 'ok', url: 'https://example.com/' + 'a'.repeat(513) })).toBe('');
		const markup = componentEmbed({ title: '♫'.repeat(1000), description: 'ok', url: 'https://example.com/' });
		expect(markup).toBe('');
	});
});
