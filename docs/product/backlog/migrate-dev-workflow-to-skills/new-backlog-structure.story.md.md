---
type: story
title: Story title
status: completed
summary: One-line description for backlog view tables (required).
themes: []
parent: "[[migrate-dev-workflow-to-skills.story.md]]"
---

## Hierarchy

| Term      | Role                                                                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Theme** | High-level grouping. Unchanged.                                                                                                                                                           |
| **Story** | A backlog item. Always a folder (`<slug>/<slug>.story.md`). Either a container (has child stories) or a leaf (has tasks). One leaf story = one branch, one devlog, one PR.                |
| **Task**  | Single-agent workable unit. An individual file (`NN-slug.task.md`) inside a leaf story folder. Self-contained: scope, acceptance criteria, and only the references needed — nothing else. |

All current "backlog items" become stories. "Phases" become child stories. Depth is unbounded — decompose until each story maps to one PR.

## Folder structure

Every story is a folder. The folder's contents reveal the story type: child subfolders = container, `*.task.md` files = leaf.

```
docs/product/backlog/
  migrate-dev-workflow-to-skills/
    migrate-dev-workflow-to-skills.story.md  ← container story (has child story subfolders)
    core-execution/
      core-execution.story.md                ← leaf story (has task files)
      01-create-folder-structure.task.md     ← task file
      02-update-templates.task.md            ← task file
      03-update-workflow-docs.task.md        ← task file
    skill-relocation/
      skill-relocation.story.md              ← leaf story (has task files)
      01-move-docs-to-skills.task.md         ← task file
      02-update-references.task.md           ← task file
  simple-feature/
    simple-feature.story.md                  ← leaf story (small enough, no children needed)
    01-add-component.task.md                 ← task file
    02-wire-up-ipc.task.md                   ← task file
  archive/
    completed-feature/                       ← archived as a whole folder
      completed-feature.story.md
      child-story/
        child-story.story.md
        01-task.task.md
```

Glob `**/*.story.md` to find all stories. Glob `**/*.task.md` to find all tasks.

Archiving is always at the folder level.

## Out of scope

- Changes to the Plan phase workflows (`plan-goal`, `refine-backlog-item`, `defining-core-concepts`) — minor edits only.
- Changes to devlog structure or conventions. One devlog per leaf story remains the convention.
- Changes to `prepare-to-commit`, `commit`, `backlog-grooming`, `docs-cleanup` — minor reference cleanup only.

## Requirements and constraints

### 1. All stories are folders

Every story — container or leaf, top-level or nested — lives at `<slug>/<slug>.story.md`. No flat `.md` files for stories. Two templates exist:

- **[[TEMPLATE.story.md]]** — for story files.
- **[[TEMPLATE.task.md]]** — for individual task files (`NN-slug.task.md`).

### 2. Tasks are individual files

Each task is a separate `.task.md` file inside the leaf story folder, named with a zero-padded numeric prefix: `01-slug.task.md`, `02-slug.task.md`, etc. The prefix provides ordering without extra metadata; the directory listing is the task queue.

Each task file is fully self-contained: scope, acceptance criteria, and only the references needed to complete it. Task status (`pending`, `in-progress`, `complete`, `blocked`) lives in the task file's own frontmatter. The story file stays as the pure contract — no task list embedded in it.

See [[TEMPLATE.task.md]] for the task file format.

### 3. Child stories vs. tasks — the decision rule

When decomposing a refined story, the agent chooses one of two outcomes:

**Create child stories when:**

- The story would require more than one PR to deliver completely.
- There are distinct phases or aspects that each benefit from separate review before the next begins.

**Create tasks when:**

- The story maps to a single PR.
- All tasks share the same context, references, and implementation domain.

A story never has both child stories and tasks. Decompose further if needed, but always to one or the other.