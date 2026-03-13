import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';

export default class OAuthRegisterView extends AbstractView {
	constructor(params) {
		super();
		this.params = params;
	}

	async getHtml() {
		this.setTitle('VRCStorage - Complete Registration');

		if (window.appState.isLoggedIn) {
			window.navigateTo('/');
			return '';
		}

		// Read ?token from the URL
		const token = new URLSearchParams(window.location.search).get('token');
		if (!token) {
			return `<div class="login-box"><p class="danger">Invalid or missing registration token.</p></div>`;
		}

		return `
            <div class="login-box">
                <h1>${t('oauthRegister.title')}</h1>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.95rem;">
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
                        <small style="color: var(--text-secondary);">3–32 chars · a-z, A-Z, 0-9, _</small>
                    </div>
                    <div id="oauth-register-error" class="danger" style="display:none;"></div>
                    <button type="submit" id="oauth-register-btn" class="btn" style="width: 100%; margin-top: 12px;">
                        ${t('oauthRegister.btn')}
                    </button>
                </form>
            </div>
        `;
	}

	async postRender() {
		const token = new URLSearchParams(window.location.search).get('token');
		if (!token) return;

		const form = document.getElementById('oauth-register-form');
		const errorDiv = document.getElementById('oauth-register-error');
		const btn = document.getElementById('oauth-register-btn');

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = document.getElementById('oauth-username').value.trim();

			btn.disabled = true;
			btn.textContent = t('oauthRegister.loading');
			errorDiv.style.display = 'none';

			try {
				const res = await fetch('/api/auth/complete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token, username }),
				});

				const data = await res.json();

				if (res.ok && data.success) {
					// Clear cached auth so nav refreshes
					localStorage.removeItem('auth_state');
					window.location.href = '/';
				} else if (res.status === 410) {
					errorDiv.textContent = t('oauthRegister.errorExpired');
					errorDiv.style.display = 'block';
					btn.disabled = false;
					btn.textContent = t('oauthRegister.btn');
				} else if (res.status === 409) {
					errorDiv.textContent = t('oauthRegister.errorTaken');
					errorDiv.style.display = 'block';
					btn.disabled = false;
					btn.textContent = t('oauthRegister.btn');
				} else if (res.status === 400) {
					errorDiv.textContent = t('oauthRegister.errorInvalid');
					errorDiv.style.display = 'block';
					btn.disabled = false;
					btn.textContent = t('oauthRegister.btn');
				} else {
					errorDiv.textContent = data.error || t('common.error');
					errorDiv.style.display = 'block';
					btn.disabled = false;
					btn.textContent = t('oauthRegister.btn');
				}
			} catch (err) {
				console.error('[OAuthRegisterView]', err);
				errorDiv.textContent = t('common.error');
				errorDiv.style.display = 'block';
				btn.disabled = false;
				btn.textContent = t('oauthRegister.btn');
			}
		});
	}
}
