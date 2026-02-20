---
name: VRChat Wiki Documentation
description: Guidelines for writing, formatting, and verifying articles in the VRChat Avatar Storage wiki.
---

# VRChat Wiki Documentation

This skill establishes strict rules for creating and editing documents in the `vrchat-avatarstorage` project wiki.

## Document Structure and Format

1.  **Visual Metadata:**
    *   Use badges for categories: `<span class="badge badge-blue">Logic</span>`, `<span class="badge badge-purple">Tool</span>`.
    *   Do not create new badge colors unless absolutely necessary.

2.  **Alerts and Notes:**
    *   Use GitHub alert format: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`.
    *   Keep alert content concise.

3.  **Internal Links:**
    *   Links to other wiki topics MUST use the format: `[text](/wiki?topic=file-slug)`.
    *   Do not use relative paths like `./file.md` for links that the end user will see.

## Reference Standards (CRITICAL)

1.  **Single Section:**
    *   All authorship, links, and bibliography information must be under a single level 2 heading: `## References`.
    *   DO NOT use subheadings like "Bibliography" or "External Links".
    *   DO NOT add "(APA Standard)" or similar to the title.

2.  **List Format:**
    *   Use a bulleted list (`*`).
    *   DO NOT use numbered lists (`1.`, `[1]`) unless there are specific citations in the text.
    *   The format for each entry should follow the logic: `* Author. (Date). Title. Platform/Site. URL`.

3.  **Link Verification:**
    *   **Including unverified links is prohibited.**
    *   Verification MUST be performed ONLY during the creation of the **Spanish draft**.
    *   Before writing a documentation URL (especially from `creators.vrchat.com`), the agent MUST use the browsing tool to check that it does not return a 404.
    *   Once links are verified in the Spanish version, re-verification is NOT required during translation into other languages.
    *   VRChat documentation changes frequently; do not rely on prior knowledge.

## Language and Localization

1.  **Draft in Spanish:**
    *   All information and writing must be performed **first in Spanish**.
    *   Automatic translations should not be carried out until the Spanish content is finalized and reviewed.

2.  **User Confirmation for Translation:**
    *   Once the Spanish document is accepted, the agent MUST request explicit confirmation from the user to proceed with the implementation in other languages.
    *   This applies to both wiki files (`public/wiki/[lang]/*.md`) and text strings in code or language configuration files (e.g., `i18n.js`).
