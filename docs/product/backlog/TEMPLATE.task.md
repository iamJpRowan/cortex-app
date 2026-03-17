---
type: task
title: Task title
alias: Task title
status: pending
story: "[[parent-slug.story.md]]"
# depends_on: []   # optional: wikilinks to task files that must complete first
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Task title

# Task: Task title

## Scope

What this task covers — specific enough that an agent can implement it without reading
anything beyond this file and its listed references. One to three sentences.

## Acceptance criteria

How to verify the task is complete. Concrete and testable.

## References

- [[relevant-doc]]

---

## Frontmatter reference

| Key          | Required | Description |
| ------------ | -------- | ----------- |
| `type`       | Yes      | Always `task` for task files. |
| `title`      | Yes      | Human-readable task name. |
| `alias`      | Yes      | Same value as `title`. |
| `status`     | Yes      | One of: `pending`, `in-progress`, `complete`, `blocked`. |
| `story`      | Yes      | Wikilink to the parent story file: `"[[parent-slug.story.md]]"`. |
| `depends_on` | No       | List of wikilinks to task files that must complete first: `["[[01-dep.task.md]]"]`. |
