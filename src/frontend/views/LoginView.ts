// =========================================================================
// views/LoginView.ts — Login form with Google OAuth and 2FA support
// =========================================================================

import { t } from '../i18n';
import { renderTurnstile } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';

// =========================================================================
// View
// =========================================================================

export async function loginView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('login.title')}`;

	if (window.appState.isLoggedIn) {
		navigateTo('/');
		return '';
	}

	return `
		<div class="login-box">
			<h1>${t('login.title')}</h1>

			<div id="login-error" class="danger"></div>

			<form id="login-form">
				<div class="form-group">
					<label for="username">${t('login.username')}</label>
					<input type="text" id="username" required autocomplete="username">
				</div>
				<div class="form-group">
					<label for="password">${t('login.password')}</label>
					<input type="password" id="password" required autocomplete="current-password">
				</div>
				<div id="two-fa-section" style="display:none">
					<div class="form-group">
						<label for="two-fa-code">${t('login.2faCode') || '2FA Code'}</label>
						<input type="text" id="two-fa-code" maxlength="6" placeholder="000000" autocomplete="one-time-code">
					</div>
				</div>
				<div id="turnstile-login" class="mb-10"></div>
				<button type="submit" class="btn" style="width:100%">${t('login.btn')}</button>
			</form>

			<div class="or-divider">
				<span>${t('login.or') || 'o'}</span>
			</div>

			<div class="oauth-section">
				<a href="/api/auth/google" class="btn btn-outline" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;text-decoration:none;padding:12px">
					<img src="/google.svg" alt="Google" width="18" height="18">
					${t('login.google') || 'Continuar con Google'}
				</a>
			</div>

			<p style="margin-top:12px;text-align:center">
				<a href="/register" data-link>${t('login.register')}</a>
			</p>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export function loginAfter(_ctx: RouteContext): void {
	renderTurnstile('#turnstile-login');

	const form = document.getElementById('login-form') as HTMLFormElement | null;
	const errorDiv = document.getElementById('login-error')!;
	const twoFaSection = document.getElementById('two-fa-section')!;

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		const restore = () => { btn.disabled = false; btn.textContent = t('login.btn'); };

		btn.disabled = true;
		btn.textContent = t('common.loading');
		errorDiv.textContent = '';

		const username = (document.getElementById('username') as HTMLInputElement).value;
		const password = (document.getElementById('password') as HTMLInputElement).value;
		const twoFaCode = (document.getElementById('two-fa-code') as HTMLInputElement).value;
		const token = (new FormData(form)).get('cf-turnstile-response') as string;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, token, code: twoFaCode || undefined }),
			});
			const data = await res.json() as { requires2FA?: boolean; error?: string };

			if (res.ok) {
				localStorage.removeItem('auth_state');
				window.location.href = '/';
			} else if (res.status === 403 && data.requires2FA) {
				twoFaSection.style.display = 'block';
				errorDiv.textContent = t('login.enter2FA') || 'Please enter your 2FA code';
				restore();
			} else {
				errorDiv.textContent = data.error ?? t('login.error');
				window.turnstile?.reset();
				restore();
			}
		} catch {
			errorDiv.textContent = t('common.networkError') || 'Network error';
			restore();
		}
	});
}
