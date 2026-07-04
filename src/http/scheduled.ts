// =========================================================================================================
// SCHEDULED HANDLER — Cron jobs
// =========================================================================================================
// The Worker's `scheduled` entrypoint. Thin: the daily orphan-media cleanup reuses the exact same
// logic as the manual admin endpoint (AdminService.cleanupOrphanedMedia) so there is a single source
// of truth for what counts as orphaned and how it's deleted. Configured in wrangler.jsonc (0 3 * * *).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { AdminService } from '../services/admin-service';

// =========================================================================================================
// Handler
// =========================================================================================================

export async function handleScheduled(_event: ScheduledEvent, env: Env): Promise<void> {
	console.log('[CRON] Running scheduled cleanup task');
	try {
		const deleted = await new AdminService(env.DB).cleanupOrphanedMedia(env.BUCKET, env.MEDIA_BUCKET);
		console.log(`[CRON] Cleanup completed: ${deleted} orphaned files deleted`);
	} catch (e) {
		console.error('[CRON] Cleanup error:', e);
	}
}
