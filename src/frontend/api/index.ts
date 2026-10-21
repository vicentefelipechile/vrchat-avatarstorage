// =========================================================================================================
// VRCStorage API facade — domain composition only.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { ResourcesApi } from './resources';
import { AuthApi } from './auth';
import { TwoFactorApi } from './two-factor';
import { UploadsApi } from './uploads';
import { MediaApi } from './media';
import { FavoritesApi } from './favorites';
import { CollectionsApi } from './collections';
import { CommentsApi } from './comments';
import { BlogApi } from './blog';
import { WikiApi } from './wiki';
import { AuthorsApi } from './authors';
import { CategoriesApi } from './categories';
import { AdminApi } from './admin';
import { DriveApi } from './drive';
import { NotificationsApi } from './notifications';
import { ShareApi } from './share';
import { SystemApi } from './system';
import { UpdatesApi } from './updates';

// =========================================================================================================
// Composition
// =========================================================================================================

export class VRCStorageApi {
	readonly Resources: ResourcesApi;
	readonly Auth: AuthApi;
	readonly TwoFactor: TwoFactorApi;
	readonly Uploads: UploadsApi;
	readonly Media: MediaApi;
	readonly Favorites: FavoritesApi;
	readonly Collections: CollectionsApi;
	readonly Comments: CommentsApi;
	readonly Blog: BlogApi;
	readonly Wiki: WikiApi;
	readonly Authors: AuthorsApi;
	readonly Categories: CategoriesApi;
	readonly Admin: AdminApi;
	readonly Drive: DriveApi;
	readonly Notifications: NotificationsApi;
	readonly Share: ShareApi;
	readonly System: SystemApi;
	readonly Updates: UpdatesApi;
	constructor(client = new ApiClient()) {
		this.Resources = new ResourcesApi(client);
		this.Auth = new AuthApi(client);
		this.TwoFactor = new TwoFactorApi(client);
		this.Uploads = new UploadsApi(client);
		this.Media = new MediaApi(client);
		this.Favorites = new FavoritesApi(client);
		this.Collections = new CollectionsApi(client);
		this.Comments = new CommentsApi(client);
		this.Blog = new BlogApi(client);
		this.Wiki = new WikiApi(client);
		this.Authors = new AuthorsApi(client);
		this.Categories = new CategoriesApi(client);
		this.Admin = new AdminApi(client);
		this.Drive = new DriveApi(client);
		this.Notifications = new NotificationsApi(client);
		this.Share = new ShareApi(client);
		this.System = new SystemApi(client);
		this.Updates = new UpdatesApi(client);
	}
}

// =========================================================================================================
// Exports
// =========================================================================================================

export const api = new VRCStorageApi();
export { VrcStorageApiError } from './errors';
export { CHUNK_SIZE } from './uploads';
