import { DataCache } from './cache';
import { t } from './i18n';
import { showToast } from './utils';

export async function deleteComment(uuid: string): Promise<void> {
	if (!confirm(t('admin.deleteConfirm'))) return;

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

export async function approveResource(uuid: string): Promise<void> {
	try {
		const res = await fetch(`/api/admin/resource/${uuid}/approve`, { method: 'POST' });
		if (res.ok) {
			DataCache.clear(`/api/resources/${uuid}`);
			location.reload();
		} else {
			showToast('Error approving resource', 'error');
		}
	} catch (e) {
		console.error(e);
		showToast('Error approving resource', 'error');
	}
}

export async function rejectResource(uuid: string): Promise<void> {
	if (!confirm(t('item.confirmReject'))) return;
	try {
		const res = await fetch(`/api/admin/resource/${uuid}/reject`, { method: 'POST' });
		if (res.ok) {
			DataCache.clear(`/api/resources/${uuid}`);
			window.location.href = '/';
		} else {
			showToast('Error rejecting resource', 'error');
		}
	} catch (e) {
		console.error(e);
		showToast('Error rejecting resource', 'error');
	}
}

export async function deactivateResource(uuid: string): Promise<void> {
	if (!confirm(t('item.confirmDeactivate'))) return;
	try {
		const res = await fetch(`/api/admin/resource/${uuid}/deactivate`, { method: 'POST' });
		if (res.ok) {
			DataCache.clear(`/api/resources/${uuid}`);
			location.reload();
		} else {
			showToast('Error deactivating resource', 'error');
		}
	} catch (e) {
		console.error(e);
		showToast('Error deactivating resource', 'error');
	}
}
