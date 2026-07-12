// =========================================================================
// lib/utils.ts — Barrel re-export of the split utility modules
// =========================================================================
//
// utils.ts used to be a single 570-line grab-bag. It is now split by concern
// into the sibling modules below; this barrel re-exports them so callers can
// keep a single `lib/utils` import. Prefer importing straight from the specific
// module (lib/media, lib/toast, …) in new code.

export { TimeUnit } from './time';
export { $, $$, htmlDecode, loadingBtn } from './dom';
export { stripMarkdown, renderMarkdown } from './markdown';
export { showToast, type ToastType } from './toast';
export { renderTurnstile } from './turnstile';
export { CHUNK_SIZE, uploadChunked, type ChunkedUploadResult } from './upload';
export { downloadHost, type DownloadKind, type HostInfo } from './download-hosts';
export { resizeImage, mediaUrl, videoUrl, progressiveImg, initLazyImages, initMediaPolling } from './media';
