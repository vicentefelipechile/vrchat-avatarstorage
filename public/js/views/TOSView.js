import AbstractView from './AbstractView.js';

export default class TOSView extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle('VRCStorage - Terms of Service');
    }

    async getHtml() {
        return `
        <div class="tos-page">
            <div class="tos-header">
                <h1>Terms of Service</h1>
                <p class="tos-subtitle">Please read these Terms of Service carefully before using VRCStorage.</p>
                <p class="tos-date">Last updated: February 24, 2026</p>
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
                    <h2>3. User-Generated Content</h2>
                    <p>VRCStorage is a hosting platform and does not create or curate the content uploaded by its users. By uploading content, you represent and warrant that:</p>
                    <ul>
                        <li>You own the content or have obtained all necessary rights, licenses, and permissions to upload and share it.</li>
                        <li>The content does not infringe upon the intellectual property, privacy, or other rights of any third party.</li>
                        <li>The content does not violate any applicable laws or regulations.</li>
                        <li>You grant VRCStorage a non-exclusive, royalty-free license to host and display the content on the platform for the purpose of operating the service.</li>
                    </ul>
                </section>

                <section class="tos-section">
                    <h2>4. Prohibited Content</h2>
                    <p>The following types of content are strictly prohibited on VRCStorage:</p>
                    <ul>
                        <li>Content that infringes on any copyright, trademark, patent, or other intellectual property right.</li>
                        <li>Malicious files, malware, or content designed to harm users or their systems.</li>
                        <li>Content that violates any applicable local, national, or international law or regulation.</li>
                        <li>Hate speech, harassment, or content that promotes violence or discrimination against individuals or groups.</li>
                        <li>Content that violates the Terms of Service of VRChat or any other relevant platforms.</li>
                    </ul>
                </section>

                <section class="tos-section">
                    <h2>5. Content Moderation</h2>
                    <p>All uploaded content is subject to review and approval by VRCStorage administrators before it becomes publicly available. VRCStorage reserves the right, at its sole discretion, to remove, reject, or deactivate any content that violates these Terms of Service or that it deems inappropriate, for any reason and without prior notice.</p>
                    <p>Users whose content is repeatedly rejected or removed may have their accounts suspended or permanently banned.</p>
                </section>

                <section class="tos-section">
                    <h2>6. Intellectual Property & Copyright</h2>
                    <p>VRCStorage respects intellectual property rights and expects its users to do the same. If you believe that content hosted on VRCStorage infringes your copyright or the copyright of a third party you represent, please refer to our <a href="/dmca" data-link>DMCA Policy</a>.</p>
                    <p>We will respond to valid DMCA takedown notices and remove infringing content in a timely manner. Repeat infringers will have their accounts terminated.</p>
                </section>

                <section class="tos-section">
                    <h2>7. Limitation of Liability</h2>
                    <p>VRCStorage is provided "as is" without warranties of any kind. The platform shall not be liable for any damages arising from the use of, or inability to use, the platform or its content, including but not limited to direct, indirect, incidental, or consequential damages.</p>
                    <p>VRCStorage is not responsible for user-uploaded content and does not endorse any content uploaded by its users. We act solely as a hosting provider and are not liable for the actions of our users.</p>
                </section>

                <section class="tos-section">
                    <h2>8. Changes to These Terms</h2>
                    <p>VRCStorage reserves the right to modify these Terms of Service at any time. Continued use of the platform after changes are posted constitutes your acceptance of the updated terms. It is your responsibility to review these terms periodically.</p>
                </section>

                <section class="tos-section">
                    <h2>9. Contact</h2>
                    <p>For general inquiries or questions about VRCStorage, you can reach us at:</p>
                    <p class="tos-contact"><strong><a href="mailto:contact@vrcstorage.lat">contact@vrcstorage.lat</a></strong></p>
                    <p>For copyright-related issues or DMCA requests, please use:</p>
                    <p class="tos-contact"><strong><a href="mailto:dmca@vrcstorage.lat">dmca@vrcstorage.lat</a></strong></p>
                </section>

                <div class="tos-footer-note">
                    <p>By using VRCStorage, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
                </div>
            </div>
        </div>
        `;
    }
}
