// =========================================================================================================
// features/admin/api.ts — Centralized JSON fetch for admin endpoints (no DataCache by design:
// admin listings mutate often — approve/orphan cleanup — so every read must hit the network)
// =========================================================================================================

import { t } from '../../core/i18n';
import { showPrompt } from '../../lib/confirm';

export class AdminApiError extends Error {
	readonly status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export async function requestTwoFactorCode(): Promise<string | null> {
	return showPrompt({
		title: t('settings.2fa_title'),
		message: t('settings.2fa_code_hint'),
		placeholder: t('settings.2fa_code'),
		confirmText: t('settings.2fa_verify'),
	});
}

export async function adminGet<T>(path: string, signal?: AbortSignal): Promise<T> {
	const res = await fetch(path, { signal });
	if (!res.ok) throw new AdminApiError(res.status, `GET ${path} → ${res.status}`);
	return (await res.json()) as T;
}

export async function adminPost<T = { success: boolean }>(path: string, body?: unknown): Promise<T> {
	const res = await fetch(path, {
		method: 'POST',
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const data = (await res.json().catch(() => null)) as { error?: string } | null;
		throw new AdminApiError(res.status, data?.error ?? `POST ${path} → ${res.status}`);
	}
	return (await res.json()) as T;
}

export async function adminDelete<T = { success: boolean }>(path: string, body: unknown): Promise<T> {
	const res = await fetch(path, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
	if (!res.ok) {
		const data = (await res.json().catch(() => null)) as { error?: string } | null;
		throw new AdminApiError(res.status, data?.error ?? `DELETE ${path} → ${res.status}`);
	}
	return (await res.json()) as T;
}
