---
type: story
title: Story title
alias: Story title
status: considering
summary: One-line description for backlog view tables (required).
themes: []  # string values, e.g. ["connections", "chat-ai"]
# milestones:                          # wikilinks to milestone files (no extension)
#   - "[[milestone-slug]]"
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

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Story title

# Story title

## Goal

What this story aims to achieve.

## Prerequisites / Dependencies

In body (e.g. "requires: X") and in frontmatter `depends_on` if blocking stories exist.

## Requirements and constraints

Functional (and non-functional) requirements, prerequisites, limitations.

## Success criteria

How to verify the story is complete. Implementation approach is decided when the work is done
(see [work-backlog-item](../../agents/work-backlog-item.md)).

## References (optional)

Inline wikilinks to architecture, development, design docs implementers need. Use `[[filename-slug]]` format — filename only, no path, no extension.

---

## Frontmatter reference

**Current (active) stories:**

| Key          | Required | Description |
| ------------ | -------- | ----------- |
| `type`       | Yes      | Always `story` for story files. (`task` for task files — see [[TEMPLATE.task.md]].) |
| `title`      | Yes      | Human-readable story name. Used in PR titles, devlog headings, and agent context. |
| `status`     | Yes      | One of: `considering`, `planned`, `next`, `in progress`, `blocked`, `ready to review`, `completed`, `abandoned`. See status table below. |
| `summary`    | Yes      | One short line for backlog view tables. |
| `themes`     | No       | String list of theme IDs: `["connections", "chat-ai"]`. |
| `parent`     | No       | Child stories only. Wikilink to parent story file: `"[[parent-slug.story.md]]"`. |
| `children`   | No       | Container stories only. List of wikilinks to child story files in dependency order. |
| `implements` | No       | Path-qualified wikilink to concept doc (no `.md`): `"[[architecture/connections]]"`. |
| `depends_on` | No       | List of wikilinks to story files this story depends on. |
| `milestones` | No       | List of wikilinks to milestone files (no extension): `["[[milestone-slug]]"]`. |
| `devlogs`    | No       | Leaf stories only. Wikilinks to devlog files (no `.md`): `["[[YYYY-MM-DD-slug]]"]`. Bi-directional with devlog's `related_backlog`. |

**Status values:**

| Status | Meaning |
| --- | --- |
| `considering` | An idea; not yet committed as required work. |
| `planned` | Committed — identified as needed. Requirements may still be incomplete. |
| `next` | Queued to be worked as soon as any blockers clear. May still need refinement before the agent can proceed autonomously. |
| `in progress` | Actively being implemented. |
| `blocked` | Cannot proceed without human input. Add a `## Blocked` section to the body explaining the blocker. |
| `ready to review` | Implementation complete; a PR is open and awaiting human review. |
| `completed` | PR merged into main. |
| `abandoned` | No intent to build. Add a reason at the top of the body: e.g. _Duplicate of [[other-slug.story.md]]_, _Decomposed into [[child1.story.md]], [[child2.story.md]]_, or a free-form explanation. |

Typical flow: `considering` → `planned` → `next` → `in progress` → `ready to review` → `completed`. A story can move to `blocked` from `in progress`, or to `abandoned` from any state.

**Archiving:** `completed` and `abandoned` stories may be moved to `docs/product/backlog/archive/` for housekeeping. Status stays the same — no special archive frontmatter. Archiving a flat story: move the `.story.md` file. Archiving a decomposed story: move the `<slug>/` folder. Container stories and all their children always archive together.

**Story structure:**

Stories start as **flat files** (`<slug>.story.md`) and stay that way until decomposed. A folder is only created when a story is decomposed into child stories or tasks:

- **Flat story** (`<slug>.story.md`) — not yet decomposed; any pre-`in progress` status.
- **Story with children** (`<slug>/<slug>.story.md` + child files) — decomposed into child stories, each starting as a flat file alongside the parent (`<child-slug>.story.md`). Decomposed via `decompose-backlog-item`.
- **Story with tasks** (`<slug>/<slug>.story.md` + task files) — decomposed into task files (`01-slug.task.md`, `02-slug.task.md`, …). One set of tasks = one branch, one devlog, one PR.

When decomposing a flat story: create the `<slug>/` folder, move the story file into it, then add children or task files alongside.

Find all stories anywhere in the repo: glob `**/*.story.md`. Find all tasks: glob `**/*.task.md`.

Task files are named with a zero-padded numeric prefix for ordering. See [[TEMPLATE.task.md]] for the task file format. See [decompose-backlog-item](../../agents/decompose-backlog-item.md) for the child-stories-vs-tasks decision rule.

Archiving a flat (undecomposed) story: move `<slug>.story.md` to `archive/<slug>.story.md`. Archiving a decomposed story: move the `<slug>/` folder to `archive/<slug>/`. A container story and all its children always archive together.

**Cross-references:** All links — frontmatter fields and body — use wikilink format with the filename slug only (no path, no extension): `[[refine-backlog-item]]`, `[[decompose-backlog-item]]`, `[[other-slug.story.md]]`. Frontmatter fields (`parent`, `children`, `depends_on`, `devlogs`) follow the same rule. Exception: `themes` uses plain string IDs (not wikilinks), e.g. `["connections", "chat-ai"]`.

**Sequence:** Delivery order for a given milestone is in the milestone file under `docs/product/milestones/`.
