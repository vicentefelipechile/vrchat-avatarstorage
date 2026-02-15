import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';
import { renderTurnstile } from '../utils.js';

export default class LoginView extends AbstractView {
    async getHtml() {
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
                <div style="margin-top: 15px; text-align: center;">
                    <small>${t('login.hint')}</small><br>
                    <a href="/register" data-link>${t('login.register')}</a>
                </div>
            </div>
        `;
    }

    async postRender() {
        const form = document.getElementById('login-form');
        renderTurnstile('#turnstile-container');

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            const btn = form.querySelector('button');

            // Get Turnstile Token
            const formData = new FormData(form);
            const token = formData.get('cf-turnstile-response');

            btn.disabled = true;
            btn.textContent = '...';

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, token })
                });

                if (res.ok) {
                    window.location.href = '/';
                } else {
                    const data = await res.json();
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
    }
}
