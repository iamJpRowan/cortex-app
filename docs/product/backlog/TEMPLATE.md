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
| `status`     | Yes      | One of: **active** `in progress`; **planning** `planned`, `refined`, `ready`; **inactive** `considering`. See status groups below.                                                                    |
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

- **Active** (Kanban columns in Backlog README): `in progress`. Items being implemented via Beads tasks.
- **Planning**: `planned` → `refined` → `ready`. Items progressing through the backlog lifecycle toward execution.
- **Inactive**: `considering`. Not part of the current goal.
- **Done** (archive only): `completed` → `decomposed` → `merged` → `abandoned`.

**Status meanings:**

- **Active:** `in progress` — Being implemented. First bead has been claimed. Testing happens at the bead level; backlog item stays `in progress` until all beads are done.
- **Planning:** `planned` — Identified as needed for the current goal; needs refinement. `refined` — Requirements, success criteria, and references are complete; ready for agent decomposition into Beads tasks. `ready` — Beads tasks exist; runner can begin execution.
- **Inactive:** `considering` — Under consideration; not part of the current goal.
- **Done:** `completed`, `decomposed`, `merged`, `abandoned` — used only in archive; set when moving to archive.

**Phased items (optional):** Use top-level sections `## Phase 1: Title` with scope and success criteria only. See [work-backlog-item](../../development/agents/work-backlog-item.md).

**Sequence:** Order of delivery is in the [Product README](../README.md#roadmap). Grouping by theme: [themes](../themes/README.md).
