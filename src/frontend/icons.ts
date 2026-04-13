// =============================================================================
// frontend/icons.ts — Centralised icon helpers built on top of lucide
//
// Usage:
//   import { icons } from '../icons';
//   html += icons.bold();          // 16×16 by default
//   html += icons.heart(20);       // custom size
//   html += icon(SomeLucideIcon);  // generic escape hatch
// =============================================================================

import {
	Bold,
	Code,
	Code2,
	Heart,
	History,
	Image,
	Italic,
	Link,
	List,
	Monitor,
	Pencil,
	Quote,
	Strikethrough,
	Globe,
	X,
	ShoppingBag,
	CreditCard,
	User,
	MessageCircle,
	Check,
} from 'lucide';

// Lucide's internal node data: [tagName, attrs, children?]
type LucideNode = [string, Record<string, string | number>, LucideNode[]?];
// A Lucide icon is exported as an array of these nodes
type LucideIconData = LucideNode[];

/** Converts a single Lucide node and its children into an HTML string. */
function renderNode(node: LucideNode): string {
	const [tag, attrs, children] = node;
	const attrStr = Object.entries(attrs)
		.map(([k, v]) => `${k}="${v}"`)
		.join(' ');
	const inner = (children ?? []).map(renderNode).join('');
	return `<${tag} ${attrStr}>${inner}</${tag}>`;
}

/**
 * Converts a Lucide icon data array into an inline SVG string.
 *
 * @param iconData  - The icon exported from the `lucide` package.
 * @param size      - Pixel size for both width and height (default: 16).
 * @param extraAttrs - Any additional HTML attributes to add to the `<svg>` tag.
 */
export function icon(iconData: LucideIconData, size = 16, extraAttrs = ''): string {
	const inner = iconData.map(renderNode).join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extraAttrs ? ' ' + extraAttrs : ''}>${inner}</svg>`;
}

/**
 * Pre-bound icon shortcuts. Each function accepts an optional `size` argument.
 * Add new entries here as other views require them.
 */
export const icons = {
	// Markdown toolbar
	bold: (size = 16) => icon(Bold as unknown as LucideIconData, size),
	italic: (size = 16) => icon(Italic as unknown as LucideIconData, size),
	strikethrough: (size = 16) => icon(Strikethrough as unknown as LucideIconData, size),
	code: (size = 16) => icon(Code as unknown as LucideIconData, size),
	codeBlock: (size = 16) => icon(Code2 as unknown as LucideIconData, size),
	link: (size = 16) => icon(Link as unknown as LucideIconData, size),
	quote: (size = 16) => icon(Quote as unknown as LucideIconData, size),
	list: (size = 16) => icon(List as unknown as LucideIconData, size),
	image: (size = 16) => icon(Image as unknown as LucideIconData, size),
	monitor: (size = 16) => icon(Monitor as unknown as LucideIconData, size),

	// UI elements
	heart: (size = 16, extraAttrs = '') => icon(Heart as unknown as LucideIconData, size, extraAttrs),
	edit: (size = 16, extraAttrs = '') => icon(Pencil as unknown as LucideIconData, size, extraAttrs),
	history: (size = 16, extraAttrs = '') => icon(History as unknown as LucideIconData, size, extraAttrs),
	check: (size = 16, extraAttrs = '') => icon(Check as unknown as LucideIconData, size, extraAttrs),
	x: (size = 16, extraAttrs = '') => icon(X as unknown as LucideIconData, size, extraAttrs),

	// Author profiles
	globe: (size = 16, extraAttrs = '') => icon(Globe as unknown as LucideIconData, size, extraAttrs),
	twitter: (size = 16, extraAttrs = '') => icon(X as unknown as LucideIconData, size, extraAttrs),
	'shopping-bag': (size = 16, extraAttrs = '') => icon(ShoppingBag as unknown as LucideIconData, size, extraAttrs),
	'credit-card': (size = 16, extraAttrs = '') => icon(CreditCard as unknown as LucideIconData, size, extraAttrs),
	user: (size = 16, extraAttrs = '') => icon(User as unknown as LucideIconData, size, extraAttrs),
	'message-circle': (size = 16, extraAttrs = '') => icon(MessageCircle as unknown as LucideIconData, size, extraAttrs),
} as const;

/**
 * Returns an icon string by name. Returns empty string if not found.
 */
export function getIcon(name: string, size = 16, extraAttrs = ''): string {
	const fn = (icons as Record<string, (s: number, e: string) => string>)[name];
	return fn ? fn(size, extraAttrs) : '';
}
