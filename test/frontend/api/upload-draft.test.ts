// =========================================================================================================
// UPLOAD DRAFT TESTS
// File reuse is independent from a failed publish, without DOM rendering.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it, vi } from 'vitest';

import { api } from '../../../src/frontend/api';
import { createUploadDraft } from '../../../src/frontend/features/upload-draft';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('upload draft', () => {
	it('reuses completed files but still uploads a replacement selection', async () => {
		const result = { media_uuid: 'media-1', r2_key: 'key-1' };
		const upload = vi.spyOn(api.Uploads, 'WithProgress').mockResolvedValue(result);
		const draft = createUploadDraft();
		const file = new File(['zip'], 'archive.zip');
		expect(await draft(file, 'file', () => {})).toEqual(result);
		// A CAPTCHA/network failure at publication does not invalidate the file result.
		expect(await draft(file, 'file', () => {})).toEqual(result);
		expect(upload).toHaveBeenCalledTimes(1);
		await draft(new File(['new zip'], 'archive.zip'), 'file', () => {});
		expect(upload).toHaveBeenCalledTimes(2);
	});

	it('does not reuse failed files or results older than the orphan cleanup grace period', async () => {
		const upload = vi.spyOn(api.Uploads, 'WithProgress').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ media_uuid: 'media-1', r2_key: 'key-1' });
		const draft = createUploadDraft();
		const file = new File(['zip'], 'archive.zip');
		await expect(draft(file, 'file', () => {})).rejects.toThrow('offline');
		await draft(file, 'file', () => {});
		vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 3600_000);
		await draft(file, 'file', () => {});
		expect(upload).toHaveBeenCalledTimes(3);
	});
});
