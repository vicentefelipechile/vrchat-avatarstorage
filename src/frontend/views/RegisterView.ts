// =========================================================================
// views/RegisterView.ts — New account registration
// =========================================================================

import { t } from '../i18n';
import { renderTurnstile, showToast } from '../utils';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';

// =========================================================================
// View
// =========================================================================

export async function registerView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('register.title')}`;

	if (window.appState.isLoggedIn) {
		navigateTo('/');
		return '';
	}

	return `
		<div class="login-box">
			<h1>${t('register.title')}</h1>

			<form id="register-form">
				<div class="form-group">
					<label for="username">${t('login.username')}</label>
					<input type="text" id="username" required minlength="3" maxlength="32" autocomplete="username">
				</div>
				<div class="form-group">
					<label for="password">${t('login.password')}</label>
					<input type="password" id="password" required minlength="8" autocomplete="new-password">
				</div>
				<div class="form-group">
					<label for="confirm-password">${t('register.confirmPassword')}</label>
					<input type="password" id="confirm-password" required minlength="8" autocomplete="new-password">
				</div>
				<div id="turnstile-register" class="mb-10"></div>
				<button type="submit" class="btn" style="width:100%">${t('register.btn')}</button>
			</form>
			<p style="margin-top:20px;text-align:center">
				${t('register.hasAccount')} <a href="/login" data-link>${t('login.btn')}</a>
			</p>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export function registerAfter(_ctx: RouteContext): void {
	renderTurnstile('#turnstile-register');

	const form = document.getElementById('register-form') as HTMLFormElement | null;

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		const restore = () => { btn.disabled = false; btn.textContent = t('register.btn'); };

		const username = (document.getElementById('username') as HTMLInputElement).value;
		const password = (document.getElementById('password') as HTMLInputElement).value;
		const confirm = (document.getElementById('confirm-password') as HTMLInputElement).value;

		if (password !== confirm) {
			showToast(t('register.passwordMismatch'), 'error');
			return;
		}

		btn.disabled = true;
		btn.textContent = t('common.loading');

		const token = (new FormData(form)).get('cf-turnstile-response') as string;

		try {
			const res = await fetch('/api/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, token }),
			});
			const data = await res.json() as { error?: string };

			if (res.ok) {
				localStorage.removeItem('auth_state');
				navigateTo('/login');
				showToast(t('register.success'), 'success');
			} else {
				showToast(data.error ?? t('register.error'), 'error');
				window.turnstile?.reset();
				restore();
			}
		} catch {
			showToast(t('common.networkError'), 'error');
			restore();
		}
	});
}
