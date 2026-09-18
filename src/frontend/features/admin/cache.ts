// =========================================================================================================
// features/admin/cache.ts — Per-user KV session cache clear
// =========================================================================================================

import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { loadingBtn } from '../../lib/dom';
import { adminPost } from './api';
import { esc } from './esc';

export function loadCache(el: HTMLElement): void {
	el.innerHTML = `<h2 class="admin-section-title">${esc(t('admin.cache.title'))}</h2>
		<div class="admin-form-panel">
			<h3>${esc(t('admin.cache.subtitle'))}</h3>
			<p class="admin-muted-paragraph">${esc(t('admin.cache.desc'))}</p>
			<form class="admin-action-bar" data-form>
				<input type="text" name="username" class="admin-search-input" placeholder="${esc(t('admin.cache.placeholder'))}" aria-label="${esc(t('admin.cache.placeholder'))}" autocomplete="off">
				<button type="submit" class="btn btn-sm" data-submit>${esc(t('admin.users.btnCache'))}</button>
			</form>
		</div>`;

	const form = el.querySelector<HTMLFormElement>('[data-form]')!;
	const input = el.querySelector<HTMLInputElement>('input[name="username"]')!;
	const btn = el.querySelector<HTMLButtonElement>('[data-submit]')!;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const username = input.value.trim();
		if (!username) return;
		const restore = loadingBtn(btn);
		try {
			await adminPost(`/api/admin/cache/clear/${encodeURIComponent(username)}`);
			showToast(`${t('admin.users.toastCacheCleared')} "${username}"`, 'success');
			input.value = '';
		} catch {
			showToast(t('admin.users.toastCacheClearedError'), 'error');
		}
		restore();
	});
}
