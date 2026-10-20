# Frontend API Client and Pages Domain Fallback Plan

## 1. Objective

Introduce a frontend `VRCStorageApi` facade that centralizes all API HTTP communication while keeping each functional domain in its own module.

The public API should be domain-oriented:

```ts
api.Resources.List(filters);
api.Resources.Get(uuid);
api.Auth.Login(credentials);
api.Uploads.Chunked(file, mediaType, onProgress);
api.Favorites.Add(data);
```

The client must also provide a frontend-only fallback:

- When the exact current hostname is `vrcstorage.pages.dev`, API requests target `https://vrcstorage.lat`.
- On `vrcstorage.lat`, localhost, and other hosts, requests keep their normal same-origin behavior.
- Static wiki content, CDN media, external links, and OAuth navigation are not ordinary API requests and must not be rewritten by the API resolver.

WebSocket support is explicitly excluded. No WebSocket client, `FeedApi`, reconnect logic, WebSocket URL fallback, or WebSocket migration will be implemented. The existing WebSocket feature will be removed separately.

## 2. Target Structure

Create a directory for the facade and its domain modules:

```text
src/frontend/api/vrcstorage-api/
  index.ts
  client.ts
  errors.ts
  origin.ts
  types.ts

  resources.ts
  auth.ts
  two-factor.ts
  uploads.ts
  media.ts
  favorites.ts
  collections.ts
  comments.ts
  blog.ts
  wiki.ts
  authors.ts
  categories.ts
  admin.ts
  drive.ts
  notifications.ts
  share.ts
  system.ts
  updates.ts
```

The split is intentionally domain-based. If a domain grows, it can be split further inside this directory without making the root class larger.

## 3. Root Facade

`index.ts` contains only composition and exports:

```ts
export class VRCStorageApi {
	readonly Resources: ResourcesApi;
	readonly Auth: AuthApi;
	readonly Uploads: UploadsApi;

	constructor(client = new ApiClient()) {
		this.Resources = new ResourcesApi(client);
		this.Auth = new AuthApi(client);
		this.Uploads = new UploadsApi(client);
	}
}

export const api = new VRCStorageApi();
```

The facade must not contain endpoint paths, direct `fetch()` calls, UI logic, backend schemas, or business-specific response parsing.

## 4. Central Transport

### `client.ts`

This is the only API layer allowed to execute `fetch()` or `XMLHttpRequest`.

Responsibilities:

- Resolve API paths to final URLs.
- Use `credentials: 'include'`.
- Serialize JSON bodies.
- Preserve `FormData`, binary bodies, and upload headers.
- Parse JSON, text, binary, and empty responses.
- Support `AbortSignal`.
- Support XHR progress callbacks for uploads.
- Normalize `{ error, details? }` backend responses.
- Expose small internal operations such as `get`, `post`, `put`, `delete`, `request`, and `upload`.

Domain modules own endpoint paths. Views must not receive a generic transport capable of constructing arbitrary API URLs.

### `errors.ts`

Create `VrcStorageApiError` containing:

- HTTP status.
- Error message.
- Optional backend details.
- HTTP method.
- Resolved URL.
- Optional parsed response body.

Distinguish HTTP errors, network errors, aborts, malformed responses, and rate limits so views do not duplicate response parsing.

## 5. API Origin Resolution

### `origin.ts`

Use exact matching only:

```ts
window.location.hostname === 'vrcstorage.pages.dev'
```

Expected result:

| Current page | API request |
| --- | --- |
| `https://vrcstorage.lat` | Same-origin `/api/...` |
| `https://vrcstorage.pages.dev` | `https://vrcstorage.lat/api/...` |
| `http://localhost:*` | Same-origin `/api/...` |
| `http://127.0.0.1:*` | Same-origin `/api/...` |
| Any other host | Same-origin `/api/...` |

Do not use `includes()` or broad `endsWith()` matching. A host such as `vrcstorage.pages.dev.example.com` must not activate the fallback.

The resolver must only handle API paths. It must not rewrite:

- `/wiki/{language}/{topic}.md`.
- CDN URLs.
- External mirrors.
- Google Drive URLs.
- OAuth or Drive browser-navigation URLs.

## 6. Frontend Types

Keep frontend API types separate from backend database types:

- Existing view models remain in `src/frontend/types.ts`.
- Request and response DTOs specific to the client go in `src/frontend/api/types.ts` or beside their domain module.
- Do not import `src/validators.ts` into the browser bundle.
- Do not use backend D1 row types as frontend response types without verifying their shape.
- Do not duplicate Zod validation in the client.

The client should type method arguments and return values while the backend remains authoritative at the trust boundary.

Move repeated inline types into the frontend API type layer where useful, including authentication, pagination, uploads, collections, favorites, Drive jobs, shares, two-factor responses, and admin responses.

## 7. Domain Modules

### Resources

Implement:

```ts
Resources.List(filters);
Resources.Latest();
Resources.Get(uuid);
Resources.History(uuid);
Resources.Create(data);
Resources.Update(uuid, data);
Resources.Delete(uuid, code);
Resources.UpdateLink(resourceUuid, linkUuid, data);
Resources.DeleteLink(resourceUuid, linkUuid);
Resources.ReorderLinks(resourceUuid, orderedUuids);
```

The module owns query-string construction, repeated multi-value filters, pagination, sorting, and resource endpoint paths.

### Authentication and 2FA

Implement:

```ts
Auth.Register(data);
Auth.Login(data);
Auth.LoginTwoFactor(data);
Auth.Status();
Auth.Me();
Auth.UpdateMe(data);
Auth.ChangePassword(data);
Auth.Logout();
Auth.CompleteOAuth(data);

TwoFactor.Status();
TwoFactor.Setup(data);
TwoFactor.Verify(data);
TwoFactor.Disable(data);
```

OAuth authorization remains browser navigation. It must not be converted into a JSON `fetch()` flow.

### Uploads and Media

Centralize all of these operations:

- Single multipart upload.
- Metadata preflight with `validate_only=true`.
- XHR upload with progress.
- Multipart init.
- Multipart part upload.
- Multipart completion.
- Media processing status.

The module hides `/api/upload/init`, `/api/upload/part`, `/api/upload/complete`, and the `X-Upload-ID`, `X-Key`, and `X-Part-Number` headers.

Existing retries, abort support, and progress callbacks must remain intact.

CDN URL generation stays in `src/frontend/lib/media.ts`; CDN requests are not API JSON calls.

### Favorites and Collections

Implement:

```ts
Favorites.List(collection);
Favorites.Ids();
Favorites.Check(resourceUuid);
Favorites.Add(data);
Favorites.Remove(resourceUuid);
Favorites.Reorder(data);
Favorites.Move(resourceUuid, collectionUuid);

Collections.List();
Collections.Create(data);
Collections.Update(uuid, data);
Collections.Delete(uuid);
Collections.Reorder(orderedUuids);
```

### Comments, Blog, and Wiki

Implement resource comments:

```ts
Comments.List(resourceUuid);
Comments.Create(resourceUuid, data);
Comments.Delete(commentUuid);
```

Implement blog operations and nested blog comments:

```ts
Blog.List(page, limit);
Blog.Get(uuid);
Blog.Create(data);
Blog.Update(uuid, data);
Blog.Delete(uuid);
Blog.Comments.List(postUuid);
Blog.Comments.Create(postUuid, data);
Blog.Comments.Delete(commentUuid);
```

`WikiApi` handles only `/api/wiki/comments`. Markdown files under `/wiki/...` remain static content.

### Authors and Categories

Implement author operations:

```ts
Authors.List(filters);
Authors.Search(query);
Authors.Get(slug, page);
Authors.Create(data);
Authors.Update(slug, data);
Authors.Delete(slug);
Authors.LinkResource(slug, resourceUuid);
```

Implement category-specific methods for avatars, assets, and clothes. Shared filter-building helpers may remain private, but callers use category-oriented methods.

### Administration

Move the current transport helpers from `src/frontend/features/admin/api.ts` into `AdminApi`.

Expose operations for pending resources, resource approval/rejection/deactivation, users, comments, authors, media cleanup, variant generation, and dashboard statistics. Nested admin modules are allowed if the file grows too large.

UI-only helpers such as two-factor prompts remain outside the API transport.

### Drive, Notifications, Shares, System, and Updates

Implement modules for:

- Drive status, folders, linking, transfers, and jobs.
- Notification preferences.
- Authenticated share-link management.
- Public configuration, version, and API documentation.
- Polling updates through `/api/updates`.

Do not add any WebSocket module or WebSocket method.

## 8. DataCache Integration

Views should use semantic API methods instead of passing API URLs to `DataCache`:

```ts
api.Resources.Get(uuid, { cache: { ttl: TimeUnit.Minute * 5 } });
```

They should no longer use:

```ts
DataCache.fetch(`/api/resources/${uuid}`);
```

Static wiki Markdown may continue using the static-content cache.

If caching remains inside the API client, cache keys must include the resolved origin or otherwise prevent responses from the canonical and fallback domains from being mixed.

Polling updates must preserve current cache invalidation behavior. No WebSocket invalidation path is required.

## 9. Consumer Migration Order

### Phase A: Infrastructure

Migrate the API network primitive, upload implementation, admin transport helpers, Turnstile configuration lookup, and polling updates.

Keep static wiki content and external browser navigation outside the API client.

### Phase B: Authentication

Migrate `app.ts`, `LoginView.ts`, `RegisterView.ts`, `OAuthRegisterView.ts`, and authentication-related parts of `SettingsView.ts`.

Verify normal login, two-factor login, registration, logout, session status, and password changes.

### Phase C: Resources and Listings

Migrate `HomeView.ts`, `CategoryView.ts`, `AvatarsView.ts`, `AssetsView.ts`, `ClothesView.ts`, `AuthorView.ts`, `ItemView.ts`, `HistoryView.ts`, and `filtered-list.ts`.

Remove API URL strings from these consumers.

### Phase D: Uploads and Editing

Migrate `UploadView.ts`, `EditResourceView.ts`, `BlogCreateView.ts`, `SettingsView.ts` media uploads, `comment-editor.ts`, and the admin author form.

Preserve progress, cancellation, chunk retries, and preflight behavior.

### Phase E: Favorites, Collections, Comments, Blog, and Wiki

Migrate `FavoritesView.ts`, resource comments, blog views, wiki API comments, and admin comment actions.

Leave static wiki Markdown loading in its existing static-content path.

### Phase F: Admin, Drive, Shares, Notifications, and System

Migrate admin features, Drive picker operations, Settings operations, ItemView Drive/share actions, notification preferences, version/config calls, and update polling.

## 10. Pages Domain Fallback

The fallback must apply consistently to:

- JSON API calls.
- Multipart uploads.
- Chunked uploads.
- API polling.
- API-generated private download URLs when consumed as API URLs.

It must not apply to static wiki files, CDN media, external mirrors, or browser-navigation OAuth URLs.

All cross-origin API calls must use `credentials: 'include'`.

No WebSocket fallback will be implemented.

## 11. CORS, CSRF, and Cookies

Add the exact origin below to both CORS and CSRF allowlists in `src/http/middleware/security.ts`:

```text
https://vrcstorage.pages.dev
```

Do not replace the allowlist with `*`, because authenticated requests use cookies.

The current session cookie in `src/auth.ts` uses `SameSite=Strict`. Since `vrcstorage.pages.dev` and `vrcstorage.lat` are different sites, authenticated cross-origin requests will not send that cookie with `SameSite=Strict`.

If `pages.dev` must support authenticated operations, change the session cookie policy to `SameSite=None; Secure` while retaining `HttpOnly`, exact CORS origins, exact CSRF origins, JWT expiration, and the existing denylist behavior. Apply matching attributes when clearing the cookie.

If `SameSite=Strict` must remain, document that the fallback supports public operations only.

Review Google and Drive OAuth redirects separately. They remain browser navigations and must not be forced through the JSON transport.

## 12. AGENTS.md Update

Add this rule to the agent execution guidance:

> Do not use subagents or delegate work to other agents. Inspection, implementation, review, and verification must be performed directly by the primary agent.

The wording must remain professional and must not contain threats or abusive language.

## 13. Verification

Run:

```bash
npx tsc -p tsconfig.frontend.json --noEmit
npm run build-frontend
npx tsc -p tsconfig.json --noEmit
npx prettier --check src/
```

Also verify:

- No view contains a direct API `fetch()` call.
- No feature contains a direct API `fetch()` call.
- No API XHR exists outside `VRCStorageApi`.
- Static `/wiki/...` content still works.
- CDN URLs are unchanged.
- `vrcstorage.lat` uses same-origin API calls.
- `vrcstorage.pages.dev` uses `https://vrcstorage.lat`.
- A lookalike hostname does not activate the fallback.
- CORS rejects unapproved origins.
- JSON and upload preflight requests work.
- Public requests work from `pages.dev`.
- Authenticated requests work from `pages.dev` if `SameSite=None` is adopted.
- Upload progress and multipart retries still work.
- Polling updates still invalidate the correct cache scopes.
- No WebSocket implementation was added.

## 14. Expected Final Usage

```ts
import { api } from '../api/vrcstorage-api';

const resources = await api.Resources.List(filters);
const resource = await api.Resources.Get(uuid);
await api.Favorites.Add({ resource_uuid: uuid });
await api.Auth.Login(credentials);
await api.Uploads.Chunked(file, 'image', onProgress);
```

The final separation is:

```text
VRCStorageApi
  - composes domain clients
  - contains no endpoint implementations

ApiClient
  - owns fetch/XHR
  - resolves the API origin
  - handles credentials and errors

Domain clients
  - own endpoint paths
  - own request and response types
  - expose semantic operations

Views and features
  - own UI and screen state
  - call api.Domain.Method()
  - contain no API transport code
```
