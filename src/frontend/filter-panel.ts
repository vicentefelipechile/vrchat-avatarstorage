// =========================================================================
// filter-panel.ts — Shared reusable filter panel module
// Used by AvatarsView, AssetsView, ClothesView
// =========================================================================

import { t } from './i18n';

// =========================================================================
// Types
// =========================================================================

export enum FilterType {
	CheckBox = 'checkbox',
	Toggle = 'toggle',
	Select = 'select',
}

export interface FilterOption {
	value: string;
	label?: string;
}

export interface FilterGroupConfig {
	name: string;
	label?: string; // i18n alias — overrides `name` for ALL i18n lookups (title + options)
	type: FilterType;
	options: FilterOption[];
}

export interface FilterPanelConfig {
	groups: FilterGroupConfig[];
}

// =========================================================================
// Helpers
// =========================================================================

/**
 * Resolves the i18n namespace for a group.
 * Uses `g.label` as the namespace if provided, otherwise falls back to `g.name`.
 *
 * Examples:
 *   name='gender_fit', label='avatar_gender' → ns = 'avatar_gender'
 *   name='avatar_type',  label=undefined      → ns = 'avatar_type'
 */
function groupNs(g: FilterGroupConfig): string {
	return g.label ?? g.name;
}

/**
 * Resolves group title: t('meta.<ns>.title')
 */
function resolveGroupLabel(g: FilterGroupConfig): string {
	return t(`meta.${groupNs(g)}.title`);
}

/**
 * Resolves option label: t('meta.<ns>.<subKey>')
 * subKey = o.label if provided, otherwise o.value.
 *
 * Examples:
 *   ns='avatar_gender', value='male'                  → t('meta.avatar_gender.male')
 *   ns='features',      value='is_nsfw', label='nsfw' → t('meta.features.nsfw')
 *   ns='clothesType',   value='body-part', label='bodyPart' → t('meta.clothesType.bodyPart')
 */
function resolveOptionLabel(g: FilterGroupConfig, o: FilterOption): string {
	const ns = groupNs(g);
	const subKey = o.label ?? o.value;
	return t(`meta.${ns}.${subKey}`);
}

// =========================================================================
// buildFilterPanel
// Returns the HTML string for the filter panel sidebar.
// =========================================================================

export function buildFilterPanel(config: FilterPanelConfig): string {
	const groups = config.groups
		.map((g) => {
			const groupLabel = resolveGroupLabel(g);

			if (g.type === 'checkbox') {
				const chips = g.options
					.map(
						(o) =>
							`<label class="filter-chip">
								<input type="checkbox" name="${g.name}" value="${o.value}" />
								<span class="filter-chip-label">${resolveOptionLabel(g, o)}</span>
							</label>`,
					)
					.join('');
				return `<div class="filter-group" data-filter-group="${g.name}">
					<span class="filter-group-label">${groupLabel}</span>
					<div class="filter-chips">${chips}</div>
				</div>`;
			}

			if (g.type === 'toggle') {
				const rows = g.options
					.map(
						(o) =>
							`<label class="filter-toggle">
								<span class="filter-toggle-label">${resolveOptionLabel(g, o)}</span>
								<input type="checkbox" name="${o.value}" value="1" />
							</label>`,
					)
					.join('');
				return `<div class="filter-group" data-filter-group="${g.name}">
					<span class="filter-group-label">${groupLabel}</span>
					${rows}
				</div>`;
			}

			if (g.type === 'select') {
				const opts = g.options
					.map((o) => `<option value="${o.value}">${resolveOptionLabel(g, o)}</option>`)
					.join('');
				return `<div class="filter-group" data-filter-group="${g.name}">
					<span class="filter-group-label">${groupLabel}</span>
					<select class="filter-select" name="${g.name}">
						<option value="">— ${t('meta.select')} —</option>
						${opts}
					</select>
				</div>`;
			}

			return '';
		})
		.join('');

	return `<aside class="filter-panel" id="filter-panel">
		<div class="filter-panel-header">
			<h3>${t('filterPanel.filterTitle')}</h3>
			<button class="filter-reset-btn" id="filter-reset-btn" type="button">${t('filterPanel.reset')}</button>
		</div>
		${groups}
	</aside>`;
}

// =========================================================================
// initFilterPanel
// Wires up all inputs in the panel. Reads current URL params on init
// to preselect filters. Calls onFilter with debounce on any change.
// =========================================================================

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function initFilterPanel(panelEl: HTMLElement, onFilter: (p: URLSearchParams) => void): void {
	const currentParams = new URLSearchParams(window.location.search);

	// Preselect values from URL
	panelEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
		const paramName = input.name;
		const paramValue = input.value;
		if (paramName === paramValue) {
			// toggle-style: param name = param value key, active when value = '1'
			if (currentParams.get(paramName) === '1') input.checked = true;
		} else {
			// chip-style: multi-value via repeated param
			const vals = currentParams.getAll(paramName);
			if (vals.includes(paramValue)) input.checked = true;
		}
	});

	panelEl.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
		const v = currentParams.get(sel.name);
		if (v) sel.value = v;
	});

	// Listen for changes
	panelEl.addEventListener('change', () => {
		if (_debounceTimer) clearTimeout(_debounceTimer);
		_debounceTimer = setTimeout(() => {
			onFilter(collectParams(panelEl));
		}, 850);
	});

	// Reset button
	const resetBtn = panelEl.querySelector<HTMLButtonElement>('#filter-reset-btn');
	resetBtn?.addEventListener('click', () => {
		resetFilters(panelEl);
		onFilter(new URLSearchParams());
	});
}

// =========================================================================
// collectParams
// Reads all inputs in the panel and builds a URLSearchParams object.
// =========================================================================

function collectParams(panelEl: HTMLElement): URLSearchParams {
	const params = new URLSearchParams();

	panelEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').forEach((input) => {
		const paramName = input.name;
		const paramValue = input.value;
		if (paramName === paramValue) {
			// toggle: add as boolean param
			params.set(paramName, '1');
		} else {
			// chip: append (may be multi-value)
			params.append(paramName, paramValue);
		}
	});

	panelEl.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
		if (sel.value) params.set(sel.name, sel.value);
	});

	return params;
}

// =========================================================================
// resetFilters
// Unchecks all checkboxes, resets all selects to empty.
// =========================================================================

export function resetFilters(panelEl: HTMLElement): void {
	panelEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
		input.checked = false;
	});
	panelEl.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
		sel.value = '';
	});
}