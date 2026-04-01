// =========================================================================
// views/SettingsView.ts — User settings: profile, avatar, and 2FA
// =========================================================================

import { t } from '../i18n';
import { renderTurnstile, resizeImage } from '../utils';
import type { RouteContext } from '../types';

// =========================================================================
// View
// =========================================================================

export async function settingsView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('settings.title')}`;

	const user = window.appState.user ?? {};
	const avatarUrl = (user as { avatar_url?: string }).avatar_url ?? 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';
	const username = (user as { username?: string }).username ?? '';

	return `
		<div class="login-box" style="max-width:500px">
			<h1>${t('settings.title')}</h1>
			<div id="settings-error" class="danger"></div>
			<div id="settings-success" class="success" style="color:green;margin-bottom:20px;text-align:center"></div>

			<div style="text-align:center;margin-bottom:30px">
				<img id="current-avatar" src="${avatarUrl}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #ddd">
			</div>

			<form id="settings-form">
				<div class="form-group">
					<label for="username">${t('login.username')}</label>
					<input type="text" id="username" value="${username}" required minlength="3" maxlength="32">
				</div>
				<div class="form-group">
					<label for="avatar">${t('settings.avatar')}</label>
					<input type="file" id="avatar" accept="image/png,image/jpg,image/jpeg,image/gif,image/webp,image/avif">
					<small style="color:#666;display:block;margin-top:5px">Optional. Max 5MB.</small>
				</div>
				<div id="turnstile-settings" class="mb-10"></div>
				<button type="submit" class="btn" style="width:100%;margin-bottom:20px">${t('settings.save')}</button>
			</form>

			<hr style="margin:30px 0">

			<details id="two-factor-details">
				<summary style="cursor:pointer;padding:10px;background:#f5f5f5;border-radius:5px">
					<h2 style="margin:0;display:inline">${t('settings.2fa_title') || 'Two-Factor Authentication'}</h2>
				</summary>
				<div id="two-factor-section" style="padding:20px 0">
					<div id="2fa-status"></div>

					<div id="2fa-enable-section" style="display:none;margin-top:15px">
						<button id="2fa-enable-btn" class="btn" style="width:100%">${t('settings.2fa_activate') || 'Activate 2FA'}</button>
					</div>

					<div id="2fa-password-section" style="display:none;margin-top:20px">
						<div class="form-group">
							<label>${t('settings.2fa_password') || 'Password'}</label>
							<input type="password" id="2fa-setup-password" style="width:100%">
						</div>
						<div id="2fa-password-error" class="danger"></div>
						<button id="2fa-confirm-password-btn" class="btn" style="width:100%">${t('settings.2fa_continue') || 'Continue'}</button>
						<button type="button" id="2fa-cancel-password-btn" class="btn" style="width:100%;margin-top:10px;background:#666">${t('settings.2fa_cancel') || 'Cancel'}</button>
					</div>

					<div id="2fa-setup" style="display:none;margin-top:20px">
						<p style="color:#666">${t('settings.2fa_setup_instructions') || 'Scan the QR code with your authenticator app, then enter the code to enable 2FA.'}</p>
						<div id="2fa-qr-container" style="text-align:center;margin:20px 0"></div>
						<div class="form-group">
							<label>${t('settings.2fa_secret') || 'Manual Secret Key'}</label>
							<code id="2fa-secret" style="display:block;word-break:break-all;background:#f5f5f5;padding:10px;margin:5px 0"></code>
						</div>
						<div class="form-group">
							<label>${t('settings.2fa_verify') || 'Enter Code'}</label>
							<input type="text" id="2fa-code" maxlength="6" placeholder="000000" style="width:100%">
						</div>
						<div id="2fa-setup-error" class="danger"></div>
						<button id="2fa-verify-btn" class="btn" style="width:100%">${t('settings.2fa_enable') || 'Enable 2FA'}</button>
						<button type="button" id="2fa-cancel-setup-btn" class="btn" style="width:100%;margin-top:10px;background:#666">${t('settings.2fa_cancel') || 'Cancel'}</button>
					</div>

					<div id="2fa-backup-codes" style="display:none;margin-top:20px">
						<p style="color:red;font-weight:bold">${t('settings.2fa_backup_warning') || 'Save these backup codes! You will not see them again.'}</p>
						<code id="backup-codes-list" style="display:block;word-break:break-all;background:#f5f5f5;padding:10px;margin:10px 0;white-space:pre-wrap"></code>
						<button id="2fa-backup-ok-btn" class="btn" style="width:100%">${t('settings.2fa_backup_ok') || 'I have saved my codes'}</button>
					</div>

					<div id="2fa-enabled-section" style="display:none;margin-top:15px">
						<p style="color:green">✓ ${t('settings.2fa_enabled') || '2FA is enabled'}</p>
						<button id="2fa-disable-btn" class="btn" style="width:100%;background:#dc3545">${t('settings.2fa_disable') || 'Disable 2FA'}</button>
					</div>

					<div id="2fa-disable-section" style="display:none;margin-top:20px">
						<div class="form-group">
							<label>${t('settings.2fa_password') || 'Password'}</label>
							<input type="password" id="2fa-disable-password" style="width:100%">
						</div>
						<div class="form-group">
							<label>${t('settings.2fa_code') || '2FA Code'}</label>
							<input type="text" id="2fa-disable-code" maxlength="6" placeholder="000000" style="width:100%">
						</div>
						<div id="2fa-disable-error" class="danger"></div>
						<button id="2fa-confirm-disable-btn" class="btn" style="width:100%;background:#dc3545">${t('settings.2fa_confirm_disable') || 'Confirm Disable'}</button>
						<button type="button" id="2fa-disable-cancel-btn" class="btn" style="width:100%;margin-top:10px;background:#666">${t('settings.2fa_cancel') || 'Cancel'}</button>
					</div>
				</div>
			</details>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function settingsAfter(_ctx: RouteContext): Promise<void> {
	renderTurnstile('#turnstile-settings');

	const form = document.getElementById('settings-form') as HTMLFormElement;
	const errorDiv = document.getElementById('settings-error')!;
	const successDiv = document.getElementById('settings-success')!;
	const avatarInput = document.getElementById('avatar') as HTMLInputElement;
	const imgPreview = document.getElementById('current-avatar') as HTMLImageElement;

	// Avatar preview
	avatarInput.addEventListener('change', (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) imgPreview.src = URL.createObjectURL(file);
	});

	// Profile form
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		const restore = () => { btn.disabled = false; btn.textContent = t('settings.save'); };

		btn.disabled = true;
		btn.textContent = 'Saving…';
		errorDiv.textContent = '';
		successDiv.textContent = '';

		const username = (document.getElementById('username') as HTMLInputElement).value;
		const avatarFile = avatarInput.files?.[0];
		const token = (new FormData(form)).get('cf-turnstile-response') as string;

		try {
			let avatarUrl: string | null = null;
			if (avatarFile) {
				const resized = await resizeImage(avatarFile, 128, 128);
				const fd = new FormData();
				fd.append('file', resized);
				fd.append('media_type', 'image');
				const uploadRes = await fetch('/api/upload', { method: 'PUT', body: fd });
				if (!uploadRes.ok) throw new Error('Error uploading avatar');
				const uploadData = await uploadRes.json() as { r2_key: string };
				avatarUrl = `/api/download/${uploadData.r2_key}`;
			}

			const body: Record<string, string> = { username, token };
			if (avatarUrl) body.avatar_url = avatarUrl;

			const res = await fetch('/api/auth/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (res.ok) {
				successDiv.textContent = t('settings.success');
				window.turnstile?.reset();
				setTimeout(() => location.reload(), 1000);
			} else {
				const data = await res.json() as { error?: string };
				throw new Error(data.error ?? 'Update failed');
			}
		} catch (err) {
			errorDiv.textContent = (err as Error).message;
			window.turnstile?.reset();
			restore();
		}
	});

	// 2FA
	await loadTwoFactorStatus();
}

// =========================================================================
// 2FA helpers (module-level so loadTwoFactorStatus can call itself recursively)
// =========================================================================

async function loadTwoFactorStatus(): Promise<void> {
	const els = {
		status: document.getElementById('2fa-status')!,
		enable: document.getElementById('2fa-enable-section')!,
		password: document.getElementById('2fa-password-section')!,
		setup: document.getElementById('2fa-setup')!,
		enabled: document.getElementById('2fa-enabled-section')!,
		disable: document.getElementById('2fa-disable-section')!,
		backup: document.getElementById('2fa-backup-codes')!,
	};

	try {
		const res = await fetch('/api/2fa/status');
		const data = await res.json() as { enabled: boolean };

		Object.values(els).forEach((el) => (el.style.display = 'none'));

		if (data.enabled) {
			els.status.innerHTML = '';
			els.enabled.style.display = 'block';
		} else {
			els.status.innerHTML = `<p style="color:#666">${t('settings.2fa_disabled') || '2FA is not enabled'}</p>`;
			els.enable.style.display = 'block';
		}

		setup2FAHandlers(els);
	} catch { /* ignore */ }
}

type TwoFAEls = { status: HTMLElement; enable: HTMLElement; password: HTMLElement; setup: HTMLElement; enabled: HTMLElement; disable: HTMLElement; backup: HTMLElement };

function setup2FAHandlers(els: TwoFAEls): void {
	const qrContainer = document.getElementById('2fa-qr-container')!;
	const secretText = document.getElementById('2fa-secret')!;
	const backupCodesList = document.getElementById('backup-codes-list')!;

	// Enable → show password step
	document.getElementById('2fa-enable-btn')?.addEventListener('click', () => {
		els.enable.style.display = 'none';
		els.password.style.display = 'block';
	});

	// Cancel password step
	document.getElementById('2fa-cancel-password-btn')?.addEventListener('click', async () => {
		els.password.style.display = 'none';
		await loadTwoFactorStatus();
	});

	// Confirm password → fetch QR
	document.getElementById('2fa-confirm-password-btn')?.addEventListener('click', async () => {
		const password = (document.getElementById('2fa-setup-password') as HTMLInputElement).value;
		const errEl = document.getElementById('2fa-password-error')!;
		if (!password) { errEl.textContent = 'Password is required'; return; }
		try {
			const res = await fetch('/api/2fa/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
			});
			const data = await res.json() as { otpauthUrl?: string; secret?: string; error?: string };
			if (!res.ok) { errEl.textContent = data.error ?? 'Error setting up 2FA'; return; }
			els.password.style.display = 'none';
			els.setup.style.display = 'block';
			qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.otpauthUrl ?? '')}" alt="QR Code">`;
			secretText.textContent = data.secret ?? '';
		} catch {
			(document.getElementById('2fa-password-error') as HTMLElement).textContent = 'Error setting up 2FA';
		}
	});

	// Cancel setup
	document.getElementById('2fa-cancel-setup-btn')?.addEventListener('click', async () => {
		els.setup.style.display = 'none';
		await loadTwoFactorStatus();
	});

	// Verify TOTP code
	document.getElementById('2fa-verify-btn')?.addEventListener('click', async () => {
		const code = (document.getElementById('2fa-code') as HTMLInputElement).value;
		const errEl = document.getElementById('2fa-setup-error')!;
		try {
			const res = await fetch('/api/2fa/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			const data = await res.json() as { backupCodes?: string[]; error?: string };
			if (res.ok) {
				els.setup.style.display = 'none';
				els.backup.style.display = 'block';
				backupCodesList.textContent = data.backupCodes?.join('\n') ?? '';
			} else {
				errEl.textContent = data.error ?? 'Invalid code';
			}
		} catch {
			(document.getElementById('2fa-setup-error') as HTMLElement).textContent = 'Error verifying code';
		}
	});

	// Backup codes OK
	document.getElementById('2fa-backup-ok-btn')?.addEventListener('click', async () => {
		els.backup.style.display = 'none';
		await loadTwoFactorStatus();
	});

	// Show disable section
	document.getElementById('2fa-disable-btn')?.addEventListener('click', () => {
		els.enabled.style.display = 'none';
		els.disable.style.display = 'block';
	});

	// Cancel disable
	document.getElementById('2fa-disable-cancel-btn')?.addEventListener('click', () => {
		els.disable.style.display = 'none';
		els.enabled.style.display = 'block';
	});

	// Confirm disable
	document.getElementById('2fa-confirm-disable-btn')?.addEventListener('click', async () => {
		const password = (document.getElementById('2fa-disable-password') as HTMLInputElement).value;
		const code = (document.getElementById('2fa-disable-code') as HTMLInputElement).value;
		const errEl = document.getElementById('2fa-disable-error')!;
		try {
			const res = await fetch('/api/2fa/disable', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password, code: code || '' }),
			});
			const data = await res.json() as { error?: string };
			if (res.ok) {
				alert(t('settings.2fa_disabled_success') || '2FA disabled successfully!');
				els.disable.style.display = 'none';
				await loadTwoFactorStatus();
			} else {
				errEl.textContent = data.error ?? 'Error disabling 2FA';
			}
		} catch {
			(document.getElementById('2fa-disable-error') as HTMLElement).textContent = 'Error disabling 2FA';
		}
	});
}
