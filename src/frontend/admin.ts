import { DataCache } from './cache';
import { t } from './i18n';

export async function deleteComment(uuid: string): Promise<void> {
	if (!confirm(t('admin.deleteConfirm'))) return;

	try {
		const res = await fetch(`/api/comments/${uuid}`, { method: 'DELETE' });
		const data = await res.json();

		if (data.success) {
			const el = document.getElementById(`comment-${uuid}`);
			if (el) el.remove();
		} else {
			alert('Failed to delete comment: ' + (data.error || 'Unknown error'));
		}
	} catch (e) {
		console.error('Delete error:', e);
		alert('Error deleting comment');
	}
}

export async function approveResource(uuid: string): Promise<void> {
	try {
		const res = await fetch(`/api/admin/resource/${uuid}/approve`, { method: 'POST' });
		if (res.ok) {
			DataCache.clear(`/api/resources/${uuid}`);
			location.reload();
		} else {
			alert('Error approving resource');
		}
	} catch (e) {
		console.error(e);
		alert('Error approving resource');
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
			alert('Error rejecting resource');
		}
	} catch (e) {
		console.error(e);
		alert('Error rejecting resource');
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
			alert('Error deactivating resource');
		}
	} catch (e) {
		console.error(e);
		alert('Error deactivating resource');
	}
}
