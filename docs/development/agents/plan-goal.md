[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Plan goal

# Plan goal

**Intent:** Set a target capability and identify the backlog items needed to achieve it. Items that don't exist yet are created as lightweight `planned` placeholders. Items that already exist are pulled in and their status updated to `planned` (or left as-is if already further along).

## Process

1. **State the goal.** The user describes the target capability in plain language (e.g., "the app can read and write to my repo"). Record it in the [product README](../../product/README.md) as the current goal.

2. **Review relevant concepts and backlog.** Walk through concept docs and backlog items that relate to the goal. For each one:
   - Does it align with the goal? Is the scope right?
   - Are there gaps — capabilities needed that have no backlog item?
   - Does any concept doc need refinement before the related backlog item can be refined? (If so, note it; use [defining-core-concepts](./defining-core-concepts.md) in a separate session.)

3. **Identify and create backlog items.** For each capability needed:
   - If a backlog item exists and is `considering`: update status to `planned`.
   - If a backlog item exists and is already `refined`, `ready`, or `in progress`: leave it.
   - If no backlog item exists: create a lightweight `planned` item with at minimum a goal statement and a note on what needs refinement. Use [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md).

4. **Map dependencies.** Ensure `depends_on` is set in frontmatter for items that block each other. This will feed into the Beads dependency graph when items are decomposed.

5. **Summarize the plan.** List the `planned` items and their dependency order. Note which items are already further along and which need concept refinement first.

**Output:** A set of `planned` (or further) backlog items that together achieve the goal, with dependencies mapped.

**What happens next:** For each `planned` item, use [refine-backlog-item](./refine-backlog-item.md) in a separate session to get it to `refined`. Items already `refined` or beyond proceed through the lifecycle automatically.

## See also

- [How we work](./how-we-work.md) — Backlog lifecycle and development loop
- [refine-backlog-item](./refine-backlog-item.md) — Next workflow for `planned` items
- [defining-core-concepts](./defining-core-concepts.md) — Used when a concept needs refinement before a backlog item can be refined
- [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md) — Structure and frontmatter for new items
