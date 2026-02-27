# User documentation

This guide explains how to **create** and **maintain** the in-app user docs (Help), and how the docs system is **built** and consumed by the UI.

## Overview

- **Source:** Markdown files in `docs/user/*.md`.
- **Build:** `scripts/build-user-docs.js` runs before `npm run dev` and `npm run build`; it parses frontmatter and headings and emits `src/renderer/src/lib/user-docs.generated.ts`.
- **Runtime API:** `src/renderer/src/lib/user-docs.ts` re-exports the generated manifest, bodies, and helpers for the renderer.
- **UI:** Help is rendered by `HelpView` at `/help` and `/help/:slug`; section links and scroll spy use the manifest. In-UI links use the `DocTooltip` component.

---

## Creating a user doc

### 1. Add a Markdown file

Create a new file in **`docs/user/`** with a `.md` extension. The **filename (without `.md`)** becomes the **slug** used in URLs and the API (e.g. `getting-started.md` → slug `getting-started`).

- File names are sorted alphabetically to determine doc order in the sidebar and `userDocSlugs`.
- Use kebab-case for the filename (e.g. `key-concepts.md`, `getting-started.md`).

### 2. Add frontmatter

At the top of the file, use YAML frontmatter between `---` lines:

```yaml
---
title: Display Title
summary: One short sentence used in the Help landing list and in DocTooltip tooltips.
---
```

- **title** — Shown in the Help sidebar and breadcrumbs. If omitted, the slug is used.
- **summary** — Shown on the Help index and in `DocTooltip` when linking to this doc from elsewhere in the app.

### 3. Write content with headings

Use standard Markdown. **Headings** define the doc’s table of contents and anchor links:

- **`# H1`** — Usually the doc title; appears in the sidebar as the “page” for this doc.
- **`## H2`** — Sections; only H2s are shown as section links in the Help sidebar.
- **H3–H6** — Sub-sections; they get anchor IDs and appear in the manifest for deep links, but are not rendered as sidebar items.

Heading text is **slugified** to form anchor IDs (lowercase, spaces → hyphens, non-alphanumeric removed). The same slug logic lives in `scripts/build-user-docs.js` and `src/renderer/src/lib/utils.ts` (for ReactMarkdown `id` attributes) so that links like `/help/vision#core-benefits` work.

**Example:**

```markdown
---
title: What is Cortex?
summary: Cortex is an AI-powered personal knowledge management system.
---

# What is Cortex?

Intro paragraph...

## Core Benefits

Content...

### Own Your Data

Sub-section (has anchor, not in sidebar).
```

### 4. Rebuild (or rely on predev/prebuild)

The build script is run automatically:

- Before **`npm run dev`** (`predev`)
- Before **`npm run build`** (`prebuild`)

To regenerate the docs without starting the app:

```bash
node scripts/build-user-docs.js
```

After the build, the new doc appears in the Help sidebar and is available via `getDoc(slug)`, `getDocSummary(slug)`, etc.

---

## How the docs are built

### Build script: `scripts/build-user-docs.js`

1. **Input:** All `*.md` files in `docs/user/`, read in sorted order.
2. **Parse:** For each file:
   - **Frontmatter:** Regex-based extraction of `title` and `summary` from the first `--- ... ---` block.
   - **Body:** The rest of the file (after the closing `---`).
   - **TOC:** All headings matched with `^(#{1,6})\s+(.+)$`; for each, a slugified `id`, `title`, and `level` (1–6) are recorded.
   - **Sections:** Content between headings is split so that `getDocSectionContent(slug, sectionId)` can return markdown for a single section (e.g. for modals or deep links).
3. **Output:** A single TypeScript file, **`src/renderer/src/lib/user-docs.generated.ts`**, containing:
   - **`userDocsManifest`** — `Record<slug, UserDocManifestEntry>` with `title`, `summary`, `sectionIds`, and `sections` (id, title, level).
   - **`userDocSlugs`** — Ordered array of slugs (same order as files).
   - **`docBodies`** (internal) — Full markdown body per slug.
   - **`docSections`** (internal) — Per-doc array of `{ id, title, content }` for each section.
   - **Export functions:** `getDocBody(slug)`, `getDocSummary(slug)`, `getDocSectionContent(slug, sectionId)`.

The generated file is committed; it is the source of truth at runtime. Do not edit it by hand.

### Slugification

Both the build script and the renderer use the same rules so that anchors match:

- Lowercase, spaces → `-`, strip non-`a-z0-9-`, collapse repeated hyphens, trim leading/trailing hyphens.

Defined in `scripts/build-user-docs.js` and mirrored in `src/renderer/src/lib/utils.ts` for the ReactMarkdown heading `id` attributes.

### Public API: `user-docs.ts`

The non-generated module `src/renderer/src/lib/user-docs.ts` re-exports:

- **Types:** `UserDocManifest`, `UserDocManifestEntry`
- **Data:** `userDocsManifest`, `userDocSlugs`
- **Functions:** `getDocBody`, `getDocSummary`, `getDocSectionContent`, `getDoc(slug)` (metadata + body for display)

Use these in the renderer; do not import from `user-docs.generated` directly so that the public API stays in one place.

---

## How the UI consumes the docs

### Help view (`HelpView.tsx`)

- **Routes:** `/help` (index) and `/help/:slug` (single doc). Optional hash: `/help/:slug#sectionId`.
- **Sidebar:** Renders `userDocSlugs` as expandable items; each doc’s `manifestEntry.sections` filtered to **level 2** (H2) are shown as section links. Doc title is highlighted when scroll is at top; one H2 is highlighted based on scroll position (scroll spy).
- **Main area:** Index lists all docs (title + summary). Doc view renders the full markdown body via ReactMarkdown with custom components that add `id` to headings (using the same `slugify` from `utils.ts`) and convert links for in-app navigation.
- **Persistence:** Help view persists sidebar expand/collapse state and the scroll position of the *last active* doc only; returning to another doc opens at the top unless a hash is present.

### In-UI links: `DocTooltip`

Use `DocTooltip` next to settings or labels to link users to a doc (or a section):

```tsx
<DocTooltip docSlug="vision" sectionId="core-benefits" ariaLabel="Learn more about Cortex" />
```

- **docSlug** — Same as the filename without `.md`.
- **sectionId** (optional) — Slug of a heading (e.g. `core-benefits` for `## Core Benefits`). Omit to link to the doc top.
- The tooltip shows `getDocSummary(docSlug)` and a “Learn more” link to `/help/:slug` or `/help/:slug#sectionId`.

### Routing and breadcrumbs

When the route is `/help` or `/help/:slug`, the app header can show breadcrumbs (e.g. Help > Doc title). The doc title comes from `userDocsManifest[slug].title`.

---

## Checklist: adding a new user doc

1. Create `docs/user/your-doc-slug.md` with frontmatter (`title`, `summary`) and headings (H1 for title, H2 for sidebar sections).
2. Run `npm run dev` (or `node scripts/build-user-docs.js`) so `user-docs.generated.ts` is updated.
3. Open Help in the app and confirm the doc appears in the sidebar and renders correctly; check anchor links and scroll spy for H2s.
4. Optionally add `DocTooltip` elsewhere in the app pointing to the new doc or a section.

---

*See also: [Development README](./README.md), [UI state persistence](./ui-state-persistence.md) for how Help persistence is implemented.*
