// =========================================================================
// views/TOSView.ts — Terms of Service (static content)
// =========================================================================

import { t } from '../i18n';
import type { RouteContext } from '../types';

// =========================================================================
// View
// =========================================================================

export async function tosView(_ctx: RouteContext): Promise<string> {
	document.title = `VRCStorage — ${t('tos.title')}`;

	return `
		<div class="login-box" style="max-width: 800px;">
			<h1>${t('tos.title')}</h1>
			<p style="color: var(--text-muted); margin-bottom: 30px;">${t('tos.lastUpdated')}</p>

			<section>
				<h2>${t('tos.section1.title')}</h2>
				<p>${t('tos.section1.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section2.title')}</h2>
				<p>${t('tos.section2.content')}</p>
				<ul>
					<li>${t('tos.section2.rule1')}</li>
					<li>${t('tos.section2.rule2')}</li>
					<li>${t('tos.section2.rule3')}</li>
					<li>${t('tos.section2.rule4')}</li>
					<li>${t('tos.section2.rule5')}</li>
				</ul>
			</section>

			<section>
				<h2>${t('tos.section3.title')}</h2>
				<p>${t('tos.section3.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section4.title')}</h2>
				<p>${t('tos.section4.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section5.title')}</h2>
				<p>${t('tos.section5.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section6.title')}</h2>
				<p>${t('tos.section6.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section7.title')}</h2>
				<p>${t('tos.section7.content')}</p>
				<ul>
					<li>${t('tos.section7.item1')}</li>
					<li>${t('tos.section7.item2')}</li>
					<li>${t('tos.section7.item3')}</li>
				</ul>
			</section>

			<section>
				<h2>${t('tos.section8.title')}</h2>
				<p>${t('tos.section8.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section9.title')}</h2>
				<p>${t('tos.section9.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section10.title')}</h2>
				<p>${t('tos.section10.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section11.title')}</h2>
				<p>${t('tos.section11.content')}</p>
			</section>

			<section>
				<h2>${t('tos.section12.title')}</h2>
				<p>${t('tos.section12.content')}</p>
				<ul>
					<li><a href="/dmca" data-link>${t('tos.dmcaLink')}</a></li>
					<li>${t('tos.gdprNote')}</li>
				</ul>
			</section>
		</div>`;
}
