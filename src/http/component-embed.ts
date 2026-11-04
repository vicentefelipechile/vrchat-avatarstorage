// =========================================================================================================
// DISCORD COMPONENT EMBED
// =========================================================================================================
// Builds server-rendered link previews while leaving Open Graph available as a fallback.
// =========================================================================================================

// =========================================================================================================
// Types
// =========================================================================================================

type Preview = { title: string; description: string; url: string; imageUrl?: string };

// =========================================================================================================
// Helpers
// =========================================================================================================

function plainDiscordText(value: string): string {
	return value.replace(/[\\*_~|`[\]()<>]/g, '\\$&').replace(/@/g, '@\u200b');
}

// =========================================================================================================
// Preview
// =========================================================================================================

export function componentEmbed(preview: Preview): string {
	if (preview.url.length > 512) return '';

	const text = `${plainDiscordText(preview.title)}\n${plainDiscordText(Array.from(preview.description).slice(0, 300).join(''))}`;
	const components: object[] = [{ type: 10, content: text }];
	if (preview.imageUrl && !preview.imageUrl.endsWith('.svg')) components.push({ type: 12, items: [{ media: { url: preview.imageUrl } }] });
	components.push({ type: 1, components: [{ type: 2, style: 5, label: 'Open', url: preview.url }] });

	// JSON inside an HTML script must not contain a literal closing tag from user content.
	const json = JSON.stringify({ component: { type: 17, components } }).replace(/</g, '\\u003c');
	if (new TextEncoder().encode(json).length > 3000) return '';
	return `<script id="discord:component-embed" type="application/json">${json}</script>`;
}
