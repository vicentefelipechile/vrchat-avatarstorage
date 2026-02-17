import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';
import { renderTurnstile, resizeImage } from '../utils.js';

export default class SettingsView extends AbstractView {
    async getHtml() {
        // Auth is already loaded from localStorage, no need to wait
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
                        <input type="file" id="avatar" accept="image/png,image/jpg,image/jpeg,image/gif">
                        <small style="color: #666; display: block; margin-top: 5px;">Optional. Max 5MB.</small>
                    </div>

                    <div id="turnstile-settings" class="mb-10"></div>

                    <button type="submit" class="btn" style="width: 100%; margin-bottom: 20px;">${t('settings.save')}</button>
                </form>
            </div>
        `;
    }

    async postRender() {
        renderTurnstile('#turnstile-settings');

        // Settings Form Handler
        const form = document.getElementById('settings-form');
        const errorDiv = document.getElementById('settings-error');
        const successDiv = document.getElementById('settings-success');
        const avatarInput = document.getElementById('avatar');
        const imgPreview = document.getElementById('current-avatar');

        // Avatar Preview
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
                // 1. Upload new avatar if selected
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

                // 2. Update User Profile
                const updateBody = {
                    username,
                    token
                };
                if (avatarUrl) updateBody.avatar_url = avatarUrl;

                const res = await fetch('/api/user', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateBody)
                });

                if (res.ok) {
                    successDiv.textContent = t('settings.success');
                    if (window.turnstile) window.turnstile.reset();
                    // Update global state if needed
                    // Reload to reflect changes globally
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
    }
}
