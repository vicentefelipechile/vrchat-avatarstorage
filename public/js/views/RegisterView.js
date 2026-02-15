import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';
import { renderTurnstile } from '../utils.js';

export default class RegisterView extends AbstractView {
    async getHtml() {
        return `
            <div class="login-box">
                <h1>${t('register.title')}</h1>
                <form id="register-form">
                    <div class="form-group">
                        <label for="username">${t('login.username')}</label>
                        <input type="text" id="username" required minlength="3" maxlength="32">
                    </div>
                    <div class="form-group">
                        <label for="password">${t('login.password')}</label>
                        <input type="password" id="password" required minlength="8">
                    </div>
                    <div id="turnstile-container" class="mb-10"></div>
                    <div id="register-error" class="danger"></div>
                    <div id="register-success" class="success" style="color: green;"></div>
                    <button type="submit" class="btn" style="width: 100%">${t('register.btn')}</button>
                </form>
                <div style="margin-top: 15px; text-align: center;">
                    <a href="/login" data-link>${t('register.loginLink')}</a>
                </div>
            </div>
        `;
    }

    async postRender() {
        const form = document.getElementById('register-form');
        renderTurnstile('#turnstile-container');

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('register-error');
            const successDiv = document.getElementById('register-success');
            const btn = form.querySelector('button');

            // Get Turnstile Token
            const formData = new FormData(form);
            const token = formData.get('cf-turnstile-response');

            btn.disabled = true;
            btn.textContent = '...';
            errorDiv.textContent = '';
            successDiv.textContent = '';

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, token })
                });

                if (res.ok) {
                    successDiv.textContent = t('register.success');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    const data = await res.json();
                    let msg = data.error || 'Registration Failed';
                    if (data.details) {
                        msg += ': ' + data.details.map(d => d.message).join(', ');
                    }
                    errorDiv.innerText = msg;
                    if (window.turnstile) window.turnstile.reset();
                    btn.disabled = false;
                    btn.textContent = t('register.btn');
                }
            } catch (err) {
                console.error(err);
                errorDiv.innerText = 'Registration Failed';
                btn.disabled = false;
                btn.textContent = t('register.btn');
            }
        });
    }
}
