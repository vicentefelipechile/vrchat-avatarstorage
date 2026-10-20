// =========================================================================================================
// WORD DIFF
// =========================================================================================================
// Return text tokens rather than HTML so callers can render untrusted revisions safely.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DiffPart } from '../types';

// =========================================================================================================
// Constants
// =========================================================================================================

const LOOK_AHEAD = 40;
const MAX_DIFF_TOKENS = 4000;

// =========================================================================================================
// Diff
// =========================================================================================================

export function diffWords(before: string, after: string): DiffPart[] {
	if (before === after) return [{ type: 'equal', text: before }];
	const oldWords = before.split(/(\s+)/).filter(Boolean);
	const newWords = after.split(/(\s+)/).filter(Boolean);
	// shortcut: large descriptions use whole-text comparison; use a dedicated diff algorithm if needed.
	if (oldWords.length + newWords.length > MAX_DIFF_TOKENS)
		return [
			{ type: 'delete', text: before },
			{ type: 'insert', text: after },
		];
	const parts: DiffPart[] = [];
	const push = (type: DiffPart['type'], text: string) => {
		if (!text) return;
		const previous = parts[parts.length - 1];
		if (previous?.type === type) previous.text += text;
		else parts.push({ type, text });
	};
	let i = 0;
	let j = 0;
	while (i < oldWords.length || j < newWords.length) {
		if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
			push('equal', oldWords[i++]);
			j++;
			continue;
		}
		let oldMatch = -1;
		let newMatch = -1;
		search: for (let distance = 1; distance < LOOK_AHEAD; distance++) {
			for (let offset = 0; offset <= distance; offset++) {
				const nextOld = i + offset;
				const nextNew = j + distance - offset;
				if (nextOld < oldWords.length && nextNew < newWords.length && oldWords[nextOld] === newWords[nextNew]) {
					oldMatch = nextOld;
					newMatch = nextNew;
					break search;
				}
			}
		}
		if (oldMatch < 0) {
			if (i < oldWords.length) push('delete', oldWords[i++]);
			if (j < newWords.length) push('insert', newWords[j++]);
			continue;
		}
		while (i < oldMatch) push('delete', oldWords[i++]);
		while (j < newMatch) push('insert', newWords[j++]);
	}
	return parts;
}
