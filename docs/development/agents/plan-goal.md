[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Plan goal

# Plan goal

**Intent:** Set a target capability and identify the epics needed to achieve it. Epics that don't exist yet are created as lightweight `planned` placeholders. Epics that already exist are pulled in and their status updated to `planned` (or left as-is if already further along).

## Process

1. **State the goal.** The user describes the target capability in plain language (e.g., "the app can read and write to my repo"). Record it in the [product README](../../product/README.md) as the current goal.

2. **Review relevant concepts and backlog.** Walk through concept docs and epics that relate to the goal. For each one:
   - Does it align with the goal? Is the scope right?
   - Are there gaps — capabilities needed that have no epic?
   - Does any concept doc need refinement before the related epic can be refined? (If so, note it; use [defining-core-concepts](./defining-core-concepts.md) in a separate session.)

3. **Identify and create epics.** For each capability needed:
   - If an epic exists and is `considering`: update status to `planned`.
   - If an epic exists and is already `refined`, `ready`, or `in progress`: leave it.
   - If no epic exists: create a lightweight `planned` epic with at minimum a goal statement and a note on what needs refinement. Use [Backlog TEMPLATE](../../product/backlog/story.TEMPLATE.md).

4. **Map dependencies.** Ensure `depends_on` is set in frontmatter for epics that block each other. This will inform story dependency order when epics are decomposed.

5. **Summarize the plan.** List the `planned` epics and their dependency order. Note which epics are already further along and which need concept refinement first.

**Output:** A set of `planned` (or further) epics that together achieve the goal, with dependencies mapped.

**What happens next:** For each `planned` epic, use [refine-backlog-item](./refine-backlog-item.md) in a separate session to get it to `refined`. Epics already `refined` or beyond proceed through the lifecycle automatically.

## See also

- [How we work](./how-we-work.md) — Backlog lifecycle and development loop
- [refine-backlog-item](./refine-backlog-item.md) — Next workflow for `planned` items
- [defining-core-concepts](./defining-core-concepts.md) — Used when a concept needs refinement before a backlog item can be refined
- [Backlog TEMPLATE](../../product/backlog/story.TEMPLATE.md) — Structure and frontmatter for new items
