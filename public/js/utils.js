
export function resizeImage(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        const reader = new FileReader();

        reader.onload = function (e) {
            img.src = e.target.result;
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now(),
                        }));
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, file.type);
            };
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const pathToRegex = path => new RegExp('^' + path.replace(/\//g, '\\/').replace(/:\w+/g, '(.+)') + '$');

export const getParams = match => {
    const values = match.result.slice(1);
    const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(result => result[1]);

    return Object.fromEntries(keys.map((key, i) => {
        return [key, values[i]];
    }));
};

export function stripMarkdown(md) {
    if (!md) return '';
    try {
        // Remove headers
        md = md.replace(/^#+\s+/gm, '');
        // Remove bold/italic
        md = md.replace(/(\*\*|__)(.*?)\1/g, '$2');
        md = md.replace(/(\*|_)(.*?)\1/g, '$2');
        // Remove links [text](url) -> text
        md = md.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        // Remove images ![alt](url) -> alt
        md = md.replace(/!\[([^\]]+)\]\([^\)]+\)/g, '$1');
        // Remove blockquotes
        md = md.replace(/^>\s+/gm, '');
        // Remove lists
        md = md.replace(/^[\+\-\*]\s+/gm, '');
        // Remove inline code
        md = md.replace(/`([^`]+)`/g, '$1');
        return md;
    } catch (e) {
        return md;
    }
}

let siteKey = null;

async function getSiteKey() {
    if (siteKey) return siteKey;
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        siteKey = data.turnstileSiteKey;
        return siteKey;
    } catch (e) {
        console.error('Failed to fetch config', e);
        return null;
    }
}

export async function renderTurnstile(containerId) {
    if (!window.turnstile) {
        console.warn('Turnstile script not loaded yet.');
        return;
    }

    const key = await getSiteKey();
    if (!key) {
        console.error('Turnstile Site Key missing');
        return;
    }

    try {
        const container = document.querySelector(containerId);
        if (container) {
            container.innerHTML = ''; // Clear previous instance if any
            window.turnstile.render(containerId, {
                sitekey: key.trim(),
            });
        }
    } catch (e) {
        console.error('Turnstile Render Error:', e);
    }
}
