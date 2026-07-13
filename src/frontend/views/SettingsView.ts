// =========================================================================
// views/SettingsView.ts — User settings: profile, avatar, password and 2FA
// =========================================================================

import QRCode from 'qrcode';
import { t } from '../core/i18n';
import { icons } from '../lib/icons';
import { renderTurnstile, resizeImage, showToast, loadingBtn, mediaUrl } from '../lib/utils';
import type { RouteContext } from '../types';

// =========================================================================
// View
// =========================================================================

export async function settingsView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('settings.title')}`;

	const user = window.appState.user ?? {};
	const avatarUrl = (user as { avatar_url?: string }).avatar_url ?? '/avatar.png';
	const username = (user as { username?: string }).username ?? '';
	const hasPassword = (user as { has_password?: boolean }).has_password !== false;

	return `
		<div>
			<h1>${t('settings.title')}</h1>

			<div class="settings-layout">
				<!-- Sidebar navigation -->
				<nav class="settings-nav" role="tablist" aria-label="${t('settings.title')}">
					<button type="button" class="settings-nav-item is-active" data-panel="profile" role="tab" aria-selected="true">
						${icons.user(18)}<span>${t('settings.section_profile')}</span>
					</button>
					<button type="button" class="settings-nav-item" data-panel="security" role="tab" aria-selected="false">
						${icons.lock(18)}<span>${t('settings.section_security')}</span>
					</button>
					<button type="button" class="settings-nav-item" data-panel="twofactor" role="tab" aria-selected="false">
						${icons.shield(18)}<span>${t('settings.section_2fa')}</span>
					</button>
				</nav>

				<!-- Panels -->
				<div class="settings-content">
					<!-- Profile -->
					<section class="settings-panel" id="panel-profile" role="tabpanel">
						<h2 class="settings-panel-title">${t('settings.section_profile')}</h2>
						<p class="settings-panel-desc">${t('settings.section_profile_desc')}</p>

						<form id="settings-form">
							<div class="settings-profile-head">
								<div class="settings-avatar-wrap">
									<img id="current-avatar" class="settings-avatar" src="${avatarUrl}" alt="${t('settings.avatar')}">
								</div>
								<div class="settings-profile-fields">
									<div class="form-group">
										<label for="username">${t('login.username')}</label>
										<input type="text" id="username" value="${username}" required minlength="3" maxlength="32">
									</div>
									<div class="form-group">
										<label for="avatar">${t('settings.avatar')}</label>
										<input type="file" id="avatar" accept="image/png,image/jpg,image/jpeg,image/gif,image/webp,image/avif">
										<small class="settings-hint">${t('settings.avatar_hint')}</small>
									</div>
								</div>
							</div>
							<div id="turnstile-settings" class="mb-10"></div>
							<button type="submit" class="btn">${icons.check(16)} ${t('settings.save')}</button>
						</form>
					</section>

					<!-- Security / password -->
					<section class="settings-panel" id="panel-security" role="tabpanel" hidden>
						<h2 class="settings-panel-title">${t('settings.change_password')}</h2>
						<p class="settings-panel-desc">${t('settings.section_security_desc')}</p>

						<div class="form-group" id="current-password-group"${hasPassword ? '' : ' hidden'}>
							<label for="current-password">${t('settings.current_password')}</label>
							<input type="password" id="current-password" autocomplete="current-password">
						</div>
						${!hasPassword ? `<p class="settings-panel-desc">${t('settings.no_password_hint')}</p>` : ''}
						<div class="form-group">
							<label for="new-password">${t('settings.new_password')}</label>
							<input type="password" id="new-password" autocomplete="new-password" minlength="8" maxlength="200">
						</div>
						<div class="form-group">
							<label for="confirm-password">${t('settings.confirm_password')}</label>
							<input type="password" id="confirm-password" autocomplete="new-password">
						</div>
						<!-- Shown only when user has 2FA enabled -->
						<div id="pw-2fa-section" hidden>
							<div class="form-group">
								<label for="pw-2fa-code">${t('settings.2fa_code')}</label>
								<input type="text" id="pw-2fa-code" maxlength="6" placeholder="000000"
								       autocomplete="one-time-code" inputmode="numeric" style="letter-spacing:0.3em;text-align:center">
								<small class="settings-hint">${t('settings.2fa_code_hint')}</small>
							</div>
						</div>
						<button id="change-password-btn" class="btn">${icons.lock(16)} ${t('settings.change_password')}</button>
					</section>

					<!-- 2FA -->
					<section class="settings-panel" id="panel-twofactor" role="tabpanel" hidden>
						<h2 class="settings-panel-title">${t('settings.2fa_title')}</h2>
						<p class="settings-panel-desc">${t('settings.section_2fa_desc')}</p>

						<div id="two-factor-section">
							<div id="2fa-status"></div>

							<div id="2fa-enable-section" hidden>
								<button id="2fa-enable-btn" class="btn">${icons.shield(16)} ${t('settings.2fa_activate')}</button>
							</div>

							<div id="2fa-password-section" hidden>
								<div class="form-group" id="2fa-password-group">
									<label for="2fa-setup-password">${t('settings.2fa_password')}</label>
									<input type="password" id="2fa-setup-password">
								</div>
								<div class="settings-actions">
									<button id="2fa-confirm-password-btn" class="btn">${t('settings.2fa_continue')}</button>
									<button type="button" id="2fa-cancel-password-btn" class="btn-outline">${t('settings.2fa_cancel')}</button>
								</div>
							</div>

							<div id="2fa-setup" hidden>
								<p class="settings-panel-desc">${t('settings.2fa_setup_instructions')}</p>
								<div id="2fa-qr-container" class="text-center" style="margin:20px 0"></div>
								<div class="form-group">
									<label>${t('settings.2fa_secret')}</label>
									<code id="2fa-secret" class="settings-code"></code>
								</div>
								<div class="form-group">
									<label for="2fa-code">${t('settings.2fa_verify')}</label>
									<input type="text" id="2fa-code" maxlength="6" placeholder="000000">
								</div>
								<div class="settings-actions">
									<button id="2fa-verify-btn" class="btn">${icons.check(16)} ${t('settings.2fa_enable')}</button>
									<button type="button" id="2fa-cancel-setup-btn" class="btn-outline">${t('settings.2fa_cancel')}</button>
								</div>
							</div>

							<div id="2fa-backup-codes" hidden>
								<p class="settings-warning">${t('settings.2fa_backup_warning')}</p>
								<code id="backup-codes-list" class="settings-code"></code>
								<button id="2fa-backup-ok-btn" class="btn">${icons.check(16)} ${t('settings.2fa_backup_ok')}</button>
							</div>

							<div id="2fa-enabled-section" hidden>
								<div class="settings-badge is-on">${icons.check(16)} ${t('settings.2fa_enabled')}</div>
								<button id="2fa-disable-btn" class="btn-danger">${t('settings.2fa_disable')}</button>
							</div>

							<div id="2fa-disable-section" hidden>
								<div class="form-group" id="2fa-disable-password-group">
									<label for="2fa-disable-password">${t('settings.2fa_password')}</label>
									<input type="password" id="2fa-disable-password">
								</div>
								<div class="form-group">
									<label for="2fa-disable-code">${t('settings.2fa_code')}</label>
									<input type="text" id="2fa-disable-code" maxlength="6" placeholder="000000">
								</div>
								<div class="settings-actions">
									<button id="2fa-confirm-disable-btn" class="btn-danger">${t('settings.2fa_confirm_disable')}</button>
									<button type="button" id="2fa-disable-cancel-btn" class="btn-outline">${t('settings.2fa_cancel')}</button>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export async function settingsAfter(_ctx: RouteContext): Promise<void> {
	renderTurnstile('#turnstile-settings');
	setupSectionNav();

	const form = document.getElementById('settings-form') as HTMLFormElement;
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
		const restore = loadingBtn(btn, t('settings.saving'));

		const username = (document.getElementById('username') as HTMLInputElement).value;
		const avatarFile = avatarInput.files?.[0];
		const token = new FormData(form).get('cf-turnstile-response') as string;

		try {
			let avatarUrl: string | null = null;
			if (avatarFile) {
				const resized = await resizeImage(avatarFile, 128, 128);
				const fd = new FormData();
				fd.append('file', resized);
				fd.append('media_type', 'image');
				const uploadRes = await fetch('/api/upload', { method: 'PUT', body: fd });
				if (!uploadRes.ok) throw new Error('Error uploading avatar');
				const uploadData = (await uploadRes.json()) as { r2_key: string; media_uuid: string };
				avatarUrl = mediaUrl(uploadData.media_uuid, 'med');
			}

			const body: Record<string, string> = { username, token };
			if (avatarUrl) body.avatar_url = avatarUrl;

			const res = await fetch('/api/auth/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (res.ok) {
				showToast(t('settings.success'), 'success');
				window.turnstile?.reset();
				setTimeout(() => location.reload(), 1200);
			} else {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error ?? 'Update failed');
			}
		} catch (err) {
			showToast((err as Error).message, 'error');
			window.turnstile?.reset();
		} finally {
			restore();
		}
	});

	// Password change
	await loadPasswordSection();

	// 2FA
	await loadTwoFactorStatus();
}

// =========================================================================
// Section navigation (sidebar tabs)
// =========================================================================

function setupSectionNav(): void {
	const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.settings-nav-item'));
	const panels: Record<string, HTMLElement | null> = {
		profile: document.getElementById('panel-profile'),
		security: document.getElementById('panel-security'),
		twofactor: document.getElementById('panel-twofactor'),
	};

	items.forEach((item) => {
		item.addEventListener('click', () => {
			const target = item.dataset.panel!;
			items.forEach((el) => {
				const active = el === item;
				el.classList.toggle('is-active', active);
				el.setAttribute('aria-selected', String(active));
			});
			Object.entries(panels).forEach(([key, panel]) => {
				if (panel) panel.hidden = key !== target;
			});
		});
	});
}

// =========================================================================
// Password change section
// =========================================================================

async function loadPasswordSection(): Promise<void> {
	// Detect if user has 2FA enabled to show/hide the code field
	let has2FA = false;
	try {
		const res = await fetch('/api/2fa/status');
		const data = (await res.json()) as { enabled: boolean };
		has2FA = data.enabled;
	} catch {
		/* ignore */
	}

	const pw2faSection = document.getElementById('pw-2fa-section') as HTMLElement;
	if (has2FA) pw2faSection.style.display = 'block';

	const hasPassword = window.appState.user?.has_password !== false;

	document.getElementById('change-password-btn')?.addEventListener('click', async () => {
		const btn = document.getElementById('change-password-btn') as HTMLButtonElement;
		const restore = loadingBtn(btn, '…');
		const currentPw = (document.getElementById('current-password') as HTMLInputElement).value;
		const newPw = (document.getElementById('new-password') as HTMLInputElement).value;
		const confirmPw = (document.getElementById('confirm-password') as HTMLInputElement).value;
		const twoFactorCode = (document.getElementById('pw-2fa-code') as HTMLInputElement | null)?.value?.trim();

		if (hasPassword && !currentPw) {
			showToast(t('settings.current_password_required'), 'warning');
			restore();
			return;
		}
		if (newPw.length < 8) {
			showToast(t('settings.password_too_short'), 'warning');
			restore();
			return;
		}
		if (newPw !== confirmPw) {
			showToast(t('settings.password_mismatch'), 'warning');
			restore();
			return;
		}
		if (has2FA && !twoFactorCode) {
			showToast(t('settings.2fa_code_required'), 'warning');
			restore();
			return;
		}

		const body: Record<string, string> = { new_password: newPw };
		if (hasPassword) body.current_password = currentPw;
		if (has2FA && twoFactorCode) body.two_factor_code = twoFactorCode;

		try {
			const res = await fetch('/api/auth/me/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const data = (await res.json()) as { success?: boolean; error?: string };

			if (res.ok) {
				showToast(t('settings.password_changed'), 'success', 4000);
				// All sessions invalidated by the backend — reload to trigger re-auth
				setTimeout(() => {
					window.location.href = '/';
				}, 2500);
			} else {
				showToast(data.error ?? 'Failed to change password', 'error');
			}
		} catch {
			showToast(t('common.networkError'), 'error');
		} finally {
			restore();
		}
	});
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
		const data = (await res.json()) as { enabled: boolean };

		Object.values(els).forEach((el) => (el.style.display = 'none'));

		if (data.enabled) {
			els.status.innerHTML = '';
			els.enabled.style.display = 'block';
		} else {
			els.status.innerHTML = `<div class="settings-badge is-off">${icons.shield(16)} ${t('settings.2fa_disabled')}</div>`;
			els.enable.style.display = 'block';
		}

		setup2FAHandlers(els);
	} catch {
		/* ignore */
	}
}

type TwoFAEls = {
	status: HTMLElement;
	enable: HTMLElement;
	password: HTMLElement;
	setup: HTMLElement;
	enabled: HTMLElement;
	disable: HTMLElement;
	backup: HTMLElement;
};

function setup2FAHandlers(els: TwoFAEls): void {
	const qrContainer = document.getElementById('2fa-qr-container')!;
	const secretText = document.getElementById('2fa-secret')!;
	const backupCodesList = document.getElementById('backup-codes-list')!;

	const hasPassword = window.appState.user?.has_password !== false;

	const fetchQR = async (password?: string, restore?: () => void) => {
		try {
			const res = await fetch('/api/2fa/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(password ? { password } : {}),
			});
			const data = (await res.json()) as { otpauthUrl?: string; secret?: string; error?: string };
			if (!res.ok) {
				showToast(data.error ?? 'Error setting up 2FA', 'error');
				if (restore) restore();
				return;
			}

			els.password.style.display = 'none';
			els.enable.style.display = 'none';
			els.setup.style.display = 'block';
			const canvas = document.createElement('canvas');
			await QRCode.toCanvas(canvas, data.otpauthUrl ?? '', { width: 200, margin: 2 });
			qrContainer.innerHTML = '';
			qrContainer.appendChild(canvas);
			secretText.textContent = data.secret ?? '';
		} catch {
			showToast(t('common.networkError'), 'error');
		} finally {
			if (restore) restore();
		}
	};

	// Enable → show password step (or skip for OAuth)
	document.getElementById('2fa-enable-btn')?.addEventListener('click', async () => {
		els.enable.style.display = 'none';
		if (hasPassword) {
			els.password.style.display = 'block';
		} else {
			const btn = document.getElementById('2fa-enable-btn') as HTMLButtonElement;
			const restore = loadingBtn(btn, '…');
			await fetchQR(undefined, restore);
		}
	});

	// Cancel password step
	document.getElementById('2fa-cancel-password-btn')?.addEventListener('click', async () => {
		els.password.style.display = 'none';
		await loadTwoFactorStatus();
	});

	// Confirm password → fetch QR
	document.getElementById('2fa-confirm-password-btn')?.addEventListener('click', async () => {
		const btn = document.getElementById('2fa-confirm-password-btn') as HTMLButtonElement;
		const restore = loadingBtn(btn, '…');
		const password = (document.getElementById('2fa-setup-password') as HTMLInputElement).value;
		if (!password) {
			showToast(t('settings.2fa_password_required'), 'warning');
			restore();
			return;
		}

		await fetchQR(password, restore);
	});

	// Cancel setup
	document.getElementById('2fa-cancel-setup-btn')?.addEventListener('click', async () => {
		els.setup.style.display = 'none';
		await loadTwoFactorStatus();
	});

	// Verify TOTP code
	document.getElementById('2fa-verify-btn')?.addEventListener('click', async () => {
		const btn = document.getElementById('2fa-verify-btn') as HTMLButtonElement;
		const restore = loadingBtn(btn, '…');
		const code = (document.getElementById('2fa-code') as HTMLInputElement).value.trim();

		try {
			const res = await fetch('/api/2fa/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			const data = (await res.json()) as { backupCodes?: string[]; error?: string };
			if (res.ok) {
				els.setup.style.display = 'none';
				els.backup.style.display = 'block';
				backupCodesList.textContent = data.backupCodes?.join('\n') ?? '';
				showToast(t('settings.2fa_enabled_success'), 'success');
			} else {
				showToast(data.error ?? 'Invalid code', 'error');
			}
		} catch {
			showToast(t('common.networkError'), 'error');
		} finally {
			restore();
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
		const btn = document.getElementById('2fa-confirm-disable-btn') as HTMLButtonElement;
		const restore = loadingBtn(btn, '…');
		const password = (document.getElementById('2fa-disable-password') as HTMLInputElement).value;
		const code = (document.getElementById('2fa-disable-code') as HTMLInputElement).value;

		const body: Record<string, string> = { code: code || '' };
		if (hasPassword) body.password = password;

		try {
			const res = await fetch('/api/2fa/disable', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const data = (await res.json()) as { error?: string };
			if (res.ok) {
				showToast(t('settings.2fa_disabled_success'), 'success');
				els.disable.style.display = 'none';
				await loadTwoFactorStatus();
				// Also hide the 2FA code field in the password section
				const pw2faSection = document.getElementById('pw-2fa-section') as HTMLElement;
				if (pw2faSection) pw2faSection.style.display = 'none';
			} else {
				showToast(data.error ?? 'Error disabling 2FA', 'error');
			}
		} catch {
			showToast(t('common.networkError'), 'error');
		} finally {
			restore();
		}
	});
}
