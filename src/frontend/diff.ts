/**
 * Simple word-by-word diff utility.
 * Returns HTML string with <ins> (green) and <del> (red) tags.
 */
export function diffString(oldText: string, newText: string): string {
	if (!oldText) oldText = '';
	if (!newText) newText = '';

	const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	oldText = escape(oldText);
	newText = escape(newText);

	const oldWords = oldText.split(/(\s+)/).filter((s) => s.length > 0);
	const newWords = newText.split(/(\s+)/).filter((s) => s.length > 0);

	let result = '';
	let i = 0;
	let j = 0;

	while (i < oldWords.length || j < newWords.length) {
		if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
			result += oldWords[i];
			i++;
			j++;
		} else {
			let nextMatchOld = -1;
			let nextMatchNew = -1;

			const lookAheadLimit = 40;
			search: for (let k = 0; k < lookAheadLimit; k++) {
				for (let l = 0; l < lookAheadLimit; l++) {
					if (i + k < oldWords.length && j + l < newWords.length && oldWords[i + k] === newWords[j + l]) {
						nextMatchOld = k;
						nextMatchNew = l;
						break search;
					}
				}
			}

			if (nextMatchOld !== -1) {
				for (let k = 0; k < nextMatchOld; k++) {
					result += `<del style="background:#ffeef0; color:#b31d28; text-decoration:none;">${oldWords[i++]}</del>`;
				}
				for (let k = 0; k < nextMatchNew; k++) {
					result += `<ins style="background:#e6ffec; color:#22863a; text-decoration:none;">${newWords[j++]}</ins>`;
				}
			} else {
				if (i < oldWords.length) {
					result += `<del style="background:#ffeef0; color:#b31d28; text-decoration:none;">${oldWords[i++]}</del>`;
				}
				if (j < newWords.length) {
					result += `<ins style="background:#e6ffec; color:#22863a; text-decoration:none;">${newWords[j++]}</ins>`;
				}
			}
		}
	}

	return result;
}
