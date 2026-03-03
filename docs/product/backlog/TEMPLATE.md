---
status: considering
summary: One-line description for backlog view tables (required).
themes: [theme-id]
# implements: path/to/concept.md
# depends_on: [slug1, slug2]
# devlogs: [YYYY-MM-DD-slug]
# references: [path/to/doc.md]
---

# Item title (match filename)

## Goal

What the feature aims to achieve.

## Prerequisites / Dependencies

In body (e.g. "requires: X") and if any backlog items are included they must also be included in the frontmatter `depends_on` property.

## Requirements and constraints

Functional (and non-functional) requirements, prerequisites, limitations.

## Success criteria

How to verify the feature is complete. Implementation approach is decided when the work is done (see [work-backlog-item](../../development/agents/work-backlog-item.md)).

## References (optional)

Or use frontmatter `references`. Link to architecture, development, design docs implementers need.

---

## Frontmatter reference

**Current (active) items:**

| Key          | Required | Description                                                                                                                                                                                             |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`     | Yes      | One of: **active** `designing`, `in progress`, `ready to test`; **inactive** `next`, `soon`, `considering`. See status groups below.                                                                    |
| `summary`    | Yes      | One short line for backlog view tables.                                                                                                                                                                 |
| `themes`     | No       | List of theme IDs (e.g. `[chat-ai, ui-features]`). Theme ID = theme file name (no `.md`) in [docs/product/themes/](../themes/README.md).                                                                |
| `implements` | No       | Path to concept doc (e.g. `architecture/connections.md`).                                                                                                                                               |
| `depends_on` | No       | List of backlog item slugs this item depends on.                                                                                                                                                        |
| `devlogs`    | No       | List of **devlog IDs** (e.g. `[2026-02-17-chat-trace-token-usage-and-cleanup]`). Devlog ID = devlog file name without `.md` in `docs/product/devlogs/`. Bi-directional with devlog's `related_backlog`. |
| `references` | No       | List of paths to docs implementers should read.                                                                                                                                                         |

**Archived items** (in `docs/product/backlog/archive/`): only these in frontmatter.

| Key             | Required | Description                                                                  |
| --------------- | -------- | ---------------------------------------------------------------------------- |
| `status`        | Yes      | One of: `completed`, `decomposed`, `merged`, `abandoned`                     |
| `date_archived` | Yes      | ISO date (YYYY-MM-DD) when moved to archive. All archive items sort by this. |
| `summary`       | Yes      | One short line for backlog view.                                             |

**Do not put in frontmatter:** "Why archived", "Merged into", "Abandoned reason" — put those as a short paragraph at the top of the body (e.g. **Merged into:** [Other Item](../other-item.md). **Why archived:** …).

**Status groups and display order** (same order everywhere when listing by status):

- **Active** (Kanban columns in Backlog README): `ready to test` → `in progress` → `designing`. Items you can act on or are in flight.
- **Inactive** (tables: Next, Soon, Considering): `next` → `soon` → `considering`. Not yet active; display order only, not delivery sequence (see roadmap).
- **Done** (archive only): `completed` → `decomposed` → `merged` → `abandoned`.

**Status meanings:**

- **Active:** `ready to test` — Testable; user's turn to test/refine. Only the user marks complete. `in progress` — Being implemented. `designing` — Being designed.
- **Inactive:** `next` — Next up for implementation. `soon` — Planned soon. `considering` — Under consideration.
- **Done:** `completed`, `decomposed`, `merged`, `abandoned` — used only in archive; set when moving to archive.

**Phased items (optional):** Use top-level sections `## Phase 1: Title` with scope and success criteria only. See [work-backlog-item](../../development/agents/work-backlog-item.md).

**Sequence:** Order of delivery is in the [Product README](../README.md#roadmap). Grouping by theme: [themes](../themes/README.md).
