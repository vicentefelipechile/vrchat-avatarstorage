import AbstractView from './AbstractView.js';
import { t } from '../i18n.js';
import { renderTurnstile } from '../utils.js';

export default class UploadView extends AbstractView {
    async getHtml() {
        return `
            <div style="max-width: 1200px; margin: 0 auto;">
                <h1>${t('upload.title')}</h1>
                <form id="upload-form">
                    <div class="form-group">
                        <label><strong>${t('upload.name')} ${t('upload.required')}</strong></label>
                        <input type="text" id="title" required placeholder="${t('upload.resourceName')}">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>${t('upload.cat')} ${t('upload.required')}</strong></label>
                        <select id="category" class="form-control" required>
                            <option value="avatars">${t('cats.avatars')}</option>
                            <option value="worlds">${t('cats.worlds')}</option>
                            <option value="assets">${t('cats.assets')}</option>
                            <option value="clothes">${t('cats.clothes')}</option>
                            <option value="others">${t('cats.others')}</option>
                        </select>
                    </div>

                    <div id="avatar-fields" style="display: none; background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #dee2e6;">
                        <h3 style="margin-top: 0; margin-bottom: 15px;">Avatar Options</h3>
                        <div class="upload-grid">
                            <div class="form-group">
                                <label><strong>Platform</strong></label>
                                <select id="avatar-platform" class="form-control">
                                    <option value="PC Only" selected>PC Only (Default)</option>
                                    <option value="Quest">Quest</option>
                                    <option value="PC / Quest">PC / Quest</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label><strong>SDK</strong></label>
                                <select id="avatar-sdk" class="form-control">
                                    <option value="3.0" selected>3.0 (Default)</option>
                                    <option value="2.0">2.0</option>
                                </select>
                            </div>
                        </div>
                        <div class="upload-grid">
                             <div class="form-group">
                                <label><strong>Version</strong> (e.g. v1.0)</label>
                                <input type="text" id="avatar-version" placeholder="v1.0">
                            </div>
                            <div class="form-group" style="display: flex; align-items: center; margin-top: 30px;">
                                <input type="checkbox" id="avatar-blend" style="width: auto; margin-right: 10px;">
                                <label for="avatar-blend" style="margin-bottom: 0;"><strong>Contains .blend file?</strong></label>
                            </div>
                        </div>
                        <div class="upload-grid" style="margin-top: 10px;">
                             <div class="form-group" style="display: flex; align-items: center;">
                                <input type="checkbox" id="avatar-poiyomi" style="width: auto; margin-right: 10px;">
                                <label for="avatar-poiyomi" style="margin-bottom: 0;"><strong>Uses Poiyomi?</strong></label>
                            </div>
                            <div class="form-group" style="display: flex; align-items: center;">
                                <input type="checkbox" id="avatar-vrcfury" style="width: auto; margin-right: 10px;">
                                <label for="avatar-vrcfury" style="margin-bottom: 0;"><strong>Uses VRCFury?</strong></label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label><strong>${t('upload.desc')} (Markdown)</strong></label>
                        <div class="upload-grid">
                            <div>
                                <textarea id="description" rows="12" placeholder="${t('upload.markdownPlaceholder')}" style="width: 100%; font-family: monospace; resize: vertical;"></textarea>
                            </div>
                            <div>
                                <div class="preview-container">
                                    <strong>${t('upload.preview')}:</strong>
                                    <hr>
                                    <div id="markdown-preview" class="markdown-body"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label><strong>${t('upload.thumbnail')} ${t('upload.required')}</strong></label>
                        <input type="file" id="thumbnail" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif" required>
                        <small style="color: #666;">${t('upload.imageVideo')}</small>
                        <div id="thumbnail-preview" style="margin-top: 10px;"></div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label><strong>${t('upload.reference')} (${t('upload.optional')})</strong></label>
                        <input type="file" id="reference-image" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,video/mp4,video/webm" multiple>
                        <small style="color: #666;">${t('upload.imageVideoAdditional')}</small>
                        <div id="reference-preview" style="margin-top: 10px;"></div>
                    </div>

                    <div class="form-group">
                        <label><strong>${t('upload.mainFile')} (.rar, .zip, .unitypackage) ${t('upload.required')}</strong></label>
                        <input type="file" id="file" accept=".rar,.zip,.unitypackage" multiple required>
                        <small style="color: #666;">${t('upload.fileTypes')} (Max 3)</small>
                        <div id="file-info" style="margin-top: 10px; color: #666;"></div>
                    </div>

                    <div class="form-group">
                        <label><strong>${t('upload.backupLinks')}</strong></label>
                         <textarea id="backup-links" rows="3" placeholder="https://example.com/backup1&#10;https://example.com/backup2" style="width: 100%; font-family: monospace; resize: vertical;"></textarea>
                         <small style="color: #666;">${t('upload.backupLinksHint')}</small>
                    </div>

                    <div class="form-group" style="margin: 20px 0;">
                        <label><strong>CAPTCHA *</strong></label>
                        <div id="turnstile-container"></div>
                    </div>

                    <div id="progress-container" style="display: none; margin-bottom: 20px;">
                        <progress id="progress-bar" value="0" max="100" style="width: 100%;"></progress>
                        <div id="progress-text" style="text-align: center; margin-top: 5px;">0%</div>
                    </div>

                    <div id="upload-error" style="color: red; margin-bottom: 10px;"></div>
                    <button type="submit" class="btn" style="width: 100%; padding: 15px; font-size: 16px;">${t('upload.btn')}</button>
                </form>
            </div>
        `;
    }

    async postRender() {
        const router = (await import('../router.js')).router; // Circular dependency handling? Or pass router
        // Actually, we can just use navigateTo from router or global
        // We might need to export navigateTo from router.js

        const form = document.getElementById('upload-form');
        const descriptionField = document.getElementById('description');
        const markdownPreview = document.getElementById('markdown-preview');
        const thumbnailInput = document.getElementById('thumbnail');
        const referenceInput = document.getElementById('reference-image');
        const fileInput = document.getElementById('file');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const referencePreview = document.getElementById('reference-preview');
        const fileInfo = document.getElementById('file-info');
        const uploadError = document.getElementById('upload-error');
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        let turnstileToken = null;
        let turnstileWidgetId = null;

        // Initialize Turnstile
        try {
            const configRes = await fetch('/api/config');
            const config = await configRes.json();

            if (window.turnstile) {
                turnstileWidgetId = window.turnstile.render('#turnstile-container', {
                    sitekey: config.turnstileSiteKey,
                    callback: function (token) {
                        turnstileToken = token;
                    },
                    'expired-callback': function () {
                        turnstileToken = null;
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load Turnstile config', e);
        }

        // Avatar Fields Logic
        const categorySelect = document.getElementById('category');
        const avatarFields = document.getElementById('avatar-fields');

        const toggleAvatarFields = () => {
            if (categorySelect.value === 'avatars') {
                avatarFields.style.display = 'block';
            } else {
                avatarFields.style.display = 'none';
            }
        };

        categorySelect.addEventListener('change', toggleAvatarFields);
        toggleAvatarFields(); // Initial check

        // Markdown Preview
        descriptionField.addEventListener('input', () => {
            const markdown = descriptionField.value;
            if (window.marked) {
                markdownPreview.innerHTML = window.marked.parse(markdown || `*${t('upload.noContent')}*`);
            } else {
                markdownPreview.textContent = markdown || t('upload.noContent');
            }
        });

        // Trigger initial preview
        descriptionField.dispatchEvent(new Event('input'));

        // Thumbnail Preview
        thumbnailInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const isVideo = file.type.startsWith('video/');
                const url = URL.createObjectURL(file);

                const container = document.createElement('div');
                container.className = 'preview-item';
                container.style.cssText = 'display: inline-block; position: relative; border: 2px solid #333; padding: 10px; margin: 5px; background: #fff;';

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '✕';
                deleteBtn.className = 'preview-delete-btn';
                deleteBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: #dc3545; color: white; border: none; border-radius: 3px; width: 25px; height: 25px; cursor: pointer; font-weight: bold; z-index: 10;';
                deleteBtn.onclick = (e) => {
                    e.preventDefault();
                    thumbnailInput.value = '';
                    thumbnailPreview.innerHTML = '';
                    URL.revokeObjectURL(url);
                };

                const mediaElement = document.createElement(isVideo ? 'video' : 'img');
                mediaElement.src = url;
                mediaElement.style.cssText = 'max-width: 200px; max-height: 200px; display: block;';
                if (isVideo) mediaElement.controls = true;

                const filename = document.createElement('div');
                filename.textContent = file.name;
                filename.style.cssText = 'margin-top: 5px; font-size: 12px; color: #666; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

                container.appendChild(deleteBtn);
                container.appendChild(mediaElement);
                container.appendChild(filename);

                thumbnailPreview.innerHTML = '';
                thumbnailPreview.appendChild(container);
            }
        });

        // Reference Image Preview with File Management
        let selectedReferenceFiles = [];

        const renderReferencePreview = () => {
            referencePreview.innerHTML = '';

            selectedReferenceFiles.forEach((file, index) => {
                const isVideo = file.type.startsWith('video/');
                const url = URL.createObjectURL(file);

                const container = document.createElement('div');
                container.className = 'preview-item';
                container.style.cssText = 'display: inline-block; position: relative; border: 2px solid #333; padding: 10px; margin: 5px; background: #fff; vertical-align: top;';

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '✕';
                deleteBtn.className = 'preview-delete-btn';
                deleteBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: #dc3545; color: white; border: none; border-radius: 3px; width: 25px; height: 25px; cursor: pointer; font-weight: bold; z-index: 10;';
                deleteBtn.onclick = (e) => {
                    e.preventDefault();
                    // Remove file from array
                    selectedReferenceFiles.splice(index, 1);

                    // Update input with remaining files using DataTransfer
                    const dt = new DataTransfer();
                    selectedReferenceFiles.forEach(f => dt.items.add(f));
                    referenceInput.files = dt.files;

                    // Re-render previews
                    renderReferencePreview();
                };

                const mediaElement = document.createElement(isVideo ? 'video' : 'img');
                mediaElement.src = url;
                mediaElement.style.cssText = 'max-width: 200px; max-height: 200px; object-fit: cover; display: block;';
                if (isVideo) mediaElement.controls = true;

                const filename = document.createElement('div');
                filename.textContent = file.name;
                filename.style.cssText = 'margin-top: 5px; font-size: 12px; color: #666; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

                container.appendChild(deleteBtn);
                container.appendChild(mediaElement);
                container.appendChild(filename);

                referencePreview.appendChild(container);
            });
        };

        referenceInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);

            if (files.length > 8) {
                alert(t('upload.maxFiles'));
                referenceInput.value = '';
                selectedReferenceFiles = [];
                renderReferencePreview();
                return;
            }

            selectedReferenceFiles = files;
            renderReferencePreview();
        });

        // File Validation
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            fileInfo.innerHTML = '';
            uploadError.textContent = '';

            if (files.length > 3) {
                fileInfo.innerHTML = `<span style="color: red;">✗ Max 3 files allowed</span>`;
                uploadError.textContent = 'Max 3 files allowed';
                fileInput.value = '';
                return;
            }

            const validExtensions = ['.rar', '.zip', '.unitypackage'];
            let allValid = true;

            files.forEach(file => {
                const fileName = file.name.toLowerCase();
                const isValid = validExtensions.some(ext => fileName.endsWith(ext));

                if (!isValid) allValid = false;

                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                const color = isValid ? 'green' : 'red';
                const symbol = isValid ? '✓' : '✗';

                const div = document.createElement('div');
                div.innerHTML = `<span style="color: ${color};">${symbol} ${file.name} (${sizeMB} MB)</span>`;
                fileInfo.appendChild(div);
            });

            if (!allValid) {
                uploadError.textContent = `${t('upload.error')}: ${t('upload.errorMainFile')}`;
                fileInput.value = '';
            }
        });

        // Helper: Upload with progress
        const uploadFileWithProgress = (url, formData, onProgress) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', url);

                if (onProgress) {
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            onProgress(percentComplete);
                        }
                    };
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            reject(new Error('Invalid JSON response'));
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(formData);
            });
        };

        // Helper: Upload Large File (Chunked)
        const uploadLargeFile = async (file, mediaType, onProgress) => {
            const CHUNK_SIZE = 30 * 1024 * 1024; // 30MB
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

            // 1. Init
            const initRes = await fetch('/api/upload/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, media_type: mediaType })
            });

            if (!initRes.ok) throw new Error('Failed to initialize upload');
            const { uploadId, key } = await initRes.json();

            // 2. Upload Parts
            const parts = [];
            let loaded = 0;

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
                const partNumber = chunkIndex + 1;

                const partRes = await fetch('/api/upload/part', {
                    method: 'PUT',
                    headers: {
                        'X-Upload-ID': uploadId,
                        'X-Key': key,
                        'X-Part-Number': partNumber.toString(),
                        'Content-Type': 'application/octet-stream' // Important
                    },
                    body: chunk
                });

                if (!partRes.ok) throw new Error(`Failed to upload part ${partNumber}`);
                const partData = await partRes.json();
                parts.push(partData);

                loaded += chunk.size;
                const percent = (loaded / file.size) * 100;
                onProgress(percent);
            }

            // 3. Complete
            const completeRes = await fetch('/api/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uploadId,
                    key,
                    parts,
                    filename: file.name,
                    media_type: mediaType
                })
            });

            if (!completeRes.ok) throw new Error('Failed to complete upload');
            return await completeRes.json();
        };

        // Helper: Update Progress UI
        const updateProgress = (text, percent) => {
            progressContainer.style.display = 'block';
            progressBar.value = percent;
            progressText.innerText = `${text} (${Math.round(percent)}%)`;
        };

        // Form Submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = t('upload.uploading');
            btn.disabled = true;
            uploadError.textContent = '';

            // Block navigation
            const preventNav = (e) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', preventNav);

            // Visual block for navbar
            const nav = document.querySelector('nav');
            if (nav) {
                nav.style.pointerEvents = 'none';
                nav.style.opacity = '0.5';
            }

            const title = document.getElementById('title').value;
            let description = descriptionField.value; // Use let to allow modification
            const category = document.getElementById('category').value;

            // Append Avatar Information if Category is Avatars
            if (category === 'avatars') {
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

                description += extraInfo;
            }
            const file = fileInput.files[0];
            const files = Array.from(fileInput.files); // Start using array of files
            const thumbnail = thumbnailInput.files[0];
            const referenceFiles = referenceInput.files;

            const resetState = () => {
                window.removeEventListener('beforeunload', preventNav);
                if (nav) {
                    nav.style.pointerEvents = 'auto';
                    nav.style.opacity = '1';
                }
                btn.textContent = originalText;
                btn.disabled = false;
            };

            // Validate main file(s)
            const validExtensions = ['.rar', '.zip', '.unitypackage'];
            let allFilesValid = true;

            if (files.length === 0) {
                uploadError.textContent = `${t('upload.error')}: No file selected`;
                resetState();
                return;
            }

            if (files.length > 3) {
                uploadError.textContent = `${t('upload.error')}: Max 3 files allowed`;
                resetState();
                return;
            }

            files.forEach(f => {
                const fName = f.name.toLowerCase();
                if (!validExtensions.some(ext => fName.endsWith(ext))) {
                    allFilesValid = false;
                }
            });

            if (!allFilesValid) {
                uploadError.textContent = `${t('upload.error')}: ${t('upload.errorMainFile')}`;
                resetState();
                return;
            }

            if (!thumbnail) {
                uploadError.textContent = `${t('upload.error')}: ${t('upload.errorThumbnail')}`;
                resetState();
                return;
            }

            if (!turnstileToken) {
                uploadError.textContent = `${t('upload.error')}: ${t('upload.errorCaptcha')}`;
                resetState();
                return;
            }

            try {
                // 1. Upload Thumbnail
                const thumbnailFormData = new FormData();
                thumbnailFormData.append('file', thumbnail);
                thumbnailFormData.append('media_type', thumbnail.type.startsWith('video/') ? 'video' : 'image');

                updateProgress(t('upload.uploadingThumbnail'), 0);
                const thumbnailData = await uploadFileWithProgress('/api/upload', thumbnailFormData, (p) => {
                    updateProgress(t('upload.uploadingThumbnail'), p);
                });

                // 2. Upload Reference Images (Gallery)
                const galleryUuids = [];
                if (referenceFiles.length > 0) {
                    if (referenceFiles.length > 8) {
                        alert(t('upload.maxFiles'));
                        resetState();
                        progressContainer.style.display = 'none';
                        return;
                    }

                    for (let i = 0; i < referenceFiles.length; i++) {
                        const file = referenceFiles[i];
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('media_type', file.type.startsWith('video/') ? 'video' : 'image');

                        updateProgress(`${t('upload.uploadingReference')} (${i + 1}/${referenceFiles.length})`, 0);
                        const data = await uploadFileWithProgress('/api/upload', formData, (p) => {
                            updateProgress(`${t('upload.uploadingReference')} (${i + 1}/${referenceFiles.length})`, p);
                        });
                        galleryUuids.push(data.media_uuid);
                    }
                }

                // 3. Upload Main File(s)
                const files = Array.from(fileInput.files);
                const uploadedFilesData = [];

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileFormData = new FormData();
                    fileFormData.append('file', file);
                    fileFormData.append('media_type', 'file');

                    const progressLabel = `${t('upload.uploadingFile')} (${i + 1}/${files.length})`;
                    updateProgress(progressLabel, 0);

                    let fileData;
                    if (file.size > 30 * 1024 * 1024) {
                        // Use Chunked Upload for > 30MB
                        fileData = await uploadLargeFile(file, 'file', (p) => {
                            updateProgress(progressLabel, p);
                        });
                    } else {
                        // Standard Upload
                        fileData = await uploadFileWithProgress('/api/upload', fileFormData, (p) => {
                            updateProgress(progressLabel, p);
                        });
                    }
                    uploadedFilesData.push({ ...fileData, originalName: file.name, size: file.size });
                }

                // 4. Create Resource
                updateProgress(t('upload.creating'), 100);

                // Construct links for uploaded files
                const fileLinks = uploadedFilesData.map((f, index) => ({
                    link_url: `/api/download/${f.r2_key}`,
                    link_title: f.originalName,
                    link_type: 'download',
                    display_order: index,
                    file_size: f.size,
                    version: '1.0'
                }));

                const resourceBody = {
                    title,
                    description,
                    category,
                    thumbnail_uuid: thumbnailData.media_uuid,
                    reference_image_uuid: galleryUuids.length > 0 ? galleryUuids[0] : null,
                    media_files: [thumbnailData.media_uuid, ...galleryUuids, ...uploadedFilesData.map(f => f.media_uuid)], // Add all media UUIDs
                    links: fileLinks
                };

                // Add Backup Links
                const backupLinksText = document.getElementById('backup-links').value;
                if (backupLinksText) {
                    const urls = backupLinksText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
                    urls.forEach((url, index) => {
                        resourceBody.links.push({
                            link_url: url,
                            link_title: 'Backup ' + (index + 1),
                            link_type: 'download',
                            display_order: fileLinks.length + index + 1
                        });
                    });
                }

                // Add token
                resourceBody.token = turnstileToken;

                const res = await fetch('/api/resources', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(resourceBody)
                });

                if (res.ok) {
                    const data = await res.json();
                    window.removeEventListener('beforeunload', preventNav); // Allow navigation
                    if (nav) {
                        nav.style.pointerEvents = 'auto';
                        nav.style.opacity = '1';
                    }
                    navigateTo('/item/' + data.uuid);
                } else {
                    const err = await res.json();
                    throw new Error(err.error || t('upload.errorCreateResource'));
                }
            } catch (err) {
                console.error(err);
                uploadError.textContent = `${t('upload.error')}: ${err.message}`;
                progressContainer.style.display = 'none';
                resetState();
                if (window.turnstile && turnstileWidgetId) {
                    window.turnstile.reset(turnstileWidgetId);
                    turnstileToken = null;
                }
            }
        });
    }
}

// Simple navigation helper if ignoring the module import issue
function navigateTo(url) {
    history.pushState(null, null, url);
    // Router should pick this up via popstate dispatch or we call router() manually
    // Ideally we import router, but avoiding circular dep issues for now.
    // Better: Dispatch custom event 'navigate'
    const event = new PopStateEvent('popstate');
    window.dispatchEvent(event);
}
