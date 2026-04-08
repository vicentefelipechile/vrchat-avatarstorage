# SEARCH — Sistema de Búsqueda por Categoría + Admin Dashboard

> Documento de arquitectura e implementación de VRCStorage.
> Diseñado para ser leído por agentes de IA en instancias separadas.
> **Estructura:** Contexto y diseño primero → Hitos de implementación al final.

---

## 1. Alcance

VRCStorage se enfoca **exclusivamente en contenido para avatares de VRChat**: avatares, assets y ropa/accesorios. La sección `worlds` se descarta funcionalmente (los datos existentes no se tocan, pero no se implementan filtros ni rutas nuevas para ella).

Este documento cubre cuatro cambios grandes que se implementan juntos:

1. **Rutas separadas por categoría** con filtros facetados: `/api/avatars`, `/api/assets`, `/api/clothes`.
2. **Sistema de autores** normalizado con página pública `/authors/:slug`.
3. **Admin Dashboard** completamente rediseñado en `/admin` (solo desktop).
4. **Sistema de historial extendido** — los cambios en metadatos se guardan en `resource_history` y se muestran en `HistoryView`.

---

## 2. Análisis del Estado Actual de la Base de Datos

### 2.1 Schema en producción (migraciones aplicadas)

| Migración | Tablas / Cambios |
|---|---|
| `0001_initial.sql` | `users`, `media`, `resource_n_media`, `resources`, `resource_links`, `comments`, `rate_limits`, `wiki_comments`, `resource_history` |
| `0002_index_resources.sql` | Índice compuesto `idx_resources_feed` en `resources(is_active, created_at DESC)` |
| `0003_tags.sql` | `tags`, `resource_tags` |
| `0004_favorites.sql` | `user_favorites` |
| `0005_2fa.sql` | Columnas en `users`: `two_factor_enabled`, `two_factor_secret`, `two_factor_backup_codes` |
| `0006_google.sql` | `user_oauth_providers` |
| `0007_blogs.sql` | `blog_posts`, `blog_comments` |

### 2.2 Tabla `resources` — estado actual

```sql
CREATE TABLE resources (
    uuid                 TEXT PRIMARY KEY,
    title                TEXT NOT NULL,
    description          TEXT,           -- metadatos embebidos aquí como Markdown
    category             TEXT NOT NULL,  -- 'avatars' | 'worlds' | 'assets' | 'clothes'
    thumbnail_uuid       TEXT NOT NULL,
    reference_image_uuid TEXT,
    author_uuid          TEXT NOT NULL,  -- FK → users.uuid (quien subió, NO el autor original)
    download_count       INTEGER DEFAULT 0,
    is_active            BOOLEAN DEFAULT 0,
    created_at           INTEGER DEFAULT (unixepoch()),
    updated_at           INTEGER DEFAULT (unixepoch())
)
```

### 2.3 El problema central: metadatos en la descripción

El `UploadView.ts` actual (línea 432) concatena los metadatos del avatar directamente en `description` como bloque Markdown:

```
[descripción del usuario]

---

### Avatar Details
* Platform: PC Only
* SDK: 3.0
* Version: v1.0
* Contains .blend: No
* Uses Poiyomi: Yes
* Uses VRCFury: No
```

Esto significa que **todos los avatares existentes tienen sus metadatos en texto libre**, no en columnas estructuradas. No se pueden filtrar por plataforma o SDK sin parsear texto.

### 2.4 Campos actuales vs. campos nuevos

| Campo actual (en descripción) | Campo nuevo (en `avatar_meta`) | Acción |
|---|---|---|
| `Platform: PC Only / Quest / PC / Quest` | `platform: 'pc' \| 'quest' \| 'cross'` | Sin migración automática |
| `SDK: 3.0 / 2.0` | `sdk_version: 'sdk3' \| 'sdk2'` | Sin migración automática |
| `Version: v1.0` | *(descartado)* | — |
| `Contains .blend: Yes/No` | *(descartado)* | — |
| `Uses Poiyomi: Yes/No` | *(descartado)* | — |
| `Uses VRCFury: Yes/No` | *(descartado)* | — |
| *(no existe)* | `gender`, `body_size`, `avatar_type` | Nuevos |
| *(no existe)* | `is_nsfw`, `has_physbones`, `has_dps`, `has_face_tracking` | Nuevos |
| *(no existe)* | `author_name_raw`, `author_uuid` | Nuevos |

---

## 3. Estrategia de Migración

### 3.1 Principio fundamental: solo añadir, nunca destruir

Las migraciones en Cloudflare D1 son **irreversibles en producción**. Las reglas son absolutas:
- ✅ `CREATE TABLE IF NOT EXISTS`
- ✅ `ALTER TABLE ... ADD COLUMN`
- ✅ `CREATE INDEX IF NOT EXISTS`
- ❌ `DROP TABLE`
- ❌ `DROP COLUMN`
- ❌ Modificar migraciones ya aplicadas

### 3.2 Qué pasa con los recursos existentes

| Recurso | Comportamiento en el nuevo sistema |
|---|---|
| Avatar legacy (sin `avatar_meta`) | Visible en `GET /api/resources?category=avatars` — **no** aparece en `GET /api/avatars` |
| Asset / Clothes legacy | Mismo comportamiento |
| Recursos de `worlds` | Sin cambios — siguen en la ruta genérica y el `CategoryView` |

Los recursos legacy podrán completar sus metadatos desde el Admin Dashboard (Sección Recursos → editar → añadir metadatos).

### 3.3 Plan de migraciones nuevas

- **`migrations/0008_category_authors.sql`** — tabla `avatar_authors`.
- **`migrations/0009_category_metadata.sql`** — tablas `avatar_meta`, `asset_meta`, `clothes_meta`.

Ambas empiezan vacías. No hay datos a migrar del sistema viejo.

### 3.4 Decisión sobre `worlds`

- Los registros `category = 'worlds'` permanecen en la DB sin cambios.
- La ruta `GET /api/resources?category=worlds` sigue funcionando.
- El `CategoryView` genérico permanece para esa URL.
- No se crea tabla `worlds_meta`.
- En el formulario de upload, la opción `worlds` se elimina del `<select>`.

---

## 4. Diseño de Base de Datos

### 4.1 Tabla `avatar_authors`

| Columna | Tipo | Notas |
|---|---|---|
| `uuid` | TEXT PK | UUID v4 |
| `name` | TEXT NOT NULL UNIQUE | Nombre display (ej: "Manuka") |
| `slug` | TEXT UNIQUE NOT NULL | URL-friendly, generado al crear (ej: "manuka") |
| `description` | TEXT NULL | Bio en inglés |
| `avatar_url` | TEXT NULL | URL de imagen de perfil del autor |
| `website_url` | TEXT NULL | Sitio web / tienda |
| `twitter_url` | TEXT NULL | Twitter/X |
| `booth_url` | TEXT NULL | BOOTH (mercado JP) |
| `gumroad_url` | TEXT NULL | Gumroad |
| `patreon_url` | TEXT NULL | Patreon |
| `created_at` | INTEGER | Unix timestamp |
| `updated_at` | INTEGER | Unix timestamp |

**Índices:** `slug`, `name`

### 4.2 Tabla `avatar_meta`

| Columna | Tipo | Valores | Obligatorio |
|---|---|---|---|
| `resource_uuid` | TEXT PK FK | → `resources.uuid` ON DELETE CASCADE | ✓ |
| `author_uuid` | TEXT NULL FK | → `avatar_authors.uuid` (admin vincula después) | — |
| `author_name_raw` | TEXT NULL | Texto libre del uploader | — |
| `gender` | TEXT NOT NULL | `male`, `female`, `androgynous`, `undefined` | ✓ |
| `body_size` | TEXT NOT NULL | `tiny`, `small`, `medium`, `tall`, `giant` | ✓ |
| `avatar_type` | TEXT NOT NULL | `anime`, `kemono`, `furry`, `human`, `semi-realistic`, `chibi`, `mecha`, `monster`, `fantasy`, `sci-fi`, `vtuber`, `other` | ✓ |
| `is_nsfw` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `has_physbones` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `has_face_tracking` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `has_dps` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `has_gogoloco` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `has_toggles` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `is_quest_optimized` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `sdk_version` | TEXT DEFAULT 'sdk3' | `sdk3`, `sdk2` | ✓ |
| `platform` | TEXT DEFAULT 'cross' | `pc`, `quest`, `cross` | ✓ |

**Índices:** `gender`, `avatar_type`, `body_size`, `is_nsfw`, `platform`, `author_uuid`, `has_gogoloco`, `is_quest_optimized`

**Flujo de autor:** el uploader escribe texto libre → se guarda en `author_name_raw`. El admin crea el registro en `avatar_authors` y ejecuta "Vincular recursos" → setea `author_uuid`. La búsqueda filtra por `author_uuid` (JOIN exacto) o como fallback usa `LIKE` sobre `author_name_raw`.

### 4.3 Tabla `asset_meta`

| Columna | Tipo | Valores | Obligatorio |
|---|---|---|---|
| `resource_uuid` | TEXT PK FK | → `resources.uuid` ON DELETE CASCADE | ✓ |
| `asset_type` | TEXT NOT NULL | `prop`, `shader`, `particle`, `vfx`, `prefab`, `script`, `animation`, `avatar-base`, `texture-pack`, `sound`, `tool`, `hud`, `other` | ✓ |
| `is_nsfw` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `unity_version` | TEXT DEFAULT '2022' | `2019`, `2022` | ✓ |
| `platform` | TEXT DEFAULT 'cross' | `pc`, `quest`, `cross` | ✓ |
| `sdk_version` | TEXT DEFAULT 'sdk3' | `sdk3`, `sdk2` | ✓ |

**Índices:** `asset_type`, `is_nsfw`, `platform`, `unity_version`

### 4.4 Tabla `clothes_meta`

| Columna | Tipo | Valores | Obligatorio |
|---|---|---|---|
| `resource_uuid` | TEXT PK FK | → `resources.uuid` ON DELETE CASCADE | ✓ |
| `gender_fit` | TEXT NOT NULL | `male`, `female`, `unisex`, `kemono` | ✓ |
| `clothing_type` | TEXT NOT NULL | `top`, `jacket`, `bottom`, `dress`, `fullbody`, `swimwear`, `shoes`, `legwear`, `hat`, `hair`, `accessory`, `tail`, `ears`, `wings`, `body-part`, `underwear`, `other` | ✓ |
| `is_base` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `base_avatar_uuid` | TEXT NULL FK | → `resources.uuid` (avatar base referenciado) | Solo si `is_base=1` |
| `base_avatar_name_raw` | TEXT NULL | Texto libre si el avatar base no está en la DB | — |
| `is_nsfw` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `has_physbones` | INTEGER DEFAULT 0 | `0` / `1` | ✓ |
| `platform` | TEXT DEFAULT 'cross' | `pc`, `quest`, `cross` | ✓ |

**Índices:** `gender_fit`, `clothing_type`, `is_base`, `is_nsfw`, `platform`, `has_physbones`

---

## 5. Arquitectura de Rutas

### 5.1 Backend

```
── NUEVAS ──────────────────────────────────────────────────────────────────────
GET  /api/avatars                       Listado de avatares (INNER JOIN avatar_meta)
POST /api/avatars                       Crear avatar + avatar_meta en db.batch()

GET  /api/assets                        Listado de assets (INNER JOIN asset_meta)
POST /api/assets                        Crear asset + asset_meta en db.batch()

GET  /api/clothes                       Listado de ropa (INNER JOIN clothes_meta)
POST /api/clothes                       Crear ropa + clothes_meta en db.batch()

GET  /api/authors                       Listado paginado de autores
GET  /api/authors/search?q=             Autocompletar nombre → {uuid, name, slug}
GET  /api/authors/:slug                 Perfil público + avatares del autor
POST /api/authors                       Crear autor [admin]
PUT  /api/authors/:slug                 Editar autor [admin]
DELETE /api/authors/:slug               Eliminar autor [admin]
POST /api/authors/:slug/link-resource   Vincular recurso a autor [admin]

GET  /api/admin/stats                   Métricas consolidadas [admin]
GET  /api/admin/users?q=&page=          Lista de usuarios con búsqueda [admin]
GET  /api/admin/resources?...           Lista completa de recursos con filtros [admin]

── EXISTENTES SIN CAMBIOS ──────────────────────────────────────────────────────
GET  /api/resources                     Búsqueda genérica — MANTENER INTACTO
GET  /api/resources/latest              Feed de últimos recursos
GET  /api/resources/:uuid               Detalle de recurso
POST /api/resources                     Crear recurso (legacy — solo admin/compatibilidad)
PUT  /api/resources/:uuid               Editar recurso
DELETE /api/resources/:uuid             Eliminar recurso
GET  /api/admin/pending                 Recursos pendientes
POST /api/admin/resource/:uuid/approve  Aprobar recurso
POST /api/admin/resource/:uuid/reject   Rechazar recurso
POST /api/admin/resource/:uuid/deactivate Desactivar recurso
GET  /api/admin/stats/orphaned-media    Stats de orphaned (queda, pero se añade /api/admin/stats)
POST /api/admin/cleanup/orphaned-media  Limpiar huérfanos
POST /api/admin/cache/clear/:username   Limpiar caché de usuario
POST /api/admin/users/:username/role    Cambiar rol de usuario
```

### 5.2 Parámetros de filtro por ruta

**`GET /api/avatars`**

| Parámetro | Valores |
|---|---|
| `gender` | `male`, `female`, `androgynous`, `undefined` |
| `body_size` | `tiny`, `small`, `medium`, `tall`, `giant` |
| `avatar_type` | `anime`, `kemono`, `furry`, `human`, `semi-realistic`, `chibi`, `mecha`, `monster`, `fantasy`, `sci-fi`, `vtuber`, `other` |
| `is_nsfw` | `0`, `1` |
| `has_physbones` | `0`, `1` |
| `has_face_tracking` | `0`, `1` |
| `has_dps` | `0`, `1` |
| `has_gogoloco` | `0`, `1` |
| `has_toggles` | `0`, `1` |
| `is_quest_optimized` | `0`, `1` |
| `platform` | `pc`, `quest`, `cross` |
| `sdk_version` | `sdk3`, `sdk2` |
| `author_uuid` | UUID del autor normalizado |
| `sort_by` | `created_at`, `download_count`, `title` |
| `sort_order` | `asc`, `desc` |
| `page`, `limit` | Paginación (max 60) |

**`GET /api/assets`**

| Parámetro | Valores |
|---|---|
| `asset_type` | `prop`, `shader`, `particle`, `vfx`, `prefab`, `script`, `animation`, `avatar-base`, `texture-pack`, `sound`, `tool`, `hud`, `other` |
| `is_nsfw` | `0`, `1` |
| `unity_version` | `2019`, `2022` |
| `platform` | `pc`, `quest`, `cross` |
| `sort_by`, `sort_order`, `page`, `limit` | Estándar |

**`GET /api/clothes`**

| Parámetro | Valores |
|---|---|
| `gender_fit` | `male`, `female`, `unisex`, `kemono` |
| `clothing_type` | `top`, `jacket`, `bottom`, `dress`, `fullbody`, `swimwear`, `shoes`, `legwear`, `hat`, `hair`, `accessory`, `tail`, `ears`, `wings`, `body-part`, `underwear`, `other` |
| `is_base` | `0`, `1` |
| `is_nsfw` | `0`, `1` |
| `has_physbones` | `0`, `1` |
| `platform` | `pc`, `quest`, `cross` |
| `sort_by`, `sort_order`, `page`, `limit` | Estándar |

### 5.3 Respuesta estándar de las rutas de categoría

```json
{
  "resources": [
    {
      "uuid": "...",
      "title": "...",
      "thumbnail_key": "...",
      "download_count": 0,
      "created_at": 0,
      "meta": { "gender": "female", "avatar_type": "anime", "platform": "cross", "..." : "..." }
    }
  ],
  "pagination": { "page": 1, "hasNextPage": true, "hasPrevPage": false }
}
```

### 5.4 Frontend

```
── NUEVAS ──────────────────────────────────────────────────────────────────────
/avatars              AvatarsView   — Grid + panel de filtros lateral
/assets               AssetsView    — Grid + panel de filtros lateral
/clothes              ClothesView   — Grid + panel de filtros lateral
/authors/:slug        AuthorView    — Perfil público del autor

── EXISTENTES SIN CAMBIOS ──────────────────────────────────────────────────────
/                     HomeView
/category/:category   CategoryView  — fallback (solo worlds en la práctica)
/item/:id             ItemView
/resource/:id         ItemView
/resource/:id/edit    EditResourceView
/resource/:id/history HistoryView
/login                LoginView
/register             RegisterView
/upload               UploadView    (refactorizado internamente)
/admin                AdminView     (rediseñado internamente)
/settings             SettingsView
/wiki                 WikiView
/favorites            FavoritesView
/tos                  TOSView
/dmca                 DMCAView
/oauth/register       OAuthRegisterView
/blog                 BlogListView
/blog/create          BlogCreateView
/blog/:id             BlogPostView
/blog/:id/edit        BlogCreateView
```

---

## 6. Diseño de la UI

### 6.1 Layout del motor de búsqueda (AvatarsView / AssetsView / ClothesView)

```
┌────────────────────────────────────────────────────────────────┐
│  NAV                                                           │
├──────────────────┬──────────────────────────────────────────── │
│                  │  X resultados          [Ordenar por ▼]      │
│  FILTER PANEL    │                                             │
│  (260px, sticky) │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│                  │  │ card │ │ card │ │ card │ │ card │        │
│  [Filtros]       │  └──────┘ └──────┘ └──────┘ └──────┘        │
│  Limpiar         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│                  │  │ card │ │ card │ │ card │ │ card │        │
│  ── Tipo ──      │  └──────┘ └──────┘ └──────┘ └──────┘        │
│  [x] Anime       │                                             │
│  [ ] Furry       │  [Anterior]   Página 1   [Siguiente]        │
│  [ ] Humano      │                                             │
│                  │                                             │
│  ── Plataforma ──│                                             │
│  [x] PC          │                                             │
│  [ ] Quest       │                                             │
│  [ ] Cross       │                                             │
│                  │                                             │
│  ── NSFW ──      │                                             │
│  [ ] Incluir     │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

**Mobile (< 768px):** el panel lateral desaparece (`display: none`). El grid ocupa el 100% del ancho. Los filtros mobile son trabajo futuro (drawer/modal).

**Comportamiento del panel:**
- Cambiar cualquier filtro → fetch con debounce 300ms.
- Los filtros activos se escriben en la URL vía `history.replaceState` (ej: `/avatars?avatar_type=anime&platform=pc`). Permite compartir búsquedas.
- Al cargar la vista, se leen los query params y se preseleccionan los inputs.
- Botón "Limpiar" → resetea todos los inputs y navega a la URL base sin params.

### 6.2 Página de autor (`/authors/:slug`)

```
┌──────────────────────────────────────────────────────┐
│  [Img]  Nombre del Autor                             │
│         Descripción del autor (en inglés)            │
│                                                      │
│  🌐 Website  🐦 Twitter  🛒 BOOTH  💬 Discord  ... │
├──────────────────────────────────────────────────────┤
│  Avatares de Nombre del Autor                        │
│                                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ card │  │ card │  │ card │  │ card │              │
│  └──────┘  └──────┘  └──────┘  └──────┘              │
│                                                      │
│  [Anterior]  Página 1  [Siguiente]                   │
└──────────────────────────────────────────────────────┘
```

Solo se muestran los iconos de redes para los campos que no sean `null`. La página es pública, sin autenticación.

### 6.3 Admin Dashboard (`/admin`)

**Solo desktop. Si viewport < 1024px:** layout oculto, se muestra un mensaje indicando que la sección solo está disponible en escritorio.

```
┌──────────────────────────────────────────────────────────────────────┐
│ VRCStorage Admin                                                     │
│ ──────────────┬───────────────────────────────────────────────────── │
│  ● Overview   │                                                      │
│  ○ Pendientes │  CONTENIDO DE LA SECCIÓN ACTIVA                      │
│    [badge: 3] │                                                      │
│  ○ Recursos   │  (stats grid / tabla paginada / formulario)          │
│  ○ Autores    │                                                      │
│  ○ Usuarios   │                                                      │
│  ○ Almacen.   │                                                      │
│  ○ Caché      │                                                      │
│               │                                                      │
│  [sidebar     │                                                      │
│   220px fijo] │  [área de contenido, flex-1, scroll independiente]   │
└───────────────┴──────────────────────────────────────────────────────┘
```

**Secciones del dashboard:**

| Sección | Contenido |
|---|---|
| **Overview** | Grid de stat cards (usuarios, recursos por categoría, pendientes, autores, media, huérfanos) + tabla de últimas subidas + tabla de últimos registros |
| **Pendientes** | Grid de cards de recursos pendientes con botones Aprobar / Rechazar (flujo actual preservado) |
| **Recursos** | Tabla paginada con búsqueda y filtros de categoría/estado + acciones por fila (ver, editar, activar/desactivar, eliminar, completar metadatos) |
| **Autores** | Tabla + formulario crear/editar autor + herramienta de vinculación de recursos por `author_name_raw` |
| **Usuarios** | Tabla paginada con búsqueda + toggle de rol admin + botón limpiar caché por fila |
| **Almacenamiento** | Stats de media huérfana + lista de archivos + botón limpiar (flujo actual preservado) |
| **Caché** | Input de username + botón limpiar caché (flujo actual preservado) |

Navegación entre secciones via JS puro (toggle de visibilidad). La URL `/admin` no cambia.

### 6.4 Formulario de Upload (refactorizado)

Al seleccionar categoría, el formulario muestra dinámicamente el bloque de metadatos correspondiente. El submit está bloqueado en cliente si los campos obligatorios están vacíos.

**Bloque avatares (`#avatar-meta-fields`):**
- Género: radio `male` / `female` / `undefined` — obligatorio
- Tamaño: radio `tall` / `medium` / `small` — obligatorio
- Tipo visual: select `anime` / `furry` / `human` / `monster` / `robot` / `other` — obligatorio
- Plataforma: select `pc` / `quest` / `cross` — obligatorio
- SDK: select `sdk3` / `sdk2`
- Checkboxes: NSFW, PhysBones, DPS, Face Tracking
- Input "Autor original": autocomplete contra `GET /api/authors/search?q=`, resultado muestra `Nombre — By Autor`; acepta texto libre si no hay match (guarda en `author_name_raw`)

**Bloque assets (`#asset-meta-fields`):**
- Tipo de asset: select — obligatorio
- Plataforma: select — obligatorio
- SDK: select
- Checkboxes: NSFW, ERP, Funny

**Bloque ropa (`#clothes-meta-fields`):**
- Género de diseño: radio — obligatorio
- Tipo de prenda: select — obligatorio
- Plataforma: select — obligatorio
- Checkbox: NSFW
- Checkbox: "Es base de avatar" → si activo muestra campo "¿Para qué avatar base?" con autocomplete

El POST va al endpoint correcto según categoría (`/api/avatars`, `/api/assets`, `/api/clothes`), no al genérico `/api/resources`.

---

## 7. Archivos a Crear / Modificar

### Nuevos archivos

| Archivo | Propósito |
|---|---|
| `migrations/0008_category_authors.sql` | Tabla `avatar_authors` |
| `migrations/0009_category_metadata.sql` | Tablas `avatar_meta`, `asset_meta`, `clothes_meta` |
| `src/routes/avatars.ts` | `GET` y `POST /api/avatars` |
| `src/routes/assets.ts` | `GET` y `POST /api/assets` |
| `src/routes/clothes.ts` | `GET` y `POST /api/clothes` |
| `src/routes/authors.ts` | CRUD de autores + búsqueda |
| `src/frontend/filter-panel.ts` | Módulo compartido del panel de filtros |
| `src/frontend/views/AvatarsView.ts` | Vista de avatares con panel lateral |
| `src/frontend/views/AssetsView.ts` | Vista de assets con panel lateral |
| `src/frontend/views/ClothesView.ts` | Vista de ropa con panel lateral |
| `src/frontend/views/AuthorView.ts` | Perfil público del autor |
| `public/style/search.css` | Layout de dos columnas + estilos del panel |
| `public/style/authors.css` | Estilos de la página de autor |
| `public/style/admin-dashboard.css` | Estilos completos del dashboard de admin |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/index.ts` | Montar las 4 nuevas rutas (`/api/avatars`, `/api/assets`, `/api/clothes`, `/api/authors`) |
| `src/types.ts` | Añadir interfaces `AvatarAuthor`, `AvatarMeta`, `AssetMeta`, `ClothesMeta`, `ResourceHistoryEntry` extendido |
| `src/validators.ts` | Añadir schemas Zod para las 4 nuevas entidades |
| `src/routes/admin.ts` | Añadir `GET /api/admin/stats`, `GET /api/admin/users`, `GET /api/admin/resources` |
| `src/routes/avatars.ts` | Al crear/editar: insertar snapshot `meta_edit` en `resource_history` |
| `src/routes/assets.ts` | Ídem para assets |
| `src/routes/clothes.ts` | Ídem para ropa |
| `src/frontend/app.ts` | Registrar 4 nuevas rutas frontend (`/avatars`, `/assets`, `/clothes`, `/authors/:slug`) |
| `src/frontend/views/UploadView.ts` | Eliminar bloque legacy, añadir bloques de metadatos por categoría, cambiar endpoint POST |
| `src/frontend/views/AdminView.ts` | Rediseño completo con layout sidebar + secciones |
| `src/frontend/views/HistoryView.ts` | Renderizar entradas `meta_edit` con diff visual de metadatos |
| `public/style.css` | Añadir `@import` de los 3 nuevos archivos CSS |

### Archivos sin cambios

| Archivo | Razón |
|---|---|
| `src/routes/resources.ts` | Compatibilidad con favoritos, historial, ItemView, admin existente |
| `src/frontend/views/CategoryView.ts` | Sigue como fallback para `worlds` |

---

## 8. Decisiones de Diseño

| Decisión | Razonamiento |
|---|---|
| `worlds` descartado funcionalmente | Plataforma 100% enfocada en avatares; los datos no se borran |
| Metadatos obligatorios en nuevas subidas | Sin metadatos no hay filtrado útil; calidad desde el primer registro nuevo |
| `author_name_raw` + `author_uuid` en paralelo | Día 1 sin autores normalizados; el admin vincula progresivamente |
| `base_avatar_uuid` + `base_avatar_name_raw` | Mismo patrón dual para ropa base |
| Sin `DROP` ni `ALTER ... DROP COLUMN` | D1 es irreversible; compatibilidad total hacia atrás |
| Panel de filtros solo desktop | Mobile requiere diseño diferente (drawer/modal) — trabajo futuro |
| Admin dashboard solo desktop | Interfaz densa; no tiene sentido en mobile |
| Navegación del dashboard sin cambio de URL | JS-only; evita rutas adicionales; la URL `/admin` no cambia |
| Rutas `/api/avatars` adicionales | `GET /api/resources` se mantiene intacto para no romper código existente |
| Historial reutiliza `resource_history` | No se crea tabla nueva; se añade `change_type = 'meta_edit'` con JSON snapshot en `previous_data` |
| Snapshot completo en cada edit de meta | Igual que `content_edit` — se guarda el estado **anterior** completo, no solo el campo cambiado. Permite reconstruir cualquier versión. |
| diff visual en `HistoryView` calculado en cliente | El backend devuelve los snapshots crudos; el diff se calcula en el frontend para no añadir carga al worker |

---

## 9. Sistema de Historial Extendido

### 9.1 Estado actual

La tabla `resource_history` ya existe desde `0001_initial.sql`:

```sql
CREATE TABLE resource_history (
    uuid          TEXT PRIMARY KEY,
    resource_uuid TEXT NOT NULL,
    actor_uuid    TEXT NOT NULL,
    change_type   TEXT NOT NULL,    -- actualmente: 'content_edit' | 'tag_change' | 'approval'
    previous_data TEXT NOT NULL,    -- JSON con el estado ANTERIOR al cambio
    created_at    INTEGER DEFAULT (unixepoch())
)
```

El flujo actual en `src/routes/resources.ts` (PUT /:uuid) hace un snapshot de `{title, description, category, tags}` **antes** de aplicar la edición y lo guarda como `change_type = 'content_edit'`.

### 9.2 Extensión: `change_type = 'meta_edit'`

Se añade un nuevo valor de `change_type` sin modificar la tabla:

| `change_type` | Cuándo se genera | Contenido de `previous_data` |
|---|---|---|
| `content_edit` | Al editar título, descripción, categoría o tags | `{title, description, category, tags[]}` |
| `meta_edit` | Al editar `avatar_meta`, `asset_meta` o `clothes_meta` | `{meta_type, fields: {...todos los campos antes del cambio}}` |
| `approval` | Al aprobar o rechazar un recurso | `{is_active: bool}` |

**Estructura del snapshot `meta_edit`:**

```json
{
  "meta_type": "avatar_meta",
  "fields": {
    "gender": "female",
    "body_size": "medium",
    "avatar_type": "anime",
    "is_nsfw": 0,
    "has_physbones": 1,
    "has_face_tracking": 0,
    "has_dps": 0,
    "has_gogoloco": 0,
    "has_toggles": 1,
    "is_quest_optimized": 0,
    "sdk_version": "sdk3",
    "platform": "cross",
    "author_name_raw": "Manuka",
    "author_uuid": null
  }
}
```

### 9.3 Cuándo se genera la entrada de historial

| Operación | Behavior |
|---|---|
| **POST** `/api/avatars` (crear) | **No** genera entrada — es la creación inicial, no un cambio |
| **PUT** `/api/avatars/:uuid` (editar metadatos) | Snapshot del estado **anterior** de `avatar_meta` → inserta `meta_edit` |
| **POST** `/api/authors/:slug/link-resource` (admin vincula autor) | Snapshot del `author_uuid` e `author_name_raw` anteriores → inserta `meta_edit`. El `actor_uuid` es el admin que hizo la vinculación |
| **PUT** `/api/assets/:uuid` o `/api/clothes/:uuid` | Mismo patrón — snapshot del `asset_meta` / `clothes_meta` anterior |

El snapshot se genera y la actualización se aplican en el mismo `db.batch()` para garantizar atomicidad.

### 9.4 Endpoint de historial

El endpoint existente `GET /api/resources/:uuid/history` en `src/routes/resources.ts` devuelve todas las entradas de `resource_history` para un recurso. Se mantiene intacto — los nuevos `meta_edit` aparecen automáticamente en la misma respuesta.

```json
[
  {
    "uuid": "...",
    "actor_username": "admin",
    "actor_avatar_url": "...",
    "change_type": "meta_edit",
    "previous_data": "{\"meta_type\":\"avatar_meta\",\"fields\":{...}}",
    "created_at": 1234567890
  },
  {
    "uuid": "...",
    "actor_username": "admin",
    "change_type": "content_edit",
    "previous_data": "{\"title\":\"...\",\"description\":\"...\",\"tags\":[...]}",
    "created_at": 1234567800
  }
]
```

### 9.5 Renderizado en `HistoryView`

El `HistoryView` actual muestra entradas `content_edit`. Se extiende para renderizar también `meta_edit`:

**Para `content_edit`** (comportamiento actual, sin cambios):
- Muestra diff de título, descripción y tags.

**Para `meta_edit`** (nuevo):
- Parsea `previous_data.fields` y lo compara contra el estado **actual** del meta (fetched aparte).
- Renderiza una tabla de dos columnas: campo / valor anterior / valor actual.
- Los campos con cambio se resaltan visualmente.
- Si `meta_type = 'avatar_meta'` y `author_uuid` cambió de null a un UUID, se muestra `"Autor vinculado: [nombre del autor]"` como texto especial.

**Para `approval`** (comportamiento actual, sin cambios):
- Muestra si fue aprobado o rechazado.

```
┌────────────────────────────────────────────────────────────────────┐
│  Historial de cambios — Nombre del Avatar                          │
├────────────────────────────────────────────────────────────────────┤
│  [👤 admin]  hace 2 horas              [meta_edit]                 │
│                                                                    │
│  Campo            │ Antes              │ Después                   │
│  ─────────────────┼────────────────────┼───────────────────────    │
│  platform         │ pc                 │ cross           ← cambio  │
│  is_quest_opti... │ 0                  │ 1               ← cambio  │
│  (otros campos sin cambios no se muestran)                         │
├────────────────────────────────────────────────────────────────────┤
│  [👤 admin]  hace 5 horas              [content_edit]              │
│                                                                    │
│  Título: "Manuka v1.0" → "Manuka v1.1"                             │
│  Tags: +quest, -pc-only                                            │
└────────────────────────────────────────────────────────────────────┘
```

Solo los campos que **cambiaron** se muestran en la fila de diff. Los campos sin cambio se omiten para no saturar la vista.

---

---

# HITOS DE IMPLEMENTACIÓN

> Lista de tareas ordenada por capa. Marca cada ítem con `[x]` al completarlo.
> Las fases deben ejecutarse en orden — cada una depende de la anterior.

---

## FASE 1 — Base de Datos

### Migración 0008: Tabla de Autores

- [ ] Crear `migrations/0008_category_authors.sql`
  - [ ] Tabla `avatar_authors` (uuid, name, slug, description, avatar_url, website_url, twitter_url, booth_url, gumroad_url, patreon_url, discord_url, created_at, updated_at)
  - [ ] `UNIQUE` en `name` y en `slug`
  - [ ] Índice en `slug`
  - [ ] Índice en `name`

### Migración 0009: Metadatos de Categoría

- [ ] Crear `migrations/0009_category_metadata.sql`
  - [ ] Tabla `avatar_meta` con todas las columnas definidas en §4.2
  - [ ] FK `resource_uuid` → `resources.uuid` ON DELETE CASCADE
  - [ ] FK nullable `author_uuid` → `avatar_authors.uuid`
  - [ ] Índices en: `gender`, `avatar_type`, `body_size`, `is_nsfw`, `platform`, `author_uuid`, `has_gogoloco`, `is_quest_optimized`
  - [ ] Tabla `asset_meta` con todas las columnas definidas en §4.3
  - [ ] FK `resource_uuid` → `resources.uuid` ON DELETE CASCADE
  - [ ] Índices en: `asset_type`, `is_nsfw`, `platform`, `unity_version`
  - [ ] Tabla `clothes_meta` con todas las columnas definidas en §4.4
  - [ ] FK `resource_uuid` → `resources.uuid` ON DELETE CASCADE
  - [ ] FK nullable `base_avatar_uuid` → `resources.uuid`
  - [ ] Índices en: `gender_fit`, `clothing_type`, `is_base`, `is_nsfw`, `platform`, `has_physbones`

> **Nota:** no se necesita migración para el sistema de historial. La tabla `resource_history` ya existe y el nuevo `change_type = 'meta_edit'` es solo un valor de texto en la columna existente.

---

## FASE 2 — Backend: Tipos y Validación

- [ ] Añadir en `src/types.ts`
  - [ ] Interface `AvatarAuthor`
  - [ ] Interface `AvatarMeta`
  - [ ] Interface `AssetMeta`
  - [ ] Interface `ClothesMeta`
  - [ ] Tipo `MetaEditSnapshot` — `{ meta_type: 'avatar_meta' | 'asset_meta' | 'clothes_meta'; fields: Record<string, unknown> }`
  - [ ] Tipo `HistoryChangeType` — unión `'content_edit' | 'meta_edit' | 'approval'`
- [ ] Añadir en `src/validators.ts`
  - [ ] `AvatarAuthorSchema` (Zod)
  - [ ] `AvatarMetaSchema` (Zod, campos obligatorios marcados)
  - [ ] `AssetMetaSchema` (Zod)
  - [ ] `ClothesMetaSchema` (Zod)

---

## FASE 3 — Backend: Rutas de Categoría

- [ ] Crear `src/routes/avatars.ts`
  - [ ] `GET /api/avatars` — `INNER JOIN avatar_meta`, filtros facetados via `QueryBuilder`
  - [ ] `POST /api/avatars` — crear en `resources` + insertar en `avatar_meta` con `db.batch()` — **no genera historial** (creación inicial)
  - [ ] `PUT /api/avatars/:uuid` — editar metadatos del avatar:
    - [ ] Snapshot del `avatar_meta` actual → `previous_data` JSON con `meta_type: 'avatar_meta'`
    - [ ] Insertar en `resource_history` con `change_type = 'meta_edit'` y `actor_uuid` del usuario
    - [ ] Actualizar `avatar_meta` — todo en `db.batch()` para atomicidad
- [ ] Crear `src/routes/assets.ts`
  - [ ] `GET /api/assets` — `INNER JOIN asset_meta`, filtros facetados
  - [ ] `POST /api/assets` — crear en `resources` + insertar en `asset_meta` con `db.batch()` — **no genera historial**
  - [ ] `PUT /api/assets/:uuid` — snapshot de `asset_meta` + `meta_edit` + actualización en `db.batch()`
- [ ] Crear `src/routes/clothes.ts`
  - [ ] `GET /api/clothes` — `INNER JOIN clothes_meta`, filtros facetados
  - [ ] `POST /api/clothes` — crear en `resources` + insertar en `clothes_meta` con `db.batch()` — **no genera historial**
  - [ ] `PUT /api/clothes/:uuid` — snapshot de `clothes_meta` + `meta_edit` + actualización en `db.batch()`
- [ ] Montar en `src/index.ts`
  - [ ] `app.route('/api/avatars', avatarsRouter)`
  - [ ] `app.route('/api/assets', assetsRouter)`
  - [ ] `app.route('/api/clothes', clothesRouter)`

---

## FASE 4 — Backend: Rutas de Autores

- [ ] Crear `src/routes/authors.ts`
  - [ ] `GET /api/authors` — listado paginado
  - [ ] `GET /api/authors/search?q=` — autocompletar nombre (máx 10 resultados)
  - [ ] `GET /api/authors/:slug` — perfil + avatares (`JOIN avatar_meta`)
  - [ ] `POST /api/authors` — crear autor [admin only]
  - [ ] `PUT /api/authors/:slug` — editar autor [admin only]
  - [ ] `DELETE /api/authors/:slug` — eliminar (verificar que no haya avatares vinculados) [admin only]
  - [ ] `POST /api/authors/:slug/link-resource` — setear `avatar_meta.author_uuid` [admin only]
- [ ] Montar en `src/index.ts`
  - [ ] `app.route('/api/authors', authorsRouter)`

---

## FASE 5 — Backend: Nuevos Endpoints de Admin

- [ ] Añadir en `src/routes/admin.ts`
  - [ ] `GET /api/admin/stats` — batch de queries: usuarios totales, recursos por categoría, pendientes, autores, media total, media huérfana, últimas 5 subidas, últimos 5 registros
  - [ ] `GET /api/admin/users?q=&page=` — lista con búsqueda por username
  - [ ] `GET /api/admin/resources?category=&status=&q=&page=` — lista completa con filtros

---

## FASE 5B — Backend: Historial para Vinculación de Autores

- [ ] En `src/routes/authors.ts`, endpoint `POST /api/authors/:slug/link-resource`:
  - [ ] Antes de setear `avatar_meta.author_uuid`, leer el valor actual de `author_uuid` y `author_name_raw`
  - [ ] Generar snapshot `{ meta_type: 'avatar_meta', fields: { author_uuid: <anterior>, author_name_raw: <anterior> } }`
  - [ ] Insertar en `resource_history` con `change_type = 'meta_edit'`
  - [ ] Actualizar `avatar_meta` y registrar historia en `db.batch()` para atomicidad

---

## FASE 6 — Frontend: CSS

- [ ] Crear `public/style/search.css`
  - [ ] `.category-layout` — flex row, gap entre panel y grid
  - [ ] `.filter-panel` — 260px, position sticky
  - [ ] `.filter-panel-header` — título + botón reset
  - [ ] `.filter-group`, `.filter-group-label`
  - [ ] `.filter-chip` — checkbox estilizado como pill seleccionable
  - [ ] `.filter-toggle` — fila con switch booleano inline
  - [ ] `.filter-select` — select nativo estilizado
  - [ ] `.filter-results-count` — contador de resultados
  - [ ] `.category-results` — flex-1, min-width: 0
  - [ ] `@media (max-width: 768px)` — `.filter-panel { display: none; }`, layout a bloque
- [ ] Crear `public/style/authors.css`
  - [ ] `.author-profile-header` — flex, imagen + nombre + descripción
  - [ ] `.author-socials` — lista horizontal de links/íconos
  - [ ] `.author-resources-section` — wrapper del grid de avatares
- [ ] Crear `public/style/admin-dashboard.css`
  - [ ] `.admin-layout` — flex row: sidebar + contenido
  - [ ] `.admin-sidebar` — 220px, fijo, altura del viewport
  - [ ] `.admin-sidebar-nav-item` — ítem con estado activo
  - [ ] `.admin-sidebar-badge` — badge de conteo numérico
  - [ ] `.admin-content` — flex-1, padding, overflow-y auto
  - [ ] `.admin-section` — oculto por defecto, visible cuando activo
  - [ ] `.admin-stats-grid` — grid de stat cards
  - [ ] `.admin-stat-card`, `--warning`, `--danger`
  - [ ] `.admin-data-table` — tabla flat sin border-radius
  - [ ] `.admin-badge-status` — badge inline de estado
  - [ ] `.admin-action-bar` — toolbar de búsqueda + botones sobre tablas
  - [ ] `.admin-form-panel` — panel de formulario create/edit
  - [ ] `.admin-desktop-only-warning` — aviso visible en viewport < 1024px
  - [ ] `@media (max-width: 1024px)` — ocultar `.admin-layout`, mostrar warning
- [ ] Registrar en `public/style.css`
  - [ ] `@import './style/search.css'`
  - [ ] `@import './style/authors.css'`
  - [ ] `@import './style/admin-dashboard.css'`

---

## FASE 7 — Frontend: Módulo de Filtros

- [ ] Crear `src/frontend/filter-panel.ts`
  - [ ] `interface FilterOption` — `{ value: string; label: string }`
  - [ ] `interface FilterGroupConfig` — `{ name: string; label: string; type: 'checkbox' | 'toggle' | 'select'; options: FilterOption[] }`
  - [ ] `interface FilterPanelConfig` — `{ groups: FilterGroupConfig[] }`
  - [ ] `buildFilterPanel(config: FilterPanelConfig): string` — devuelve HTML del panel
  - [ ] `initFilterPanel(panelEl: HTMLElement, onFilter: (p: URLSearchParams) => void): void`
    - Listeners en todos los inputs → debounce 300ms → llama `onFilter`
    - Lee `URLSearchParams` actuales al inicializar y preselecciona valores
  - [ ] `resetFilters(panelEl: HTMLElement): void` — resetea todos los inputs

---

## FASE 8 — Frontend: Vistas de Categoría

- [ ] Crear `src/frontend/views/AvatarsView.ts`
  - [ ] Layout `.category-layout`
  - [ ] Panel: grupos `avatar_type`, `gender`, `body_size`, `platform`, `sdk_version`
  - [ ] Panel: toggles `is_nsfw`, `has_physbones`, `has_dps`, `has_face_tracking`
  - [ ] Panel: select `sort_by`
  - [ ] Counter `"X resultados"` sobre el grid
  - [ ] Grid de resource cards
  - [ ] Paginación con filtros sincronizados en URL
  - [ ] Estado vacío si no hay resultados
- [ ] Crear `src/frontend/views/AssetsView.ts`
  - [ ] Panel: `asset_type`, `platform`, `sdk_version`, toggles `is_nsfw`
  - [ ] Mismo layout, counter y paginación
- [ ] Crear `src/frontend/views/ClothesView.ts`
  - [ ] Panel: `gender_fit`, `clothing_type`, `platform`, toggles `is_nsfw`, `is_base`
  - [ ] Si `is_base` activo: campo autocomplete de avatar base
  - [ ] Mismo layout, counter y paginación
- [ ] Registrar en `src/frontend/app.ts`
  - [ ] `route('/avatars', avatarsView, { after: avatarsAfter })`
  - [ ] `route('/assets', assetsView, { after: assetsAfter })`
  - [ ] `route('/clothes', clothesView, { after: clothesAfter })`

---

## FASE 8B — Frontend: HistoryView Extendido

- [ ] Modificar `src/frontend/views/HistoryView.ts`
  - [ ] Mantener renderizado actual de `content_edit` y `approval` sin cambios
  - [ ] Añadir rama para `change_type === 'meta_edit'`:
    - [ ] Parsear `previous_data` como `MetaEditSnapshot`
    - [ ] Hacer fetch del estado actual del meta (`GET /api/avatars/:uuid`, `/api/assets/:uuid` o `/api/clothes/:uuid`) para obtener los valores actuales
    - [ ] Calcular diff: iterar `fields` del snapshot y comparar contra los valores actuales del recurso
    - [ ] Renderizar tabla con columnas: Campo / Antes / Después — solo filas donde el valor cambió
    - [ ] Caso especial: si `author_uuid` cambió de `null` a un UUID, mostrar `"Autor vinculado: [nombre]"` en lugar del UUID crudo
    - [ ] Si todos los campos del snapshot son iguales al actual (edit sin cambio real), mostrar `"Sin cambios detectados"`
  - [ ] Añadir estilos inline o clases CSS para resaltar la columna "Antes" (texto tachado o color diferente) vs "Después"

---

## FASE 9 — Frontend: Vista de Autor

- [ ] Crear `src/frontend/views/AuthorView.ts`
  - [ ] Fetch `GET /api/authors/:slug`
  - [ ] 404 si slug no existe
  - [ ] Header: imagen, nombre, descripción
  - [ ] Sección de redes (solo renderiza links no-null)
  - [ ] Grid de avatares del autor (`GET /api/avatars?author_uuid=X`)
  - [ ] Paginación del grid
- [ ] Registrar en `src/frontend/app.ts`
  - [ ] `route('/authors/:slug', authorView, { after: authorAfter })`

---

## FASE 10 — Frontend: Admin Dashboard

- [ ] Rediseñar `src/frontend/views/AdminView.ts`
  - [ ] Guard de viewport: si `< 1024px` mostrar `.admin-desktop-only-warning`
  - [ ] Layout `.admin-layout`
  - [ ] Sidebar con 7 ítems + badge numérico en "Pendientes"
  - [ ] Navegación JS entre secciones (show/hide + estado activo)
  - [ ] **Sección Overview:** stat cards + tablas de últimas actividades
  - [ ] **Sección Pendientes:** grid de recursos pendientes, botones Aprobar/Rechazar
  - [ ] **Sección Recursos:** tabla paginada con búsqueda y filtros, acciones por fila
  - [ ] **Sección Autores:** tabla + formulario CRUD + herramienta de vinculación por `author_name_raw`
  - [ ] **Sección Usuarios:** tabla paginada, toggle admin, limpiar caché por fila
  - [ ] **Sección Almacenamiento:** stats + lista de huérfanos + botón limpiar
  - [ ] **Sección Caché:** input username + botón limpiar caché

---

## FASE 11 — Frontend: Formulario de Upload

- [ ] Modificar `src/frontend/views/UploadView.ts`
  - [ ] Eliminar opción `worlds` del `<select>` de categoría
  - [ ] Eliminar bloque `#avatar-fields` actual (Platform/SDK/Version/blend/poiyomi/vrcfury)
  - [ ] Eliminar concatenación de metadatos en `description` (línea 432)
  - [ ] Añadir bloque `#avatar-meta-fields` con todos los campos del §6.4
  - [ ] Añadir bloque `#asset-meta-fields`
  - [ ] Añadir bloque `#clothes-meta-fields`
  - [ ] Validación en cliente: submit bloqueado si campos obligatorios vacíos
  - [ ] POST al endpoint correcto según categoría (`/api/avatars`, `/api/assets`, `/api/clothes`)

---

## FASE 12 — i18n

- [ ] Ejecutar `npm run i18n-manager CHECK JSON` — obtener claves faltantes
- [ ] Crear `i18n-fill.json` con todas las traducciones nuevas (ver §6 para las claves)
  - [ ] Claves de filtros de avatares: `filters.gender.*`, `filters.body_size.*`, `filters.avatar_type.*`, `filters.platform.*`, `filters.sdk.*`, `filters.nsfw`, `filters.physbones`, `filters.dps`, `filters.face_tracking`, `filters.gogoloco`, `filters.toggles`, `filters.quest_optimized`
  - [ ] Claves de filtros de assets: `filters.asset_type.*`, `filters.erp`, `filters.funny`, `filters.free`, `filters.unity_version.*`
  - [ ] Claves de filtros de ropa: `filters.gender_fit.*`, `filters.clothing_type.*`, `filters.is_base`, `filters.physbones`
  - [ ] Claves de UI del panel: `filters.title`, `filters.clear`, `filters.results_count`, `filters.sort_by`, `filters.sort_by.recent`, `filters.sort_by.popular`, `filters.sort_by.az`
  - [ ] Claves de página de autor: `authors.resources`, `authors.no_resources`, `authors.socials`
  - [ ] Claves del admin: secciones del sidebar (`admin.section.*`), formularios de autores, tablas
- [ ] Ejecutar `npm run i18n-manager FILL ./i18n-fill.json`
- [ ] Ejecutar `npm run i18n-manager CHECK` — verificar `✔ All keys present in all locales.`

---

## FASE 13 — QA y Verificación

- [ ] Aplicar migraciones localmente: `wrangler d1 migrations apply DB --local`
- [ ] Verificar que `GET /api/resources` (ruta genérica) responde igual que antes
- [ ] Probar `GET /api/avatars` sin filtros, con un filtro, con múltiples filtros combinados
- [ ] Probar `GET /api/assets` y `GET /api/clothes` con sus filtros
- [ ] Probar `GET /api/authors/search?q=` con 0, 1 y múltiples resultados
- [ ] Probar `GET /api/authors/:slug` — slug válido y slug inexistente (debe 404)
- [ ] Subir un nuevo avatar vía `/upload` — verificar que `avatar_meta` se crea correctamente
- [ ] Verificar que submit del upload está bloqueado sin metadatos obligatorios
- [ ] Verificar sincronización de filtros con URL (aplicar filtros → copiar URL → abrir → mismos filtros)
- [ ] Verificar "Limpiar filtros" resetea URL y resultados
- [ ] Verificar mobile (< 768px): panel oculto, grid 100% ancho
- [ ] Admin Dashboard: las 7 secciones cargan sin errores
- [ ] Admin Dashboard: CRUD completo de autores (crear, editar, eliminar, vincular)
- [ ] Admin Dashboard: aprobar/rechazar recurso (flujo preservado)
- [ ] Admin Dashboard: toggle de rol admin en Usuarios
- [ ] Admin Dashboard: limpieza de huérfanos y caché funcionan
- [ ] Admin Dashboard: aviso "solo escritorio" en viewport < 1024px
- [ ] **Historial:** editar metadatos de un avatar desde admin → verificar que aparece entrada `meta_edit` en `/resource/:uuid/history`
- [ ] **Historial:** verificar que el diff muestra solo los campos que cambiaron
- [ ] **Historial:** vincular un autor a un avatar → verificar entrada `meta_edit` con `author_uuid` en historial
- [ ] **Historial:** publicar un avatar nuevo → verificar que **no** se genera ninguna entrada de historial
- [ ] **Historial:** verificar que las entradas `content_edit` y `approval` siguen renderizando correctamente (sin regresiones)
- [ ] Ejecutar `npx prettier --check .` — sin diferencias de formato
