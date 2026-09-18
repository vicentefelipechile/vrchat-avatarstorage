# VRCStorage (VRChat Avatar Storage)

A fast, scalable, and secure backend and frontend architecture for managing and storing VRChat avatars, resources, and media. Built natively for Cloudflare Workers.

## 🚀 Tech Stack

This project leverages the Cloudflare developer ecosystem for edge execution and scalable resources:

- **Framework**: [Hono](https://hono.dev/) (v4+) for routing and middleware.
- **Language**: [TypeScript](https://www.typescriptlang.org/) for strong typing.
- **Database**: **Cloudflare D1** (Serverless SQLite) for relational data (`c.env.DB`).
- **Object Storage**: **Cloudflare R2** for originals (`c.env.BUCKET`) and processed media (`c.env.MEDIA_BUCKET`).
- **Media Processing**: Cloudflare Images and Media Transformations through Queues.
- **Realtime**: Durable Objects for the live feed.
- **Caching & KV**: **Cloudflare KV** for caching, rate limiting, and temporary data (`c.env.VRCSTORAGE_KV`).
- **Queues**: **Cloudflare Queues** for background processing and handling uploads async (`c.env.UPLOAD_QUEUE`).
- **Validation**: [Zod](https://zod.dev/) for robust schema parsing and input validation.
- **Validation**: TypeScript, Prettier, i18n consistency checks and frontend build. There is currently no test runner configured.

## 🌟 Key Features

- **Resource & Avatar Management**: Create, view, update, and search for VRChat resources, models, and assets.
- **Authentication & Security**:
  - Secure login/registration (with Bcrypt for passwords).
  - Multi-Factor Authentication (2FA) via OTPAuth.
  - OAuth login support.
- **File Upload & Downloads**:
  - Validates files securely using magic bytes instead of just extensions.
  - Efficient file serving through Cloudflare R2 via custom endpoints.
- **Interactions**: Allows users to comment, tag, and add items to favorites.
- **Rate Limiting**: Native protection against abuse directly integrated with Hono middleware using Cloudflare primitives.
- **Cron Jobs**: Scheduled daily tasks (e.g., auto-cleaning orphaned media files).
- **SEO & Social Previews**: Dynamic injection of Open Graph and Twitter tags in the SPA for avatars and resources.
- **Multi-language Wiki**: Built-in comprehensive documentation rendered dynamically using Markdown in multiple languages (pt, fr, jp, ru, es).

## 🗂️ Project Structure

```text
├── public/                 # Static assets, CSS, Client-side logic, and Wiki markdown
├── migrations/             # D1 SQL migrations
├── src/                    # Backend source code
│   ├── auth.ts             # Authentication logic & session handling
│   ├── helpers/            # Utility functions (e.g., file validation via magic bytes)
│   ├── index.ts            # Entrypoint: Worker setup, Middlewares, routing logic
│   ├── http/               # Middleware, routes, queue and scheduled handlers
│   ├── repositories/       # D1 queries
│   ├── services/           # Domain logic
│   ├── test/               # Test configuration and setup wrappers
│   ├── types.ts            # Shared TypeScript interfaces & models
│   └── validators.ts       # Zod schemas & sanitization logic
└── wrangler.jsonc          # Cloudflare configuration, env vars, and bindings
```

## 🛠️ Getting Started & Commands

Ensure you have Node.js and npm installed. The whole environment runs effectively through `wrangler`.

### Installation

```bash
npm install
```

### Local Development

Starts a local development server mirroring Cloudflare architecture (D1, R2, KV).

```bash
npm run dev
```

### Database Seeding

Populates the local D1 database with initial data or mock users:

```bash
npm run seed
```

### Generate Types

Automatically updates `worker-configuration.d.ts` from `wrangler.jsonc` whenever bindings change:

```bash
npm run cf-typegen
```

### Validation

```bash
npx tsc -p tsconfig.json --noEmit
npx tsc -p tsconfig.frontend.json --noEmit
npx prettier --check src/
npm run build-frontend
```

### Deployment

Deploys the application directly to Cloudflare production:

```bash
npm run deploy

# Deploy to preview environment
npm run deploy:test
```

## 🛡️ Best Practices & Rules

- **Validation**: All incoming requests inputs must be verified with Zod schemas and validated in `src/validators.ts`.
- **Sanitization**: Uses `sanitizeHtml` Regex utilities (no DOMPurify) to secure inputs.
- **Database Rules**: Uses prepared statements (`.bind(val)`) to prevent SQL Injection.
- **Code Formatting**: Ensure to run `npx prettier --check src/` for lint checks.

## 📄 License

Check the root for details. All VRCStorage codebase runs as a Cloudflare Worker proxy.
