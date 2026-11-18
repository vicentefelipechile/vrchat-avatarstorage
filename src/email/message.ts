// =========================================================================================================
// EMAIL MESSAGE VALIDATION AND PROXY MARKUP
// =========================================================================================================
// Only explicitly marked proxy blocks are stripped; signatures and other quoted content stay intact.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { addressParser } from 'postal-mime';
import { z } from 'zod';

import { ValidationError } from '../domain/errors';
import { EMAIL_ADDRESS, EMAIL_DOMAIN } from './types';

// =========================================================================================================
// Constants
// =========================================================================================================

const ADDRESS_SCHEMA = z
	.email()
	.max(254)
	.regex(/^[\x21-\x7e]+$/);
const TOKEN_ADDRESS = new RegExp(`^reply\\+([a-f0-9]{32})@${EMAIL_DOMAIN.replaceAll('.', '\\.')}$`, 'i');
const PROXY_BLOCK = /\[VRCStorage proxy ([a-f0-9-]{36})\][\s\S]*?\[\/VRCStorage proxy \1\]/gi;

// =========================================================================================================
// Public helpers
// =========================================================================================================

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function emailAddress(value: string): string {
	const parsed = ADDRESS_SCHEMA.safeParse(value.trim());
	if (!parsed.success) throw new ValidationError('Invalid email address');
	return parsed.data.toLowerCase();
}

export function singleMailbox(value: string | null): string {
	if (!value || value.length > 2048) throw new ValidationError('Exactly one email address is required');
	const addresses = addressParser(value);
	if (addresses.length !== 1 || !addresses[0].address) throw new ValidationError('Exactly one email address is required');
	return emailAddress(addresses[0].address);
}

export function replyToken(address: string): string | null {
	return TOKEN_ADDRESS.exec(address)?.[1].toLowerCase() ?? null;
}

export function replyAddress(token: string): string {
	return `reply+${token}@${EMAIL_DOMAIN}`;
}

export async function hashEmailValue(value: string): Promise<string> {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function messageId(value: string | null): string | null {
	return value && /^<[^<>\s]{1,500}>$/.test(value) ? value : null;
}

export function authenticatedAdmin(headers: Headers): boolean {
	// Trust only the first result inserted by Cloudflare, not a later sender-supplied header.
	const first = (headers.get('Authentication-Results') ?? '').split(/,(?=\s*[^;,\s]+\s*;)/)[0];
	return /^\s*mx\.cloudflare\.net\s*;/i.test(first) && /;\s*dmarc=([a-z]+)(?=\s|;|$)/i.exec(first)?.[1].toLowerCase() === 'pass';
}

export function automatedEmail(headers: Headers, envelopeFrom: string): boolean {
	const automatic = headers.get('Auto-Submitted');
	return (
		!envelopeFrom ||
		envelopeFrom === '<>' ||
		Boolean(automatic && automatic.trim().toLowerCase() !== 'no') ||
		/\b(?:bulk|list|junk)\b/i.test(headers.get('Precedence') ?? '') ||
		headers.has('List-Id') ||
		/multipart\/report/i.test(headers.get('Content-Type') ?? '')
	);
}

export function cleanProxyBlocks(value: string): string {
	return value.replace(PROXY_BLOCK, '').trim();
}

export function proxyBodies(uuid: string, author: string, text: string, html?: string): { text: string; html?: string } {
	const start = `[VRCStorage proxy ${uuid}]`;
	const end = `[/VRCStorage proxy ${uuid}]`;
	const instruction = `Contact from: ${author}. Reply to this email to respond through ${EMAIL_ADDRESS}.`;
	return {
		text: `${start}\n${instruction}\n${end}\n\n${cleanProxyBlocks(text)}`,
		html: html ? `<div>${start}<p>${escapeHtml(instruction)}</p>${end}</div>${cleanProxyBlocks(html)}` : undefined,
	};
}
