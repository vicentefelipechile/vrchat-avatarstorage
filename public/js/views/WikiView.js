import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';

export default class WikiView extends AbstractView {
    async getHtml() {
        return `
            <div class="details-box">
                <h1>${t('wiki.title')}</h1>
                <p style="font-size: 1.1em; margin-bottom: 30px;">${t('wiki.subtitle')}</p>

                <!-- Poiyomi Section -->
                <div style="background: #f0f8ff; border-left: 4px solid #4a90e2; padding: 20px; margin-bottom: 30px;">
                    <h2 style="color: #4a90e2; margin-top: 0;">
                        <span style="background: #4a90e2; color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.7em; margin-right: 10px;">DEPENDENCIA</span>
                        ${t('wiki.poiyomi.title')}
                    </h2>
                    
                    <h3>${t('wiki.whatIs')}</h3>
                    <p>${t('wiki.poiyomi.description')}</p>

                    <h3>${t('wiki.whatFor')}</h3>
                    <ul>
                        <li>${t('wiki.poiyomi.feature1')}</li>
                        <li>${t('wiki.poiyomi.feature2')}</li>
                        <li>${t('wiki.poiyomi.feature3')}</li>
                        <li>${t('wiki.poiyomi.feature4')}</li>
                        <li>${t('wiki.poiyomi.feature5')}</li>
                    </ul>

                    <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <strong style="color: #856404;">⚠️ ${t('wiki.important')}</strong>
                        <p style="margin: 10px 0 0 0; color: #856404;">${t('wiki.poiyomi.warning')}</p>
                    </div>

                    <h3>${t('wiki.whereGet')}</h3>
                    <ul>
                        <li><strong>${t('wiki.poiyomi.free')}:</strong> <a href="https://github.com/poiyomi/PoiyomiToonShader" target="_blank" rel="noopener">GitHub - Poiyomi Toon Shader</a></li>
                        <li><strong>${t('wiki.poiyomi.pro')}:</strong> <a href="https://www.patreon.com/poiyomi" target="_blank" rel="noopener">Patreon - Poiyomi</a></li>
                    </ul>

                    <h3>${t('wiki.howInstall')}</h3>
                    <ol>
                        <li>${t('wiki.poiyomi.step1')}</li>
                        <li>${t('wiki.poiyomi.step2')}</li>
                        <li>${t('wiki.poiyomi.step3')}</li>
                    </ol>
                </div>

                <!-- VRCFury Section -->
                <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 20px; margin-bottom: 30px;">
                    <h2 style="color: #48bb78; margin-top: 0;">
                        <span style="background: #48bb78; color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.7em; margin-right: 10px;">OPCIONAL</span>
                        ${t('wiki.vrcfury.title')}
                    </h2>
                    
                    <h3>${t('wiki.whatIs')}</h3>
                    <p>${t('wiki.vrcfury.description')}</p>

                    <h3>${t('wiki.whatFor')}</h3>
                    <ul>
                        <li>${t('wiki.vrcfury.feature1')}</li>
                        <li>${t('wiki.vrcfury.feature2')}</li>
                        <li>${t('wiki.vrcfury.feature3')}</li>
                        <li>${t('wiki.vrcfury.feature4')}</li>
                        <li>${t('wiki.vrcfury.feature5')}</li>
                    </ul>

                    <div style="background: #d1ecf1; border: 2px solid #17a2b8; padding: 15px; margin: 20px 0;">
                        <strong style="color: #0c5460;">ℹ️ ${t('wiki.note')}</strong>
                        <p style="margin: 10px 0 0 0; color: #0c5460;">${t('wiki.vrcfury.note')}</p>
                    </div>

                    <h3>${t('wiki.whereGet')}</h3>
                    <ul>
                        <li><a href="https://vrcfury.com/" target="_blank" rel="noopener">VRCFury Official Website</a></li>
                        <li><a href="https://gitlab.com/VRCFury/VRCFury" target="_blank" rel="noopener">GitLab - VRCFury</a></li>
                    </ul>

                    <h3>${t('wiki.howInstall')}</h3>
                    <ol>
                        <li>${t('wiki.vrcfury.step1')}</li>
                        <li>${t('wiki.vrcfury.step2')}</li>
                        <li>${t('wiki.vrcfury.step3')}</li>
                    </ol>
                </div>

                <!-- Setup Guide Section (Collapsible) -->
                <div style="background: #fff9e6; border-left: 4px solid #ff9800; padding: 20px; margin-bottom: 30px;">
                    <h2 style="color: #ff9800; margin-top: 0; cursor: pointer; user-select: none;" id="setup-toggle">
                        <span style="background: #ff9800; color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.7em; margin-right: 10px;">GUÍA</span>
                        ${t('wiki.setup.title')}
                        <span id="setup-arrow" style="float: right; transition: transform 0.3s;">▼</span>
                    </h2>
                    
                    <div id="setup-content" style="display: none; margin-top: 20px;">
                        <p style="font-size: 1.1em; margin-bottom: 20px;"><strong>${t('wiki.setup.subtitle')}</strong></p>
                        
                        <!-- Step 1 -->
                        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border: 3px solid #000;">
                            <h3 style="margin-top: 0;">${t('wiki.setup.step1Title')}</h3>
                            <p>${t('wiki.setup.step1Content')}</p>
                        </div>
                        
                        <!-- Step 2 -->
                        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border: 3px solid #000;">
                            <h3 style="margin-top: 0;">${t('wiki.setup.step2Title')}</h3>
                            <p>${t('wiki.setup.step2Content')}</p>
                        </div>
                        
                        <!-- Step 3 -->
                        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border: 3px solid #000;">
                            <h3 style="margin-top: 0;">${t('wiki.setup.step3Title')}</h3>
                            <p>${t('wiki.setup.step3Content')}</p>
                        </div>
                        
                        <!-- Step 4 -->
                        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border: 3px solid #000;">
                            <h3 style="margin-top: 0;">${t('wiki.setup.step4Title')}</h3>
                            <p>${t('wiki.setup.step4Content')}</p>
                        </div>
                        
                        <!-- Step 5 -->
                        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border: 3px solid #000;">
                            <h3 style="margin-top: 0;">${t('wiki.setup.step5Title')}</h3>
                            <p>${t('wiki.setup.step5Content')}</p>
                        </div>
                        
                        <!-- Step 6 -->
                        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border: 3px solid #000;">
                            <h3 style="margin-top: 0;">${t('wiki.setup.step6Title')}</h3>
                            <p>${t('wiki.setup.step6Content')}</p>
                        </div>
                        
                        <!-- Step 7 -->
                        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border: 3px solid #000;">
                            <h3 style="margin-top: 0;">${t('wiki.setup.step7Title')}</h3>
                            <p>${t('wiki.setup.step7Content')}</p>
                        </div>
                        
                        <!-- Tip -->
                        <div style="background: #e8f4f8; padding: 15px; margin-top: 20px; border: 3px solid #000;">
                            <strong style="font-size: 1.1em;">${t('wiki.setup.tip')}</strong>
                            <p style="margin: 10px 0 0 0;">${t('wiki.setup.tipContent')}</p>
                        </div>
                    </div>
                </div>

                <!-- FAQ Section -->
                <div style="background: #fff; border: 2px solid #ddd; padding: 20px; margin-bottom: 30px;">
                    <h2>${t('wiki.faq.title')}</h2>
                    
                    <h3>${t('wiki.faq.q1')}</h3>
                    <p>${t('wiki.faq.a1')}</p>

                    <h3>${t('wiki.faq.q2')}</h3>
                    <p>${t('wiki.faq.a2')}</p>

                    <h3>${t('wiki.faq.q3')}</h3>
                    <p>${t('wiki.faq.a3')}</p>

                    <h3>${t('wiki.faq.q4')}</h3>
                    <p>${t('wiki.faq.a4')}</p>
                </div>

                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 5px;">
                    <p style="margin: 0; color: #666;">${t('wiki.footer')}</p>
                </div>
            </div>
        `;
    }

    postRender() {
        // Setup collapsible toggle
        const setupToggle = document.getElementById('setup-toggle');
        const setupContent = document.getElementById('setup-content');
        const setupArrow = document.getElementById('setup-arrow');

        if (setupToggle && setupContent && setupArrow) {
            setupToggle.addEventListener('click', () => {
                const isHidden = setupContent.style.display === 'none';
                setupContent.style.display = isHidden ? 'block' : 'none';
                setupArrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        }
    }
}
