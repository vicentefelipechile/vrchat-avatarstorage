// =========================================================================================================
// UPLOAD CHECKPOINTS
// Only session identities are persisted; the server remains authoritative about accepted parts and ownership.
// =========================================================================================================

// =========================================================================================================
// Constants
// =========================================================================================================

const PREFIX = 'upload:';
const TTL = 23 * 3600_000;

// =========================================================================================================
// Types
// =========================================================================================================

interface UploadCheckpoint {
	uploadId: string;
	key: string;
}

// =========================================================================================================
// Storage
// =========================================================================================================

export const UploadCheckpoints = {
	get(fingerprint: string): UploadCheckpoint | null {
		try {
			const raw = localStorage.getItem(PREFIX + fingerprint);
			if (!raw) return null;
			const saved = JSON.parse(raw);
			if (Date.now() - saved.timestamp < TTL && typeof saved.uploadId === 'string' && typeof saved.key === 'string') return { uploadId: saved.uploadId, key: saved.key };
			localStorage.removeItem(PREFIX + fingerprint);
		} catch (error) {
			console.error('Cannot read upload checkpoint', error);
		}
		return null;
	},
	set(fingerprint: string, session: UploadCheckpoint): void {
		try {
			// Prune stale identities without touching the application's other storage.
			for (let i = localStorage.length - 1; i >= 0; i--) {
				const key = localStorage.key(i);
				if (key?.startsWith(PREFIX)) this.get(key.slice(PREFIX.length));
			}
			localStorage.setItem(PREFIX + fingerprint, JSON.stringify({ ...session, timestamp: Date.now() }));
		} catch (error) {
			console.error('Cannot persist upload checkpoint; reload recovery is unavailable', error);
		}
	},
	delete(fingerprint: string): void {
		try {
			localStorage.removeItem(PREFIX + fingerprint);
		} catch (error) {
			console.error('Cannot remove upload checkpoint', error);
		}
	},
};
