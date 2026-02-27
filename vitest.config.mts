import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		setupFiles: ['./src/test/setup/apply-migrations.ts'],
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					outboundService: (req: any) => fetch(req),
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
