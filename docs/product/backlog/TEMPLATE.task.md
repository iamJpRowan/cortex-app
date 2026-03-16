# Task file format

Each task is an individual `.task.md` file inside a leaf story folder. Name task files with a
zero-padded numeric prefix for ordering: `01-slug.task.md`, `02-slug.task.md`, etc. This makes
task order visible in the directory listing and avoids any separate ordering metadata.

---

## Template

```markdown
---
type: task
title: Task title
status: pending
story: "[[parent-slug.story.md]]"
depends_on: []   # optional: wikilinks to task files that must complete first, e.g. ["[[01-create-schema.task.md]]"]
---

# Task: <title>

## Scope

What this task covers — specific enough that an agent can implement it without reading
anything beyond this file and its listed references. One to three sentences.

## Acceptance criteria

How to verify the task is complete. Concrete and testable.

## References

- [[relevant-doc]]
- [[other-reference]]
```

---

## Status values

| Value | Meaning |
|---|---|
| `pending` | Not yet started. |
| `in-progress` | Currently being worked by an agent. |
| `complete` | Implemented, committed, and pushed. |
| `blocked` | Blocked — add a **Blocked** section to the body with the reason. |

---

## Conventions

- **Self-contained** — An agent working `03-add-ui.task.md` should need nothing except this file and its listed references. If a task depends on the output of a prior task, note it in `depends_on` and add a sentence in Scope: "Builds on the schema created in task 01."
- **One session** — Completable in a single agent session (~10–30 minutes). If larger, split into two files.
- **Ordered by filename** — Tasks execute in ascending filename order. Use the numeric prefix to set sequence; `depends_on` is for explicit blocking only.
- **Never modify the number prefix** — If you need to insert a task between 02 and 03, use 02b or renumber all subsequent tasks. Prefer appending.
- **Cross-references** — All links — frontmatter and body — use wikilink format with the filename slug only (no path, no extension): `[[how-we-work]]`, `[[TEMPLATE.story.md]]`, `[[other-slug.story.md]]`. Frontmatter: `story: "[[parent-slug.story.md]]"`, `depends_on: ["[[01-dep.task.md]]"]`.

---

## Example

**File:** `docs/product/backlog/migrate-dev-workflow-to-skills/core-execution/01-create-story-folders.task.md`

```markdown
---
type: task
title: Create story folder structure and templates
status: pending
story: "[[core-execution.story.md]]"
depends_on: []
---

# Task: Create story folder structure and templates

## Scope

Convert the flat `docs/product/backlog/` structure so every story is a folder with a
`<slug>.story.md` file. Create `TEMPLATE.story.md` and `TEMPLATE.task.md` in the backlog root.
Update the backlog `README.md` to document the new structure.

## Acceptance criteria

- All existing backlog `.md` files are moved to `<slug>/<slug>.story.md`.
- `docs/product/backlog/TEMPLATE.story.md` exists and documents the story file format.
- `docs/product/backlog/TEMPLATE.task.md` exists and documents the task file format.
- Backlog `README.md` reflects the folder-based structure.

## References

- [[TEMPLATE.story.md]]
- [[how-we-work]]
- [[decompose-backlog-item]]
```
