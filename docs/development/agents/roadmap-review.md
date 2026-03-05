[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Roadmap review

# Roadmap review

**Intent:** Review and update the [roadmap](../../product/README.md#roadmap) so current focus and sequence reflect the user's priorities. The roadmap is the

## Process

1. **Open the roadmap** — Read `docs/product/README.md` (Roadmap section and frontmatter `current_focus`): body (Current goal / MVP path / Also consider, Sequence by theme). Optionally read [Backlog README](../../product/backlog/README.md) (Kanban table is generated in predev and pre-commit).
2. **Review current goal (if set)** — Does the "Current goal" and its **MVP path** / **Also consider** still match what the user wants to reach? Update so the MVP path is the minimal ordered list to that capability; Also consider = related items to do in the same pass.
3. **Review current focus** — Does `current_focus` match reality (what's in progress, what's blocked, what the user wants next)? Usually the next 1–3 items from the MVP path (or sequence). Consider adding, removing, or reordering.
4. **Review sequence** — Does the order in the roadmap body (by theme) make sense given dependencies and priorities? Sequence uses theme IDs from [Themes](../../product/themes/README.md). Identify items to add, remove, or reorder.
5. **Propose changes** — Present your assessment and suggested updates: current goal and paths, `current_focus`, sequence. If backlog items were added or removed, note any needed updates to the [Backlog README](../../product/backlog/README.md) single list. Ask for the user's direction.
6. **Update** — After the user confirms, update the roadmap. If you added or removed backlog files, the Backlog README Kanban table will be updated on next pre-commit or predev. The backlog README Kanban table is regenerated on pre-commit. Do not create a devlog or dated record of the review.

## See also

- [Roadmap](../../product/README.md#roadmap) — Current focus, sequence by theme, goal / MVP path
- [Themes](../../product/themes/README.md) — Theme IDs and bi-directional linking
- [How we work](./how-we-work.md) — Intended development loop
- [Backlog README](../../product/backlog/README.md) — Full backlog list
- [Backlog README](../../product/backlog/README.md) — Kanban table (generated)
