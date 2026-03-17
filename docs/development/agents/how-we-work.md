[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / How we work

# How we work

This document describes the intended development loop so both the user and agents can follow a consistent process.

## Hierarchy

| Term | Role |
|---|---|
| **Theme** | High-level grouping of related stories. |
| **Story** | A backlog item. Starts as a flat file (`<slug>.story.md`); becomes a folder (`<slug>/<slug>.story.md` + children or tasks) only when decomposed. Either a **container** (has child story files) or a **leaf** (has task files). One leaf story = one branch, one devlog, one PR. |
| **Task** | Single-agent workable unit. An individual file (`NN-slug.task.md`) inside a leaf story folder. Self-contained: scope, acceptance criteria, and references needed — nothing else. |

Stories nest at any depth. Decompose until each story maps to a single PR. Archiving a flat story moves the file; archiving a decomposed story moves the folder. A container story and all its children always archive together under `archive/`.

## Backlog Lifecycle

Every story — container or leaf — shares the same status lifecycle.

| Status | Owner | Next workflow | What happens |
|---|---|---|---|
| `considering` | — | `plan-goal` (pulls it in) | Story exists but is not part of the current goal. |
| `planned` | You | `refine-backlog-item` | Goal-setting identified this story as needed. May be a lightweight placeholder. |
| `refined` | Agent (auto) | `decompose-backlog-item` (no human turn) | Requirements solid. Agent creates child story folders or task files depending on scope. |
| `ready` | Agent (auto) | `/work` (leaf stories only) | Leaf: task files written, `/work` can begin. Container: all children are planned. |
| `in progress` | Agent/You | (working tasks; reviewing PRs per leaf story) | Work ongoing. Each completed leaf story opens a PR for your review. |
| `completed` | You | Archive | Leaf: PR merged. Container: all child stories completed. |

Review happens at the **leaf story level**. Each leaf story maps to one git branch (`backlog/<story-path>`). When all tasks in a leaf story are complete, the agent opens a PR. You check out the branch, run `npm run dev`, test and iterate, then merge. When all leaf stories under a container are merged, mark the container `completed` and archive the whole folder.

## The Three Phases

| Phase | Who | What |
|-------|-----|------|
| 1. Plan | You + agent | Set goal, refine stories, agent decomposes into child stories or tasks |
| 2. Execute | Agents (via `/work`) | `/work` works through tasks in a leaf story; opens PR when done |
| 3. Review | You | Check out PR branch, `npm run dev`, test and iterate, merge when satisfied |

Planning and execution overlap. As soon as one leaf story reaches `ready`, `/work` can begin while you continue refining other stories.

## The User's Role

1. **Set goals** — Define the next target capability and identify the stories needed. Use the [plan-goal](./plan-goal.md) workflow.
2. **Refine stories** — For each `planned` story, flesh out requirements and success criteria. Use the [refine-backlog-item](./refine-backlog-item.md) workflow.
3. **Review story PRs** — When a leaf story PR is opened, check out the branch, run `npm run dev`, test and iterate. Merge when satisfied. If work is egregiously wrong, close the PR, reset the story to `refined` with improved requirements, and re-decompose.
4. **Define concepts** — Use [defining-core-concepts](./defining-core-concepts.md) before refining any story that depends on an unsettled concept.

## The Agent's Role

1. **Decompose** — When a story reaches `refined`, apply the child-stories-vs-tasks decision rule and decompose accordingly. Follow [decompose-backlog-item](./decompose-backlog-item.md).
2. **Implement** — Work tasks within a leaf story. Follow [work-backlog-item](./work-backlog-item.md).
3. **Hand off for review** — When all tasks in a leaf story are complete, open a PR with summary and test steps.
4. **Respond to feedback** — If the user requests changes after reviewing a PR, new tasks are added to the story on the same branch and worked before the PR is merged.

## The `/work` Skill

Invoked on a **leaf story** (tasks, no child stories). Orchestrates all tasks using sub-agents in isolated worktrees. When all tasks are done, opens a PR and stops. If invoked on a container story, detects no tasks and reports the first ready child story instead.

See [work-backlog-item](./work-backlog-item.md) for how individual tasks are implemented.

## Your Daily Routine

1. **Check open PRs** — Review leaf story PRs in GitHub. Check out the branch, `npm run dev`, test and iterate, then merge.
2. **Refine `planned` stories** — Pick the next one and run `refine-backlog-item`.
3. **Invoke `/work`** — On the next `ready` leaf story to continue execution.
4. **Set the next goal** — When all stories in the current goal are `completed`, start over with `plan-goal`.

## See also

- [Agent workflows](./README.md#workflow-based-conversations) — Which workflow to use when
- [Backlog Template](../../product/backlog/TEMPLATE.story.md) — Backlog structure, status definitions, and frontmatter reference
