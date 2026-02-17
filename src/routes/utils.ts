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
