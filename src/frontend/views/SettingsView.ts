// =========================================================================
// views/SettingsView.ts — User settings: profile, avatar, password and 2FA
// =========================================================================

import QRCode from 'qrcode';
import { t } from '../core/i18n';
import { icons } from '../lib/icons';
import { renderTurnstile, resizeImage, showToast, loadingBtn, mediaUrl, metaLabel } from '../lib/utils';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, setCachedPrefs, type NotificationPrefsDTO } from '../features/notifications';
import type { RouteContext } from '../types';

const AVATAR_TYPE_OPTIONS = ['human', 'anime', 'furry', 'chibi', 'cartoon', 'semi-realistic', 'monster', 'fantasy', 'mecha', 'kemono', 'other'] as const;
const ASSET_TYPE_OPTIONS = ['prop', 'shader', 'particle', 'vfx', 'prefab', 'script', 'animation', 'avatar-base', 'texture-pack', 'sound', 'tool', 'hud', 'other'] as const;

// =========================================================================
// View
// =========================================================================

export async function settingsView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('settings.title')}`;

	const user = window.appState.user ?? {};
	const avatarUrl = (user as { avatar_url?: string }).avatar_url ?? '/avatar.png';
	const username = (user as { username?: string }).username ?? '';
	const hasPassword = (user as { has_password?: boolean }).has_password !== false;
	const isAnonymous = !!(user as { is_anonymous?: number | boolean }).is_anonymous;

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
					<button type="button" class="settings-nav-item" data-panel="notifications" role="tab" aria-selected="false">
						${icons.bell(18)}<span>${t('settings.section_notifications')}</span>
					</button>
					<button type="button" class="settings-nav-item" data-panel="drive" role="tab" aria-selected="false">
						${icons['hard-drive'](18)}<span>${t('settings.section_drive')}</span>
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
									<div class="form-group checkbox-group" style="margin-top:10px;">
										<label class="checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
											<input type="checkbox" id="is-anonymous" ${isAnonymous ? 'checked' : ''}>
											<strong>Anonymous Mode</strong>
										</label>
										<small class="settings-hint">When active, your name and avatar are hidden on public posts and comments.</small>
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

					<!-- Drive -->
					<section class="settings-panel" id="panel-drive" role="tabpanel" hidden>
						<h2 class="settings-panel-title">${t('settings.section_drive')}</h2>
						<p class="settings-panel-desc">${t('settings.section_drive_desc')}</p>
						<div id="drive-status" class="settings-panel-desc">${t('common.loading')}</div>
						<div id="drive-controls" hidden style="margin-top:16px;">
							<div id="drive-linked-row" style="border:1px solid var(--border-color);padding:12px;margin-bottom:12px;background:var(--bg-card);">
								<p id="drive-linked-text" style="margin:0 0 8px 0;"></p>
								<p id="drive-folder-text" style="margin:0 0 12px 0;font-size:0.9em;color:var(--text-muted);"></p>
								<div style="display:flex;gap:10px;flex-wrap:wrap;">
									<button id="drive-change-folder-btn" class="btn-outline">${t('settings.driveChangeFolder')}</button>
									<button id="drive-clear-folder-btn" class="btn-outline">${t('settings.driveClearFolder')}</button>
									<button id="drive-disconnect-btn" class="btn-danger">${t('settings.driveDisconnect')}</button>
								</div>
							</div>
							<div id="drive-unlinked-row" hidden>
								<button id="drive-connect-btn" class="btn">${icons['hard-drive'](16)} ${t('settings.driveConnect')}</button>
								<p class="settings-hint" style="margin-top:8px;">${t('settings.driveConnectHint')}</p>
							</div>
						</div>
					</section>

					<!-- Notifications -->
					<section class="settings-panel" id="panel-notifications" role="tabpanel" hidden>
						<h2 class="settings-panel-title">${t('settings.section_notifications')}</h2>
						<p class="settings-panel-desc">${t('settings.section_notifications_desc')}</p>

						<div id="notifications-status" class="settings-panel-desc">${t('common.loading')}</div>

						<div id="notifications-controls" hidden>
							<div class="form-group checkbox-group">
								<label class="checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
									<input type="checkbox" id="notif-enabled">
									<strong>${t('notifications.enable')}</strong>
								</label>
								<small class="settings-hint">${t('notifications.enable_hint')}</small>
							</div>

							<div id="notif-permission-row" class="settings-panel-desc" style="margin:10px 0;padding:10px;border:1px solid var(--border-color);background:var(--bg-code);"></div>

							<div id="notif-categories" style="margin-top:16px;">
								<!-- Avatars -->
								<div class="form-group" style="border:1px solid var(--border-color);padding:12px;margin-bottom:12px;">
									<label class="checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
										<input type="checkbox" id="notif-avatars-enabled">
										<strong>${t('notifications.category_avatars')}</strong>
									</label>
									<small class="settings-hint">${t('notifications.category_avatars_hint')}</small>
									<div id="notif-avatar-types" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;"></div>
									<small class="settings-hint">${t('notifications.subtype_empty_means_all')}</small>
								</div>
								<!-- Assets -->
								<div class="form-group" style="border:1px solid var(--border-color);padding:12px;margin-bottom:12px;">
									<label class="checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
										<input type="checkbox" id="notif-assets-enabled">
										<strong>${t('notifications.category_assets')}</strong>
									</label>
									<small class="settings-hint">${t('notifications.category_assets_hint')}</small>
									<div id="notif-asset-types" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;"></div>
									<small class="settings-hint">${t('notifications.subtype_empty_means_all')}</small>
								</div>
								<!-- Clothes -->
								<div class="form-group" style="border:1px solid var(--border-color);padding:12px;margin-bottom:12px;">
									<label class="checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
										<input type="checkbox" id="notif-clothes-enabled">
										<strong>${t('notifications.category_clothes')}</strong>
									</label>
									<small class="settings-hint">${t('notifications.category_clothes_hint')}</small>
								</div>
							</div>

							<div style="margin-top:16px;display:flex;gap:10px;align-items:center;">
								<button id="notif-save-btn" class="btn">${icons.check(16)} ${t('settings.save')}</button>
								<button id="notif-test-btn" class="btn-outline">${icons.bell(16)} ${t('notifications.test')}</button>
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
	const anonCheckbox = document.getElementById('is-anonymous') as HTMLInputElement;

	const originalAvatarUrl = imgPreview.src;

	// Anonymous preview
	anonCheckbox.addEventListener('change', () => {
		if (anonCheckbox.checked) {
			imgPreview.src = '/avatar.png';
			imgPreview.style.opacity = '0.5';
		} else {
			imgPreview.src = avatarInput.files?.[0] ? URL.createObjectURL(avatarInput.files[0]) : originalAvatarUrl;
			imgPreview.style.opacity = '1';
		}
	});

	avatarInput.addEventListener('change', (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			const url = URL.createObjectURL(file);
			if (!anonCheckbox.checked) imgPreview.src = url;
		}
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

			const is_anonymous = anonCheckbox.checked ? 1 : 0;
			const body: Record<string, string | number> = { username, token, is_anonymous };
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

	// Drive
	await loadDrivePanel();

	// Notifications
	await loadNotificationsPanel();

	// Handle drive redirect feedback ?drive=linked|denied|error
	const params = new URLSearchParams(location.search);
	const driveParam = params.get('drive');
	if (driveParam) {
		if (driveParam === 'linked') showToast(t('settings.driveLinked'), 'success');
		else if (driveParam === 'denied') showToast(t('settings.driveDenied'), 'warning');
		else if (driveParam === 'error') showToast(t('settings.driveError'), 'error');
		// Clean params without reload
		params.delete('drive');
		params.delete('pickFolder');
		const clean = params.toString() ? `?${params.toString()}` : location.pathname;
		history.replaceState(null, '', clean);
	}
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
		notifications: document.getElementById('panel-notifications'),
		drive: document.getElementById('panel-drive'),
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

// =========================================================================
// Drive panel
// =========================================================================

async function loadDrivePanel(): Promise<void> {
	const statusEl = document.getElementById('drive-status') as HTMLElement;
	const controlsEl = document.getElementById('drive-controls') as HTMLElement;
	const linkedRow = document.getElementById('drive-linked-row') as HTMLElement;
	const unlinkedRow = document.getElementById('drive-unlinked-row') as HTMLElement;
	const linkedText = document.getElementById('drive-linked-text') as HTMLElement;
	const folderText = document.getElementById('drive-folder-text') as HTMLElement;

	if (!statusEl || !controlsEl) return;
	if (!window.appState.isLoggedIn) {
		statusEl.textContent = t('settings.driveLoginRequired');
		return;
	}

	const refresh = async () => {
		try {
			const res = await fetch('/api/drive/status');
			if (!res.ok) throw new Error();
			const data = (await res.json()) as { linked: boolean; folder_id: string | null; folder_name: string | null };
			statusEl.hidden = true;
			controlsEl.hidden = false;
			if (data.linked) {
				linkedRow.hidden = false;
				unlinkedRow.hidden = true;
				linkedText.textContent = `✓ ${t('settings.driveLinked')}`;
				folderText.textContent = data.folder_name ? `${t('settings.driveFolder')}: ${data.folder_name}` : t('settings.driveNoFolder');
			} else {
				linkedRow.hidden = true;
				unlinkedRow.hidden = false;
			}
		} catch {
			statusEl.textContent = t('common.networkError');
		}
	};

	await refresh();

	document.getElementById('drive-connect-btn')?.addEventListener('click', () => {
		location.href = '/api/drive/auth';
	});

	document.getElementById('drive-disconnect-btn')?.addEventListener('click', async () => {
		const { showConfirm } = await import('../lib/confirm');
		const ok = await showConfirm({ title: t('confirm.title'), message: t('settings.driveDisconnectConfirm'), confirmText: t('confirm.confirm'), cancelText: t('confirm.cancel'), danger: true });
		if (!ok) return;
		try {
			const res = await fetch('/api/drive/link', { method: 'DELETE' });
			if (!res.ok) throw new Error();
			showToast(t('settings.driveDisconnected'), 'success');
			await refresh();
		} catch {
			showToast(t('common.networkError'), 'error');
		}
	});

	document.getElementById('drive-change-folder-btn')?.addEventListener('click', async () => {
		const { showDrivePicker } = await import('../features/drive-picker');
		// Fetch current folder to pre-select
		let currentId: string | null = null;
		try {
			const s = await fetch('/api/drive/status').then((r) => r.json() as Promise<{ folder_id: string | null }>);
			currentId = s.folder_id;
		} catch {
			/* ignore */
		}
		const picked = await showDrivePicker(currentId);
		if (picked === null) return; // cancelled
		try {
			const res = await fetch('/api/drive/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder_id: picked.id, folder_name: picked.name }) });
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error ?? 'Failed');
			}
			showToast(picked.id ? t('settings.driveFolderSaved') : t('settings.driveFolderCleared'), 'success');
			await refresh();
		} catch (e) {
			showToast((e as Error).message, 'error');
		}
	});

	document.getElementById('drive-clear-folder-btn')?.addEventListener('click', async () => {
		try {
			await fetch('/api/drive/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder_id: null, folder_name: null }) });
			showToast(t('settings.driveFolderCleared'), 'success');
			await refresh();
		} catch {
			showToast(t('common.networkError'), 'error');
		}
	});
}

// =========================================================================
// Notifications panel
// =========================================================================

async function loadNotificationsPanel(): Promise<void> {
	const statusEl = document.getElementById('notifications-status') as HTMLElement;
	const controlsEl = document.getElementById('notifications-controls') as HTMLElement;
	const enabledEl = document.getElementById('notif-enabled') as HTMLInputElement;
	const avatarsEnabledEl = document.getElementById('notif-avatars-enabled') as HTMLInputElement;
	const assetsEnabledEl = document.getElementById('notif-assets-enabled') as HTMLInputElement;
	const clothesEnabledEl = document.getElementById('notif-clothes-enabled') as HTMLInputElement;
	const avatarTypesEl = document.getElementById('notif-avatar-types') as HTMLElement;
	const assetTypesEl = document.getElementById('notif-asset-types') as HTMLElement;
	const permissionRow = document.getElementById('notif-permission-row') as HTMLElement;
	const saveBtn = document.getElementById('notif-save-btn') as HTMLButtonElement;
	const testBtn = document.getElementById('notif-test-btn') as HTMLButtonElement;

	if (!statusEl || !controlsEl) return;

	if (!window.appState.isLoggedIn) {
		statusEl.textContent = t('notifications.login_required');
		return;
	}

	const renderPermission = () => {
		if (!isNotificationSupported()) {
			permissionRow.innerHTML = `<span style="color:var(--danger-color,red)">${t('notifications.unsupported')}</span>`;
			return;
		}
		const perm = getNotificationPermission();
		if (perm === 'granted') {
			permissionRow.innerHTML = `✓ ${t('notifications.permission_granted')}`;
			permissionRow.style.color = 'var(--success-color, green)';
		} else if (perm === 'denied') {
			permissionRow.innerHTML = `✗ ${t('notifications.permission_denied')}<br><small>${t('notifications.permission_denied_hint')}</small>`;
			permissionRow.style.color = 'var(--danger-color, red)';
		} else {
			permissionRow.innerHTML = `${t('notifications.permission_default')} <button type="button" id="notif-permission-btn" class="btn btn-sm" style="margin-left:8px;">${t('notifications.request_permission')}</button>`;
			permissionRow.style.color = '';
			document.getElementById('notif-permission-btn')?.addEventListener('click', async () => {
				const result = await requestNotificationPermission();
				renderPermission();
				if (result === 'granted') showToast(t('notifications.permission_granted'), 'success');
				else if (result === 'denied') showToast(t('notifications.permission_denied'), 'error');
			});
		}
	};

	const buildSubtypeChecks = (container: HTMLElement, options: readonly string[], selected: string[] | null, prefix: string, namespace: string) => {
		container.innerHTML = '';
		for (const opt of options) {
			const id = `${prefix}-${opt}`;
			const checked = selected ? selected.includes(opt) : false;
			const label = document.createElement('label');
			label.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--border-color);background:var(--bg-card);font-size:0.82rem;cursor:pointer;';
			label.innerHTML = `<input type="checkbox" value="${opt}" id="${id}" ${checked ? 'checked' : ''}> ${metaLabel(namespace, opt)}`;
			container.appendChild(label);
		}
	};

	const getSelected = (container: HTMLElement): string[] | null => {
		const checks = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map((c) => c.value);
		return checks.length === 0 ? null : checks;
	};

	const syncCategoriesVisible = () => {
		const enabled = enabledEl.checked;
		const catEl = document.getElementById('notif-categories') as HTMLElement;
		if (catEl) catEl.style.opacity = enabled ? '1' : '0.45';
		// Disable inner controls when globally off to prevent confusion.
		for (const el of [avatarsEnabledEl, assetsEnabledEl, clothesEnabledEl]) el.disabled = !enabled;
		for (const c of [avatarTypesEl, assetTypesEl]) {
			for (const inp of Array.from(c.querySelectorAll<HTMLInputElement>('input'))) inp.disabled = !enabled;
		}
		saveBtn.disabled = false;
		testBtn.disabled = false;
	};

	let currentPrefs: NotificationPrefsDTO | null = null;

	try {
		const res = await fetch('/api/notifications/preferences');
		if (!res.ok) throw new Error();
		currentPrefs = (await res.json()) as NotificationPrefsDTO;
	} catch {
		statusEl.textContent = t('common.networkError');
		return;
	}

	statusEl.hidden = true;
	controlsEl.hidden = false;

	enabledEl.checked = !!currentPrefs.enabled;
	avatarsEnabledEl.checked = !!currentPrefs.avatars_enabled;
	assetsEnabledEl.checked = !!currentPrefs.assets_enabled;
	clothesEnabledEl.checked = !!currentPrefs.clothes_enabled;

	buildSubtypeChecks(avatarTypesEl, AVATAR_TYPE_OPTIONS, currentPrefs.avatar_types, 'avtypes', 'avatar_type');
	buildSubtypeChecks(assetTypesEl, ASSET_TYPE_OPTIONS, currentPrefs.asset_types, 'astypes', 'asset_type');

	renderPermission();
	syncCategoriesVisible();

	enabledEl.addEventListener('change', syncCategoriesVisible);

	saveBtn.addEventListener('click', async () => {
		const restore = loadingBtn(saveBtn, t('settings.saving'));
		const payload: NotificationPrefsDTO = {
			enabled: enabledEl.checked,
			avatars_enabled: avatarsEnabledEl.checked,
			avatar_types: getSelected(avatarTypesEl),
			assets_enabled: assetsEnabledEl.checked,
			asset_types: getSelected(assetTypesEl),
			clothes_enabled: clothesEnabledEl.checked,
			updated_at: null,
		};
		try {
			const res = await fetch('/api/notifications/preferences', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error ?? 'Failed');
			}
			const saved = (await res.json()) as NotificationPrefsDTO;
			currentPrefs = saved;
			setCachedPrefs(saved);
			showToast(t('notifications.saved'), 'success');
			if (saved.enabled && getNotificationPermission() === 'default') {
				const perm = await requestNotificationPermission();
				renderPermission();
				if (perm === 'granted') showToast(t('notifications.permission_granted'), 'success');
			}
		} catch (e) {
			showToast((e as Error).message || t('common.networkError'), 'error');
		} finally {
			restore();
		}
	});

	testBtn.addEventListener('click', async () => {
		if (!isNotificationSupported()) {
			showToast(t('notifications.unsupported'), 'error');
			return;
		}
		let perm = getNotificationPermission();
		if (perm !== 'granted') perm = await requestNotificationPermission();
		renderPermission();
		if (perm !== 'granted') {
			showToast(t('notifications.permission_denied'), 'warning');
			return;
		}
		try {
			const n = new Notification(t('notifications.test_title'), {
				body: t('notifications.test_body'),
				icon: '/favicon.ico',
			});
			n.onclick = () => n.close();
			setTimeout(() => n.close(), 4000);
		} catch {
			showToast(t('common.networkError'), 'error');
		}
	});
}
