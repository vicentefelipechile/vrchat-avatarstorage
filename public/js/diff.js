/**
 * Simple word-by-word diff utility
 * Returns HTML string with <ins> (green) and <del> (red) tags
 */
export function diffString(oldText, newText) {
    if (!oldText) oldText = "";
    if (!newText) newText = "";

    // Escape HTML to prevent XSS before processing
    const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    oldText = escape(oldText);
    newText = escape(newText);

    // Split by whitespace but keep delimiters (spaces, newlines, etc.)
    // Filter empty strings if any (e.g. from start/end)
    const oldWords = oldText.split(/(\s+)/).filter(s => s.length > 0);
    const newWords = newText.split(/(\s+)/).filter(s => s.length > 0);
    
    let result = "";
    let i = 0;
    let j = 0;

    while (i < oldWords.length || j < newWords.length) {
        if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
            result += oldWords[i]; // Append directly, no extra space
            i++;
            j++;
        } else {
            let nextMatchOld = -1;
            let nextMatchNew = -1;

            // Look ahead to find sync point
            const lookAheadLimit = 40; // Increased limit slightly for tokenized split
            search:
            for (let k = 0; k < lookAheadLimit; k++) {
                for (let l = 0; l < lookAheadLimit; l++) {
                    if ((i + k) < oldWords.length && (j + l) < newWords.length && oldWords[i + k] === newWords[j + l]) {
                        nextMatchOld = k;
                        nextMatchNew = l;
                        break search;
                    }
                }
            }

            if (nextMatchOld !== -1) {
                // Found match ahead, mark everything in between as changed
                for (let k = 0; k < nextMatchOld; k++) {
                    const word = oldWords[i++];
                    // Don't highlight pure whitespace changes heavily, or maybe do?
                    // For now standard del style
                    result += `<del style="background:#ffeef0; color:#b31d28; text-decoration:none;">${word}</del>`;
                }
                for (let k = 0; k < nextMatchNew; k++) {
                    const word = newWords[j++];
                    result += `<ins style="background:#e6ffec; color:#22863a; text-decoration:none;">${word}</ins>`;
                }
            } else {
                // No sync found nearby, just output current mismatch
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
