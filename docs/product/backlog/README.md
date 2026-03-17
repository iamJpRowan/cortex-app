[Docs](../../README.md) / [Product](../README.md) / Backlog

# Backlog

Stories and tasks that make up the product roadmap. Development is organized as **Theme → Story → Task** — see [How we work](../../agents/README.md) for the full workflow.

## Templates

- **Stories:** [TEMPLATE.story.md](./TEMPLATE.story.md)
- **Tasks:** [TEMPLATE.task.md](./TEMPLATE.task.md)

## Story structure

Stories start as **flat files** (`<slug>.story.md`) and stay that way until decomposed. A folder is only created when a story is decomposed into child stories or tasks:

- **Flat story** (`<slug>.story.md`) — not yet decomposed; status `planned`, `refined`, or `considering`.
- **Story with children** (`<slug>/<slug>.story.md` + child story files) — decomposed into child stories. Each child starts as a flat file alongside the parent.
- **Story with tasks** (`<slug>/<slug>.story.md` + task files) — decomposed into task files (`01-slug.task.md`, `02-slug.task.md`, …). One set of tasks = one branch, one devlog, one PR.

When decomposing a flat story: create the `<slug>/` folder, move the story file into it, then add children or task files alongside it.

Find all stories anywhere in the repo: glob `**/*.story.md`. Find all tasks: glob `**/*.task.md`.

## Task file conventions

**Naming:** Zero-padded numeric prefix for ordering: `01-slug.task.md`, `02-slug.task.md`. This makes task order visible in the directory listing.

**Self-contained:** An agent working `03-add-ui.task.md` should need nothing except that file and its listed references. If a task depends on the output of a prior task, note it in `depends_on` and say so in Scope.

**One session:** Completable in a single agent session (~10–30 minutes). If larger, split into two files.

**Ordered by filename:** Tasks execute in ascending filename order. Use the numeric prefix to set sequence; `depends_on` is for explicit blocking only.

**Never modify the number prefix:** If you need to insert between 02 and 03, use `02b` or renumber all subsequent tasks. Prefer appending.

**Cross-references:** All links — frontmatter and body — use wikilink format with filename slug only (no path, no extension): `[[refine-backlog-item]]`, `[[other-slug.story.md]]`. Frontmatter: `story: "[[parent-slug.story.md]]"`, `depends_on: ["[[01-dep.task.md]]"]`.

## Task status values

| Value       | Meaning |
| ----------- | ------- |
| `pending`   | Not yet started. |
| `in-progress` | Currently being worked by an agent. |
| `complete`  | Implemented, committed, and pushed. |
| `blocked`   | Blocked — add a **Blocked** section to the body with the reason. |

## Example task

**File:** `docs/product/backlog/connections-foundation/01-connection-type-registry.task.md`

```markdown
---
type: task
title: Connection type registry and manifest shape
alias: Connection type registry and manifest shape
status: pending
story: "[[connections-foundation.story.md]]"
depends_on: []
---

# Task: Connection type registry and manifest shape

## Scope

Define the connection type manifest shape (id, name, instance config schema, list of tool
names) and implement the registry that stores built-in types. Register the Local Folder
type as the first built-in. Builds on the mode and tool registry already in place.

## Acceptance criteria

- `ConnectionTypeManifest` type exists with required fields.
- Registry loads built-in types at startup; `getConnectionType(id)` returns the manifest.
- Local Folder is registered with correct id, name, config schema (path), and tool names.

## References

- [[connections-foundation.story.md]]
- [[connections]]
```

## Archiving

Archiving a flat (undecomposed) story: move `<slug>.story.md` to `archive/<slug>.story.md`. Archiving a decomposed story: move the `<slug>/` folder to `archive/<slug>/`. A container story and all its children always archive together.

Archived story frontmatter keeps only: `status` (one of `completed`, `decomposed`, `merged`, `abandoned`), `date_archived`, and `summary`. Any "why archived" context goes as a short paragraph at the top of the body — not in frontmatter.
