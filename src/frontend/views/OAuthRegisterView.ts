// =========================================================================
// views/OAuthRegisterView.ts — Complete OAuth registration (username pick)
// =========================================================================

import { t } from '../i18n';
import { navigateTo } from '../router';
import type { RouteContext } from '../types';

// =========================================================================
// View
// =========================================================================

export async function oauthRegisterView(ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('oauthRegister.title')}`;

	if (window.appState.isLoggedIn) {
		navigateTo('/');
		return '';
	}

	const token = ctx.query.get('token');
	if (!token) {
		return `<div class="login-box"><p class="danger">Invalid or missing registration token.</p></div>`;
	}

	return `
		<div class="login-box">
			<h1>${t('oauthRegister.title')}</h1>
			<p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.95rem">
				${t('oauthRegister.subtitle')}
			</p>
			<form id="oauth-register-form">
				<div class="form-group">
					<label for="oauth-username">${t('login.username')}</label>
					<input
						type="text"
						id="oauth-username"
						placeholder="${t('oauthRegister.usernamePlaceholder')}"
						minlength="3"
						maxlength="32"
						pattern="[a-zA-Z0-9_]+"
						required
						autocomplete="username"
					>
					<small style="color:var(--text-secondary)">3–32 chars · a-z, A-Z, 0-9, _</small>
				</div>
				<div id="oauth-register-error" class="danger" style="display:none"></div>
				<button type="submit" id="oauth-register-btn" class="btn" style="width:100%;margin-top:12px">
					${t('oauthRegister.btn')}
				</button>
			</form>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export function oauthRegisterAfter(ctx: RouteContext): void {
	const token = ctx.query.get('token');
	if (!token) return;

	const form = document.getElementById('oauth-register-form') as HTMLFormElement | null;
	const errorDiv = document.getElementById('oauth-register-error')!;
	const btn = document.getElementById('oauth-register-btn') as HTMLButtonElement;

	const restoreBtn = () => {
		btn.disabled = false;
		btn.textContent = t('oauthRegister.btn');
	};

	const showError = (msg: string) => {
		errorDiv.textContent = msg;
		errorDiv.style.display = 'block';
		restoreBtn();
	};

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const username = (document.getElementById('oauth-username') as HTMLInputElement).value.trim();

		btn.disabled = true;
		btn.textContent = t('oauthRegister.loading');
		errorDiv.style.display = 'none';

		try {
			const res = await fetch('/api/auth/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, username }),
			});
			const data = (await res.json()) as { success?: boolean; error?: string };

			if (res.ok && data.success) {
				localStorage.removeItem('auth_state');
				window.location.href = '/';
			} else if (res.status === 410) {
				showError(t('oauthRegister.errorExpired'));
			} else if (res.status === 409) {
				showError(t('oauthRegister.errorTaken'));
			} else {
				showError(data.error ?? t('common.error'));
			}
		} catch {
			showError(t('common.error'));
		}
	});
}
