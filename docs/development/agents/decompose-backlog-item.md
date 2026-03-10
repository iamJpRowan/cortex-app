[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Decompose backlog item

# Decompose backlog item

**Intent:** Take a `refined` backlog item and decompose it into a Beads epic with session-sized tasks. This workflow is **fully automated** — no human turn is required. Once a backlog item reaches `refined`, the agent decomposes it and the runner can begin execution immediately.

## Process

1. **Read the backlog item.** Load the item and all docs it references (`implements`, `references`, `depends_on` items, linked architecture/design docs). Understand the goal, requirements, success criteria, and constraints.

2. **Create a Beads epic per phase.** For each `## Phase N: Title` section in the backlog item, create one Beads epic: `bd create "<backlog item title> — Phase N: <phase title>" -t epic`. For backlog items with no phases, create a single epic for the whole item. Each epic's description must include:
   - `Backlog: docs/product/backlog/<slug>.md` — so the runner can link epic → backlog doc
   - `Phase: N` (omit for single-phase items) — so the runner can derive the branch name `backlog/<slug>-phase-N`

   The runner uses these to create the correct branch and open a PR when all beads in the epic are closed.

3. **Break into session-sized tasks.** Each task should be completable in a single agent session (~10-30 minutes of agent work). For each task:
   - `bd create "<task title>" -t task` as a child of the epic.
   - Set a clear description with scope and acceptance criteria (derived from the backlog item's requirements and success criteria).
   - Add dependency links (`bd dep add <child> <parent>`) for tasks that must be completed in order.

4. **Update the backlog item.** Set status to `ready` in frontmatter. Add a note in the body referencing each Beads epic ID.

## Task sizing guidance

- **Too big:** If a task requires multiple files across multiple domains (e.g., backend + frontend + docs), or if it would take more than one agent session, break it down further.
- **Too small:** If a task is just renaming a variable or adding an import, it should be part of a larger task. A task should deliver a meaningful, testable unit of progress.
- **UI tasks:** No need to separate behavior from UI for review gating. All review happens when the full phase PR is opened. Focus task boundaries on logical units of work, not review checkpoints.

## See also

- [How we work](./how-we-work.md) — Backlog lifecycle and runner
- [refine-backlog-item](./refine-backlog-item.md) — Workflow that produces `refined` items
- [work-backlog-item](./work-backlog-item.md) — How agents execute individual Beads tasks
