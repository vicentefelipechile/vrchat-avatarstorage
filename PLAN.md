# VRCStorage i18n Remediation Plan — PLAN.md

> **Scope:** full audit + cleanup + reordering + fragmentation of the frontend
> internationalization system (`public/i18n/`, `src/frontend/core/i18n.ts`,
> `src/tools/i18n-manager.mjs`).
> **Status:** plan approved by the maintainer. Execution order is strictly
> sequential: **Phase 1 (cleanup) → Phase 2 (reorder) → Phase 3 (split)**.
> Decisions already taken: fragment layout **A** (`{locale}/{section}.json`),
> cleanup **before** splitting, generated monolits stay **committed**.
> No code has been changed yet; this document is the single source of truth
> for the work ahead.

---

## Table of Contents

1. [Background & Motivation](#1-background--motivation)
2. [Current State Inventory](#2-current-state-inventory)
3. [Audit Findings](#3-audit-findings)
4. [Target State](#4-target-state)
5. [Phase 1 — Cleanup](#5-phase-1--cleanup)
6. [Phase 2 — Reordering](#6-phase-2--reordering)
7. [Phase 3 — Fragmentation](#7-phase-3--fragmentation)
8. [Tooling Changes](#8-tooling-changes)
9. [Verification Matrix](#9-verification-matrix)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Out of Scope](#11-out-of-scope)
12. [Execution Checklist](#12-execution-checklist)

---

## 1. Background & Motivation

The i18n system consists of 12 monolithic locale files (`public/i18n/*.json`,
one per supported locale: `cn, de, en, es, fr, it, jp, nl, pl, pt, ru, tr`),
statically imported by `src/frontend/core/i18n.ts` and bundled into
`public/js/bundle.js` by esbuild (IIFE, no code splitting). Keys are resolved
at runtime with `t('section.key')`, falling back to English and then to the
raw path string.

Three problems accumulated over time:

1. **Dead keys.** Refactored views left behind keys that no code references
   (e.g. a whole legacy `avatar.*` section, superseded `category.*` keys,
   stale `upload.*` keys from a rewritten upload flow).
2. **A silently desynchronized reference locale.** `en.json` is the documented
   reference, but ~100 keys used by the code exist only in `es.json` (the most
   complete locale). English-speaking users see raw paths such as
   `admin.nav.overview`. The `CHECK` command cannot see this because it only
   compares in the EN→others direction.
3. **Monolith fragility.** A single malformed edit (a missing comma, a bad
   merge conflict resolution) invalidates a whole language. Diffs are large,
   reviews are hard, and two translators working on the same file collide.

This plan fixes all three, in an order chosen so that errors are never
migrated from one representation to another.

---

## 2. Current State Inventory

All figures below were measured mechanically (exhaustive scan of every
`src/frontend/**/*.ts` file plus `data-i18n` attributes in
`public/index.html`), not estimated.

### 2.1 Locale files

| Fact | Value |
|---|---|
| Reference file | `public/i18n/en.json` |
| Total keys in `en.json` | **701** |
| Top-level sections in `en.json` | **30** |
| Supported locales | `cn, de, en, es, fr, it, jp, nl, pl, pt, ru, tr` (12) |
| File format | Plain JSON (`{ "key": "value" }`), tabs, **not** ES modules |
| Loader | `src/frontend/core/i18n.ts` — 12 static JSON imports, bundled by esbuild |
| Manager CLI | `src/tools/i18n-manager.mjs` — `ADD / FILL / LIST / CHECK` |
| Runtime API | `t(path)`, `setLanguage(lang)`, `getCurrentLang()` — `t()` is **synchronous** and used at ~640 call sites; it must stay synchronous |
| Other consumers of `public/i18n/*.json` | **None.** Verified: only `i18n.ts` (at build time) and `i18n-manager.mjs` read these files |

### 2.2 Per-section key counts (`en.json`)

| Section | Keys | Section | Keys |
|---|---|---|---|
| `common` | 15 | `upload` | 49 (+`val` nested) |
| `nav` | 14 | `cats` | 6 (+`desc` nested) |
| `settings` | 81 | `wiki` | 27 (all nested) |
| `home` | 3 | `dmca` | 8 (`simple`, `advanced`, `info` nested) |
| `card` | 1 | `blog` | 27 |
| `avatar` | 11 | `meta` | 14 groups nested |
| `category` | 5 | `sort` | 3 |
| `pagination` | 8 | `filterPanel` | 17 |
| `admin` | 24 | `autorProfile` (typo) | 4 |
| `item` | 70 (+`md` nested) | `favorites` | 12 |
| `edit` | 31 | `collections` | 7 |
| `history` | 7 (`field`, `types`, `meta` nested) | `updates` | 6 |
| `login` | 18 | `notifications` | 25 |
| `oauthRegister` | 8 | `confirm` | 3 |
| `register` | 8 | `chat` | 13 |

### 2.3 Key reference mechanisms (all must be honored by any analysis)

Keys reach `t()` through more channels than the obvious `t('a.b')` literal,
and every audit query must account for all of them:

1. **Direct literals** — `t('admin.title')` (~640 occurrences).
2. **String-key passing** — `titleKey: 'filterPanel.titleAssets'`,
   `label: 'wiki.poiyomi.title'`, resolved via `t(key)` later. A naive
   `t('…')`-only scan falsely reports `wiki.*` and `filterPanel.*` as dead.
3. **`data-i18n` attributes** — `public/index.html` (`nav.avatars`,
   `nav.assets`, `nav.clothes`, `nav.wiki`, `nav.blog`, `nav.menu`,
   `nav.upload`, `nav.favorites`, `nav.admin`, `nav.settings`, `nav.login`,
   `settings.logout`), applied by `updateNavDOM()` in `app.ts`.
4. **Dynamic construction** — families that can never be enumerated
   statically and must be preserved wholesale:
   - `meta.*` via `metaLabel(namespace, value)` and
     `` t(`meta.${groupNs(g)}.title`) ``
   - `updates.*` via `SCOPE_LABELS` map
   - `cats.*` via `t('cats.' + category)` / `t('cats.desc.' + category)`
   - `history.types.*` via `` t(`history.types.${entry.change_type}`) ``
   - `item.exp*` via `SHARE_EXPIRY_KEYS` index lookup
   - `settings.sharesState_*` via template suffix

---

## 3. Audit Findings

### 3.1 Critical: `en.json` is desynchronized (false-green CHECK)

**~102 keys referenced by the code do not exist in `en.json`.** They exist in
`es.json` (95 keys present in ES but missing in EN). Consequences:

- `npm run i18n-manager CHECK` reports `✔ All keys present in all locales`
  while English users see raw paths across the entire admin panel. **The
  CHECK is blind by design**: it iterates over EN paths and reports which
  *other* locales lack them; it never detects keys that other locales have
  and EN lacks.
- Missing-in-EN keys by group: `admin.nav.*` (6), `admin.overview.*` (8),
  `admin.stats.*` (8), `admin.resources.*` (12), `admin.users.*` (10),
  `admin.authors.*` (28), `admin.cache.*` (4), `admin.media.*` (11),
  `authorProfile.*` (4), plus `common.loadError`, `edit.moveUp`,
  `edit.moveDown`, `edit.reorderError`, `history.meta.noChanges`,
  `history.meta.noFields`, `settings.no_password_hint`, `upload.validating`.
  (A handful of raw scan hits such as `g.label`, `itch.io`, `this.cache` are
  regex noise from non-i18n string literals and are excluded.)

### 3.2 Bug: `autorProfile` vs `authorProfile` typo

All 12 locale files define `autorProfile.*` (missing the `h`), while
`src/frontend/views/AuthorView.ts` (lines 107–162) reads `authorProfile.*`.
**The author page shows raw paths in every language.** Fix = rename the
section in all 12 files **and** fix nothing in code (the code is already
correct).

### 3.3 Bug: mis-nested admin keys

The code reads flat keys `admin.desktopWarningTitle`,
`admin.desktopWarningDesc`, `admin.statsError` (`AdminView.ts`), but
`es.json` nests them under `admin.nav.*`. They resolve in **no** locale,
including Spanish. Fix = move them to the flat `admin.*` level in every
locale (with correct translations taken from the nested ES values).

### 3.4 Dead keys: 89 confirmed

A key is declared dead only if it appears in **none** of: `t('…')` literals
(with word boundary), quoted key-passing strings, `data-i18n` attributes, or
the dynamic families of §2.3 — searched across all of `src/frontend` and
`index.html`, plus a repo-wide confirmation grep. The backend never calls
`t()` (frontend-only by architecture).

| Group | Keys | Root cause |
|---|---|---|
| `avatar.*` — **entire section, 11 keys** | `options, platform, sdk, version, blend, poiyomi, vrcfury, pcOnly, quest, pcQuest, default` | Legacy view; superseded by `meta.*` via `metaLabel()` |
| Flat `admin.*` — 20 keys | `cleanupOrphaned, cleanupConfirm, cleaning, cleanupSuccess, noPending, orphanedFiles, orphanedFilesFound, orphanedFilesDesc, viewFileList, noOrphanedFiles, noOrphanedFilesDesc, pendingResources, cacheClear, clearCacheBtn, cacheClearSuccess, cacheClearError, usernamePlaceholder, totalMedia, totalResources, error` | Superseded by `admin.media.*`, `admin.stats.*`, `admin.users.*` |
| `category.*` — 4 keys | `of, prev, next, resources` | Superseded by `pagination.*` (`CategoryView` already uses them); `category.showing` **stays** |
| `upload.*` — 11 keys | `file, success, validFile, invalidFile, maxFiles, errorMaxFiles, errorFileUpload, errorThumbnailUpload, errorReferenceUpload, errorUnknown, errorImageDimensions` | Upload flow rewritten; generic `upload.error*` keys cover current usage |
| `item.*` — 10 keys | `description, downloadMain, downloadPrimary, postComment, deleting, md.tabWrite, md.tabPreview, md.previewEmpty, driveSending, saveToDriveHint` | Views now use `upload.*`/`blog.*` equivalents or no longer render these slots |
| Scattered remainder (~33) | `common.loadingResources, common.loadingCleanup, common.loadingPending, common.moveToTop, nav.worlds, nav.others, blog.by, blog.readMore, blog.publishedOn, blog.preview, blog.write, login.hint, login.logout, login.2fa_hint, edit.addFileHeader, edit.addFileDesc, edit.linkType, edit.backupLinksLabel, edit.backupLinksHint, dmca.simple.resourceUrl, oauthRegister.errorInvalid, register.loginLink, settings.2fa_success, settings.2fa_enter_password, settings.2fa_view_backup, settings.driveNoFolders, favorites.uncategorized, favorites.maxReached, collections.maxReached, chat.rateLimited, chat.tooLong, chat.invalid` | Remnants of previous views; `nav.worlds`/`nav.others` died when the nav was simplified (only `avatars/assets/clothes/wiki/blog` remain in `index.html`) |
| Explicitly **not** dead | `wiki.*.title`, `wiki.categories.*`, `filterPanel.title*/no*/count*`, all of `cats.*`, `meta.*`, `updates.*`, `history.types.*`, `item.exp*`, `settings.sharesState_*` | Used via string-key passing or dynamic construction (§2.3) |

Additional hygiene finding (not a key issue): `BlogCreateView.ts` and
`UploadView.ts` contain **hardcoded untranslatable strings** rendered directly
(`'Subiendo imagen…', 'Imagen subida correctamente', 'File too large. Max:…'`,
`'Invalid dimensions'`, `'Error: …'`, `'Failed to change password'`, etc.).
These bypass `t()` entirely and should be converted to keys during Phase 1.

### 3.5 Duplicate values: 46 groups

Most identical values are legitimate (same word, different context — they
*will* diverge across languages). Classification:

**Safe to merge (~15 groups).** Canonical survivor first:

- `common.error` ← `admin.error`, `upload.error`
- `common.cancel` ← `settings.2fa_cancel`, `confirm.cancel`
- `login.username` ← `admin.usernamePlaceholder`
- `settings.password_mismatch` ↔ `register.passwordMismatch` (keep settings)
- `settings.2fa_enabled_success` ← `settings.2fa_success`
- `admin.delete` ↔ `edit.linkDelete` (keep `admin.delete`)
- `item.saveToDriveHint` (`"Google Drive"`) → **remove the key**; brand names
  are never localized, inline the literal
- `item.comments` ↔ `blog.comments`, `item.noComments` ↔ `blog.noComments`,
  `item.commentPlaceholder` ↔ `blog.commentPlaceholder`,
  `item.loginToComment` ↔ `blog.loginToComment` → unify under a new
  `comment.*` section (requires small edits in `ItemView.ts` + `BlogPostView.ts`)
- `settings.logout` ↔ `login.logout` (keep `settings.logout`; `index.html`
  and the login view both reference it)

**Keep separate (~31 groups).** Rationale recorded so future cleanups do not
re-litigate: `nav.*` vs `cats.*` vs `notifications.category_*` (nav label vs
badge vs notification context differ per language); `Title`, `Type`,
`Category`, `Description`, `Preview`, `Write`, `Page`, `of`, `Previous`,
`Next`, `Confirm`, `Other`, `Kemono`, `PhysBones`, `GoGo Loco` (noun vs verb
vs table-header vs taxonomy-bound proper noun — merging risks breaking
gender/case/capitalization in some locales).

**Self-resolving:** `avatar.*` vs `meta.platform.*` duplicates (`Platform`,
`SDK`, `PC Only`) disappear when the dead `avatar.*` section is deleted.

### 3.6 Ordering & naming

- Top-level section order is **historical/chronological**, not alphabetical
  and not layered:
  `common, nav, settings, home, card, avatar, category, pagination, admin,
  item, edit, history, login, oauthRegister, register, upload, cats, wiki,
  dmca, blog, meta, sort, filterPanel, autorProfile, favorites, collections,
  updates, notifications, confirm, chat`.
- Leaf keys inside sections are unsorted (only `card` and `wiki` happen to
  be alphabetical).
- `es.json` carries divergent nesting (`admin.nav.desktopWarning*`,
  `admin.nav.statsError`, `admin.nav.loading`) absent from EN — a symptom of
  edits landing in one locale without propagating the structure.
- ~70–80 values identical to EN in `es/de/fr` were sampled; they are
  overwhelmingly legitimate cognates and brand names (`SDK`, `Assets`,
  `Google Drive`), **not** forbidden English placeholders. No mass violation;
  review case-by-case only (e.g. `settings.section_drive`).

---

## 4. Target State

### 4.1 Section layout (layered, not alphabetical on top)

The top level reads as the application map: **global → discovery →
resource → identity → content**. Alphabetical leaf keys inside every section
(nested groups sorted too, sub-groups last).

```
 1  common            11  sort              21  register
 2  nav               12  filterPanel       22  oauthRegister
 3  pagination        13  favorites         23  settings
 4  confirm           14  collections       24  admin
 5  notifications     15  item              25  chat
 6  updates           16  edit              26  blog
 7  home              17  history           27  wiki
 8  cats              18  upload            28  dmca
 9  category          19  meta
10  card              20  authorProfile (renamed)
```

29 sections: `avatar` deleted, `autorProfile` renamed. `category` retains its
single live key (`showing`) with **zero** code changes for now; folding it
into `filterPanel.showing` (+1 edit in `CategoryView.ts:117`) is deferred to
the day that legacy view migrates to the `filtered-list` factory.

### 4.2 Fragmented file layout (option A, approved)

```
public/i18n/_src/{locale}/{section}.json      ← SOURCE OF TRUTH (hand-edited)
        │  npm run i18n:build
        ▼
public/i18n/{locale}.json                     ← GENERATED, but COMMITTED
        │  esbuild (unchanged) + i18n-manager (adapted)
        ▼
public/js/bundle.js
```

Example: `public/i18n/_src/es/admin.json`, `public/i18n/_src/en/meta.json`.
≈29 files × 12 locales ≈ 350 small files. A corrupt edit breaks **one
section of one language**; diffs are small; translators collide rarely.

The generated monolits stay **committed** (maintainer decision): a fresh
clone works with no extra step, and deterministic generator output keeps
regeneration diffs minimal. The price — a 12-file diff per key change — is
accepted. Rule: monolits are never hand-edited; any manual edit is
overwritten by the next build.

### 4.3 Conventions to record in `AGENTS.md` (i18n section)

- Source of truth is `public/i18n/_src/`; `public/i18n/*.json` are artifacts.
- Top-level sections follow the layered order (§4.1); leaf keys alphabetical.
- `CHECK` enforces: bidirectional sync, no unreferenced keys, section order,
  monolit↔fragment consistency.

---

## 5. Phase 1 — Cleanup

**Goal:** `en.json` becomes a true, complete reference again; all dead weight
removed; both known bugs fixed. All work happens on the current monolithic
files. **No structural migration yet.**

### 5.1 Add the ~102 missing keys to `en.json`

- Source translations from `es.json` (the most complete locale), translating
  ES→EN (do not copy Spanish text into `en.json`).
- Groups: full `admin.nav/overview/stats/resources/users/authors/cache/media`
  subtrees, `authorProfile.*` (4), `common.loadError`, `edit.moveUp/moveDown/
  reorderError`, `history.meta.noChanges/noFields`,
  `settings.no_password_hint`, `upload.validating`.
- Then propagate any still-missing keys to the remaining 10 locales via
  `FILL` (proper translations per locale, never English copy-paste, per the
  AGENTS.md i18n rule).

### 5.2 Delete the 89 dead keys in all 12 locales

- Exact list in §3.4. Delete mechanically (script-assisted, human-reviewed).
- `avatar.*` section disappears entirely; `category.*` shrinks to `showing`.

### 5.3 Fix the two bugs

1. Rename `autorProfile` → `authorProfile` in all 12 files (code already
   correct — no `.ts` change needed, but verify with a repo-wide search).
2. Move `desktopWarningTitle/Desc` and `statsError` from `admin.nav.*` to
   flat `admin.*` in every locale, preserving the Spanish copy as the
   translation source.

### 5.4 Merge the ~15 safe duplicate groups

- Canonical survivors listed in §3.5. Each merge = pick survivor, rewrite the
  ~2–6 call sites to the survivor key, delete the losers in all 12 locales.
- `comment.*` unification touches `ItemView.ts` and `BlogPostView.ts` comment
  blocks — keep the diff tight, no behavior change.
- `item.saveToDriveHint` → inline `"Google Drive"` literal, delete key.
- Leave the ~31 context-sensitive groups untouched.

### 5.5 Convert hardcoded strings to keys

- `BlogCreateView.ts` (image-upload toasts), `UploadView.ts` (size/dimension
  errors), plus the `data.error ?? '…'` English fallbacks in `SettingsView.ts`
  and `WikiView.ts`: introduce keys (suggested `upload.toast.*`,
  `settings.toast.*`, `wiki.toast.*`) in EN + all locales, replace literals.
- This is the only Phase 1 step that adds *new* keys; it prevents the next
  audit from going stale on day one.

### 5.6 Phase 1 verification

- `npm run i18n-manager CHECK` → green.
- `npx tsc -p tsconfig.json --noEmit` → clean.
- `npx tsc -p tsconfig.frontend.json --noEmit` → clean.
- `npm run build-frontend` → succeeds.
- Spot-check in English: admin panel, author page, upload flow — no raw paths.
- `npx prettier --check src/` (only if any `.ts` was touched, e.g. `comment.*`
  unification).

---

## 6. Phase 2 — Reordering

**Goal:** apply the §4.1 layout and alphabetical leaves. Pure permutation —
**zero** key additions, deletions, or renames (those belong to Phase 1), so
the diff is reviewable as ordering-only.

### 6.1 Steps

1. Reorder top-level sections in `en.json` to the §4.1 sequence.
2. Sort leaf keys alphabetically within every section (nested groups sorted
   recursively, sub-group objects last).
3. Replicate the exact order to the other 11 locales (mechanical, scripted).
4. Add the ordering convention to `AGENTS.md` (one line in the i18n section).

### 6.2 Phase 2 verification

- Structural diff of key *sets* before/after → empty (only order changed).
- `npm run i18n-manager CHECK` → green.
- Rebuild frontend; bundle must be functionally identical (key order inside
  JSON does not affect the shipped behavior, but rebuild to be sure).

### 6.3 Deferred to later (explicitly not here)

- Nesting `sort.*` under `filterPanel.sort.*` (touches `filter-panel.ts`,
  `filtered-list.ts`, three view configs).
- Folding `category.showing` into `filterPanel.showing` (touches
  `CategoryView.ts:117`).
- Any further section renames.

---

## 7. Phase 3 — Fragmentation

**Goal:** split the cleaned, ordered monolits into per-section fragments with
a deterministic generator. Prerequisite: Phases 1+2 complete — **never
migrate dead keys, typos, or unordered content into 350 files.**

### 7.1 One-shot splitter

- New disposable script `src/tools/split-i18n.mjs`: reads each
  `public/i18n/{locale}.json`, writes
  `public/i18n/_src/{locale}/{section}.json` (one file per top-level
  section, pretty-printed with tabs, trailing newline — byte-stable).
- Commit the split **alone** (content identical, only relocated) to preserve
  `git blame` reviewability.

### 7.2 Permanent generator

- New script `src/tools/build-i18n.mjs` behind `npm run i18n:build`:
  reads `_src/`, emits the 12 monolits deterministically (layered section
  order, alphabetical leaves) **plus** a self-check.
- Round-trip acceptance: `build(split(x)) == x` byte-for-byte on the first
  run.
- Wire-up in `package.json`: `i18n:build` runs before `build-frontend`,
  `build-frontend:dev`, `dev`, and `deploy`. (Committed monolits mean a
  missing regeneration is a stale artifact, not a broken build — but CI
  must catch it; see §9.)
- Document in `AGENTS.md`: `_src/` is the source of truth; monolits are
  regenerated artifacts, never hand-edited.

### 7.3 Dev-watch note

esbuild `--watch` observes the imported monolits, not the fragments. After
editing a fragment during `npm run dev`, re-run `npm run i18n:build`
(manually or via a tiny `i18n:watch` helper) to refresh. This must be written
into `AGENTS.md` troubleshooting, next to the existing "Bundle not updating"
entry.

### 7.4 Phase 3 verification

- Round-trip byte-identity on first generation.
- Full verification matrix (§9).
- Bundle before/after comparison: functionally identical.

---

## 8. Tooling Changes

`src/tools/i18n-manager.mjs` must be adapted in Phase 3 (it is the only other
reader of the locale files besides the build):

| Subcommand | Current behavior | New behavior |
|---|---|---|
| `ADD` | Writes `section.key` into `{locale}.json` | Resolves section = first path segment, writes into `_src/{locale}/{section}.json` (creates the file if a new section is born) |
| `FILL` | Batch-write into `{locale}.json` | Same routing per key; unchanged JSON envelope |
| `LIST` | Reads `{locale}.json` | Reads the fragment (falls back to merged view when no locale filter is given) |
| `CHECK` | EN-paths × other-locales (one-directional) | **Bidirectional**: missing-in-others *and* present-elsewhere-but-missing-in-EN; **unreferenced-key scan** (all `t()` channels from §2.3); **order check** (layered sections, alphabetical leaves); **consistency check** (regenerate monolits in memory, fail on divergence) |

No changes to `src/frontend/core/i18n.ts`, the esbuild config, or the `t()`
call sites — the fragmentation is build-time only, which is what keeps the
bundle IIFE-compatible and `t()` synchronous.

---

## 9. Verification Matrix

Run after **every** phase; all rows must be green before the next phase starts.

| Check | Command / action | Expected |
|---|---|---|
| i18n sync (extended) | `npm run i18n-manager CHECK` | `✔ All keys present`, no unreferenced, order OK, monolits consistent |
| Backend types | `npx tsc -p tsconfig.json --noEmit` | Clean |
| Frontend types | `npx tsc -p tsconfig.frontend.json --noEmit` | Clean |
| Frontend bundle | `npm run build-frontend` | Succeeds |
| Formatting | `npx prettier --check src/` | Clean (whenever `.ts` changed) |
| Runtime spot-check (EN) | Open admin panel, author page, upload flow, blog post comments | No raw `section.key` paths visible |
| Runtime spot-check (ES) | Same tour in Spanish | Identical coverage, correct language |
| Phase 2 structural diff | Compare key *sets* before/after reorder | Empty (order-only change) |
| Phase 3 round-trip | `build(split(x))` vs `x` | Byte-identical |
| CI (new) | Regenerate monolits, `git diff --exit-code -- public/i18n/*.json` | Empty (catches hand-edits and forgotten regenerations) |

There is no test suite in this repository (see AGENTS.md “Testing”); the
build **is** the check. Never claim anything is “tested” — report exactly
which rows of this matrix were run.

---

## 10. Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Cleaning and splitting in one diff → unreviewable change | Strict phase order with verification gates; split commit is content-identical |
| 2 | Deleting a key that is actually referenced dynamically | Dead list derived from all four reference channels (§2.3) + repo-wide grep + runtime spot-checks in two languages |
| 3 | Merging duplicates breaks gender/case in some locale | Conservative merge list (§3.5); context-sensitive groups explicitly preserved with rationale |
| 4 | Manual edits to committed monolits diverge from `_src/` | CI consistency check (§9); AGENTS.md rule; generator overwrites unconditionally |
| 5 | `git blame` history readability after split | Content-identical split commit; `git log --follow` still traverses renames per file |
| 6 | ~350 files clutter the explorer | `_src/` prefix keeps them collapsed; accepted as the price of minimal blast radius |
| 7 | Fresh-clone / CI builds with stale monolits | Generator wired into all build scripts; CI fails on divergence |
| 8 | English placeholders sneaking into other locales during FILL | AGENTS.md forbids it; CHECK reports identical-to-EN values above a length threshold for human review (short cognates/brand names exempt) |

---

## 11. Out of Scope

- **Per-language lazy loading.** Would require moving the bundle from IIFE to
  ESM with code splitting and making boot async (`t()` is sync at ~640 call
  sites). Revisit only if bundle weight ever justifies it. Today all 12
  locales ship inside the bundle either way, so fragmentation changes
  maintainability, not payload.
- **`sort.*` / `category.showing` nesting**, further renames, new features.
- **Wiki content translation** (`public/wiki/`) — separate system, untouched.
- **The hardcoded-string cleanup beyond §5.5** — convert opportunistically,
  not exhaustively, to bound the diff.

---

## 12. Execution Checklist

- [ ] **Phase 1.1** — Add ~102 missing keys to `en.json` (translate from ES)
- [ ] **Phase 1.2** — FILL remaining gaps in the other 10 locales (real translations only)
- [ ] **Phase 1.3** — Delete the 89 dead keys in all 12 locales (list in §3.4)
- [ ] **Phase 1.4** — Fix `autorProfile` → `authorProfile` (12 files)
- [ ] **Phase 1.5** — Move `desktopWarning*`/`statsError` to flat `admin.*` (12 files)
- [ ] **Phase 1.6** — Merge the ~15 safe duplicate groups + `comment.*` unification (+ `ItemView.ts`, `BlogPostView.ts` edits)
- [ ] **Phase 1.7** — Convert hardcoded strings to keys (§5.5)
- [ ] **Phase 1 gate** — full verification matrix (§9), EN+ES runtime tour
- [ ] **Phase 2.1** — Apply §4.1 section order to `en.json`
- [ ] **Phase 2.2** — Alphabetical leaves everywhere, replicate order to 11 locales
- [ ] **Phase 2.3** — AGENTS.md one-liner on ordering convention
- [ ] **Phase 2 gate** — key-set diff empty + verification matrix
- [ ] **Phase 3.1** — Write + run one-shot `split-i18n.mjs`, commit split alone
- [ ] **Phase 3.2** — Write permanent `build-i18n.mjs` + `npm run i18n:build`, round-trip byte-identity
- [ ] **Phase 3.3** — Adapt `i18n-manager` (ADD/FILL/LIST/CHECK per §8)
- [ ] **Phase 3.4** — Wire `i18n:build` into `build-frontend`, `dev`, `deploy`; add CI consistency check
- [ ] **Phase 3.5** — AGENTS.md updates (source of truth, artifacts rule, dev-watch troubleshooting note)
- [ ] **Phase 3 gate** — full verification matrix + bundle equivalence + EN+ES runtime tour
