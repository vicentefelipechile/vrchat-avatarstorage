import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';
import { renderTurnstile, resizeImage } from '../utils.js';

export default class SettingsView extends AbstractView {
    async getHtml() {
        const user = window.appState.user || {};
        const avatarUrl = user.avatar_url || 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';

        return `
            <div class="login-box" style="max-width: 500px;">
                <h1>${t('settings.title')}</h1>
                <div id="settings-error" class="danger"></div>
                <div id="settings-success" class="success" style="color: green; margin-bottom: 20px; text-align: center;"></div>
                
                <div style="text-align: center; margin-bottom: 30px;">
                    <img id="current-avatar" src="${avatarUrl}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #ddd;">
                </div>

                <form id="settings-form">
                    <div class="form-group">
                        <label for="username">${t('login.username')}</label>
                        <input type="text" id="username" value="${user.username || ''}" required minlength="3" maxlength="32">
                    </div>
                    
                    <div class="form-group">
                        <label for="avatar">${t('settings.avatar')}</label>
                        <input type="file" id="avatar" accept="image/png,image/jpg,image/jpeg,image/gif,image/webp,image/avif">
                        <small style="color: #666; display: block; margin-top: 5px;">Optional. Max 5MB.</small>
                    </div>

                    <div id="turnstile-settings" class="mb-10"></div>

                    <button type="submit" class="btn" style="width: 100%; margin-bottom: 20px;">${t('settings.save')}</button>
                </form>

                <hr style="margin: 30px 0;">

                <details id="two-factor-details">
                    <summary style="cursor: pointer; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                        <h2 style="margin: 0; display: inline;">${t('settings.2fa_title') || 'Two-Factor Authentication'}</h2>
                    </summary>
                    
                    <div id="two-factor-section" style="padding: 20px 0;">
                        <div id="2fa-status"></div>
                        
                        <div id="2fa-enable-section" style="display: none; margin-top: 15px;">
                            <button id="2fa-enable-btn" class="btn" style="width: 100%;">${t('settings.2fa_activate') || 'Activate 2FA'}</button>
                        </div>
                        
                        <div id="2fa-password-section" style="display: none; margin-top: 20px;">
                            <div class="form-group">
                                <label>${t('settings.2fa_password') || 'Password'}</label>
                                <input type="password" id="2fa-setup-password" style="width: 100%;">
                            </div>
                            <div id="2fa-password-error" class="danger"></div>
                            <button id="2fa-confirm-password-btn" class="btn" style="width: 100%;">${t('settings.2fa_continue') || 'Continue'}</button>
                            <button type="button" id="2fa-cancel-password-btn" class="btn" style="width: 100%; margin-top: 10px; background: #666;">${t('settings.2fa_cancel') || 'Cancel'}</button>
                        </div>
                        
                        <div id="2fa-setup" style="display: none; margin-top: 20px;">
                            <p style="color: #666;">${t('settings.2fa_setup_instructions') || 'Scan the QR code with your authenticator app, then enter the code to enable 2FA.'}</p>
                            <div id="2fa-qr-container" style="text-align: center; margin: 20px 0;"></div>
                            <div class="form-group">
                                <label>${t('settings.2fa_secret') || 'Manual Secret Key'}</label>
                                <code id="2fa-secret" style="display: block; word-break: break-all; background: #f5f5f5; padding: 10px; margin: 5px 0;"></code>
                            </div>
                            <div class="form-group">
                                <label>${t('settings.2fa_verify') || 'Enter Code'}</label>
                                <input type="text" id="2fa-code" maxlength="6" placeholder="000000" style="width: 100%;">
                            </div>
                            <div id="2fa-setup-error" class="danger"></div>
                            <button id="2fa-verify-btn" class="btn" style="width: 100%;">${t('settings.2fa_enable') || 'Enable 2FA'}</button>
                            <button type="button" id="2fa-cancel-setup-btn" class="btn" style="width: 100%; margin-top: 10px; background: #666;">${t('settings.2fa_cancel') || 'Cancel'}</button>
                        </div>
                        
                        <div id="2fa-backup-codes" style="display: none; margin-top: 20px;">
                            <p style="color: red; font-weight: bold;">${t('settings.2fa_backup_warning') || 'Save these backup codes! You will not see them again.'}</p>
                            <code id="backup-codes-list" style="display: block; word-break: break-all; background: #f5f5f5; padding: 10px; margin: 10px 0; white-space: pre-wrap;"></code>
                            <button id="2fa-backup-ok-btn" class="btn" style="width: 100%;">${t('settings.2fa_backup_ok') || 'I have saved my codes'}</button>
                        </div>
                        
                        <div id="2fa-enabled-section" style="display: none; margin-top: 15px;">
                            <p style="color: green;">✓ ${t('settings.2fa_enabled') || '2FA is enabled'}</p>
                            <button id="2fa-disable-btn" class="btn" style="width: 100%; background: #dc3545;">${t('settings.2fa_disable') || 'Disable 2FA'}</button>
                        </div>
                        
                        <div id="2fa-disable-section" style="display: none; margin-top: 20px;">
                            <div class="form-group">
                                <label>${t('settings.2fa_password') || 'Password'}</label>
                                <input type="password" id="2fa-disable-password" style="width: 100%;">
                            </div>
                            <div class="form-group">
                                <label>${t('settings.2fa_code') || '2FA Code'}</label>
                                <input type="text" id="2fa-disable-code" maxlength="6" placeholder="000000" style="width: 100%;">
                            </div>
                            <div id="2fa-disable-error" class="danger"></div>
                            <button id="2fa-confirm-disable-btn" class="btn" style="width: 100%; background: #dc3545;">${t('settings.2fa_confirm_disable') || 'Confirm Disable'}</button>
                            <button type="button" id="2fa-disable-cancel-btn" class="btn" style="width: 100%; margin-top: 10px; background: #666;">${t('settings.2fa_cancel') || 'Cancel'}</button>
                        </div>
                    </div>
                </details>
            </div>
        `;
    }

    async postRender() {
        renderTurnstile('#turnstile-settings');

        const form = document.getElementById('settings-form');
        const errorDiv = document.getElementById('settings-error');
        const successDiv = document.getElementById('settings-success');
        const avatarInput = document.getElementById('avatar');
        const imgPreview = document.getElementById('current-avatar');

        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                imgPreview.src = url;
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Saving...';
            btn.disabled = true;
            errorDiv.textContent = '';
            successDiv.textContent = '';

            const username = document.getElementById('username').value;
            const avatarFile = avatarInput.files[0];
            const formData = new FormData(form);
            const token = formData.get('cf-turnstile-response');

            let avatarUrl = null;

            try {
                if (avatarFile) {
                    const resizedAvatar = await resizeImage(avatarFile, 128, 128);
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', resizedAvatar);
                    uploadFormData.append('media_type', 'image');

                    const uploadRes = await fetch('/api/upload', {
                        method: 'PUT',
                        body: uploadFormData
                    });

                    if (!uploadRes.ok) throw new Error('Error uploading avatar');
                    const uploadData = await uploadRes.json();
                    avatarUrl = `/api/download/${uploadData.r2_key}`;
                }

                const updateBody = { username, token };
                if (avatarUrl) updateBody.avatar_url = avatarUrl;

                const res = await fetch('/api/user', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateBody)
                });

                if (res.ok) {
                    successDiv.textContent = t('settings.success');
                    if (window.turnstile) window.turnstile.reset();
                    setTimeout(() => location.reload(), 1000);
                } else {
                    const data = await res.json();
                    throw new Error(data.error || 'Update failed');
                }

            } catch (err) {
                console.error(err);
                errorDiv.textContent = err.message;
                btn.textContent = originalText;
                btn.disabled = false;
                if (window.turnstile) window.turnstile.reset();
            }
        });

        // 2FA Section
        await this.loadTwoFactorStatus();
    }

    async loadTwoFactorStatus() {
        const statusDiv = document.getElementById('2fa-status');
        const enableSection = document.getElementById('2fa-enable-section');
        const passwordSection = document.getElementById('2fa-password-section');
        const setupDiv = document.getElementById('2fa-setup');
        const enabledSection = document.getElementById('2fa-enabled-section');
        const disableSection = document.getElementById('2fa-disable-section');
        const backupCodesDiv = document.getElementById('2fa-backup-codes');
        const backupCodesList = document.getElementById('backup-codes-list');

        try {
            const res = await fetch('/api/2fa/status');
            const data = await res.json();

            // Reset all sections
            enableSection.style.display = 'none';
            passwordSection.style.display = 'none';
            setupDiv.style.display = 'none';
            enabledSection.style.display = 'none';
            disableSection.style.display = 'none';
            backupCodesDiv.style.display = 'none';

            if (data.enabled) {
                statusDiv.innerHTML = '';
                enabledSection.style.display = 'block';
            } else {
                statusDiv.innerHTML = `<p style="color: #666;">${t('settings.2fa_disabled') || '2FA is not enabled'}</p>`;
                enableSection.style.display = 'block';
            }

            this.setupTwoFactorHandlers();

        } catch (err) {
            console.error('Error loading 2FA status:', err);
        }
    }

    async setupTwoFactorHandlers() {
        const enableSection = document.getElementById('2fa-enable-section');
        const passwordSection = document.getElementById('2fa-password-section');
        const setupDiv = document.getElementById('2fa-setup');
        const enabledSection = document.getElementById('2fa-enabled-section');
        const disableSection = document.getElementById('2fa-disable-section');
        const backupCodesDiv = document.getElementById('2fa-backup-codes');
        const qrContainer = document.getElementById('2fa-qr-container');
        const secretText = document.getElementById('2fa-secret');
        const backupCodesList = document.getElementById('backup-codes-list');

        // Activate 2FA button - show password form
        document.getElementById('2fa-enable-btn').addEventListener('click', () => {
            enableSection.style.display = 'none';
            passwordSection.style.display = 'block';
        });

        // Cancel password entry
        document.getElementById('2fa-cancel-password-btn').addEventListener('click', async () => {
            passwordSection.style.display = 'none';
            await this.loadTwoFactorStatus();
        });

        // Confirm password and start setup
        document.getElementById('2fa-confirm-password-btn').addEventListener('click', async () => {
            const password = document.getElementById('2fa-setup-password').value;
            const errorDiv = document.getElementById('2fa-password-error');

            if (!password) {
                errorDiv.innerText = 'Password is required';
                return;
            }

            try {
                const res = await fetch('/api/2fa/setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                const data = await res.json();
                if (!res.ok) {
                    errorDiv.innerText = data.error || 'Error setting up 2FA';
                    return;
                }

                passwordSection.style.display = 'none';
                setupDiv.style.display = 'block';
                qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.otpauthUrl)}" alt="QR Code">`;
                secretText.textContent = data.secret;

            } catch (err) {
                console.error(err);
                errorDiv.innerText = 'Error setting up 2FA';
            }
        });

        // Cancel setup
        document.getElementById('2fa-cancel-setup-btn').addEventListener('click', async () => {
            setupDiv.style.display = 'none';
            await this.loadTwoFactorStatus();
        });

        // Verify and enable 2FA
        document.getElementById('2fa-verify-btn').addEventListener('click', async () => {
            const code = document.getElementById('2fa-code').value;
            const errorDiv = document.getElementById('2fa-setup-error');

            try {
                const res = await fetch('/api/2fa/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const data = await res.json();

                if (res.ok) {
                    setupDiv.style.display = 'none';
                    backupCodesDiv.style.display = 'block';
                    backupCodesList.textContent = data.backupCodes.join('\n');
                } else {
                    errorDiv.innerText = data.error || 'Invalid code';
                }
            } catch (err) {
                console.error(err);
                errorDiv.innerText = 'Error verifying code';
            }
        });

        // OK button after saving backup codes
        document.getElementById('2fa-backup-ok-btn').addEventListener('click', async () => {
            backupCodesDiv.style.display = 'none';
            await this.loadTwoFactorStatus();
        });

        // Disable 2FA button
        document.getElementById('2fa-disable-btn').addEventListener('click', () => {
            enabledSection.style.display = 'none';
            disableSection.style.display = 'block';
        });

        // Cancel disable
        document.getElementById('2fa-disable-cancel-btn').addEventListener('click', () => {
            disableSection.style.display = 'none';
            enabledSection.style.display = 'block';
        });

        // Confirm disable
        document.getElementById('2fa-confirm-disable-btn').addEventListener('click', async () => {
            const password = document.getElementById('2fa-disable-password').value;
            const code = document.getElementById('2fa-disable-code').value;
            const errorDiv = document.getElementById('2fa-disable-error');

            try {
                const res = await fetch('/api/2fa/disable', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password, code: code || '' })
                });

                const data = await res.json();

                if (res.ok) {
                    alert(t('settings.2fa_disabled_success') || '2FA disabled successfully!');
                    disableSection.style.display = 'none';
                    await this.loadTwoFactorStatus();
                } else {
                    errorDiv.innerText = data.error || 'Error disabling 2FA';
                }
            } catch (err) {
                console.error(err);
                errorDiv.innerText = 'Error disabling 2FA';
            }
        });
    }
}
