import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';
import { renderTurnstile } from '../utils.js';

export default class LoginView extends AbstractView {
	constructor() {
		super();
		this.pendingUsername = null;
	}

	async getHtml() {
		this.setTitle('VRCStorage - Login');

		if (window.appState.isLoggedIn) {
			window.navigateTo('/settings');
			return '';
		}

		return `
            <div class="login-box">
                <h1>${t('login.title')}</h1>
                <form id="login-form">
                    <div class="form-group">
                        <label for="username">${t('login.username')}</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">${t('login.password')}</label>
                        <input type="password" id="password" required>
                    </div>
                    <div id="turnstile-container" class="mb-10"></div>
                    <div id="login-error" class="danger"></div>
                    <button type="submit" class="btn" style="width: 100%">${t('login.btn')}</button>
                </form>

                <form id="login-2fa-form" style="display: none;">
                    <div class="form-group">
                        <label for="2fa-code">${t('login.2fa_code')}</label>
                        <input type="text" id="2fa-code" maxlength="8" placeholder="000000" required>
                        <small style="color: #666;">${t('login.2fa_hint')}</small>
                    </div>
                    <div id="login-2fa-error" class="danger"></div>
                    <button type="submit" class="btn" style="width: 100%">${t('login.btn')}</button>
                    <button type="button" id="back-to-login" class="btn" style="width: 100%; margin-top: 10px; background: #666;">${t('login.back')}</button>
                </form>

                <div style="margin-top: 15px; text-align: center; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary);">
                        <hr style="flex: 1; border: none; border-top: 1px solid var(--border-color);">
                        <span style="font-size: 0.85rem;">${t('login.or')}</span>
                        <hr style="flex: 1; border: none; border-top: 1px solid var(--border-color);">
                    </div>
                    <a href="/api/auth/google" class="btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: #fff; color: #3c4043; border: 1px solid #3c4043; font-weight: 500; text-decoration: none;">
                        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
                            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
                        </svg>
                        ${t('login.google')}
                    </a>
                    <small>${t('login.hint')}</small>
                    <a href="/register" data-link>${t('login.register')}</a>
                </div>
            </div>
        `;
	}

	async postRender() {
		const loginForm = document.getElementById('login-form');
		const login2faForm = document.getElementById('login-2fa-form');
		renderTurnstile('#turnstile-container');

		loginForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = document.getElementById('username').value;
			const password = document.getElementById('password').value;
			const errorDiv = document.getElementById('login-error');
			const btn = loginForm.querySelector('button');

			const formData = new FormData(loginForm);
			const token = formData.get('cf-turnstile-response');

			btn.disabled = true;
			btn.textContent = '...';

			try {
				const res = await fetch('/api/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ username, password, token }),
				});

				const data = await res.json();

				if (res.ok) {
					if (data.requires_2fa) {
						this.pendingUsername = data.username;
						loginForm.style.display = 'none';
						login2faForm.style.display = 'block';
						btn.disabled = false;
						btn.textContent = t('login.btn');
					} else {
						window.location.href = '/';
					}
				} else {
					errorDiv.innerText = data.error || t('login.error');
					if (window.turnstile) window.turnstile.reset();
					btn.disabled = false;
					btn.textContent = t('login.btn');
				}
			} catch (err) {
				console.error(err);
				errorDiv.innerText = 'Login Failed';
				btn.disabled = false;
				btn.textContent = t('login.btn');
			}
		});

		login2faForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const code = document.getElementById('2fa-code').value;
			const errorDiv = document.getElementById('login-2fa-error');
			const btn = login2faForm.querySelector('button[type="submit"]');

			btn.disabled = true;
			btn.textContent = '...';

			try {
				const res = await fetch('/api/login/2fa', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ username: this.pendingUsername, code }),
				});

				if (res.ok) {
					window.location.href = '/';
				} else {
					const data = await res.json();
					errorDiv.innerText = data.error || t('login.error');
					btn.disabled = false;
					btn.textContent = t('login.btn');
				}
			} catch (err) {
				console.error(err);
				errorDiv.innerText = 'Login Failed';
				btn.disabled = false;
				btn.textContent = t('login.btn');
			}
		});

		document.getElementById('back-to-login').addEventListener('click', () => {
			login2faForm.style.display = 'none';
			loginForm.style.display = 'block';
			this.pendingUsername = null;
		});
	}
}
