[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Decompose backlog item

# Decompose backlog item

**Intent:** Take a `refined` backlog item and decompose it into a Beads epic with session-sized tasks. This workflow is **fully automated** — no human turn is required. Once a backlog item reaches `refined`, the agent decomposes it and the runner can begin execution immediately.

## Process

1. **Read the backlog item.** Load the item and all docs it references (`implements`, `references`, `depends_on` items, linked architecture/design docs). Understand the goal, requirements, success criteria, and constraints.

2. **Create a Beads epic.** `bd create "<backlog item title>" -t epic` with a description that includes the backlog item path so the runner can link epic → backlog. Include a line: `Backlog: docs/product/backlog/<slug>.md` (where `<slug>` is the backlog filename without `.md`). The runner uses this to create the branch `backlog/<slug>` and to spawn the "set backlog item ready for review" workflow when all tasks are closed.

3. **Break into session-sized tasks.** Each task should be completable in a single agent session (~10-30 minutes of agent work). For each task:
   - `bd create "<task title>" -t task` as a child of the epic.
   - Set a clear description with scope and acceptance criteria (derived from the backlog item's requirements and success criteria).
   - Add dependency links (`bd dep add <child> <parent>`) for tasks that must be completed in order.

4. **Tag each task.** Each task gets one of two completion types (in the task description or metadata):
   - **auto-advance** — No UI or human review needed. Agent closes the task and the runner picks up the next one.
   - **review-required** — Has UI or needs human testing. Agent sets the task to `ready to test`. Downstream tasks stay blocked until the user approves.

5. **Update the backlog item.** Set status to `ready` in frontmatter. Add a note in the body referencing the Beads epic ID.

## Task sizing guidance

- **Too big:** If a task requires multiple files across multiple domains (e.g., backend + frontend + docs), or if it would take more than one agent session, break it down further.
- **Too small:** If a task is just renaming a variable or adding an import, it should be part of a larger task. A task should deliver a meaningful, testable unit of progress.
- **UI tasks:** Separate "implement the behavior" (auto-advance) from "build the UI to exercise it" (review-required) where possible. This lets the behavior work proceed without waiting for user review.

## See also

- [How we work](./how-we-work.md) — Backlog lifecycle and runner
- [refine-backlog-item](./refine-backlog-item.md) — Workflow that produces `refined` items
- [work-backlog-item](./work-backlog-item.md) — How agents execute individual Beads tasks
