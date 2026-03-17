[Docs](../README.md) / Agents

# Agent Instructions

This directory holds **generic instructions** for all agent conversations and **workflow-based instructions** for specific kinds of conversations. Development follows a **doc-first** approach: state and substance live in docs (story, devlog, concept doc); use chat for coordination and short summaries so future sessions can start from the docs.

## How we work
Work is organized as **Theme → Story → Task**.

| Term | Role |
|---|---|
| **Theme** | High-level grouping of related stories. |
| **Story** | A backlog item (`<slug>.story.md`). Flat file until decomposed; becomes a folder with child stories or task files. One leaf story = one branch, one devlog, one PR. |
| **Task** | Single-agent unit (`NN-slug.task.md`). Self-contained: scope, acceptance criteria, references. |

Stories nest at any depth. Decompose until each story maps to a single PR. Archiving a flat story moves the file; archiving a decomposed story moves the folder. A container story and all its children always archive together under `archive/`.

### Backlog lifecycle

| Status | What it means |
|---|---|
| `considering` | An idea; not yet committed as required work. |
| `planned` | Committed — identified as needed. Requirements may still be incomplete. |
| `next` | Queued to be worked as soon as any blockers clear. May still need refinement. |
| `in progress` | Actively being implemented on its own branch and worktree. |
| `blocked` | Cannot proceed without human input. Story body has a `## Blocked` section. |
| `ready to review` | All tasks complete; PR is open and awaiting review. |
| `completed` | PR merged into main. |
| `abandoned` | No intent to build. Reason is at the top of the story body. |

Typical flow: `considering` → `planned` → `next` → `in progress` → `ready to review` → `completed`.

Review happens at the **leaf story level**. Each leaf story gets its own branch and worktree. When all tasks complete, the agent opens a PR. You check out the branch, run `npm run dev`, test and iterate, then merge. When all leaf stories under a container are merged, mark the container `completed`.

### Three phases

| Phase | Who | What |
|---|---|---|
| **Plan** | You + agent | Set milestone, refine stories, decompose into tasks |
| **Execute** | Agents (via `/work-story`) | Works tasks sequentially; opens PR when done |
| **Review** | You | Check out branch, `npm run dev`, test and iterate, merge |

Phases overlap — as soon as one leaf story reaches `next`, `/work-story` can begin while you continue refining others.

### Your role

1. **Set goals** — Define the next target capability and identify the stories needed. Use `/plan-milestone`.
2. **Refine and queue stories** — Use `/refine-story` to flesh out requirements; set `next` when ready to be worked.
3. **Approve task breakdowns** — When `/work-story` proposes a task breakdown, review and approve before implementation begins.
4. **Review story PRs** — Check out the branch, run `npm run dev`, test and iterate. Merge when satisfied. If work needs rethinking, close the PR, update the story, and re-invoke `/work-story`.
5. **Define concepts** — Use [defining-core-concepts](./defining-core-concepts.md) before refining any story that depends on an unsettled concept.

### Agent's role

1. **Refine** — Drive the `/refine-story` conversation to get a `planned` story ready to be worked.
2. **Work** — Via `/work-story`: evaluate readiness, decompose into tasks (inline in story file), work each task via `/work-task` subagents, open a PR when done.
3. **Hand off for review** — Set story to `ready to review`, open PR with summary and test steps.
4. **Respond to feedback** — Add tasks for requested changes on the same branch; re-open or update the PR.

### Daily routine

1. **Check open PRs** — Review `ready to review` stories. Check out the branch, `npm run dev`, test and iterate, then merge.
2. **Pick the next story** — Set the next `planned` story to `next` (and `/refine-story` it if needed).
3. **Invoke `/work-story`** — On any `next` story to kick off implementation.
4. **Set the next milestone** — When all stories in the current milestone are `completed`, start over with `/plan-milestone`.

## Generic behavior (all chats)
- Follow the collaboration patterns in [CONTRIBUTING.md](../../CONTRIBUTING.md) and technical constraints in the [development guide](../development/README.md).
- Favor concise explanations; provide detail when asked.
- Pause and clarify when requirements are ambiguous — do not assume.
- If the agreed approach will not work, stop, explain, and ask how to proceed.

## Workflow docs
Each doc is a set of explicit instructions for that conversation type. When the user references one by name or phrase, read and follow it.

- **`/refine-story` skill** / **[refine-backlog-item](./refine-backlog-item.md)** — Refine a story until it is ready to be worked autonomously. Sets status to `next`.
- **`/work-story` skill** / **[work-backlog-item](./work-backlog-item.md)** — Validate readiness, create worktree/branch, decompose into tasks, drive implementation to a PR.
- **`/work-task` skill** — Subagent worker invoked by `/work-story` for each task. Not invoked directly by the user.
- **[decompose-backlog-item](./decompose-backlog-item.md)** — Manual workflow: decompose a story into child stories or task files.
- **[create-pr-message](./create-pr-message.md)** — Open a PR when all tasks are complete; invoked by `/work-story`.
- **[defining-core-concepts](./defining-core-concepts.md)** — Define or refine how the product works; trickle-down to architecture, user docs, backlog.
- **[backlog-grooming](./backlog-grooming.md)** — Backlog hygiene (clarify, abandon, archive).
- **[docs-cleanup](./docs-cleanup.md)** — Docs-only cleanup (links, user vs dev, devlog related_backlog).

## Commands
Invokable via `/command-name`. Files are in [`commands/`](./commands/) and are the authoritative definition for each command.

- **[/plan-milestone](./commands/plan-milestone.md)** — Define a milestone and map to existing stories; flag gaps.
- **[/create-story](./commands/create-story.md)** — Scaffold a new `planned` story (user or agent invokable).
- **[/prepare-to-commit](./commands/prepare-to-commit.md)** — Review changes and apply fixes before committing.
- **[/commit](./commands/commit.md)** — Stage and commit with Conventional Commits format.
