// =========================================================================================================
// Drive — browser authorization remains outside this JSON domain.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { query, type DriveStatus, type DriveFolder, type DriveJob, type Success } from './types';

// =========================================================================================================
// Domain
// =========================================================================================================

export class DriveApi {
	constructor(private readonly client: ApiClient) {}
	Status() {
		return this.client.get<DriveStatus>('/api/drive/status');
	}
	Folders(parentId: string | null) {
		return this.client.get<{ folders: DriveFolder[]; parentId: string | null }>(`/api/drive/folders${query({ parentId })}`);
	}
	CreateFolder(data: { name: string; parentId: string | null }) {
		return this.client.post<DriveFolder>('/api/drive/folders/create', data);
	}
	EnsureFolder(data: { name: string; parentId: string | null }) {
		return this.client.post<DriveFolder>('/api/drive/folders/ensure', data);
	}
	SetFolder(data: { folder_id: string | null; folder_name: string | null }) {
		return this.client.post<Success>('/api/drive/folder', data);
	}
	Unlink() {
		return this.client.delete<Success>('/api/drive/link');
	}
	Transfer(data: { r2_key: string; folder_id?: string | null }) {
		return this.client.post<{ job_uuid: string }>('/api/drive/transfer', data);
	}
	Jobs() {
		return this.client.get<DriveJob[]>('/api/drive/jobs');
	}
	Job(uuid: string) {
		return this.client.get<DriveJob>(`/api/drive/jobs/${encodeURIComponent(uuid)}`);
	}
}
