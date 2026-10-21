// =========================================================================================================
// ADMIN ACTIONS
// =========================================================================================================
// Shared UI actions for resource moderation and comment deletion.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { api } from '../api';
import { t } from '../core/i18n';
import { showToast } from '../lib/utils';
import { showConfirm } from '../lib/confirm';
import { requestTwoFactorCode } from './admin/two-factor';

// =========================================================================================================
// Actions
// =========================================================================================================

export async function deleteComment(uuid: string): Promise<void> {
	if (!(await showConfirm({ message: t('admin.deleteConfirm'), confirmText: t('admin.delete'), danger: true }))) return;
	try {
		await api.Comments.Delete(uuid);
		document.getElementById(`comment-${uuid}`)?.remove();
	} catch (error) {
		showToast(error instanceof Error ? error.message : t('common.error'), 'error');
	}
}

export async function approveResource(uuid: string, onDone?: () => void | Promise<void>): Promise<void> {
	try {
		await api.Admin.Approve(uuid);
		showToast(t('item.approved'), 'success');
		await onDone?.();
	} catch (error) {
		showToast(error instanceof Error ? error.message : t('common.error'), 'error');
	}
}

export async function rejectResource(uuid: string): Promise<void> {
	if (!(await showConfirm({ message: t('item.confirmReject'), confirmText: t('item.reject'), danger: true }))) return;
	const code = await requestTwoFactorCode();
	if (!code) return;
	try {
		await api.Admin.Reject(uuid, code);
		window.location.href = '/';
	} catch (error) {
		showToast(error instanceof Error ? error.message : t('common.error'), 'error');
	}
}

export async function deactivateResource(uuid: string, onDone?: () => void | Promise<void>): Promise<void> {
	if (!(await showConfirm({ message: t('item.confirmDeactivate'), confirmText: t('item.deactivate'), danger: true }))) return;
	try {
		await api.Admin.Deactivate(uuid);
		showToast(t('item.deactivated'), 'success');
		await onDone?.();
	} catch (error) {
		showToast(error instanceof Error ? error.message : t('common.error'), 'error');
	}
}
