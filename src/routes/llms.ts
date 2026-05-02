// =========================================================================================================
// LLMS.TXT ROUTE
// =========================================================================================================
// Serves /llms.txt following the llmstxt.org specification.
// This file provides a curated, LLM-friendly overview of VRCStorage for AI scrapers and agents.
// It is intentionally public and unauthenticated — equivalent in spirit to /robots.txt.
// Spec: https://llmstxt.org/
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * The llms.txt content following the llmstxt.org spec:
 *   1. H1  — project name (required)
 *   2. Blockquote — short summary
 *   3. Optional paragraphs — additional context
 *   4. H2 sections — curated file/URL lists
 *   5. ## Optional section — secondary links that can be skipped for short contexts
 */
const LLMS_TXT = `# VRCStorage

> VRCStorage is a community-driven platform for sharing and downloading VRChat resources: avatars, assets (shaders, tools, prefabs), and clothing. All content is user-submitted and free to download after registration. The platform serves a global audience and is available in 12 languages.

VRCStorage is hosted at https://vrcstorage.lat. Content is age-gated (18+). Resources are organised into three primary categories: **Avatars** (full VRChat-ready avatar packages), **Assets** (Unity-compatible shaders, tools, scripts, props, and prefabs), and **Clothes** (wearable clothing and accessories compatible with popular avatar bases).

All API endpoints return JSON. Pagination follows a consistent shape: \`{ page, limit, total, hasNextPage, hasPrevPage }\`. UUIDs are v4 strings. Timestamps are Unix milliseconds unless noted.

## Site Sections

- [Home](https://vrcstorage.lat/): Landing page with featured content and community ads.
- [Avatars](https://vrcstorage.lat/avatars): Browse and filter VRChat avatars by type, gender, size, platform, SDK, and NSFW flag.
- [Assets](https://vrcstorage.lat/assets): Browse shaders, tools, prefabs, scripts, and other Unity assets for VRChat.
- [Clothes](https://vrcstorage.lat/clothes): Browse wearable clothing items compatible with popular VRChat avatar bases.
- [Blog](https://vrcstorage.lat/blog): Community articles and announcements written by platform staff.
- [Community](https://vrcstorage.lat/community): Community advertisement pages — creator and studio promotions.
- [Wiki](https://vrcstorage.lat/wiki/en/home.md): Documentation hub covering setup, tools, shaders, and VRChat guides (raw Markdown).
- [Upload](https://vrcstorage.lat/upload): Submit a new resource (requires an authenticated account).

## Policies

- [Terms of Service](https://vrcstorage.lat/tos): Permitted content, age requirement (18+), DMCA policy, and account rules.
- [DMCA](https://vrcstorage.lat/dmca): Copyright takedown request process.

## Public API — Avatars

Base URL: \`https://vrcstorage.lat/api/avatars\`

\`\`\`
GET /api/avatars
  List avatars. All query params are optional.
  ?page=1              Page number (default: 1)
  ?limit=24            Items per page (max: 60, default: 24)
  ?sort_by=created_at  Sort field: created_at | download_count | title
  ?sort_order=desc     Sort direction: asc | desc
  ?avatar_gender=      Filter: male | female | androgynous | undefined | both
  ?avatar_size=        Filter: tiny | small | medium | tall | giant
  ?avatar_type=        Filter: human | furry | anime | chibi | cartoon | semi-realistic | monster | fantasy | mecha | kemono | sci-fi | vtuber | other
  ?platform=           Filter: pc | quest | cross
  ?sdk_version=        Filter: sdk3 | sdk2
  ?is_nsfw=0           Filter NSFW content: 0 (safe) | 1 (NSFW)
  ?has_physbones=1     Boolean flag filters (0 or 1): has_physbones, has_face_tracking, has_dps, has_gogoloco, has_toggles, is_quest_optimized
  ?author_uuid=<uuid>  Filter by author profile UUID

Response shape:
{
  "resources": [
    {
      "uuid": "string",
      "title": "string",
      "thumbnail_key": "string | null",   // append to /api/download/ to get image URL
      "download_count": number,
      "created_at": number,               // Unix ms
      "meta": {
        "avatar_gender": "male|female|androgynous|undefined|both",
        "avatar_size": "tiny|small|medium|tall|giant",
        "avatar_type": "human|furry|...",
        "is_nsfw": 0 | 1,
        "has_physbones": 0 | 1,
        "has_face_tracking": 0 | 1,
        "has_dps": 0 | 1,
        "has_gogoloco": 0 | 1,
        "has_toggles": 0 | 1,
        "is_quest_optimized": 0 | 1,
        "sdk_version": "sdk3|sdk2",
        "platform": "pc|quest|cross",
        "author_uuid": "string | null",
        "author_name_raw": "string | null",
        "author_name": "string | null",   // from normalised avatar_authors table
        "author_slug": "string | null"
      }
    }
  ],
  "pagination": { "page": number, "limit": number, "total": number, "hasNextPage": bool, "hasPrevPage": bool }
}

GET /api/avatars/search?q=<query>&limit=10
  Lightweight name search for autocomplete. Returns: [{ "uuid": string, "title": string }]
  q     Partial name to match (min 2 chars, required)
  limit Max results (default: 10, max: 20)

GET /api/avatars/:uuid
  Get a single avatar with its metadata by UUID.
\`\`\`

## Public API — Assets

Base URL: \`https://vrcstorage.lat/api/assets\`

\`\`\`
GET /api/assets
  List assets. All query params are optional.
  ?page=1              Page number (default: 1)
  ?limit=24            Items per page (max: 60)
  ?sort_by=created_at  Sort field: created_at | download_count | title
  ?sort_order=desc     Sort direction: asc | desc
  ?asset_type=         Filter: prop | shader | particle | vfx | prefab | script | animation | avatar-base | texture-pack | sound | tool | hud | other
  ?platform=           Filter: pc | quest | cross
  ?sdk_version=        Filter: sdk3 | sdk2
  ?unity_version=      Filter: 2019 | 2022
  ?is_nsfw=0           Boolean: 0 | 1

Response shape:
{
  "resources": [
    {
      "uuid": "string",
      "title": "string",
      "thumbnail_key": "string | null",
      "download_count": number,
      "created_at": number,
      "meta": {
        "asset_type": "prop|shader|...",
        "is_nsfw": 0 | 1,
        "unity_version": "2019|2022",
        "platform": "pc|quest|cross",
        "sdk_version": "sdk3|sdk2"
      }
    }
  ],
  "pagination": { "page": number, "limit": number, "total": number, "hasNextPage": bool, "hasPrevPage": bool }
}

GET /api/assets/:uuid
  Get a single asset with its metadata by UUID.
\`\`\`

## Public API — Clothes

Base URL: \`https://vrcstorage.lat/api/clothes\`

\`\`\`
GET /api/clothes
  List clothing items. All query params are optional.
  ?page=1, ?limit=24, ?sort_by=, ?sort_order=
  ?is_nsfw=0            Boolean: 0 | 1
  ?compatible_avatar=   Filter by compatible avatar UUID

GET /api/clothes/:uuid
  Get a single clothing item with its metadata.
\`\`\`

## Public API — Blog

Base URL: \`https://vrcstorage.lat/api/blog\`

\`\`\`
GET /api/blog
  List blog posts (paginated). Query params: ?page=1&limit=10
  Response: { "data": [ BlogPost ], "pagination": { page, limit, total, total_pages } }
  BlogPost fields: uuid, slug, title, excerpt, content, author_username, author_avatar,
                   cover_image_key, author_display, created_at (Unix ms), updated_at

GET /api/blog/:uuid
  Get a single post by UUID (includes full markdown content).

GET /api/blog/:uuid/comments
  Get comments for a post. Query params: ?limit=50&offset=0
  Returns: [{ uuid, text, timestamp (Unix ms), author, author_avatar }]
\`\`\`

## Public API — Tags

\`\`\`
GET /api/tags
  Returns all available tags used to label resources.
  Response: [{ "id": number, "name": string }]
\`\`\`

## Public API — Authors

\`\`\`
GET /api/authors
  List avatar authors (creators with a normalised profile).

GET /api/authors/:slug
  Get an author profile by slug. Returns author metadata and their published avatars.
\`\`\`

## Public API — Resources (General)

Base URL: \`https://vrcstorage.lat/api/resources\`

\`\`\`
GET /api/resources/:uuid
  Get the full detail of any resource (avatar, asset, or clothing) by UUID.
  Includes: title, description (Markdown), tags, download links, media files,
            thumbnail, reference image, download_count, category, created_at, updated_at.

GET /api/resources/:uuid/comments
  Get comments for a resource.
  Returns: [{ uuid, text, timestamp (Unix ms), author, author_avatar }]
\`\`\`

## Public API — Downloads & Media

\`\`\`
GET /api/download/:r2_key
  Proxy download for any R2-stored file (images, archives, etc.).
  The r2_key is obtained from the thumbnail_key or media fields of resource/avatar/asset responses.
  Returns the raw file with appropriate Content-Type headers.
  No authentication required for public resources.
\`\`\`

## Public API — Community Ads

\`\`\`
GET /api/ads?slot=<slot>
  Returns active community advertisements for a given display slot.
  Available slots: sidebar_left | featured_artist | grid_card | detail_banner
  Response: [{ uuid, title, tagline, slot_type, cta_url, banner_r2_key, card_r2_key, display_weight }]
\`\`\`

## Public API — System

\`\`\`
GET /api/version
  Returns worker deployment metadata (no auth required).
  Response: { version_id, version_tag, commit, deployed_at, compatibility_date, runtime, ray_id, colo, country }
\`\`\`

## Optional

All wiki articles are served as raw Markdown from /wiki/en/{topic}.md (replace \`en\` with any supported locale: es, pt, ru, jp, cn, fr, de, it, pl, nl, tr).

- [Wiki - Home](https://vrcstorage.lat/wiki/en/home.md): VRCStorage wiki landing page.
- [Wiki - FAQ](https://vrcstorage.lat/wiki/en/faq.md): Frequently asked questions about VRCStorage.
- [Wiki - Setup](https://vrcstorage.lat/wiki/en/setup.md): How to install and use downloaded resources in VRChat/Unity.
- [Wiki - Poiyomi](https://vrcstorage.lat/wiki/en/poiyomi.md): Guide to the Poiyomi shader, widely used in VRChat avatars.
- [Wiki - PhysBones](https://vrcstorage.lat/wiki/en/physbones.md): VRChat PhysBones system — setup, limits, and performance tips.
- [Wiki - GoGo Loco](https://vrcstorage.lat/wiki/en/gogoloco.md): GoGo Loco locomotion system guide.
- [Wiki - GoGo Loco NSFW](https://vrcstorage.lat/wiki/en/gogoloco-nsfw.md): GoGo Loco NSFW module configuration.
- [Wiki - Modular Avatar](https://vrcstorage.lat/wiki/en/modular-avatar.md): Modular Avatar Unity package guide.
- [Wiki - VRCFury](https://vrcstorage.lat/wiki/en/vrcfury.md): VRCFury tool overview and usage.
- [Wiki - SPS](https://vrcstorage.lat/wiki/en/sps.md): Super Penetration System (SPS) setup guide.
- [Wiki - DPS](https://vrcstorage.lat/wiki/en/dps.md): Dynamic Penetration System (DPS) overview.
- [Wiki - NSFW Essentials](https://vrcstorage.lat/wiki/en/nsfw-essentials.md): Essential tools and setup for NSFW avatars.
- [Wiki - Parameters](https://vrcstorage.lat/wiki/en/parameter.md): VRChat avatar parameter system and animator guide.
- [Wiki - Action Menu](https://vrcstorage.lat/wiki/en/action-menu.md): VRChat action menu and radial puppet setup.
- [Wiki - Avatar Categories](https://vrcstorage.lat/wiki/en/avatar-categories.md): Explanation of avatar classification categories used on VRCStorage.
- [Wiki - Desktop Puppeteer](https://vrcstorage.lat/wiki/en/desktop-puppeteer.md): Desktop puppeteer mode for VRChat.
- [Wiki - Gesture Manager & Emulator](https://vrcstorage.lat/wiki/en/gesture-manager-emulator.md): In-editor gesture testing tools.
- [Wiki - Haptics](https://vrcstorage.lat/wiki/en/haptics.md): Haptic feedback integration for VRChat avatars.
- [Wiki - Inside View](https://vrcstorage.lat/wiki/en/inside-view.md): Inside view toggle for avatar heads.
- [Wiki - JustKiss SFX](https://vrcstorage.lat/wiki/en/justkisssfx.md): JustKiss SFX audio component setup.
- [Wiki - PCS](https://vrcstorage.lat/wiki/en/pcs.md): Physic Contact System (PCS) guide.
- [Wiki - Sync Dances](https://vrcstorage.lat/wiki/en/syncdances.md): Synchronized dance system for VRChat.
- [Wiki - Unity Hub Error](https://vrcstorage.lat/wiki/en/unityhub-error.md): Common Unity Hub errors and fixes.
- [Wiki - VRCQuestTools](https://vrcstorage.lat/wiki/en/vrcquesttools.md): VRCQuestTools — PC to Quest avatar conversion.
`;

// =========================================================================================================
// Endpoints
// =========================================================================================================

const llms = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /llms.txt
// Serves the LLM-friendly site overview following the llmstxt.org specification.
// Public, unauthenticated. No rate-limit override — falls under the global RL_GLOBAL catch-all.
// =========================================================================================================

llms.get('/', (c) => {
  return c.text(LLMS_TXT, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400', // 24-hour CDN cache
    'VRCStorage-Info': 'Hi mom :D',
  });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default llms;
