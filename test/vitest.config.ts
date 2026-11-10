// =========================================================================================================
// BACKEND TEST CONFIGURATION
// =========================================================================================================
// Runs the real Worker and its bindings locally without touching development or remote storage.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { fileURLToPath, URL } from 'node:url';

import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// =========================================================================================================
// Configuration
// =========================================================================================================

export default defineConfig({
	plugins: [
		cloudflareTest(async () => ({
			wrangler: { configPath: fileURLToPath(new URL('./wrangler.jsonc', import.meta.url)) },
			miniflare: {
				bindings: {
					JWT_SECRET: 'backend-tests-only-secret',
					RESEND_API_KEY: 're_tests_only',
					EMAIL_ADMIN: 'admin@gmail.com',
					TEST_MIGRATIONS: await readD1Migrations(fileURLToPath(new URL('../migrations', import.meta.url))),
				},
			},
		})),
	],
	test: {
		include: ['test/backend/**/*.test.ts'],
		setupFiles: ['test/setup/migrations.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['src/frontend/**', 'src/tools/**'],
			reporter: ['text-summary', 'html'],
			reportsDirectory: 'coverage/backend',
		},
	},
});
