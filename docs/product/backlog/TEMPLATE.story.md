---
type: story
title: Story title
status: considering
summary: One-line description for backlog view tables (required).
themes: []
# parent: "[[parent-slug.story.md]]"   # child stories only: wikilink to parent story file
# children:                             # container stories only: in dependency order
#   - "[[slug1.story.md]]"
#   - "[[slug2.story.md]]"
# implements: "[[path/to/concept]]"     # path-qualified wikilink, no extension
# depends_on:
#   - "[[slug1.story.md]]"
# devlogs:                              # leaf stories only
#   - "[[YYYY-MM-DD-slug]]"
---

# Story title

## Goal

What this story aims to achieve.

## Prerequisites / Dependencies

In body (e.g. "requires: X") and in frontmatter `depends_on` if blocking stories exist.

## Requirements and constraints

Functional (and non-functional) requirements, prerequisites, limitations.

## Success criteria

How to verify the story is complete. Implementation approach is decided when the work is done
(see [work-backlog-item](../../development/agents/work-backlog-item.md)).

## References (optional)

Inline wikilinks to architecture, development, design docs implementers need. Use `[[filename-slug]]` format — filename only, no path, no extension.

---

## Frontmatter reference

**Current (active) stories:**

| Key          | Required | Description |
| ------------ | -------- | ----------- |
| `type`       | Yes      | Always `story` for story files. (`task` for task files — see [[TEMPLATE.task.md]].) |
| `title`      | Yes      | Human-readable story name. Used in PR titles, devlog headings, and agent context. |
| `status`     | Yes      | One of: **active** `in progress`; **planning** `planned`, `refined`, `ready`; **inactive** `considering`. |
| `summary`    | Yes      | One short line for backlog view tables. |
| `themes`     | No       | Wikilinks to theme files: `["[[theme-id]]"]`. Theme ID = filename (no `.md`) in [docs/product/themes/](../themes/README.md). |
| `parent`     | No       | Child stories only. Wikilink to parent story file: `"[[parent-slug.story.md]]"`. |
| `children`   | No       | Container stories only. List of wikilinks to child story files in dependency order. |
| `implements` | No       | Path-qualified wikilink to concept doc (no `.md`): `"[[architecture/connections]]"`. |
| `depends_on` | No       | List of wikilinks to story files this story depends on. |
| `devlogs`    | No       | Leaf stories only. Wikilinks to devlog files (no `.md`): `["[[YYYY-MM-DD-slug]]"]`. Bi-directional with devlog's `related_backlog`. |

**Archived stories** (in `docs/product/backlog/archive/`): archive the whole folder. Only these in frontmatter:

| Key             | Required | Description |
| --------------- | -------- | ------------ |
| `status`        | Yes      | One of: `completed`, `decomposed`, `merged`, `abandoned` |
| `date_archived` | Yes      | ISO date (YYYY-MM-DD) when moved to archive. |
| `summary`       | Yes      | One short line for backlog view. |

**Do not put in frontmatter:** "Why archived", "Merged into", "Abandoned reason" — put those as a short paragraph at the top of the body.

**Status groups:**

- **Active**: `in progress` — Being implemented. Review happens per leaf story via PR.
- **Planning**: `planned` → `refined` → `ready`.
  - `planned` — Identified as needed; needs refinement.
  - `refined` — Requirements complete; ready for decomposition.
  - `ready` — Leaf: task files written, `/work` can begin. Container: all children are planned.
- **Inactive**: `considering` — Not part of the current goal.
- **Done** (archive only): `completed` → `decomposed` → `merged` → `abandoned`.

**Story structure:**

All stories live at `<slug>/<slug>.story.md`. The folder's contents reveal the story type:

- **Story with children** — has child story subfolders (each with their own `<slug>.story.md`). Decomposed into child stories via `decompose-backlog-item`.
- **Story with tasks** — has task files (`01-slug.task.md`, `02-slug.task.md`, …). One set of tasks = one branch, one devlog, one PR.

A story may have both child stories and tasks.

Find all stories anywhere in the repo: glob `**/*.story.md`. Find all tasks: glob `**/*.task.md`.

Task files are named with a zero-padded numeric prefix for ordering. See [[TEMPLATE.task.md]] for the task file format. See [decompose-backlog-item](../../development/agents/decompose-backlog-item.md) for the child-stories-vs-tasks decision rule.

Archiving is always at the folder level. A completed container story and all its children move to `archive/<slug>/` together.

**Cross-references:** All links — frontmatter fields and body — use wikilink format with the filename slug only (no path, no extension): `[[how-we-work]]`, `[[decompose-backlog-item]]`, `[[other-slug.story.md]]`. Frontmatter fields (`parent`, `children`, `depends_on`, `devlogs`, `themes`) follow the same rule.

**Sequence:** Order of delivery is in the [Product README](../README.md#roadmap). Grouping by theme: [themes](../themes/README.md).
