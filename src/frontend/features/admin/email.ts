// =========================================================================================================
// FAILED EMAIL ADMINISTRATION
// =========================================================================================================
// Metadata-only listing with authenticated MIME downloads; message HTML is never inserted into the DOM.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { api } from '../../api';
import { t } from '../../core/i18n';
import { showToast } from '../../lib/utils';
import { showConfirm } from '../../lib/confirm';

// =========================================================================================================
// Helpers
// =========================================================================================================

function textCell(value: string): HTMLTableCellElement {
	const cell = document.createElement('td');
	cell.textContent = value;
	return cell;
}

function actionButton(label: string, danger = false): HTMLButtonElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `btn btn-sm${danger ? ' btn-danger' : ''}`;
	button.textContent = label;
	return button;
}

// =========================================================================================================
// Section
// =========================================================================================================

export function loadEmailFailures(root: HTMLElement, signal: AbortSignal): void {
	let busy = false;

	async function load(page: number): Promise<void> {
		if (busy || signal.aborted) return;
		busy = true;
		const dismiss = showToast(t('common.loading'), 'info', 0);
		try {
			const result = await api.Admin.EmailFailures(page, { signal });
			if (signal.aborted) return;
			const title = document.createElement('h2');
			title.className = 'admin-section-title';
			title.textContent = t('admin.email.title');
			const retention = document.createElement('p');
			retention.className = 'admin-muted-paragraph';
			retention.textContent = t('admin.email.retention');
			const wrap = document.createElement('div');
			wrap.className = 'admin-table-wrap';
			const table = document.createElement('table');
			table.className = 'admin-data-table';
			const heading = table.createTHead().insertRow();
			for (const label of [t('admin.overview.colDate'), t('admin.email.recipient'), t('admin.email.error'), t('admin.email.attempts'), t('admin.email.actions')]) {
				const cell = document.createElement('th');
				cell.scope = 'col';
				cell.textContent = label;
				heading.append(cell);
			}
			const body = table.createTBody();
			for (const delivery of result.deliveries) {
				const row = body.insertRow();
				row.append(textCell(new Date(delivery.failed_at ?? delivery.created_at).toLocaleString()), textCell(delivery.recipient), textCell(delivery.last_error ?? t('common.unknown')), textCell(String(delivery.attempts)));
				const actions = document.createElement('td');
				const buttons = document.createElement('div');
				buttons.className = 'admin-row-actions';
				if (delivery.content_available) {
					const download = actionButton(t('admin.email.download'));
					download.addEventListener('click', async () => {
						download.disabled = true;
						try {
							const blob = await api.Admin.EmailOriginal(delivery.uuid, { signal });
							if (signal.aborted) return;
							const url = URL.createObjectURL(blob);
							const link = document.createElement('a');
							link.href = url;
							link.download = `email-${delivery.uuid}.eml`;
							link.click();
							setTimeout(() => URL.revokeObjectURL(url), 30_000);
						} catch (error) {
							if (!signal.aborted) showToast(error instanceof Error ? error.message : t('common.error'), 'error');
						} finally {
							download.disabled = false;
						}
					});
					buttons.append(download);
				} else {
					const expired = document.createElement('span');
					expired.textContent = t('admin.email.expired');
					buttons.append(expired);
				}
				const remove = actionButton(t('admin.delete'), true);
				remove.addEventListener('click', async () => {
					if (!(await showConfirm({ message: t('admin.email.deleteConfirm'), confirmText: t('admin.delete'), danger: true })) || signal.aborted) return;
					remove.disabled = true;
					try {
						await api.Admin.DeleteEmail(delivery.uuid);
						if (signal.aborted) return;
						showToast(t('admin.email.deleted'), 'success');
						await load(result.deliveries.length === 1 && page > 1 ? page - 1 : page);
					} catch (error) {
						if (!signal.aborted) showToast(error instanceof Error ? error.message : t('common.error'), 'error');
					} finally {
						remove.disabled = false;
					}
				});
				buttons.append(remove);
				actions.append(buttons);
				row.append(actions);
			}
			if (!result.deliveries.length) {
				const empty = textCell(t('admin.email.empty'));
				empty.colSpan = 5;
				body.insertRow().append(empty);
			}
			wrap.append(table);
			const pagination = document.createElement('div');
			pagination.className = 'admin-pagination';
			const previous = actionButton(t('filterPanel.prev'));
			previous.disabled = !result.pagination.hasPrevPage;
			previous.addEventListener('click', () => void load(page - 1));
			const next = actionButton(t('filterPanel.next'));
			next.disabled = !result.pagination.hasNextPage;
			next.addEventListener('click', () => void load(page + 1));
			const count = document.createElement('span');
			count.textContent = `${page} / ${Math.max(1, Math.ceil(result.pagination.total / result.pagination.limit))}`;
			pagination.append(previous, count, next);
			root.replaceChildren(title, retention, wrap, pagination);
		} catch (error) {
			if (!signal.aborted) showToast(error instanceof Error ? error.message : t('common.loadError'), 'error');
		} finally {
			busy = false;
			dismiss();
		}
	}
	void load(1);
}
