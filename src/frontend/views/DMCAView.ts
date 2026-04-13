// =========================================================================
// views/DMCAView.ts — DMCA takedown notice builder (simple + advanced)
// =========================================================================

import { t } from '../i18n';
import type { RouteContext } from '../types';

// =========================================================================
// View
// =========================================================================

export async function dmcaView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('dmca.title')}`;

	return `
		<div class="dmca-page">
			<div class="dmca-header">
				<h1>${t('dmca.title')}</h1>
				<p class="dmca-subtitle">${t('dmca.subtitle')}</p>
			</div>

			<div class="dmca-tabs">
				<button class="dmca-tab-btn active" id="dmca-tab-simple" data-tab="simple">${t('dmca.modeSimple')}</button>
				<button class="dmca-tab-btn" id="dmca-tab-advanced" data-tab="advanced">${t('dmca.modeAdvanced')}</button>
			</div>

			<!-- SIMPLE MODE -->
			<div class="dmca-panel" id="dmca-panel-simple">
				<div class="dmca-story-builder">
					<p class="dmca-story-intro">${t('dmca.simple.intro')}</p>

					<div class="dmca-story-line">
						<span class="dmca-story-text">${t('dmca.simple.iAmA')}</span>
						<select class="dmca-select" id="s-claimant-type">
							<option value="author">${t('dmca.simple.optAuthor')}</option>
							<option value="representative">${t('dmca.simple.optRepresentative')}</option>
							<option value="third_reporter">${t('dmca.simple.optThirdReporter')}</option>
						</select>
					</div>

					<div class="dmca-story-line" id="s-company-row" style="display:none">
						<span class="dmca-story-text">${t('dmca.simple.representing')}</span>
						<input type="text" class="dmca-input-inline" id="s-company-name" placeholder="${t('dmca.simple.companyPlaceholder')}">
					</div>

					<div class="dmca-story-line" id="s-reporter-name-row" style="display:none">
						<span class="dmca-story-text">${t('dmca.simple.reporterName')}</span>
						<input type="text" class="dmca-input-inline" id="s-reporter-name" placeholder="${t('dmca.simple.reporterNamePlaceholder')}">
					</div>

					<div class="dmca-field-group" id="s-reporter-reason-group" style="display:none">
						<label class="dmca-field-label">${t('dmca.simple.reporterReason')}</label>
						<select class="dmca-select dmca-select-full" id="s-reporter-reason">
							<option value="recognized">${t('dmca.simple.reason_recognized')}</option>
							<option value="shared_without_permission">${t('dmca.simple.reason_shared')}</option>
							<option value="asked_by_author">${t('dmca.simple.reason_asked')}</option>
							<option value="paid_platform">${t('dmca.simple.reason_paid')}</option>
							<option value="other">${t('dmca.simple.reason_other')}</option>
						</select>
						<textarea class="dmca-textarea dmca-textarea-sm" id="s-reporter-reason-other" rows="2"
							style="display:none;margin-top:8px"
							placeholder="${t('dmca.simple.reporterReasonPlaceholder')}"></textarea>
					</div>

					<div class="dmca-story-line" id="s-infringement-row">
						<span class="dmca-story-text">${t('dmca.simple.claimThat')}</span>
						<select class="dmca-select" id="s-infringement-type">
							<option value="mine">${t('dmca.simple.optMyRights')}</option>
							<option value="third">${t('dmca.simple.optThirdParty')}</option>
						</select>
					</div>

					<div class="dmca-story-line" id="s-owner-row" style="display:none">
						<span class="dmca-story-text">${t('dmca.simple.originalOwner')}</span>
						<input type="text" class="dmca-input-inline" id="s-owner-name" placeholder="${t('dmca.simple.ownerPlaceholder')}">
					</div>

					<div class="dmca-story-line">
						<span class="dmca-story-text">${t('dmca.simple.andDemand')}</span>
						<select class="dmca-select" id="s-action-type">
							<option value="immediate_termination">${t('dmca.simple.optImmediateTermination')}</option>
							<option value="immediate_removal">${t('dmca.simple.optImmediateRemoval')}</option>
							<option value="notify_user">${t('dmca.simple.optNotifyUser')}</option>
						</select>
					</div>

					<div class="dmca-field-group">
						<label class="dmca-field-label">${t('dmca.simple.resourceUrls')}</label>
						<p class="dmca-hint">${t('dmca.simple.resourceUrlsHint')}</p>
						<textarea class="dmca-textarea dmca-textarea-sm" id="s-resource-urls" rows="3"
							placeholder="https://vrcstorage.lat/item/...&#10;https://vrcstorage.lat/item/..."></textarea>
					</div>

					<div class="dmca-field-group" id="s-proof-group">
						<label class="dmca-field-label">${t('dmca.simple.proofLabel')}</label>
						<p class="dmca-hint">${t('dmca.simple.proofHint')}</p>
						<textarea class="dmca-textarea dmca-textarea-sm" id="s-proof-text" rows="3"
							placeholder="${t('dmca.simple.proofPlaceholder')}"></textarea>
					</div>

					<div class="dmca-preview-box">
						<p class="dmca-preview-label">${t('dmca.simple.preview')}</p>
						<div class="dmca-preview-text" id="s-preview-text"></div>
					</div>

					<button class="btn dmca-send-btn" id="s-send-btn">${t('dmca.sendEmail')}</button>
				</div>
			</div>

			<!-- ADVANCED MODE -->
			<div class="dmca-panel" id="dmca-panel-advanced" style="display:none">
				<div class="dmca-advanced-builder">
					<p class="dmca-advanced-intro">${t('dmca.advanced.intro')}</p>

					<label class="dmca-label">${t('dmca.advanced.claimLabel')}</label>
					<textarea class="dmca-textarea" id="a-claim-text" rows="10"
						placeholder="${t('dmca.advanced.claimPlaceholder')}"></textarea>

					<label class="dmca-label">${t('dmca.advanced.resourcesLabel')}</label>
					<p class="dmca-hint">${t('dmca.advanced.resourcesHint')}</p>
					<textarea class="dmca-textarea" id="a-resources-text" rows="4"
						placeholder="https://vrcstorage.lat/item/..."></textarea>

					<label class="dmca-label">${t('dmca.advanced.evidenceLabel')}</label>
					<p class="dmca-hint">${t('dmca.advanced.evidenceHint')}</p>
					<textarea class="dmca-textarea" id="a-evidence-text" rows="4"
						placeholder="${t('dmca.advanced.evidencePlaceholder')}"></textarea>

					<button class="btn dmca-send-btn" id="a-send-btn">${t('dmca.sendEmail')}</button>
				</div>
			</div>

			<div class="dmca-info-box">
				<h3>${t('dmca.info.title')}</h3>
				<ul>
					<li>${t('dmca.info.l1')}</li>
					<li>${t('dmca.info.l2')}</li>
					<li>${t('dmca.info.l3')}</li>
				</ul>
				<p class="dmca-contact"><strong>dmca@vrcstorage.lat</strong></p>
			</div>
		</div>`;
}

// =========================================================================
// After
// =========================================================================

export function dmcaAfter(_ctx: RouteContext): void {
	// Tab switching
	document.querySelectorAll<HTMLElement>('.dmca-tab-btn').forEach((btn) => {
		btn.addEventListener('click', () => {
			document.querySelectorAll('.dmca-tab-btn').forEach((b) => b.classList.remove('active'));
			btn.classList.add('active');
			const tab = btn.dataset.tab;
			document.getElementById('dmca-panel-simple')!.style.display = tab === 'simple' ? '' : 'none';
			document.getElementById('dmca-panel-advanced')!.style.display = tab === 'advanced' ? '' : 'none';
		});
	});

	// Simple form references
	const claimantType = document.getElementById('s-claimant-type') as HTMLSelectElement;
	const companyRow = document.getElementById('s-company-row')!;
	const reporterNameRow = document.getElementById('s-reporter-name-row')!;
	const reporterReasonGroup = document.getElementById('s-reporter-reason-group')!;
	const infringementRow = document.getElementById('s-infringement-row')!;
	const infringementType = document.getElementById('s-infringement-type') as HTMLSelectElement;
	const ownerRow = document.getElementById('s-owner-row')!;
	const proofGroup = document.getElementById('s-proof-group')!;
	const reasonSelect = document.getElementById('s-reporter-reason') as HTMLSelectElement;
	const reasonOther = document.getElementById('s-reporter-reason-other') as HTMLTextAreaElement;

	const buildSimpleBody = (): string => {
		const ct = claimantType.value;
		const it = infringementType.value;
		const companyName = (document.getElementById('s-company-name') as HTMLInputElement)?.value?.trim() || '___';
		const ownerName = (document.getElementById('s-owner-name') as HTMLInputElement)?.value?.trim() || '___';
		const action = (document.getElementById('s-action-type') as HTMLSelectElement)?.value;
		const urlsRaw = (document.getElementById('s-resource-urls') as HTMLTextAreaElement)?.value?.trim() || '';
		const proof = (document.getElementById('s-proof-text') as HTMLTextAreaElement)?.value?.trim() || '';
		const reporterName = (document.getElementById('s-reporter-name') as HTMLInputElement)?.value?.trim() || '___';
		const MAP: Record<string, string> = {
			recognized: t('dmca.simple.reason_recognized'),
			shared_without_permission: t('dmca.simple.reason_shared'),
			asked_by_author: t('dmca.simple.reason_asked'),
			paid_platform: t('dmca.simple.reason_paid'),
		};
		const reporterReason = reasonSelect?.value === 'other' ? reasonOther?.value?.trim() || '___' : MAP[reasonSelect?.value] || '___';

		const urls = urlsRaw
			? urlsRaw
					.split('\n')
					.map((u) => `  - ${u.trim()}`)
					.filter((u) => u.length > 4)
					.join('\n')
			: `  - ${t('dmca.simple.urlNotSpecified')}`;

		let claimantStr: string;
		if (ct === 'author') claimantStr = t('dmca.simple.optAuthor');
		else if (ct === 'representative') claimantStr = `${t('dmca.simple.optRepresentative')} ${t('dmca.simple.of')} ${companyName}`;
		else claimantStr = `${t('dmca.simple.optThirdReporter')} (${reporterName})`;

		const infringementStr =
			ct !== 'third_reporter'
				? it === 'mine'
					? t('dmca.simple.optMyRights')
					: `${t('dmca.simple.optThirdParty')} (${t('dmca.simple.recognizedAs')}: "${ownerName}")`
				: null;

		let actionStr: string;
		if (action === 'immediate_termination') actionStr = t('dmca.simple.optImmediateTermination');
		else if (action === 'immediate_removal') actionStr = t('dmca.simple.optImmediateRemoval');
		else actionStr = t('dmca.simple.optNotifyUser');

		let body = `${t('dmca.simple.bodyI')} ${claimantStr}, ${t('dmca.simple.bodyClaim')}:\n${urls}\n\n`;

		if (infringementStr) {
			body += `${t('dmca.simple.bodyInfringe')} ${infringementStr}.\n\n`;
		} else {
			body += `${t('dmca.simple.bodyThirdReporterClaim')}\n${t('dmca.simple.bodyThirdReporterReason')}: ${reporterReason}\n\n`;
		}

		body += `${t('dmca.simple.bodyDemand')} ${actionStr}.\n\n`;
		if (proof && ct !== 'third_reporter') body += `${t('dmca.simple.bodyProof')}:\n${proof}\n\n`;
		body += `${t('dmca.simple.bodyDeclaration')}\n\n${t('dmca.simple.bodyDate')}: ${new Date().toLocaleDateString()}`;

		return body;
	};

	const updatePreview = () => {
		const el = document.getElementById('s-preview-text');
		if (el) el.textContent = buildSimpleBody();
	};

	const updateSimpleVisibility = () => {
		const ct = claimantType.value;
		const it = infringementType.value;
		const isThird = ct === 'third_reporter';

		companyRow.style.display = ct === 'representative' ? 'flex' : 'none';
		reporterNameRow.style.display = isThird ? 'flex' : 'none';
		reporterReasonGroup.style.display = isThird ? '' : 'none';
		infringementRow.style.display = isThird ? 'none' : '';
		ownerRow.style.display = !isThird && it === 'third' ? 'flex' : 'none';
		proofGroup.style.display = isThird ? 'none' : '';

		updatePreview();
	};

	claimantType.addEventListener('change', updateSimpleVisibility);
	infringementType.addEventListener('change', updateSimpleVisibility);

	[
		's-company-name',
		's-owner-name',
		's-resource-urls',
		's-proof-text',
		's-action-type',
		's-reporter-name',
		's-reporter-reason',
		's-reporter-reason-other',
	].forEach((id) => {
		const el = document.getElementById(id);
		if (el) {
			el.addEventListener('input', updatePreview);
			el.addEventListener('change', updatePreview);
		}
	});

	reasonSelect?.addEventListener('change', () => {
		reasonOther.style.display = reasonSelect.value === 'other' ? '' : 'none';
		updatePreview();
	});

	updateSimpleVisibility();

	// Send simple
	document.getElementById('s-send-btn')?.addEventListener('click', () => {
		const subject = encodeURIComponent('DMCA Takedown Notice - VRCStorage');
		window.location.href = `mailto:dmca@vrcstorage.lat?subject=${subject}&body=${encodeURIComponent(buildSimpleBody())}`;
	});

	// Send advanced
	document.getElementById('a-send-btn')?.addEventListener('click', () => {
		const claim = (document.getElementById('a-claim-text') as HTMLTextAreaElement).value.trim();
		const resources = (document.getElementById('a-resources-text') as HTMLTextAreaElement).value.trim();
		const evidence = (document.getElementById('a-evidence-text') as HTMLTextAreaElement).value.trim();
		const notSpec = t('dmca.simple.urlNotSpecified');

		const body =
			`=== DMCA TAKEDOWN NOTICE ===\n\n${claim}\n\n` +
			`--- ${t('dmca.advanced.resourcesLabel')} ---\n${resources || notSpec}\n\n` +
			`--- ${t('dmca.advanced.evidenceLabel')} ---\n${evidence || notSpec}`;

		const subject = encodeURIComponent('DMCA Takedown Notice (Advanced) - VRCStorage');
		window.location.href = `mailto:dmca@vrcstorage.lat?subject=${subject}&body=${encodeURIComponent(body)}`;
	});
}
