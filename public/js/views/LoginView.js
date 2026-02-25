import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';
import { renderTurnstile } from '../utils.js';

export default class LoginView extends AbstractView {
	constructor() {
		super();
		this.pendingUsername = null;
	}

	async getHtml() {
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

                <div style="margin-top: 15px; text-align: center;">
                    <small>${t('login.hint')}</small><br>
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
