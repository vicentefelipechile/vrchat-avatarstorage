declare module 'cloudflare:test' {
    interface GlobalProps {
        mainModule: typeof import("../index");
    }
    interface ProvidedEnv extends Env {
        VRCSTORAGE_KV: KVNamespace;
        BUCKET: R2Bucket;
        DB: D1Database;
        UPLOAD_QUEUE: Queue;
        RL_STRICT: RateLimit;
        RL_MEDIUM: RateLimit;
        RL_GLOBAL: RateLimit;
        CF_VERSION_METADATA: WorkerVersionMetadata;
        ASSETS: Fetcher;
        TURNSTILE_SITE_KEY: string;
        TURNSTILE_SECRET_KEY: string;
        JWT_SECRET: string;
    }
}

declare module '*.sql?raw' {
    const content: string;
    export default content;
}