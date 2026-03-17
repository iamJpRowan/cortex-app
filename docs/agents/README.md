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

### Backlog lifecycle

| Status | What it means | Next step |
|---|---|---|
| `considering` | Exists but not in current plan | Pull into a milestone |
| `planned` | Goal-aligned; may be a lightweight placeholder | `refine-backlog-item` |
| `refined` | Requirements solid; ready to decompose | `decompose-backlog-item` |
| `ready` | Task files written (leaf) or all children planned (container) | `/work` (leaf only) |
| `in progress` | Work ongoing | Review PRs per leaf story |
| `completed` | PR merged (leaf) or all children merged (container) | Archive |

### Three phases

| Phase | Who | What |
|---|---|---|
| **Plan** | You + agent | Set milestone, refine stories, decompose into tasks |
| **Execute** | Agents | `/work` runs through tasks; opens PR when done |
| **Review** | You | Check out branch, `npm run dev`, test and iterate, merge |

Phases overlap — as soon as one leaf story is `ready`, `/work` can begin while you continue refining others.

## Generic behavior (all chats)
- Follow the collaboration patterns in [CONTRIBUTING.md](../../CONTRIBUTING.md) and technical constraints in the [development guide](../development/README.md).
- Favor concise explanations; provide detail when asked.
- Pause and clarify when requirements are ambiguous — do not assume.
- If the agreed approach will not work, stop, explain, and ask how to proceed.

## Workflow docs
Each doc is a set of explicit instructions for that conversation type. When the user references one by name or phrase, read and follow it.

- **[refine-backlog-item](./refine-backlog-item.md)** — Refine a `planned` story to `refined`.
- **[decompose-backlog-item](./decompose-backlog-item.md)** — Decompose into child stories or task files. Fully automated, no human turn.
- **[work-backlog-item](./work-backlog-item.md)** — Work tasks in a leaf story; invoked per-task by `/work`.
- **[create-pr-message](./create-pr-message.md)** — Open a PR when all tasks are complete; invoked by `/work`.
- **[defining-core-concepts](./defining-core-concepts.md)** — Define or refine how the product works; trickle-down to architecture, user docs, backlog.
- **[backlog-grooming](./backlog-grooming.md)** — Backlog hygiene (clarify, abandon, archive).
- **[docs-cleanup](./docs-cleanup.md)** — Docs-only cleanup (links, user vs dev, devlog related_backlog).

## Commands
Invokable via `/command-name`. Files are in [`commands/`](./commands/) and are the authoritative definition for each command.

- **[/plan-milestone](./commands/plan-milestone.md)** — Define a milestone and map to existing stories; flag gaps.
- **[/create-story](./commands/create-story.md)** — Scaffold a new `planned` story (user or agent invokable).
- **[/prepare-to-commit](./commands/prepare-to-commit.md)** — Review changes and apply fixes before committing.
- **[/commit](./commands/commit.md)** — Stage and commit with Conventional Commits format.
