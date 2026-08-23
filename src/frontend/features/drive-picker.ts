// =========================================================================
// features/drive-picker.ts — Browsable Drive folder picker (design system)
// =========================================================================
// Hierarchical explorer: breadcrumb + subfolders of current parent.
// Uses GET /api/drive/folders?parentId= and POST /api/drive/folders/create.
// No API key, no external Picker library — fully proxy via backend.
// =========================================================================

import { t } from '../core/i18n';
import { getIcon } from '../lib/icons';

interface DriveFolder {
	id: string;
	name: string;
}

let overlay: HTMLElement | null = null;

function buildOverlay(): HTMLElement {
	const el = document.createElement('div');
	el.className = 'drive-picker-overlay';
	el.setAttribute('role', 'dialog');
	el.setAttribute('aria-modal', 'true');
	el.innerHTML = `
		<div class="drive-picker-modal">
			<div class="drive-picker-header">
				<h3 class="drive-picker-title">${t('settings.driveFolder')}</h3>
				<button type="button" class="drive-picker-close" aria-label="Close">×</button>
			</div>
			<div class="drive-picker-body">
				<p class="drive-picker-desc">${t('settings.drivePickerDesc')}</p>
				<nav class="drive-picker-breadcrumb" aria-label="breadcrumb"></nav>
				<div class="drive-picker-list"></div>
				<div class="drive-picker-new">
					<input type="text" class="drive-picker-input" placeholder="Nueva carpeta..." maxlength="100" />
					<button type="button" class="btn btn-outline drive-picker-create-btn">${getIcon('folder-plus', 16)} ${t('settings.driveCreateFolder')}</button>
				</div>
				<div class="drive-picker-actions">
					<button type="button" class="btn drive-picker-select-current"></button>
					<button type="button" class="btn btn-outline drive-picker-cancel">${t('confirm.cancel')}</button>
				</div>
			</div>
		</div>`;
	document.body.appendChild(el);

	const style = document.createElement('style');
	style.textContent = `
		.drive-picker-overlay{position:fixed;inset:0;z-index:10001;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);padding:16px;}
		.drive-picker-overlay.active{display:flex;}
		.drive-picker-modal{background:var(--bg-card);border:2px solid var(--border-color);width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;}
		.drive-picker-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:2px solid var(--border-color);}
		.drive-picker-title{margin:0;font-size:1rem;font-weight:bold;}
		.drive-picker-close{background:transparent;border:2px solid transparent;padding:4px 10px;font-size:1.4rem;cursor:pointer;font-family:inherit;}
		.drive-picker-close:hover{border-color:var(--border-color);background:var(--bg-hover);}
		.drive-picker-body{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:12px;}
		.drive-picker-desc{margin:0;color:var(--text-muted);font-size:0.88rem;line-height:1.5;}
		.drive-picker-breadcrumb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;border:1px solid var(--border-light);background:var(--bg-hover);font-size:0.85rem;}
		.drive-picker-breadcrumb button{background:transparent;border:none;cursor:pointer;font-family:inherit;color:var(--text-link);text-decoration:underline;padding:0;}
		.drive-picker-breadcrumb button:hover{color:var(--text-main);}
		.drive-picker-breadcrumb .crumb-sep{color:var(--text-muted);}
		.drive-picker-breadcrumb .crumb-current{font-weight:bold;color:var(--text-main);}
		.drive-picker-list{display:flex;flex-direction:column;gap:6px;min-height:120px;max-height:320px;overflow:auto;border:1px solid var(--border-light);padding:6px;background:var(--bg-card);}
		.drive-picker-row{display:flex;align-items:center;gap:0;border:2px solid var(--border-color);background:var(--bg-card);}
		.drive-picker-row:hover{background:var(--bg-hover);}
		.drive-picker-row-main{flex:1;display:flex;align-items:center;gap:10px;padding:10px 12px;background:transparent;border:none;cursor:pointer;font-family:inherit;text-align:left;min-width:0;}
		.drive-picker-row-main:hover{color:var(--text-link);}
		.drive-picker-row-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
		.drive-picker-row-actions{display:flex;gap:0;flex-shrink:0;}
		.drive-picker-row-enter,.drive-picker-row-select{padding:8px 10px;border:none;border-left:2px solid var(--border-color);background:transparent;cursor:pointer;font-family:inherit;font-size:0.82rem;}
		.drive-picker-row-enter:hover,.drive-picker-row-select:hover{background:var(--bg-hover);}
		.drive-picker-row-select{font-weight:bold;}
		.drive-picker-empty{color:var(--text-muted);font-size:0.85rem;padding:12px;text-align:center;}
		.drive-picker-new{display:flex;gap:8px;align-items:center;}
		.drive-picker-input{flex:1;padding:8px 10px;border:2px solid var(--border-color);background:var(--bg-input);color:var(--text-main);font-family:inherit;font-size:0.9rem;}
		.drive-picker-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;border-top:1px solid var(--border-light);padding-top:12px;}
		.drive-picker-select-current{font-weight:bold;}
	`;
	document.head.appendChild(style);
	return el;
}

export function showDrivePicker(currentFolderId: string | null): Promise<{ id: string | null; name: string | null } | null> {
	if (!overlay) overlay = buildOverlay();
	const root = overlay;
	const breadcrumbEl = root.querySelector<HTMLElement>('.drive-picker-breadcrumb')!;
	const listEl = root.querySelector<HTMLElement>('.drive-picker-list')!;
	const closeBtn = root.querySelector<HTMLButtonElement>('.drive-picker-close')!;
	const cancelBtn = root.querySelector<HTMLButtonElement>('.drive-picker-cancel')!;
	const createBtn = root.querySelector<HTMLButtonElement>('.drive-picker-create-btn')!;
	const inputEl = root.querySelector<HTMLInputElement>('.drive-picker-input')!;
	const selectCurrentBtn = root.querySelector<HTMLButtonElement>('.drive-picker-select-current')!;

	return new Promise((resolve) => {
		let currentId: string | null = null;
		let path: Array<{ id: string | null; name: string }> = [{ id: null, name: 'Mi unidad' }];
		let folders: DriveFolder[] = [];
		let loading = false;
		let scopeError = false;
		let scopeMessage = '';

		const close = (result: { id: string | null; name: string | null } | null) => {
			root.classList.remove('active');
			document.body.style.overflow = '';
			closeBtn.removeEventListener('click', onClose);
			cancelBtn.removeEventListener('click', onCancel);
			createBtn.removeEventListener('click', onCreate);
			selectCurrentBtn.removeEventListener('click', onSelectCurrent);
			root.removeEventListener('click', onBackdrop);
			document.removeEventListener('keydown', onKey);
			resolve(result);
		};

		const onClose = () => close(null);
		const onCancel = () => close(null);
		const onBackdrop = (e: MouseEvent) => {
			if (e.target === root) close(null);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close(null);
		};

		const onSelectCurrent = () => {
			if (currentId === null) close({ id: null, name: null });
			else {
				const cur = path[path.length - 1];
				close({ id: cur.id, name: cur.name });
			}
		};

		const onCreate = async () => {
			const name = inputEl.value.trim();
			if (!name) return;
			createBtn.disabled = true;
			const prev = createBtn.innerHTML;
			createBtn.textContent = '…';
			try {
				const res = await fetch('/api/drive/folders/create', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name, parentId: currentId }),
				});
				if (!res.ok) throw new Error();
				inputEl.value = '';
				await load(currentId);
			} catch {
				// ignore
			} finally {
				createBtn.disabled = false;
				createBtn.innerHTML = prev;
			}
		};

		const buildBreadcrumb = () => {
			breadcrumbEl.innerHTML = '';
			path.forEach((p, idx) => {
				const isLast = idx === path.length - 1;
				if (isLast) {
					const span = document.createElement('span');
					span.className = 'crumb-current';
					span.textContent = p.name;
					breadcrumbEl.appendChild(span);
				} else {
					const btn = document.createElement('button');
					btn.type = 'button';
					btn.textContent = p.name;
					btn.addEventListener('click', async () => {
						path = path.slice(0, idx + 1);
						currentId = p.id;
						await load(currentId);
					});
					breadcrumbEl.appendChild(btn);
					const sep = document.createElement('span');
					sep.className = 'crumb-sep';
					sep.textContent = '›';
					breadcrumbEl.appendChild(sep);
				}
			});
			const curName = path[path.length - 1].name;
			selectCurrentBtn.textContent = currentId === null ? 'Usar Mi unidad' : `Seleccionar "${curName}"`;
		};

		const render = () => {
			buildBreadcrumb();
			listEl.innerHTML = '';
			if (loading) {
				listEl.innerHTML = `<p style="color:var(--text-muted);padding:12px;text-align:center;">${t('common.loading')}</p>`;
				return;
			}
			if (scopeError) {
				listEl.innerHTML = `<div style="padding:12px;border:2px solid #dc3545;background:rgba(220,53,69,0.1);"><p style="margin:0 0 10px 0;color:#dc3545;font-weight:bold;">${scopeMessage}</p><a href="/api/drive/auth" class="btn btn-danger" style="display:inline-block;">Reconectar Drive</a><p style="margin:8px 0 0 0;font-size:0.82rem;color:var(--text-muted);">Desconecta y vuelve a autorizar para ver todas tus carpetas. El permiso anterior solo permitía carpetas creadas por la app.</p></div>`;
				return;
			}
			if (folders.length === 0) {
				const empty = document.createElement('p');
				empty.className = 'drive-picker-empty';
				empty.textContent = 'Esta carpeta está vacía.';
				listEl.appendChild(empty);
				return;
			}
			for (const f of folders) {
				const row = document.createElement('div');
				row.className = 'drive-picker-row';
				row.innerHTML = `
					<button type="button" class="drive-picker-row-main" data-id="${f.id}">${getIcon('folder', 16)} <span class="drive-picker-row-name">${f.name}</span></button>
					<div class="drive-picker-row-actions">
						<button type="button" class="drive-picker-row-select" data-id="${f.id}" data-name="${f.name}">Seleccionar</button>
						<button type="button" class="drive-picker-row-enter" data-id="${f.id}" title="Abrir">›</button>
					</div>
				`;
				const mainBtn = row.querySelector<HTMLButtonElement>('.drive-picker-row-main')!;
				const enterBtn = row.querySelector<HTMLButtonElement>('.drive-picker-row-enter')!;
				const selectBtn = row.querySelector<HTMLButtonElement>('.drive-picker-row-select')!;

				const enter = async () => {
					path.push({ id: f.id, name: f.name });
					currentId = f.id;
					await load(currentId);
				};

				mainBtn.addEventListener('click', enter);
				enterBtn.addEventListener('click', enter);
				selectBtn.addEventListener('click', () => close({ id: f.id, name: f.name }));

				listEl.appendChild(row);
			}
		};

		const load = async (parentId: string | null) => {
			loading = true;
			scopeError = false;
			render();
			try {
				const url = parentId ? `/api/drive/folders?parentId=${encodeURIComponent(parentId)}` : '/api/drive/folders';
				const res = await fetch(url);
				if (!res.ok) {
					const data = (await res.json().catch(() => ({}))) as { error?: string };
					if (res.status === 403) {
						scopeError = true;
						scopeMessage = data.error ?? 'Necesitas reconectar Drive para ver tus carpetas.';
						throw new Error(scopeMessage);
					}
					throw new Error();
				}
				const data = (await res.json()) as { folders: DriveFolder[] };
				folders = data.folders ?? [];
			} catch (e) {
				if (!scopeError) folders = [];
			} finally {
				loading = false;
				render();
			}
		};

		closeBtn.addEventListener('click', onClose);
		cancelBtn.addEventListener('click', onCancel);
		createBtn.addEventListener('click', onCreate);
		selectCurrentBtn.addEventListener('click', onSelectCurrent);
		root.addEventListener('click', onBackdrop);
		document.addEventListener('keydown', onKey);

		root.classList.add('active');
		document.body.style.overflow = 'hidden';

		(async () => {
			if (currentFolderId) {
				let currentName = 'Carpeta actual';
				try {
					const s = await fetch('/api/drive/status').then((r) => r.json() as Promise<{ folder_name: string | null }>);
					if (s.folder_name) currentName = s.folder_name;
				} catch {}
				path = [{ id: null, name: 'Mi unidad' }, { id: currentFolderId, name: currentName }];
				currentId = currentFolderId;
			} else {
				path = [{ id: null, name: 'Mi unidad' }];
				currentId = null;
			}
			await load(currentId);
		})();
	});
}
