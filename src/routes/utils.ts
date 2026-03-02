// =========================================================================================================
// UTILITY ROUTES
// =========================================================================================================
// Configuration and utility endpoints
// =========================================================================================================

import { Hono } from 'hono';

const utils = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /config
 * Devuelve la configuracion del sitio web. De momento solo el site key de turnstile para el captcha.
 */
utils.get('/config', (c) => {
    return c.json({
        turnstileSiteKey: (c.env.TURNSTILE_SITE_KEY || '').trim()
    });
});

/**
 * Endpoint: /version
 * Devuelve información del worker y entorno para debugging
 */
utils.get('/version', async (c) => {
    const versionMetadata = c.env.CF_VERSION_METADATA;
    
    const buildTimestamp = parseInt(versionMetadata.timestamp) * 1000;
    
    const commitHash = versionMetadata.id ? versionMetadata.id.substring(0, 7) : 'unknown';
    
    return c.json({
        worker: {
            versionId: versionMetadata.id || 'unknown',
            versionTag: versionMetadata.tag || 'unknown',
            commitHash: commitHash,
            deployedAt: versionMetadata.timestamp ? new Date(buildTimestamp).toISOString() : 'unknown',
            deployedAtTimestamp: versionMetadata.timestamp || 0,
            compatibilityDate: '2026-02-12',
        },
        runtime: {
            name: 'Cloudflare Workers',
            runtime: 'v8 isolate',
        },
        environment: {
            zone: c.req.header('CF-Ray') ? 'cf-zone' : 'unknown',
            country: c.req.header('CF-IPCountry') || 'unknown',
            colo: c.req.header('CF-Ray')?.split('-')[1] || 'unknown',
        },
        request: {
            rayId: c.req.header('CF-Ray') || 'unknown',
            requestId: c.req.header('CF-Request-Id') || 'unknown',
            nodeVersion: 'workers-v8',
        },
        build: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        }
    });
});

/**
 * Helper: Verify Turnstile CAPTCHA
 */
export async function verifyTurnstile(token: string, secret: string) {
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

export default utils;
