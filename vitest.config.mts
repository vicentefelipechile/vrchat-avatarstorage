import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		setupFiles: ['./src/test/setup/index.ts'],
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					outboundService: async (req: Request) => {
						// Intercept Turnstile verification calls and return a mocked
						// always-pass response. This avoids real network calls during
						// tests and prevents 500 errors when the endpoint is unreachable.
						if (req.url.includes('challenges.cloudflare.com/turnstile')) {
							return new Response(JSON.stringify({ success: true }), {
								headers: { 'Content-Type': 'application/json' },
							});
						}
						return fetch(req);
					},
					bindings: {
						// Fixed secret for JWT signing in tests
						JWT_SECRET: 'vitest-test-secret-do-not-use-in-prod',
						// Official Cloudflare Turnstile always-pass test key
						// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
						TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
					},
				},
			},
		},
	},
});
