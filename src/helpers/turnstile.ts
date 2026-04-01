// =========================================================================================================
// TURNSTILE HELPER
// =========================================================================================================
// Cloudflare Turnstile CAPTCHA verification helper.
// Imported by any route that requires CAPTCHA verification.
// =========================================================================================================

/**
 * Verifies a Cloudflare Turnstile CAPTCHA token against the Turnstile API.
 * Returns `true` if `secret` is not configured (dev/test environments).
 */
export async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
	if (!secret) return true;

	const formData = new FormData();
	formData.append('secret', secret);
	formData.append('response', token);

	const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		body: formData,
	});

	const outcome = await result.json<{ success: boolean }>();
	return outcome.success;
}
