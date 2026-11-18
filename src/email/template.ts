// =========================================================================================================
// VRCSTORAGE EMAIL TEMPLATE
// =========================================================================================================
// Inline light-theme tokens are required because mail clients do not reliably support CSS variables.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { cleanProxyBlocks, escapeHtml } from './message';

// =========================================================================================================
// Template
// =========================================================================================================

export function renderEmail(author: string, text: string, html?: string): { text: string; html: string } {
	const plain = cleanProxyBlocks(text);
	const rich = html ? cleanProxyBlocks(html) : escapeHtml(plain).replace(/\r\n|\r|\n/g, '<br>');
	return {
		text: `VRCStorage\n${author}\n\n${plain}`,
		html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;background:#f0f0f0;font-family:monospace;color:#333;">
			<tr><td align="center" style="padding:24px 15px;">
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;table-layout:fixed;border:2px solid #333;border-collapse:collapse;background:#fff;">
					<tr><td style="padding:24px 30px;border-bottom:2px solid #333;">
						<div style="font-family:monospace;font-size:1.4rem;font-weight:bold;line-height:1.2;">VRCStorage</div>
						<div style="padding-top:8px;font-family:monospace;font-size:0.85rem;line-height:1.6;color:#666;word-break:break-word;">${escapeHtml(author)}</div>
					</td></tr>
					<tr><td style="padding:24px 30px;font-family:monospace;font-size:1rem;line-height:1.7;word-break:break-word;">${rich}</td></tr>
				</table>
			</td></tr>
		</table>`,
	};
}
