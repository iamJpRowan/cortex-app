[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Docs cleanup

# Docs cleanup

**Intent:** Fix documentation drift—broken links, misplaced content, stale references—when processes weren't followed exactly. This workflow is **docs-only**; it does not change backlog content or the roadmap (use [backlog-grooming](./backlog-grooming.md) and [roadmap-review](./roadmap-review.md) for those).

## What to check

1. **Links** — Across `docs/` (architecture, development, user, design, product): fix broken internal links (e.g. to moved or renamed files, wrong paths). Fix links from docs to backlog items (e.g. archived items).
2. **User vs developer content** — Is any content clearly user-facing but living only in architecture or development? Note it for moving to or summarizing in `docs/user/` (see [user-docs](../feature-guides/user-docs.md)).
3. **Concept docs** — In architecture and product: any "Doc updates (after refinement)" or TODO sections that are done or obsolete? Update or remove them.
4. **Devlogs** — Do any devlogs clearly belong to a backlog item but lack `related_backlog` in frontmatter (use backlog slug: filename without `.md`)? Add it or note for the user. Do any backlog items have devlogs that reference them (via `related_backlog`) but do not list those devlogs in `devlogs` frontmatter (use devlog ID: filename without `.md`)? Add the back-link or note for the user so the relationship is bi-directional. Format: [Devlogs README](../../product/devlogs/README.md), [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md).

## Process

1. **Assess** — Review the areas above (or a scope the user specifies). Gather every finding. Do not make edits yet.
2. **Report** — Present the assessment: broken links, suggested moves, stale sections, devlogs missing `related_backlog`. Give the user full context.
3. **Confirm** — Wait for the user to confirm which updates to apply.
4. **Update** — After confirmation, make the agreed doc edits. Do not modify backlog items or the roadmap in this workflow.

## See also

- [Backlog grooming](./backlog-grooming.md) — Backlog-specific hygiene and relevance
- [Roadmap review](./roadmap-review.md) — Update roadmap current focus and sequence
- [User docs guide](../feature-guides/user-docs.md) — What belongs in user docs
- [Devlogs](../../product/devlogs/README.md) — Devlog template and `related_backlog`
