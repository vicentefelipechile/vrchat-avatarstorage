// =========================================================================================================
// FRONTEND API DOMAIN REQUEST TESTS
// =========================================================================================================
// Assert request method, endpoint, payload and cache options for every JSON API operation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../src/frontend/api/client';
import { VRCStorageApi } from '../../../src/frontend/api';
import type { ApiOptions } from '../../../src/frontend/api/types';
import type { UploadPart, UploadSession } from '../../../src/frontend/api/types';

// =========================================================================================================
// Constants
// =========================================================================================================

const cacheOptions: ApiOptions = { cache: { ttl: 1234, persistent: true } };
const resourceData = { title: 'Resource', category: 'assets', thumbnail_uuid: 'media-1' };
const loginData = { username: 'tester', password: 'secret' };
const session: UploadSession = { uploadId: 'upload-1', key: 'r2-key' };
const parts: UploadPart[] = [{ partNumber: 1, etag: 'etag-1' }];
const form = new FormData();
const preferences = {
	enabled: true,
	avatars_enabled: true,
	avatar_types: ['human'],
	assets_enabled: false,
	asset_types: null,
	clothes_enabled: true,
	updated_at: null,
};

// =========================================================================================================
// Types
// =========================================================================================================

type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'upload';

interface RecordedCall {
	method: string;
	args: unknown[];
}

interface RequestCase {
	name: string;
	method: RequestMethod;
	path: string;
	run: (api: VRCStorageApi) => Promise<unknown> | void;
	body?: unknown;
	options?: unknown;
};

// =========================================================================================================
// Helpers
// =========================================================================================================

function recordingApi(): { api: VRCStorageApi; calls: RecordedCall[]; invalidate: ReturnType<typeof vi.fn> } {
	const calls: RecordedCall[] = [];
	const record = (method: string) => (...args: unknown[]) => {
		calls.push({ method, args });
		return Promise.resolve({});
	};
	const invalidate = vi.fn((...prefixes: string[]) => calls.push({ method: 'invalidate', args: prefixes }));
	const client = {
		get: record('get'),
		post: record('post'),
		put: record('put'),
		delete: record('delete'),
		upload: record('upload'),
		invalidate,
	} as unknown as ApiClient;
	return { api: new VRCStorageApi(client), calls, invalidate };
}

function requestCase(
	name: string,
	method: RequestMethod,
	path: string,
	run: RequestCase['run'],
	options?: unknown,
	body?: unknown,
): RequestCase {
	return { name, method, path, run, options, body };
}

// =========================================================================================================
// Request cases
// =========================================================================================================

const requests: RequestCase[] = [
	requestCase('Auth.Register', 'post', '/api/auth/register', (api) => api.Auth.Register(loginData), { invalidate: ['/api/'] }, loginData),
	requestCase('Auth.Login', 'post', '/api/auth/login', (api) => api.Auth.Login(loginData), { invalidate: ['/api/'] }, loginData),
	requestCase('Auth.LoginTwoFactor', 'post', '/api/auth/login/2fa', (api) => api.Auth.LoginTwoFactor({ username: 'tester', code: '123456', pre_auth_token: 'pre-auth' }), { invalidate: ['/api/'] }, { username: 'tester', code: '123456', pre_auth_token: 'pre-auth' }),
	requestCase('Auth.Status', 'get', '/api/auth/status', (api) => api.Auth.Status(cacheOptions), cacheOptions),
	requestCase('Auth.Me alias', 'get', '/api/auth/status', (api) => api.Auth.Me()),
	requestCase('Auth.UpdateMe', 'put', '/api/auth/me', (api) => api.Auth.UpdateMe({ username: 'newname', is_anonymous: 1 }), { invalidate: ['/api/'] }, { username: 'newname', is_anonymous: 1 }),
	requestCase('Auth.ChangePassword', 'post', '/api/auth/me/password', (api) => api.Auth.ChangePassword({ new_password: 'new-secret', token: 'turnstile' }), { invalidate: ['/api/'] }, { new_password: 'new-secret', token: 'turnstile' }),
	requestCase('Auth.Logout', 'post', '/api/auth/logout', (api) => api.Auth.Logout(), { invalidate: ['/api/'] }),
	requestCase('Auth.CompleteOAuth', 'post', '/api/auth/complete', (api) => api.Auth.CompleteOAuth({ username: 'tester', token: 'pending' }), { invalidate: ['/api/'] }, { username: 'tester', token: 'pending' }),

	requestCase('Resources.List builds repeated filter keys', 'get', '/api/resources?category=avatars&avatar_type=human&avatar_type=furry&page=2', (api) => api.Resources.List({ category: 'avatars', avatar_type: ['human', 'furry'], page: 2 }, cacheOptions), cacheOptions),
	requestCase('Resources.Latest', 'get', '/api/resources/latest', (api) => api.Resources.Latest()),
	requestCase('Resources.Get encodes path segments', 'get', '/api/resources/a%2Fb%20%3F', (api) => api.Resources.Get('a/b ?')),
	requestCase('Resources.History', 'get', '/api/resources/resource-1/history', (api) => api.Resources.History('resource-1')),
	requestCase('Resources.Create', 'post', '/api/resources', (api) => api.Resources.Create(resourceData), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, resourceData),
	requestCase('Resources.Update', 'put', '/api/resources/resource-1', (api) => api.Resources.Update('resource-1', { title: 'Updated' }), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { title: 'Updated' }),
	requestCase('Resources.Delete includes the sensitive code', 'delete', '/api/resources/resource-1', (api) => api.Resources.Delete('resource-1', '123456'), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { code: '123456' }),
	requestCase('Resources.UpdateLink', 'put', '/api/resources/resource-1/links/link-1', (api) => api.Resources.UpdateLink('resource-1', 'link-1', { link_title: 'Mirror' }), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { link_title: 'Mirror' }),
	requestCase('Resources.DeleteLink', 'delete', '/api/resources/resource-1/links/link-1', (api) => api.Resources.DeleteLink('resource-1', 'link-1'), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }),
	requestCase('Resources.ReorderLinks', 'post', '/api/resources/resource-1/links/reorder', (api) => api.Resources.ReorderLinks('resource-1', ['link-1', 'link-2']), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { ordered_uuids: ['link-1', 'link-2'] }),

	requestCase('Authors.List', 'get', '/api/authors?q=fox&page=2', (api) => api.Authors.List({ q: 'fox', page: 2 }, cacheOptions), cacheOptions),
	requestCase('Authors.Search', 'get', '/api/authors/search?q=fox', (api) => api.Authors.Search('fox')),
	requestCase('Authors.Get', 'get', '/api/authors/a%2Fb?page=3', (api) => api.Authors.Get('a/b', 3)),
	requestCase('Authors.Create', 'post', '/api/authors', (api) => api.Authors.Create({ name: 'Creator' }), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { name: 'Creator' }),
	requestCase('Authors.Update', 'put', '/api/authors/creator', (api) => api.Authors.Update('creator', { description: 'Bio' }), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { description: 'Bio' }),
	requestCase('Authors.Delete', 'delete', '/api/authors/creator', (api) => api.Authors.Delete('creator'), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }),
	requestCase('Authors.LinkResource', 'post', '/api/authors/creator/link-resource', (api) => api.Authors.LinkResource('creator', 'resource-1'), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { resource_uuid: 'resource-1' }),

	requestCase('Categories.Avatars.List', 'get', '/api/avatars?avatar_type=human&avatar_type=furry', (api) => api.Categories.Avatars.List({ avatar_type: ['human', 'furry'] }, cacheOptions), cacheOptions),
	requestCase('Categories.Avatars.Get', 'get', '/api/avatars/avatar-1', (api) => api.Categories.Avatars.Get('avatar-1')),
	requestCase('Categories.Avatars.Create', 'post', '/api/avatars', (api) => api.Categories.Avatars.Create(resourceData), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, resourceData),
	requestCase('Categories.Avatars.Preflight', 'post', '/api/avatars?validate_only=true', (api) => api.Categories.Avatars.Preflight(resourceData), undefined, resourceData),
	requestCase('Categories.Avatars.Update', 'put', '/api/avatars/avatar-1', (api) => api.Categories.Avatars.Update('avatar-1', { gender: 'female' }), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { gender: 'female' }),
	requestCase('Categories.Avatars.Search', 'get', '/api/avatars/search?q=fox&limit=5', (api) => api.Categories.Avatars.Search('fox', 5)),
	requestCase('Categories.Assets.List', 'get', '/api/assets?page=2', (api) => api.Categories.Assets.List({ page: 2 })),
	requestCase('Categories.Assets.Get', 'get', '/api/assets/asset-1', (api) => api.Categories.Assets.Get('asset-1')),
	requestCase('Categories.Assets.Create', 'post', '/api/assets', (api) => api.Categories.Assets.Create(resourceData), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, resourceData),
	requestCase('Categories.Assets.Preflight', 'post', '/api/assets?validate_only=true', (api) => api.Categories.Assets.Preflight(resourceData), undefined, resourceData),
	requestCase('Categories.Assets.Update', 'put', '/api/assets/asset-1', (api) => api.Categories.Assets.Update('asset-1', { asset_type: 'prop' }), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { asset_type: 'prop' }),
	requestCase('Categories.Clothes.List', 'get', '/api/clothes?clothing_type=jacket&clothing_type=accessory', (api) => api.Categories.Clothes.List({ clothing_type: ['jacket', 'accessory'] })),
	requestCase('Categories.Clothes.Get', 'get', '/api/clothes/clothes-1', (api) => api.Categories.Clothes.Get('clothes-1')),
	requestCase('Categories.Clothes.Create', 'post', '/api/clothes', (api) => api.Categories.Clothes.Create(resourceData), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, resourceData),
	requestCase('Categories.Clothes.Preflight', 'post', '/api/clothes?validate_only=true', (api) => api.Categories.Clothes.Preflight(resourceData), undefined, resourceData),
	requestCase('Categories.Clothes.Update', 'put', '/api/clothes/clothes-1', (api) => api.Categories.Clothes.Update('clothes-1', { is_base: 1 }), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { is_base: 1 }),

	requestCase('Favorites.List', 'get', '/api/favorites?collection=all', (api) => api.Favorites.List()),
	requestCase('Favorites.List accepts no collection filter', 'get', '/api/favorites', (api) => api.Favorites.List(null)),
	requestCase('Favorites.Ids', 'get', '/api/favorites/ids', (api) => api.Favorites.Ids()),
	requestCase('Favorites.Check', 'get', '/api/favorites/check/resource-1', (api) => api.Favorites.Check('resource-1')),
	requestCase('Favorites.Add', 'post', '/api/favorites', (api) => api.Favorites.Add({ resource_uuid: 'resource-1', collection_uuid: 'collection-1' }), { invalidate: ['/api/favorites', '/api/collections'] }, { resource_uuid: 'resource-1', collection_uuid: 'collection-1' }),
	requestCase('Favorites.Remove', 'delete', '/api/favorites/resource-1', (api) => api.Favorites.Remove('resource-1'), { invalidate: ['/api/favorites', '/api/collections'] }),
	requestCase('Favorites.Reorder', 'post', '/api/favorites/reorder', (api) => api.Favorites.Reorder({ ordered_uuids: ['resource-1'], collection_uuid: null }), { invalidate: ['/api/favorites', '/api/collections'] }, { ordered_uuids: ['resource-1'], collection_uuid: null }),
	requestCase('Favorites.Move', 'put', '/api/favorites/resource-1/collection', (api) => api.Favorites.Move('resource-1', 'collection-1'), { invalidate: ['/api/favorites', '/api/collections'] }, { collection_uuid: 'collection-1' }),

	requestCase('Collections.List', 'get', '/api/collections', (api) => api.Collections.List(cacheOptions), cacheOptions),
	requestCase('Collections.Create', 'post', '/api/collections', (api) => api.Collections.Create({ name: 'Favorites' }), { invalidate: ['/api/favorites', '/api/collections'] }, { name: 'Favorites' }),
	requestCase('Collections.Update', 'put', '/api/collections/collection-1', (api) => api.Collections.Update('collection-1', { name: 'Updated' }), { invalidate: ['/api/favorites', '/api/collections'] }, { name: 'Updated' }),
	requestCase('Collections.Delete', 'delete', '/api/collections/collection-1', (api) => api.Collections.Delete('collection-1'), { invalidate: ['/api/favorites', '/api/collections'] }),
	requestCase('Collections.Reorder', 'post', '/api/collections/reorder', (api) => api.Collections.Reorder(['collection-1', 'collection-2']), { invalidate: ['/api/favorites', '/api/collections'] }, { ordered_uuids: ['collection-1', 'collection-2'] }),

	requestCase('Comments.List', 'get', '/api/comments/resource-1', (api) => api.Comments.List('resource-1', cacheOptions), cacheOptions),
	requestCase('Comments.Create', 'post', '/api/comments/resource-1', (api) => api.Comments.Create('resource-1', { text: 'Comment' }), { invalidate: ['/api/comments'] }, { text: 'Comment' }),
	requestCase('Comments.Delete', 'delete', '/api/comments/comment-1', (api) => api.Comments.Delete('comment-1'), { invalidate: ['/api/comments'] }),

	requestCase('Blog.List', 'get', '/api/blog?page=2&limit=5', (api) => api.Blog.List(2, 5)),
	requestCase('Blog.Get', 'get', '/api/blog/post-1', (api) => api.Blog.Get('post-1')),
	requestCase('Blog.Create', 'post', '/api/blog', (api) => api.Blog.Create({ title: 'Post', content: 'Text', author_display: 'Author' }), { invalidate: ['/api/blog'] }, { title: 'Post', content: 'Text', author_display: 'Author' }),
	requestCase('Blog.Update', 'put', '/api/blog/post-1', (api) => api.Blog.Update('post-1', { title: 'Updated' }), { invalidate: ['/api/blog'] }, { title: 'Updated' }),
	requestCase('Blog.Delete', 'delete', '/api/blog/post-1', (api) => api.Blog.Delete('post-1'), { invalidate: ['/api/blog'] }),
	requestCase('Blog.Comments.List', 'get', '/api/blog/post-1/comments', (api) => api.Blog.Comments.List('post-1')),
	requestCase('Blog.Comments.Create', 'post', '/api/blog/post-1/comments', (api) => api.Blog.Comments.Create('post-1', { text: 'Comment' }), undefined, { text: 'Comment' }),
	requestCase('Blog.Comments.Delete', 'delete', '/api/blog/comments/comment-1', (api) => api.Blog.Comments.Delete('comment-1')),

	requestCase('Drive.Status', 'get', '/api/drive/status', (api) => api.Drive.Status()),
	requestCase('Drive.Folders omits null parent', 'get', '/api/drive/folders', (api) => api.Drive.Folders(null)),
	requestCase('Drive.Folders encodes parent query', 'get', '/api/drive/folders?parentId=folder+1', (api) => api.Drive.Folders('folder 1')),
	requestCase('Drive.CreateFolder', 'post', '/api/drive/folders/create', (api) => api.Drive.CreateFolder({ name: 'Folder', parentId: null }), undefined, { name: 'Folder', parentId: null }),
	requestCase('Drive.EnsureFolder', 'post', '/api/drive/folders/ensure', (api) => api.Drive.EnsureFolder({ name: 'Folder', parentId: 'parent' }), undefined, { name: 'Folder', parentId: 'parent' }),
	requestCase('Drive.SetFolder', 'post', '/api/drive/folder', (api) => api.Drive.SetFolder({ folder_id: null, folder_name: null }), undefined, { folder_id: null, folder_name: null }),
	requestCase('Drive.Unlink', 'delete', '/api/drive/link', (api) => api.Drive.Unlink()),
	requestCase('Drive.Transfer', 'post', '/api/drive/transfer', (api) => api.Drive.Transfer({ r2_key: 'key', folder_id: null }), undefined, { r2_key: 'key', folder_id: null }),
	requestCase('Drive.Jobs', 'get', '/api/drive/jobs', (api) => api.Drive.Jobs()),
	requestCase('Drive.Job', 'get', '/api/drive/jobs/job-1', (api) => api.Drive.Job('job-1')),

	requestCase('Media.Status', 'get', '/api/media/media-1/status', (api) => api.Media.Status('media-1')),
	requestCase('Notifications.Preferences', 'get', '/api/notifications/preferences', (api) => api.Notifications.Preferences()),
	requestCase('Notifications.UpdatePreferences', 'put', '/api/notifications/preferences', (api) => api.Notifications.UpdatePreferences(preferences), undefined, preferences),
	requestCase('TwoFactor.Status', 'get', '/api/2fa/status', (api) => api.TwoFactor.Status()),
	requestCase('TwoFactor.Setup', 'post', '/api/2fa/setup', (api) => api.TwoFactor.Setup({ password: 'secret' }), undefined, { password: 'secret' }),
	requestCase('TwoFactor.Verify invalidates auth data', 'post', '/api/2fa/verify', (api) => api.TwoFactor.Verify({ code: '123456' }), { invalidate: ['/api/'] }, { code: '123456' }),
	requestCase('TwoFactor.Disable invalidates auth data', 'post', '/api/2fa/disable', (api) => api.TwoFactor.Disable({ code: '123456' }), { invalidate: ['/api/'] }, { code: '123456' }),

	requestCase('Share.Create', 'post', '/api/share', (api) => api.Share.Create({ r2_key: 'key', expires_in: 3600, max_uses: 5 }), undefined, { r2_key: 'key', expires_in: 3600, max_uses: 5 }),
	requestCase('Share.Mine', 'get', '/api/share/mine', (api) => api.Share.Mine()),
	requestCase('Share.Revoke', 'delete', '/api/share/link-1', (api) => api.Share.Revoke('link-1')),
	requestCase('System.Config', 'get', '/api/config', (api) => api.System.Config()),
	requestCase('System.Version', 'get', '/api/version', (api) => api.System.Version()),
	requestCase('System.Docs', 'get', '/api/docs', (api) => api.System.Docs()),
	requestCase('Updates.Since omits undefined cursor', 'get', '/api/updates', (api) => api.Updates.Since()),
	requestCase('Updates.Since includes cursor', 'get', '/api/updates?since=123', (api) => api.Updates.Since(123)),
	requestCase('Wiki.ListComments', 'get', '/api/wiki/comments', (api) => api.Wiki.ListComments()),
	requestCase('Wiki.CreateComment', 'post', '/api/wiki/comments', (api) => api.Wiki.CreateComment({ text: 'Comment', token: 'turnstile' }), undefined, { text: 'Comment', token: 'turnstile' }),
	requestCase('Wiki.DeleteComment', 'delete', '/api/wiki/comments/comment-1', (api) => api.Wiki.DeleteComment('comment-1')),
	requestCase('Admin.Pending', 'get', '/api/admin/pending', (api) => api.Admin.Pending(cacheOptions), cacheOptions),
	requestCase('Admin.Approve', 'post', '/api/admin/resource/resource-1/approve', (api) => api.Admin.Approve('resource-1'), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }),
	requestCase('Admin.Reject', 'post', '/api/admin/resource/resource-1/reject', (api) => api.Admin.Reject('resource-1', '123456'), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }, { code: '123456' }),
	requestCase('Admin.Deactivate', 'post', '/api/admin/resource/resource-1/deactivate', (api) => api.Admin.Deactivate('resource-1'), { invalidate: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] }),
	requestCase('Admin.Stats', 'get', '/api/admin/stats', (api) => api.Admin.Stats()),
	requestCase('Admin.Timeseries', 'get', '/api/admin/stats/timeseries?days=14', (api) => api.Admin.Timeseries(14)),
	requestCase('Admin.OrphanStats', 'get', '/api/admin/stats/orphaned-media', (api) => api.Admin.OrphanStats()),
	requestCase('Admin.CleanupMedia', 'post', '/api/admin/cleanup/orphaned-media', (api) => api.Admin.CleanupMedia('123456'), undefined, { code: '123456' }),
	requestCase('Admin.GenerateVariants', 'post', '/api/admin/media/generate-variants', (api) => api.Admin.GenerateVariants()),
	requestCase('Admin.ClearUserCache encodes username', 'post', '/api/admin/cache/clear/user%2Fname', (api) => api.Admin.ClearUserCache('user/name')),
	requestCase('Admin.Users', 'get', '/api/admin/users?q=user&page=2', (api) => api.Admin.Users({ q: 'user', page: 2 }, cacheOptions), cacheOptions),
	requestCase('Admin.Resources', 'get', '/api/admin/resources?category=avatars', (api) => api.Admin.Resources({ category: 'avatars' })),
	requestCase('Admin.Comments', 'get', '/api/admin/comments?resource_uuid=resource-1', (api) => api.Admin.Comments({ resource_uuid: 'resource-1' })),
	requestCase('Admin.ChangeRole', 'post', '/api/admin/users/tester/role', (api) => api.Admin.ChangeRole('tester', { is_admin: true, code: '123456' }), { invalidate: ['/api/'] }, { is_admin: true, code: '123456' }),
	requestCase('Admin.BanUser', 'post', '/api/admin/users/tester/ban', (api) => api.Admin.BanUser('tester', { banned: true, code: '123456' }), { invalidate: ['/api/'] }, { banned: true, code: '123456' }),
	requestCase('Admin.DeleteUser', 'delete', '/api/admin/users/tester', (api) => api.Admin.DeleteUser('tester', '123456'), { invalidate: ['/api/'] }, { code: '123456' }),
	requestCase('Uploads.Single sends FormData', 'put', '/api/upload', (api) => api.Uploads.Single(form), undefined, form),
	requestCase('Uploads.WithProgress delegates to XHR transport', 'upload', '/api/upload', (api) => api.Uploads.WithProgress(form, () => {}), undefined, form),
	requestCase('Uploads.Init maps mediaType to media_type', 'post', '/api/upload/init', (api) => api.Uploads.Init('file.zip', 'file'), undefined, { filename: 'file.zip', media_type: 'file' }),
	requestCase('Uploads.Part sends binary body and upload headers', 'put', '/api/upload/part', (api) => api.Uploads.Part(session, 2, new ArrayBuffer(3)), { headers: { 'X-Upload-ID': 'upload-1', 'X-Key': 'r2-key', 'X-Part-Number': '2', 'Content-Type': 'application/octet-stream' } }, new ArrayBuffer(3)),
	requestCase('Uploads.Complete sends ordered parts and session', 'post', '/api/upload/complete', (api) => api.Uploads.Complete(session, parts, 'file.zip', 'file'), undefined, { ...session, parts, filename: 'file.zip', media_type: 'file' }),
];

// =========================================================================================================
// Tests
// =========================================================================================================

describe('frontend API domains', () => {
	it.each(requests)('$name delegates the expected request', async (testCase) => {
		const { api, calls } = recordingApi();
		await testCase.run(api);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.method).toBe(testCase.method);
		expect(calls[0]?.args[0]).toBe(testCase.path);
		if (testCase.method !== 'get') expect(calls[0]?.args[1]).toEqual(testCase.body);
		if (testCase.method === 'upload') expect(calls[0]?.args[2]).toEqual(expect.any(Function));
		const optionsIndex = testCase.method === 'get' ? 1 : testCase.method === 'upload' ? 3 : 2;
		expect(calls[0]?.args[optionsIndex]).toEqual(testCase.options);
	});

	it('manual invalidators clear the precise cache scopes', () => {
		const { api, calls } = recordingApi();
		api.Auth.Invalidate();
		api.Resources.Invalidate();
		api.Blog.Invalidate();
		api.Comments.Invalidate();
		api.Categories.Avatars.Invalidate();
		expect(calls).toEqual([
			{ method: 'invalidate', args: ['/api/'] },
			{ method: 'invalidate', args: ['/api/resources', '/api/avatars', '/api/assets', '/api/clothes', '/api/authors', '/api/favorites', '/api/collections'] },
			{ method: 'invalidate', args: ['/api/blog'] },
			{ method: 'invalidate', args: ['/api/comments'] },
			{ method: 'invalidate', args: ['/api/avatars', '/api/resources', '/api/authors'] },
		]);
	});
});
