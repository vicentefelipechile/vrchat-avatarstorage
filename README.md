# VRCStorage

Storage and sharing for VRChat avatars, assets and clothing, with favorites, comments, collections and a multilingual wiki.

Built with TypeScript, Hono and Cloudflare Workers, using D1, R2, Queues and Durable Objects. The frontend is a vanilla TypeScript SPA bundled with esbuild.

## Development

Configure bindings in `wrangler.jsonc`, copy `.env.example` to `.env` and fill in your local values, then apply the D1 migrations.

```bash
npm install
npm run dev
```

Run `npm run dev:cdn` separately for the local media CDN.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Build frontend, translations and API docs |
| `npm test` | Run Worker, Node and frontend tests |
| `npm run test:typecheck` | Type-check backend tests |
| `npm run test:typecheck:frontend-api` | Type-check frontend tests |
| `npm run seed` | Populate local development data |
| `npm run deploy` | Build and deploy to production |
| `npm run deploy:test` | Build and upload a preview version |
| `npm run deploy:cdn` | Deploy the separate CDN Worker |
| `npm run cf-typegen` | Regenerate Cloudflare binding types |
| `npm run i18n-manager CHECK` | Check translation consistency |

Use `npm run` to list every available script. Apply remote migrations before deploying changes that require them.

Tests use isolated local storage and mocked external services; browser rendering is not covered.

## Reference

- [Architecture and development conventions](AGENTS.md)
- [Contact email setup](src/email/README.md)
- [License](LICENSE)
