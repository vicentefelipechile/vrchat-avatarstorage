import { DataCache } from '../core/cache';
import { t } from '../core/i18n';
import { showToast } from '../lib/utils';
import { showConfirm } from '../lib/confirm';
import { requestTwoFactorCode, AdminApiError } from './admin/api';

export async function deleteComment(uuid: string): Promise<void> {
	const ok = await showConfirm({ message: t('admin.deleteConfirm'), confirmText: t('admin.delete'), danger: true });
	if (!ok) return;

	try {
		const res = await fetch(`/api/comments/${uuid}`, { method: 'DELETE' });
		const data = await res.json();

		if (data.success) {
			const el = document.getElementById(`comment-${uuid}`);
			if (el) el.remove();
		} else {
			showToast('Failed to delete comment: ' + (data.error || 'Unknown error'), 'error');
		}
	} catch (e) {
		console.error('Delete error:', e);
		showToast('Error deleting comment', 'error');
	}
}

export async function approveResource(uuid: string, onDone?: () => void | Promise<void>): Promise<void> {
	try {
		const res = await fetch(`/api/admin/resource/${uuid}/approve`, { method: 'POST' });
		if (res.ok) {
			DataCache.clear(`/api/resources/${uuid}`);
			showToast(t('item.approved'), 'success');
			await onDone?.();
		} else {
			showToast('Error approving resource', 'error');
		}
	} catch (e) {
		console.error(e);
		showToast('Error approving resource', 'error');
	}
}

export async function rejectResource(uuid: string): Promise<void> {
	const ok = await showConfirm({ message: t('item.confirmReject'), confirmText: t('item.reject'), danger: true });
	if (!ok) return;
	const code = await requestTwoFactorCode();
	if (!code) return;
	try {
		const res = await fetch(`/api/admin/resource/${uuid}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
		if (res.ok) {
			DataCache.clear(`/api/resources/${uuid}`);
			window.location.href = '/';
		} else {
			const data = (await res.json().catch(() => null)) as { error?: string } | null;
			showToast(data?.error ?? 'Error rejecting resource', 'error');
		}
	} catch (e) {
		console.error(e);
		showToast('Error rejecting resource', 'error');
	}
}

export async function deactivateResource(uuid: string, onDone?: () => void | Promise<void>): Promise<void> {
	const ok = await showConfirm({ message: t('item.confirmDeactivate'), confirmText: t('item.deactivate'), danger: true });
	if (!ok) return;
	try {
		const res = await fetch(`/api/admin/resource/${uuid}/deactivate`, { method: 'POST' });
		if (res.ok) {
			DataCache.clear(`/api/resources/${uuid}`);
			showToast(t('item.deactivated'), 'success');
			await onDone?.();
		} else {
			showToast('Error deactivating resource', 'error');
		}
	} catch (e) {
		console.error(e);
		showToast('Error deactivating resource', 'error');
	}
}
