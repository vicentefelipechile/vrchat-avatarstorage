// =========================================================================================================
// DEPRECATED — utils.ts
// =========================================================================================================
// This file has been split into:
//   - src/helpers/turnstile.ts  → verifyTurnstile helper
//   - src/routes/system.ts      → /api/config and /api/version routes
//
// This file is kept only as a re-export shim for backwards compatibility
// during the transition. It is safe to delete once all imports are updated.
// =========================================================================================================

export { verifyTurnstile } from '../helpers/turnstile';
