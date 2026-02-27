// =========================================================================================================
// TEST ENV TYPES
// =========================================================================================================
// Extends the `cloudflare:test` ProvidedEnv interface so TypeScript knows
// what bindings are available inside tests via `import { env } from 'cloudflare:test'`.
// =========================================================================================================

declare module 'cloudflare:test' {
    // Re-use the global Env type defined in worker-configuration.d.ts
    // so all bindings (DB, BUCKET, VRCSTORAGE_KV, etc.) are available.
    interface ProvidedEnv extends Env { }
}
