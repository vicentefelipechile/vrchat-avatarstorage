// =========================================================================
// filter-panel.ts — Shared reusable filter panel module
// Used by AvatarsView, AssetsView, ClothesView
// =========================================================================

// =========================================================================
// Types
// =========================================================================

export interface FilterOption {
	value: string;
	label: string;
}

export interface FilterGroupConfig {
	name: string;
	label: string;
	type: 'checkbox' | 'toggle' | 'select';
	options: FilterOption[];
}

export interface FilterPanelConfig {
	groups: FilterGroupConfig[];
}

// =========================================================================
// buildFilterPanel
// Returns the HTML string for the filter panel sidebar.
// =========================================================================

export function buildFilterPanel(config: FilterPanelConfig): string {
	const groups = config.groups
		.map((g) => {
			if (g.type === 'checkbox') {
				const chips = g.options
					.map(
						(o) =>
							`<label class="filter-chip">
								<input type="checkbox" name="${g.name}" value="${o.value}" />
								<span class="filter-chip-label">${o.label}</span>
							</label>`,
					)
					.join('');
				return `<div class="filter-group" data-filter-group="${g.name}">
					<span class="filter-group-label">${g.label}</span>
					<div class="filter-chips">${chips}</div>
				</div>`;
			}

			if (g.type === 'toggle') {
				// For toggle groups, each option is rendered as its own boolean switch row
				const rows = g.options
					.map(
						(o) =>
							`<label class="filter-toggle">
								<span class="filter-toggle-label">${o.label}</span>
								<input type="checkbox" name="${o.value}" value="1" />
							</label>`,
					)
					.join('');
				return `<div class="filter-group" data-filter-group="${g.name}">
					<span class="filter-group-label">${g.label}</span>
					${rows}
				</div>`;
			}

			if (g.type === 'select') {
				const opts = g.options
					.map((o) => `<option value="${o.value}">${o.label}</option>`)
					.join('');
				return `<div class="filter-group" data-filter-group="${g.name}">
					<span class="filter-group-label">${g.label}</span>
					<select class="filter-select" name="${g.name}">
						<option value="">— Todos —</option>
						${opts}
					</select>
				</div>`;
			}

			return '';
		})
		.join('');

	return `<aside class="filter-panel" id="filter-panel">
		<div class="filter-panel-header">
			<h3>Filtros</h3>
			<button class="filter-reset-btn" id="filter-reset-btn" type="button">Limpiar</button>
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
		}, 300);
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
