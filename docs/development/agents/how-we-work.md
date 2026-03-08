[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / How we work

# How we work

This document describes the intended development loop so both the user and agents can follow a consistent process.

## Backlog Lifecycle

The backlog item is the central planning artifact. Each status has a clear owner and a corresponding workflow that advances it to the next state.

| Status | Owner | Next workflow | What happens |
|---|---|---|---|
| `considering` | — | `plan-goal` (pulls it in) | Item exists but is not part of the current goal. |
| `planned` | You | `refine-backlog-item` | Goal-setting identified this item as needed. May be a lightweight placeholder. |
| `refined` | Agent (auto) | `decompose-backlog-item` (no human turn) | Design is solid. Agent decomposes into Beads epic + tasks. |
| `ready` | Runner | `work-backlog-item` | Beads tasks exist. Runner picks up the first unblocked task. |
| `in progress` | Agent/You | (working + testing beads) | Work ongoing. You test individual beads as they hit `ready to test`. |
| `completed` | You | Archive | All beads done, you're satisfied with the feature. |

Testing happens at the **Beads level**, not the backlog level. A backlog item stays `in progress` until all its beads are closed and you're satisfied, then you mark it `completed`.

## The Three Phases

| Phase | Who | What |
|-------|-----|------|
| 1. Plan | You + agent | Set goal, refine backlog items, agent decomposes into Beads tasks |
| 2. Execute | Agents (continuous) | Agents work through Beads task chain; each completed task spawns the next |
| 3. Review | You | Test queued beads, refine UI, approve/reject |

Planning and execution overlap. You don't wait for all items to be refined before execution starts. As soon as one item reaches `ready`, the runner begins working its tasks while you continue refining later items.

## The User's Role

1. **Set goals** — Define the next target capability and identify the backlog items needed to achieve it. Use the [plan-goal](./plan-goal.md) workflow.
2. **Refine backlog items** — For each `planned` item, flesh out requirements and success criteria so agents can decompose and implement it. Use the [refine-backlog-item](./refine-backlog-item.md) workflow.
3. **Test beads** — When a bead reaches `ready to test`, test the feature via the UI, refine, and approve or reject. Only you mark a backlog item `completed` after all its beads are done.
4. **Define concepts** — When needed, define or refine how the product works using [defining-core-concepts](./defining-core-concepts.md). This is not a lifecycle step; it's a tool you pull in when the design requires it.

## The Agent's Role

1. **Decompose** — When a backlog item reaches `refined`, automatically decompose it into Beads tasks. Follow [decompose-backlog-item](./decompose-backlog-item.md).
2. **Implement** — Work tasks from `bd ready`. Follow [work-backlog-item](./work-backlog-item.md).
3. **Hand off for review** — When a bead with UI is testable, set it to `ready to test` with a clear summary of what to test and how. Do not close it.
4. **Respond to feedback** — If the user sends a bead back, pick up their notes and iterate.

## The Runner

A lightweight script manages agent continuity:

1. Run `bd ready` to find a task with no open blockers.
2. Spawn a Claude Code session with the task context.
3. Agent works the task, creates a devlog, and closes the task (or sets to `ready to test`).
4. If the task was **auto-advance**, go to step 1. If **review-required**, pause that chain.
5. Repeat until `bd ready` returns nothing.

The runner is not a supervisor or orchestrator. It's a while loop. The intelligence is in the task graph (Beads) and the agent.

## Your Daily Routine

1. **Check beads `ready to test`** — Review and approve/reject queued UI.
2. **Advance `planned` items** — Pick the next one and run `refine-backlog-item`.
3. **Set the next goal** — When all items in the current goal are `completed`, start over with `plan-goal`.

## See also

- [Agent workflows](./README.md#workflow-based-conversations) — Which workflow to use when
- [Backlog README](../../product/backlog/README.md) — Backlog structure and status definitions
