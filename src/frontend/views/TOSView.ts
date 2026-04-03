// =========================================================================================================
// TOS VIEW
// =========================================================================================================
// Terms of Service page — fully static, hardcoded content. This view intentionally does NOT use i18n.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { RouteContext } from '../types';

// =========================================================================================================
// Endpoints
// =========================================================================================================

export async function tosView(_ctx: RouteContext): Promise<string> {
	document.title = 'VRCStorage — Terms of Service';

	return `
		<div class="tos-page">
			<div class="tos-header">
				<h1>Terms of Service</h1>
				<p class="tos-subtitle">Please read these Terms of Service carefully before using VRCStorage.</p>
				<p class="tos-date">Last updated: April 2, 2026</p>
			</div>

			<div class="tos-content">
				<section class="tos-section">
					<h2>1. About VRCStorage</h2>
					<p>VRCStorage (<strong>vrcstorage.lat</strong>) is a User-Generated Content (UGC) platform that allows users to upload, share, and download resources primarily intended for use in VRChat, including avatars, assets, clothing, and other related content.</p>
					<p>By accessing or using this platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the platform.</p>
				</section>

				<section class="tos-section">
					<h2>2. User Accounts</h2>
					<p>To upload content, you must register an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
					<ul>
						<li>You must provide accurate and complete information when registering.</li>
						<li>You must not create accounts for malicious purposes or to circumvent bans.</li>
						<li>You must not share your account with third parties.</li>
						<li>VRCStorage reserves the right to suspend or terminate accounts that violate these terms.</li>
					</ul>
				</section>

				<section class="tos-section">
					<h2>3. Age Requirement</h2>
					<p>VRCStorage is intended exclusively for users who are <strong>18 years of age or older</strong>. By accessing or using this platform, you represent and warrant that you are at least 18 years old.</p>
					<p>The platform hosts content that may include adult-oriented or mature material. If you are under the age of 18, you are not permitted to use this platform under any circumstances. VRCStorage reserves the right to terminate any account found to belong to a user under 18 years of age.</p>
				</section>

				<section class="tos-section">
					<h2>4. User-Generated Content</h2>
					<p>VRCStorage is a hosting platform and does not create or curate the content uploaded by its users. By uploading content, you represent and warrant that:</p>
					<ul>
						<li>You own the content or have obtained all necessary rights, licenses, and permissions to upload and share it.</li>
						<li>The content does not infringe upon the intellectual property, privacy, or other rights of any third party.</li>
						<li>The content does not violate any applicable laws or regulations.</li>
						<li>You grant VRCStorage a non-exclusive, worldwide, royalty-free license to host, store, display, and serve the content — including through third-party infrastructure providers (such as Cloudflare R2) — solely for the purpose of operating the service. This license terminates when you delete your content or your account, except for copies retained in automated backups, which are deleted on a rolling schedule.</li>
					</ul>
				</section>

				<section class="tos-section">
					<h2>5. Prohibited Content</h2>
					<p>The following types of content are strictly prohibited on VRCStorage:</p>
					<ul>
						<li>Content that infringes on any copyright, trademark, patent, or other intellectual property right.</li>
						<li>Malicious files, malware, or content designed to harm users or their systems.</li>
						<li>Content that violates any applicable local, national, or international law or regulation.</li>
						<li>Any content depicting the sexual exploitation of minors (CSAM), in any form whatsoever.</li>
						<li>Doxxing or the disclosure of personal information of third parties without their explicit consent.</li>
						<li>Content that violates the Terms of Service of VRChat or any other relevant platforms.</li>
					</ul>
				</section>

				<section class="tos-section">
					<h2>6. Content Moderation</h2>
					<p>All uploaded content is subject to review and approval by VRCStorage administrators before it becomes publicly available. VRCStorage reserves the right, at its sole discretion, to remove, reject, or deactivate any content that violates these Terms of Service or that it deems inappropriate, for any reason and without prior notice.</p>
					<p>Users whose content is repeatedly rejected or removed may have their accounts suspended or permanently banned.</p>
				</section>

				<section class="tos-section">
					<h2>7. Intellectual Property &amp; Copyright</h2>
					<p>VRCStorage respects intellectual property rights and expects its users to do the same. If you believe that content hosted on VRCStorage infringes your copyright or the copyright of a third party you represent, please refer to our <a href="/dmca" data-link>DMCA Policy</a>.</p>
					<p>We will respond to valid DMCA takedown notices and remove infringing content in a timely manner. Repeat infringers will have their accounts terminated.</p>
				</section>

				<section class="tos-section">
					<h2>8. Data We Collect</h2>
					<p>VRCStorage collects only the minimum data necessary to operate the service. We do not sell your data to third parties. The following information may be collected and stored:</p>
					<ul>
						<li><strong>Account credentials:</strong> Your username and a bcrypt-hashed version of your password (we never store your plain-text password).</li>
						<li><strong>Avatar URL:</strong> A URL pointing to your profile picture, stored in your account profile.</li>
						<li><strong>Email address (OAuth only):</strong> If you register or sign in via Google, your email address and Google account identifier are stored solely to link your account to your OAuth provider.</li>
						<li><strong>Two-factor authentication data:</strong> If you enable 2FA, your TOTP secret (stored AES-encrypted) and hashed backup codes are retained for as long as 2FA is active on your account.</li>
						<li><strong>Session cookie:</strong> An HttpOnly, Secure JWT cookie named <code>auth_token</code>, valid for 7 days, used to maintain your logged-in session.</li>
						<li><strong>IP address:</strong> Collected transiently by Cloudflare's infrastructure for rate limiting and security purposes. Not stored persistently by VRCStorage beyond short TTL windows.</li>
						<li><strong>Local preferences:</strong> Your chosen language and theme (light/dark) are stored in your browser's <code>localStorage</code> and are never transmitted to our servers.</li>
					</ul>
					<p>Our infrastructure runs on <strong>Cloudflare Workers, D1, R2, and KV</strong>. As a result, standard Cloudflare network telemetry (such as request country and Colo) may be processed by Cloudflare in accordance with <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare's Privacy Policy</a>.</p>
					<p>You may request deletion of your account and associated data by contacting us at <a href="mailto:contact@vrcstorage.lat">contact@vrcstorage.lat</a>.</p>
				</section>

				<section class="tos-section">
					<h2>9. Indemnification</h2>
					<p>You agree to indemnify, defend, and hold harmless VRCStorage and its operators from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in any way connected with:</p>
					<ul>
						<li>Your access to or use of the platform;</li>
						<li>Any content you upload, share, or otherwise make available through the platform;</li>
						<li>Your violation of these Terms of Service; or</li>
						<li>Your violation of any rights of a third party, including intellectual property rights or privacy rights.</li>
					</ul>
					<p>This indemnification obligation survives the termination of your account and your discontinuation of use of the platform.</p>
				</section>

				<section class="tos-section">
					<h2>10. Limitation of Liability</h2>
					<p>VRCStorage is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. The platform shall not be liable for any damages arising from the use of, or inability to use, the platform or its content, including but not limited to direct, indirect, incidental, special, punitive, or consequential damages, or loss of data or profits.</p>
					<p>VRCStorage is not responsible for user-uploaded content and does not endorse any content uploaded by its users. We act solely as a hosting provider and are not liable for the actions of our users. In no event shall VRCStorage's total liability to you exceed USD $100.</p>
				</section>

				<section class="tos-section">
					<h2>11. Changes to These Terms</h2>
					<p>VRCStorage reserves the right to modify these Terms of Service at any time. We will make reasonable efforts to notify registered users of material changes via an on-platform notice. Continued use of the platform after changes are posted constitutes your acceptance of the updated terms. It is your responsibility to review these terms periodically.</p>
				</section>

				<section class="tos-section">
					<h2>12. Governing Law &amp; Jurisdiction</h2>
					<p>These Terms of Service shall be governed by and construed in accordance with the laws of the Republic of Chile, without regard to its conflict of law provisions. Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, or invalidity thereof, shall be submitted to the exclusive jurisdiction of the competent courts of Santiago, Chile.</p>
					<p>If any provision of these Terms is found to be invalid or unenforceable under applicable law, the remaining provisions shall continue in full force and effect.</p>
				</section>

				<section class="tos-section">
					<h2>13. Contact</h2>
					<p>For general inquiries or questions about VRCStorage, you can reach us at:</p>
					<p class="tos-contact"><strong><a href="mailto:contact@vrcstorage.lat">contact@vrcstorage.lat</a></strong></p>
					<p>For copyright-related issues or DMCA requests, please use:</p>
					<p class="tos-contact"><strong><a href="mailto:dmca@vrcstorage.lat">dmca@vrcstorage.lat</a></strong></p>
				</section>

				<div class="tos-footer-note">
					<p>By using VRCStorage, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
				</div>
			</div>
		</div>`;
}

// =========================================================================================================
// Export
// =========================================================================================================

export default tosView;
