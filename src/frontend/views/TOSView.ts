// =========================================================================================================
// TOS VIEW
// =========================================================================================================
// Terms of Service page — fully static, hardcoded content. This view intentionally does NOT use i18n.
// English is the only official version of these terms.
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
				<p class="tos-date">Last updated: September 7, 2026</p>
			</div>

			<div class="tos-content">
				<section class="tos-section">
					<h2>1. About VRCStorage</h2>
					<p>VRCStorage (<strong>vrcstorage.lat</strong>) is a User-Generated Content (UGC) platform where users can upload, share, and download resources primarily intended for use in VRChat, including avatars, assets, clothing, and other related content. It also includes secondary features such as comments and chat.</p>
					<p>By accessing or using this platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the platform.</p>
					<p>The English version of these terms is the only official version.</p>
				</section>

				<section class="tos-section">
					<h2>2. User Accounts</h2>
					<p>To upload content, you must register an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
					<ul>
						<li>You must provide accurate and complete information when registering (a username and password, or your Google account).</li>
						<li>We may ask you to complete an anti-bot check when registering.</li>
						<li>One person, one account: we may suspend accounts we believe are used to evade a ban.</li>
						<li>You must not share your account with third parties. You are responsible for keeping your password private.</li>
						<li>Usernames must be appropriate. We may require you to change or remove usernames we consider offensive or misleading.</li>
						<li>VRCStorage reserves the right to suspend or terminate accounts that violate these terms.</li>
					</ul>
				</section>

				<section class="tos-section">
					<h2>3. Age Requirement</h2>
					<p>VRCStorage is intended exclusively for users who are <strong>18 years of age or older</strong>. By accessing or using this platform, you represent and warrant that you are at least 18 years old. We do not verify your identity; it is your responsibility to be honest about your age.</p>
					<p>The platform hosts content that may include adult-oriented or mature material. If you are under the age of 18, you are not permitted to use this platform under any circumstances. VRCStorage reserves the right to terminate any account found to belong to a user under 18 years of age.</p>
				</section>

				<section class="tos-section">
					<h2>4. User-Generated Content</h2>
					<p>VRCStorage is a hosting platform and does not create or curate the content uploaded by its users. By uploading content, you represent and warrant that:</p>
					<ul>
						<li>You own the content or have obtained all necessary rights, licenses, and permissions to upload and share it.</li>
						<li>The content does not infringe upon the intellectual property, privacy, or other rights of any third party.</li>
						<li>The content does not violate any applicable laws or regulations.</li>
						<li>You give VRCStorage permission to host, store, show, and deliver your content so the service can work. This includes creating optimized copies of your images and videos (adapted sizes, previews shown while loading, short animated previews of videos) so pages load fast.</li>
					</ul>
					<p>When you delete your content, we stop showing it, but copies may take some time to fully disappear from our systems. If you delete your account, content you already published stays on the platform.</p>
				</section>

				<section class="tos-section">
					<h2>5. Prohibited Content</h2>
					<p>The following types of content and behavior are strictly prohibited on VRCStorage:</p>
					<ul>
						<li>Content that infringes on any copyright, trademark, patent, or other intellectual property right.</li>
						<li>Uploading paid or leaked content that you know you have no right to share.</li>
						<li>Malicious files, malware, or content designed to harm users or their systems.</li>
						<li>Content that violates any applicable local, national, or international law or regulation.</li>
						<li>Any content depicting the sexual exploitation of minors (CSAM), in any form whatsoever.</li>
						<li>Doxxing or the disclosure of personal information of third parties without their explicit consent.</li>
						<li>Spam, harassment, hate, or abusive behavior in comments or chat.</li>
						<li>Trying to break, overload, or abuse the service (mass uploads, bots, bypassing limits).</li>
						<li>Content that violates the Terms of Service of VRChat or any other relevant platforms.</li>
					</ul>
				</section>

				<section class="tos-section">
					<h2>6. Content Moderation</h2>
					<p>Uploaded resources are subject to review and approval by VRCStorage administrators before they become publicly available. Comments and chat messages appear instantly and are moderated afterwards.</p>
					<p>VRCStorage reserves the right, at its sole discretion, to remove, reject, or deactivate any content that violates these Terms of Service or that it deems inappropriate, for any reason and without prior notice. Consequences may escalate from a warning to content removal, account suspension, or a permanent ban.</p>
					<p>Users whose content is repeatedly rejected or removed may have their accounts suspended or permanently banned.</p>
				</section>

				<section class="tos-section">
					<h2>7. Intellectual Property &amp; Copyright</h2>
					<p>VRCStorage respects intellectual property rights and expects its users to do the same. If you believe that content hosted on VRCStorage infringes your copyright or the copyright of a third party you represent, please refer to our <a href="/dmca" data-link>DMCA Policy</a>.</p>
					<p>We will respond to valid takedown notices and remove infringing content in a timely manner. Repeat infringers will have their accounts terminated.</p>
					<p>If your content was removed and you believe it was a mistake, you may write to us explaining what was removed, why you believe it was an error, and your name and contact details. False or bad-faith claims can also lead to account suspension.</p>
				</section>

				<section class="tos-section">
					<h2>8. Data We Collect</h2>
					<p>VRCStorage collects only the minimum data necessary to operate the service. We do not sell your data to third parties. The following information may be collected and stored:</p>
					<ul>
						<li><strong>Account credentials:</strong> Your username and an encrypted version of your password (we never store your actual password).</li>
						<li><strong>Profile picture:</strong> The image you choose for your account profile.</li>
						<li><strong>Email address (Google login only):</strong> If you register or sign in via Google, your email address and Google account identifier are stored solely to link your account to your login provider.</li>
						<li><strong>Two-step verification:</strong> If you enable it, we keep what is needed to check your codes for as long as it stays active on your account.</li>
						<li><strong>Login cookie:</strong> A cookie that keeps you signed in for 7 days.</li>
						<li><strong>Your files:</strong> When you upload images or videos, we create optimized copies for fast loading (adapted sizes, a preview shown while loading, short animated previews of videos).</li>
						<li><strong>Comments, chat, and favorites:</strong> What you write in comments or chat is public. We keep recent chat messages so the conversation can be shown. Favorites and collections you save are private unless you share them.</li>
						<li><strong>Sharing and saving:</strong> If you create a temporary link to share a file, we use it only to deliver that file until the link expires or runs out of uses. If you save a file to your cloud drive, we use that access only to save the file you chose.</li>
						<li><strong>Security and anti-bot checks:</strong> When registering or using the site, we may ask you to prove you are a person and we may review connection data temporarily to prevent abuse. We do not keep that connection data permanently.</li>
						<li><strong>Language and theme:</strong> Your chosen language and theme (light/dark) are saved in your own browser. Your browser shares your preferred language with each visit, and we use it to show you the page and notices in that language.</li>
					</ul>
					<p>Our service runs on third-party infrastructure, which may process basic technical data about the connection (such as the approximate country) in accordance with <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare's Privacy Policy</a>.</p>
					<p>You may request deletion of your account and associated private data by contacting us at <a href="mailto:contact@vrcstorage.lat">contact@vrcstorage.lat</a>. We handle deletion requests within 30 days. Content you already published stays on the platform; your account data (credentials, profile, and private settings) is removed.</p>
				</section>

				<section class="tos-section">
					<h2>9. External Links &amp; Downloads</h2>
					<p>Many downloads point to external sites (stores, file hosts, cloud drives) that we do not control. We cannot guarantee those files will stay available or are safe. Downloading from external links is at your own risk.</p>
				</section>

				<section class="tos-section">
					<h2>10. Indemnification</h2>
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
					<h2>11. Limitation of Liability</h2>
					<p>VRCStorage is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. The platform shall not be liable for any damages arising from the use of, or inability to use, the platform or its content, including but not limited to direct, indirect, incidental, special, punitive, or consequential damages, or loss of data or profits.</p>
					<p>VRCStorage is not responsible for user-uploaded content and does not endorse any content uploaded by its users. We act solely as a hosting provider and are not liable for the actions of our users. In no event shall VRCStorage's total liability to you exceed USD $100.</p>
				</section>

				<section class="tos-section">
					<h2>12. Changes to These Terms</h2>
					<p>VRCStorage reserves the right to modify these Terms of Service at any time. We will publish the new version on this page with a new date. Continuing to use the platform after the change means you accept the updated terms. It is your responsibility to review these terms periodically.</p>
				</section>

				<section class="tos-section">
					<h2>13. Governing Law &amp; Jurisdiction</h2>
					<p>These Terms of Service shall be governed by and construed in accordance with the laws of the Republic of Chile, without regard to its conflict of law provisions. Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, or invalidity thereof, shall be submitted to the exclusive jurisdiction of the competent courts of Santiago, Chile.</p>
					<p>If any provision of these Terms is found to be invalid or unenforceable under applicable law, the remaining provisions shall continue in full force and effect. Where translations exist, the English version prevails.</p>
				</section>

				<section class="tos-section">
					<h2>14. Contact</h2>
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
