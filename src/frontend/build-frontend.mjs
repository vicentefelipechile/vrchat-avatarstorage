import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

const buildOptions = {
	entryPoints: [path.join(__dirname, 'app.ts')],
	bundle: true,
	outfile: path.join(__dirname, '../../public/js/bundle.js'),
	format: /** @type {'iife'} */ ('iife'),
	platform: 'browser',
	target: ['es2020'],
	minify: !isDev,
	sourcemap: isDev,
	legalComments: 'none',

	// Keep i18n files as external so they stay as separate static files
	// served from public/js/i18n/. Comment this out to bundle them:
	// external: ['../../public/js/i18n/*'],

	define: {
		'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
	},

	logLevel: 'info',
};

if (isWatch) {
	const ctx = await esbuild.context(buildOptions);
	await ctx.watch();
	console.log('Watching for changes...');
} else {
	const result = await esbuild.build(buildOptions);
	if (result.errors.length > 0) {
		console.error('Build failed:', result.errors);
		process.exit(1);
	}
	console.log('✅ Frontend bundle built at public/js/bundle.js');
}
