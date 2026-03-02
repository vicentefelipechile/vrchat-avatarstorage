---
name: VRCStorage Wiki Documentation
description: Guidelines for researching, writing, and translating wiki articles for VRCStorage. Covers the full workflow from research to multilingual publishing.
---

# VRCStorage Wiki Documentation

> [!IMPORTANT]
> This skill defines a workflow with BLOCKING steps. Each step depends on the previous one being completed. NEVER skip steps. NEVER translate without explicit user confirmation.

---

## 0. Project Languages

| Code | Language | Folder |
|------|----------|--------|
| `es` | Spanish | `public/wiki/es/` |
| `en` | English | `public/wiki/en/` |
| `pt` | Portuguese | `public/wiki/pt/` |
| `ru` | Russian | `public/wiki/ru/` |
| `ja` | Japanese | `public/wiki/ja/` |
| `zh` | Chinese | `public/wiki/zh/` |
| `fr` | French | `public/wiki/fr/` |

**Spanish is always the primary language.** Everything starts from the Spanish version.

---

## 1. Full Workflow — MANDATORY

```
NEW TOPIC
    │
    ▼
[STEP 1] Research on the internet
    │  Search for official sources, documentation, guides
    │
    ▼
[STEP 2] Write draft in SPANISH
    │  Use the correct template (see Section 3)
    │  Verify ALL links with WebFetch
    │  Format references in APA (see Section 4)
    │
    ▼
[STEP 3] ⛔ PAUSE — Show draft to user
    │  Exact message: "I've created the Spanish draft.
    │  Please review it and let me know if any changes are needed before continuing."
    │  WAIT for response. DO NOT continue without it.
    │
    ▼
[STEP 4] Did the user request changes?
    │  YES → Apply changes → go back to STEP 3
    │  NO  → Continue
    │
    ▼
[STEP 5] ⛔ PAUSE — Request explicit confirmation
    │  Exact message: "Do you confirm the Spanish content is correct
    │  and I can proceed to translate it to the other languages?"
    │  WAIT for "yes", "confirmed", "go ahead" or equivalent.
    │  If the user says something ambiguous → ask again.
    │  DO NOT interpret silence as confirmation.
    │
    ▼
[STEP 6] Translate to the other languages
    │  Order: en → pt → ru → ja → zh → fr
    │  Only the languages the user requests (or all if not specified)
    │
    ▼
[STEP 7] Update WikiView.js and i18n.js
    │
    ▼
COMPLETED ✓
```

> [!WARNING]
> **STEP 3 and STEP 5 are BLOCKING.** The agent MUST stop and wait for the user. Continuing without confirmation is a critical workflow error.

---

## 2. Research (Step 1)

Before writing a single line of content, search for:

1. **Official VRChat documentation**: `https://creators.vrchat.com/`
2. **VCC (VRChat Creator Companion)**: `https://vcc.docs.vrchat.com/`
3. **GitHub repositories** for the relevant tool/shader
4. **Download pages** (Booth, Gumroad, GitHub Releases)

For each source found:
- Verify with `WebFetch` that the URL loads correctly (not 404)
- Note: author, year or "n.d." if no date, title, platform, URL

> [!IMPORTANT]
> URLs that return 404 or an error CANNOT be used as references or links in the article.

---

## 3. Content Templates

Choose the template based on the type of article:

### 3.1 Step-by-Step Guide

Use when the article explains how to do something (installation, configuration, process).

```markdown
# Guide Title
Brief description of what this guide covers and who it's for.

> [!NOTE]
> Important introductory note if applicable.

## Requirements
* Requirement 1
* Requirement 2

## Step 1: Step Name
Clear description of the step. Include links if applicable.

## Step 2: Step Name
Description of the step.

> [!TIP]
> Useful tip related to this step.

## Step 3: Step Name
Description of the step.

> [!WARNING]
> Warning if this step can cause problems.

---

## References

* Author, A. (Year). *Resource Title*. Platform. URL
```

### 3.2 Reference Document

Use when the article describes concepts, parameters, or technical information.

```markdown
# Topic Title
General description of the topic in 2-3 sentences.

## Main Section
Section content.

### Subsection
More details if necessary.

> [!IMPORTANT]
> Critical information the user must know.

## Another Section
Content.

---

## References

* Author, A. (Year). *Resource Title*. Platform. URL
* Author, B. (n.d.). *Resource Title*. Platform. URL
```

### 3.3 FAQ

Use when the article answers frequently asked questions.

```markdown
# Frequently Asked Questions — Topic

## Question 1?
Complete answer to the question.

## Question 2?
Complete answer.

> [!TIP]
> Related tip.

## Question 3?
Complete answer.

---

## References

* Author, A. (Year). *Title*. Platform. URL
```

---

## 4. APA Reference Format — CRITICAL

### Base APA Format

```
Last Name, N. (Year). *Work Title*. Platform/Publisher Name. URL
```

If no date is known, use `(n.d.)` (no date).
If there is no individual author, use the organization name.

### CORRECT Examples ✓

```markdown
## References

* VRChat Inc. (n.d.). *VRChat Creator Companion*. VRChat. https://vcc.docs.vrchat.com/
* Poiyomi. (n.d.). *Poiyomi Toon Shader*. GitHub. https://github.com/poiyomi/PoiyomiToonShader
* Lyuma. (2023). *Av3Emulator - Avatar 3.0 Emulator*. GitHub. https://github.com/lyuma/Av3Emulator
* VRChat Inc. (2024). *Avatar SDK 3 Overview*. VRChat Creators. https://creators.vrchat.com/avatars/
```

### INCORRECT Examples ✗

```markdown
## References

[1] VRChat Inc. VRChat Creator Companion. https://vcc.docs.vrchat.com/    ← no year, no APA format, numbered

[2] https://github.com/poiyomi/PoiyomiToonShader                          ← URL only, no author or title

* Poiyomi Toon Shader - https://github.com/poiyomi/PoiyomiToonShader      ← free format, not APA
```

### APA Rules for This Project

| Situation | Format |
|-----------|--------|
| Organization as author | `VRChat Inc. (n.d.).` |
| Person as author | `Last Name, N. (Year).` or `Username. (Year).` |
| No date | `(n.d.)` — never leave blank |
| Resource title | Always in *italics* using `*asterisks*` |
| No clear publisher/platform | Omit that field |
| Long URL | Include it in full, do not shorten |

> [!WARNING]
> NEVER use `[1]`, `[2]` or numbering. ALWAYS use `*` for each reference. ALWAYS include the title in italics.

---

## 5. Formatting Elements

### Badges

Only use existing colors. Do not create new ones.

```html
<span class="badge badge-blue">Tool</span>
<span class="badge badge-purple">Shader</span>
```

### Alerts (Callouts)

```markdown
> [!NOTE]
> Additional useful information that is not critical.

> [!TIP]
> Practical tip that improves the experience.

> [!IMPORTANT]
> Information the user MUST read.

> [!WARNING]
> Warning about something that can go wrong.
```

### Internal Links

```markdown
[visible text](/wiki?topic=topic-slug)
```

Examples:
```markdown
[Installation guide](/wiki?topic=installation-guide)
[VCC](/wiki?topic=vcc-setup)
```

### External Links

```markdown
[visible text](https://full-url.com)
```

> [!IMPORTANT]
> All external links must be verified with WebFetch before including them.

---

## 6. Files to Create/Modify

When completing a new article, create or modify these files:

### 6.1 Markdown File per Language

```
public/wiki/es/[topic-slug].md   ← first
public/wiki/en/[topic-slug].md   ← after confirmation
public/wiki/pt/[topic-slug].md
public/wiki/ru/[topic-slug].md
public/wiki/ja/[topic-slug].md
public/wiki/zh/[topic-slug].md
public/wiki/fr/[topic-slug].md
```

### 6.2 WikiView.js

Add the topic to the topics array:

```javascript
// public/js/views/WikiView.js
{
    id: 'topic-slug',         // must match the .md filename exactly
    label: 'wiki.topicSlug.title'
}
```

### 6.3 i18n.js

Add the translated title for ALL project languages:

```javascript
// public/js/i18n.js
wiki: {
    topicSlug: {
        title: 'Title in that language'
    },
    // ... rest of existing topics
}
```

Do this for all 7 languages: `es`, `en`, `pt`, `ru`, `ja`, `zh`, `fr`.

---

## 7. Naming Conventions

| Element | Rule | Example |
|---------|------|---------|
| Topic slug | `kebab-case`, lowercase and hyphens only | `avatar-upload`, `vcc-setup` |
| File name | `[slug].md` | `avatar-upload.md` |
| Key in i18n.js | `camelCase` of the slug | `avatarUpload`, `vccSetup` |
| ID in WikiView.js | Same as slug | `avatar-upload` |

---

## 8. Final Checklist

Before marking the task as complete, verify EVERY point:

- [ ] Research done using official sources
- [ ] Spanish draft created with the correct template
- [ ] All external links verified with WebFetch (none return 404)
- [ ] References in APA format with `*` bullets and titles in italics
- [ ] No `[1]`, `[2]` numbering in references
- [ ] User reviewed the Spanish draft
- [ ] User explicitly confirmed with "yes", "confirmed" or equivalent
- [ ] Translations created AFTER confirmation
- [ ] `WikiView.js` updated with the new topic
- [ ] `i18n.js` updated with titles in all 7 languages
- [ ] No relative links (`./file.md`) — only `/wiki?topic=slug`

---

## 9. Anti-Patterns (DO NOT DO)

| Error | Why it's a problem | Fix |
|-------|-------------------|-----|
| Translating before confirmation | User may want changes — redoing 7 files is costly | Wait for explicit confirmation |
| Reference with `[1]`, `[2]` | Not APA, not the project format | Use `*` bullet per reference |
| Reference title without italics | Incorrect in APA | Wrap in `*asterisks*` |
| Unverified link | May be 404, looks bad | Verify with WebFetch |
| Continuing after user says "it's not right" | Obvious | Apply changes and show draft again |
| Interpreting silence as "yes" | User may not have seen the message | Ask again explicitly |
| Creating slug with spaces or uppercase | Breaks routing | Only `kebab-case` lowercase |
| Forgetting to update `i18n.js` | Title won't appear in wiki selector | Always update alongside `WikiView.js` |
