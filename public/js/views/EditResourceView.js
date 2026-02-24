import AbstractView from './AbstractView.js';
import { DataCache } from '../cache.js';
import { t } from '../i18n.js';
import { renderTurnstile } from '../utils.js';

export default class EditResourceView extends AbstractView {
    async getHtml() {
        return `
            <div style="max-width: 1200px; margin: 0 auto;">
                <h1>${t('edit.title')}</h1>
                <div id="loading-edit" class="skeleton-text">Loading...</div>
                
                <form id="edit-form" style="display: none;">
                    <div class="form-group">
                        <label><strong>${t('upload.name')}</strong></label>
                        <input type="text" id="title" required>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>${t('upload.cat')}</strong></label>
                        <select id="category" class="form-control" required>
                            <option value="avatars">${t('cats.avatars')}</option>
                            <option value="worlds">${t('cats.worlds')}</option>
                            <option value="assets">${t('cats.assets')}</option>
                            <option value="clothes">${t('cats.clothes')}</option>
                        </select>
                    </div>

                    <div id="avatar-fields" style="display: none; background: var(--bg-card); padding: 15px; margin-bottom: 20px; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; margin-bottom: 15px;">${t('avatar.options')}</h3>
                        <div class="upload-grid">
                            <div class="form-group">
                                <label><strong>${t('avatar.platform')}</strong></label>
                                <select id="avatar-platform" class="form-control">
                                    <option value="PC Only" selected>${t('avatar.pcOnly')} (${t('avatar.default')})</option>
                                    <option value="Quest">${t('avatar.quest')}</option>
                                    <option value="PC / Quest">${t('avatar.pcQuest')}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label><strong>${t('avatar.sdk')}</strong></label>
                                <select id="avatar-sdk" class="form-control">
                                    <option value="3.0" selected>3.0 (${t('avatar.default')})</option>
                                    <option value="2.0">2.0</option>
                                </select>
                            </div>
                        </div>
                        <div class="upload-grid">
                             <div class="form-group">
                                <label><strong>${t('avatar.version')}</strong> (e.g. v1.0)</label>
                                <input type="text" id="avatar-version" placeholder="v1.0">
                            </div>
                            <div class="form-group" style="display: flex; align-items: center; margin-top: 30px;">
                                <input type="checkbox" id="avatar-blend" style="width: auto; margin-right: 10px;">
                                <label for="avatar-blend" style="margin-bottom: 0;"><strong>${t('avatar.blend')}</strong></label>
                            </div>
                        </div>
                        <div class="upload-grid" style="margin-top: 10px;">
                             <div class="form-group" style="display: flex; align-items: center;">
                                <input type="checkbox" id="avatar-poiyomi" style="width: auto; margin-right: 10px;">
                                <label for="avatar-poiyomi" style="margin-bottom: 0;"><strong>${t('avatar.poiyomi')}</strong></label>
                            </div>
                            <div class="form-group" style="display: flex; align-items: center;">
                                <input type="checkbox" id="avatar-vrcfury" style="width: auto; margin-right: 10px;">
                                <label for="avatar-vrcfury" style="margin-bottom: 0;"><strong>${t('avatar.vrcfury')}</strong></label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label><strong>${t('upload.tags')}</strong> <small>(${t('upload.tagsHint')})</small></label>
                        <input type="text" id="tags" placeholder="anime, horror, quest, nsfw">
                    </div>
                    <div class="form-group">
                        <label><strong>${t('upload.desc')} (Markdown)</strong></label>
                        <div style="display: flex; gap: 20px; align-items: stretch;">
                            <div style="flex: 1;">
                                <textarea id="description" rows="20" style="width: 100%; height: 100%; font-family: monospace; resize: vertical; min-height: 400px;"></textarea>
                            </div>
                            <div style="flex: 1; border: 1px solid var(--border-color); padding: 15px; background: var(--bg-card); overflow-y: auto; max-height: 600px;">
                                <div id="markdown-preview" class="markdown-body"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Add File Section -->
                    <div class="form-group" style="background: var(--bg-card); padding: 15px; border: 2px solid var(--border-color); margin-top: 20px;">
                        <h3 style="margin-top:0;">${t('edit.addFileHeader')}</h3>
                        <p style="font-size: 0.9em; color: var(--text-muted);">${t('edit.addFileDesc')}</p>
                        
                        <label><strong>${t('upload.file')}</strong></label>
                        <input type="file" id="new-file" accept=".rar,.zip,.unitypackage">
                        <div id="new-file-info"></div>
                        
                        <div id="upload-progress" style="display: none; margin-top: 10px;">
                            <progress value="0" max="100" style="width: 100%"></progress>
                            <span id="upload-percent">0%</span>
                        </div>
                    </div>

                    <div id="edit-error" style="color: red; margin: 10px 0;"></div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn" style="flex: 1;">${t('settings.save')}</button>
                        <a href="/item/${this.params.id}" data-link class="btn" style="background: #666;">${t('common.cancel')}</a>
                    </div>
                </form>
            </div>
        `;
    }

    async postRender() {
        const uuid = this.params.id;
        const form = document.getElementById('edit-form');
        const loading = document.getElementById('loading-edit');
        const errorDiv = document.getElementById('edit-error');
        
        let originalData = null;

        // Fetch Data
        try {
            const res = await DataCache.fetch(`/api/resources/${uuid}`, 0); // No cache for edit
            if (!res) throw new Error('Resource not found');
            
            originalData = res;

            document.getElementById('title').value = res.title;
            document.getElementById('category').value = res.category;
            
            // Avatar Fields Logic & Data Extraction
            const categorySelect = document.getElementById('category');
            const avatarFields = document.getElementById('avatar-fields');

            const toggleAvatarFields = () => {
                avatarFields.style.display = (categorySelect.value === 'avatars') ? 'block' : 'none';
            };
            categorySelect.addEventListener('change', toggleAvatarFields);
            toggleAvatarFields();

            let descriptionText = res.description || '';
            const AVATAR_DETAILS_REGEX = /\n\n---\n\n### Avatar Details\n([\s\S]*)$/;
            const match = descriptionText.match(AVATAR_DETAILS_REGEX);
            
            if (match && match[1]) {
                // Remove the block from the editor text so user edits clean description
                descriptionText = descriptionText.replace(AVATAR_DETAILS_REGEX, '');
                
                // Parse the details to fill the form controls
                const details = match[1];
                
                const getVal = (key) => {
                    // Escape special regex chars in key if needed, but here keys are simple
                    const m = details.match(new RegExp(`\\* ${key.replace('.', '\\.')}: (.*)`));
                    return m ? m[1].trim() : null;
                };

                const platform = getVal('Platform');
                if (platform) document.getElementById('avatar-platform').value = platform;
                
                const sdk = getVal('SDK');
                if (sdk) document.getElementById('avatar-sdk').value = sdk;
                
                const version = getVal('Version');
                if (version && version !== 'Not specified') document.getElementById('avatar-version').value = version;
                
                const checkBool = (key, id) => {
                    const val = getVal(key);
                    if (val) document.getElementById(id).checked = (val === 'Yes');
                };
                
                checkBool('Contains .blend', 'avatar-blend');
                checkBool('Uses Poiyomi', 'avatar-poiyomi');
                checkBool('Uses VRCFury', 'avatar-vrcfury');
            }

            document.getElementById('description').value = descriptionText;
            
            // Populate Tags
            const tags = res.tags ? res.tags.map(t => t.name).join(', ') : '';
            document.getElementById('tags').value = tags;

            // Setup Markdown Preview
            const descEl = document.getElementById('description');
            const previewEl = document.getElementById('markdown-preview');
            
            const updatePreview = () => {
                const text = descEl.value;
                if (window.marked && window.DOMPurify) {
                    previewEl.innerHTML = window.DOMPurify.sanitize(window.marked.parse(text || ''));
                } else if (window.marked) {
                    previewEl.innerHTML = window.marked.parse(text || '');
                } else {
                    previewEl.textContent = text;
                }
            };
            
            descEl.addEventListener('input', updatePreview);
            updatePreview(); // Initial render

            loading.style.display = 'none';
            form.style.display = 'block';
        } catch (e) {
            loading.innerHTML = `<p style="color: red;">Error: ${e.message}</p>`;
            return;
        }

        // File Upload Logic (Reuse from UploadView mostly)
        const fileInput = document.getElementById('new-file');
        
        // Form Submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = t('edit.saving');
            errorDiv.textContent = '';

            try {
                // 1. Upload new file if present
                const newFile = fileInput.files[0];
                let uploadedFileLinks = []; // This backend endpoint might NOT support adding links directly via update yet?
                // Wait, the PUT endpoint I wrote earlier updates title, desc, category, tags. 
                // It DOES NOT have logic to append to `resource_links`.
                // I need to update the backend first or use a separate endpoint for adding files?
                // OR: I can update the PUT endpoint to accept `new_links`.
                
                // Let's assume I will update the backend to accept `new_links` array in the PUT body.
                
                if (newFile) {
                    // Quick upload logic
                    const formData = new FormData();
                    formData.append('file', newFile);
                    formData.append('media_type', 'file');
                    
                    document.getElementById('upload-progress').style.display = 'block';
                    
                    // Simple XHR upload
                    const uploadRes = await new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('PUT', '/api/upload');
                        xhr.upload.onprogress = (ev) => {
                            if (ev.lengthComputable) {
                                const percent = (ev.loaded / ev.total) * 100;
                                document.getElementById('upload-percent').innerText = Math.round(percent) + '%';
                                document.querySelector('progress').value = percent;
                            }
                        };
                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
                            else reject(new Error('Upload failed'));
                        };
                        xhr.onerror = () => reject(new Error('Network error'));
                        xhr.send(formData);
                    });

                    // Add to links array
                    // Since I can't easily append to DB links without a specific backend handler, 
                    // I might need to implement that backend support now.
                    // But wait, the prompt said "users NO pueden modificar los archivos, a lo maximo pueden añadir mas archivos".
                    
                    // I will send the new file as a link to be added.
                    // The backend PUT currently doesn't look at "links".
                    // I MUST modify the backend PUT to handle `new_links`.
                    
                    uploadedFileLinks.push({
                        link_url: `/api/download/${uploadRes.r2_key}`,
                        link_title: newFile.name,
                        link_type: 'download',
                        display_order: 99 // Put at end
                    });
                }

                // 2. Prepare Payload
                const tagsInput = document.getElementById('tags').value;
                const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

                let finalDescription = document.getElementById('description').value;
                const categoryVal = document.getElementById('category').value;

                // Re-append Avatar Information if Category is Avatars
                if (categoryVal === 'avatars') {
                    const platform = document.getElementById('avatar-platform').value;
                    const sdk = document.getElementById('avatar-sdk').value;
                    const version = document.getElementById('avatar-version').value;
                    const hasBlend = document.getElementById('avatar-blend').checked;
                    const usesPoiyomi = document.getElementById('avatar-poiyomi').checked;
                    const usesVrcFury = document.getElementById('avatar-vrcfury').checked;

                    let extraInfo = '\n\n---\n\n### Avatar Details\n';
                    extraInfo += `* Platform: ${platform}\n`;
                    extraInfo += `* SDK: ${sdk}\n`;
                    extraInfo += `* Version: ${version || 'Not specified'}\n`;
                    extraInfo += `* Contains .blend: ${hasBlend ? 'Yes' : 'No'}\n`;
                    extraInfo += `* Uses Poiyomi: ${usesPoiyomi ? 'Yes' : 'No'}\n`;
                    extraInfo += `* Uses VRCFury: ${usesVrcFury ? 'Yes' : 'No'}\n`;

                    finalDescription += extraInfo;
                }

                const payload = {
                    title: document.getElementById('title').value,
                    category: categoryVal,
                    description: finalDescription,
                    tags: tagsArray,
                    new_links: uploadedFileLinks // Will need backend support
                };

                // 3. Send PUT
                const res = await fetch(`/api/resources/${uuid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    // Clear cache for this item so the user sees the update immediately
                    DataCache.clear(`/api/resources/${uuid}`);
                    
                    // Navigate back
                    // Use router navigate
                    history.pushState(null, null, `/item/${uuid}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else {
                    const data = await res.json();
                    throw new Error(data.error || 'Update failed');
                }

            } catch (err) {
                console.error(err);
                errorDiv.textContent = err.message;
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
}
