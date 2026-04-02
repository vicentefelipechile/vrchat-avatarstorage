// =========================================================================
// views/LoginView.ts — Login form with Google OAuth and 2FA support
// =========================================================================
// FLOW
//  Step 1 — POST /api/auth/login with { username, password, token }
//           If res.ok → full session created (no 2FA) → redirect /
//           If requires_2fa === true → store pre_auth_token, reveal step 2
//  Step 2 — POST /api/auth/login/2fa with { username, code, pre_auth_token }
//           If res.ok → full session created → redirect /
// =========================================================================

import { t } from '../i18n';
import { renderTurnstile, showToast, loadingBtn } from '../utils';
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

			<!-- Step 1: credentials -->
			<form id="login-form">
				<div class="form-group">
					<label for="username">${t('login.username')}</label>
					<input type="text" id="username" required autocomplete="username">
				</div>
				<div class="form-group">
					<label for="password">${t('login.password')}</label>
					<input type="password" id="password" required autocomplete="current-password">
				</div>
				<div id="turnstile-login" class="mb-10"></div>
				<button type="submit" id="login-btn" class="btn" style="width:100%">${t('login.btn')}</button>
			</form>

			<!-- Step 2: 2FA (hidden until needed) -->
			<form id="twofa-form" style="display:none;margin-top:20px">
				<p id="twofa-hint" style="color:var(--text-muted);margin-bottom:12px;text-align:center;font-size:0.9em">
					${t('login.enter2FA')}
				</p>
				<div class="form-group">
					<label for="two-fa-code">${t('login.2fa_code')}</label>
					<input type="text" id="two-fa-code" maxlength="6" placeholder="000000"
					       autocomplete="one-time-code" inputmode="numeric" style="letter-spacing:0.3em;text-align:center;font-size:1.2em">
				</div>
				<button type="submit" id="twofa-btn" class="btn" style="width:100%">
					${t('login.btn')}
				</button>
				<button type="button" id="twofa-back-btn" class="btn" style="width:100%;margin-top:8px;background:var(--bg-secondary)">
					← ${t('login.back')}
				</button>
			</form>

			<div class="or-divider" id="or-divider">
				<span>${t('login.or')}</span>
			</div>

			<div class="oauth-section" id="oauth-section">
				<a href="/api/auth/google" class="btn btn-outline" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;text-decoration:none;padding:12px">
					<img src="/google.svg" alt="Google" width="18" height="18">
					${t('login.google')}
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

	const form = document.getElementById('login-form') as HTMLFormElement;
	const twofaForm = document.getElementById('twofa-form') as HTMLFormElement;
	const orDiv = document.getElementById('or-divider') as HTMLElement;
	const oauthDiv = document.getElementById('oauth-section') as HTMLElement;

	// Ephemeral state kept in closure — no localStorage exposure
	let _preAuthToken = '';
	let _username = '';

	// -----------------------------------------------------------------------
	// Step 1: password login
	// -----------------------------------------------------------------------
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = document.getElementById('login-btn') as HTMLButtonElement;
		const restore = loadingBtn(btn, t('common.loading'));

		const username = (document.getElementById('username') as HTMLInputElement).value.trim();
		const password = (document.getElementById('password') as HTMLInputElement).value;
		const token = (new FormData(form)).get('cf-turnstile-response') as string;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, token }),
			});
			const data = await res.json() as { success?: boolean; requires_2fa?: boolean; pre_auth_token?: string; username?: string; error?: string };

			// Check requires_2fa FIRST — the backend returns 200 for this case too,
			// so we must inspect the payload before treating res.ok as a full login.
			if (data.requires_2fa && data.pre_auth_token) {
				// Store token in closure — never persisted to localStorage
				_preAuthToken = data.pre_auth_token;
				_username = data.username ?? username;

				// Transition to step 2
				form.style.display = 'none';
				orDiv.style.display = 'none';
				oauthDiv.style.display = 'none';
				twofaForm.style.display = 'block';
				(document.getElementById('two-fa-code') as HTMLInputElement).focus();
				showToast(t('login.enter2FA'), 'info');
				return;
			}

			if (res.ok) {
				sessionStorage.setItem('flash_toast', JSON.stringify({ message: t('login.success'), type: 'success' }));
				// Pre-populate auth_state so the nav renders correctly on the redirected page
				// without waiting for the async /api/auth/status fetch.
				localStorage.setItem('auth_state', JSON.stringify({ isLoggedIn: true, isAdmin: false, user: null }));
				window.location.href = '/';
				return;
			}

			showToast(data.error ?? t('login.error'), 'error');
			window.turnstile?.reset();
		} catch {
			showToast(t('common.networkError'), 'error');
		} finally {
			restore();
		}
	});

	// -----------------------------------------------------------------------
	// Step 2: 2FA verification
	// -----------------------------------------------------------------------
	twofaForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = document.getElementById('twofa-btn') as HTMLButtonElement;
		const restore = loadingBtn(btn, t('common.loading'));
		const code = (document.getElementById('two-fa-code') as HTMLInputElement).value.trim();

		if (code.length !== 6 || !/^\d+$/.test(code)) {
			showToast(t('login.invalid2FA'), 'warning');
			restore();
			return;
		}

		try {
			const res = await fetch('/api/auth/login/2fa', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: _username, code, pre_auth_token: _preAuthToken }),
			});
			const data = await res.json() as { success?: boolean; error?: string };

			if (res.ok) {
				sessionStorage.setItem('flash_toast', JSON.stringify({ message: t('login.success') || '¡Sesión iniciada!', type: 'success' }));
				// Pre-populate auth_state so the nav renders correctly on the redirected page
				// without waiting for the async /api/auth/status fetch.
				localStorage.setItem('auth_state', JSON.stringify({ isLoggedIn: true, isAdmin: false, user: null }));
				window.location.href = '/';
				return;
			}

			showToast(data.error ?? t('login.error'), 'error');

			// If token expired, force back to step 1
			if (res.status === 401) {
				_preAuthToken = '';
				_username = '';
				twofaForm.style.display = 'none';
				form.style.display = 'block';
				orDiv.style.display = '';
				oauthDiv.style.display = '';
				window.turnstile?.reset();
			}
		} catch {
			showToast(t('common.networkError'), 'error');
		} finally {
			restore();
		}
	});

	// Back button — go back to step 1
	document.getElementById('twofa-back-btn')?.addEventListener('click', () => {
		_preAuthToken = '';
		_username = '';
		twofaForm.style.display = 'none';
		form.style.display = 'block';
		orDiv.style.display = '';
		oauthDiv.style.display = '';
		(document.getElementById('password') as HTMLInputElement).value = '';
		window.turnstile?.reset();
	});
}
