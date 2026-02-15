import { DataCache } from './cache.js';
import { t } from './i18n.js';

export async function deleteComment(uuid) {
    if (!confirm(t('admin.deleteConfirm'))) return;

    try {
        const res = await fetch(`/api/comments/${uuid}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            const el = document.getElementById(`comment-${uuid}`);
            if (el) el.remove();
            // Invalidate cache
            // We need to know the item ID to clear the cache efficiently, but here we might just have to wait for TTL or partial reload
            // Ideally passing itemId would be better, but for now we rely on the component reloading
        } else {
            alert('Failed to delete comment: ' + (data.error || 'Unknown error'));
        }
    } catch (e) {
        console.error('Delete error:', e);
        alert('Error deleting comment');
    }
}

export async function approveResource(uuid) {
    try {
        const res = await fetch(`/api/admin/resource/${uuid}/approve`, { method: 'POST' });
        if (res.ok) {
            DataCache.clear(`/api/item/${uuid}`); // Clear persistent cache
            location.reload();
        } else {
            alert('Error approving resource');
        }
    } catch (e) {
        console.error(e);
        alert('Error approving resource');
    }
}

export async function rejectResource(uuid) {
    if (!confirm(t('item.confirmReject'))) return;
    try {
        const res = await fetch(`/api/admin/resource/${uuid}/reject`, { method: 'POST' });
        if (res.ok) {
            DataCache.clear(`/api/item/${uuid}`); // Clear persistent cache
            window.location.href = '/';
        } else {
            alert('Error rejecting resource');
        }
    } catch (e) {
        console.error(e);
        alert('Error rejecting resource');
    }
}

export async function deactivateResource(uuid) {
    if (!confirm(t('item.confirmDeactivate'))) return;
    try {
        const res = await fetch(`/api/admin/resource/${uuid}/deactivate`, { method: 'POST' });
        if (res.ok) {
            DataCache.clear(`/api/item/${uuid}`); // Clear persistent cache
            location.reload();
        } else {
            alert('Error deactivating resource');
        }
    } catch (e) {
        console.error(e);
        alert('Error deactivating resource');
    }
}
