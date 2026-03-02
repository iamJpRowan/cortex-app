[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Backlog grooming

# Backlog grooming

**Intent:** Keep the backlog accurate and relevant: fix hygiene (README vs files, status, links, archive) and evaluate whether items are still relevant, need clarification, or should be abandoned and archived.

## Hygiene

1. **Backlog view** — The [Backlog README](../../product/backlog/README.md) is generated from frontmatter (predev/pre-commit). Ensure each item has required frontmatter (`status`, `summary`) per [TEMPLATE](../../product/backlog/TEMPLATE.md).
2. **Status consistency** — For each item, is the status in frontmatter consistent with the body? Flag mismatches (e.g. `status: in progress` but body suggests work is done).
3. **Archive** — Are any items completed but not yet in `docs/product/backlog/archive/`? Move them with `status: completed`, `date_archived: YYYY-MM-DD`, and `summary`. Abandoned items: `status: abandoned`, `date_archived`, `summary`; put "Why archived" in the body, not frontmatter. See [TEMPLATE](../../product/backlog/TEMPLATE.md). No archive README; the generated Backlog README lists archived items.
4. **Links** — Check "requires:" and other links between backlog items. Fix broken or stale links (e.g. pointing to archived or renamed items).
5. **Backlog item as manifest** — For each item, if devlogs reference it (`related_backlog`), does the backlog item list those devlogs in `devlogs` (frontmatter) by devlog ID (filename without `.md`)? Add the back-link so the relationship is bi-directional. Format: [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md), [Devlogs README](../../product/devlogs/README.md).

## Relevance and lifecycle

For each item (or a subset the user chooses), evaluate:

- **Still relevant?** — Is it still aligned with product direction and worth doing? If not, consider marking for abandon (see below).
- **Needs clarification?** — Are goal, requirements, or success criteria vague or outdated? Suggest edits or flag for a design pass (e.g. [design-new-features](./design-new-features.md)).
- **Abandon?** — If the item is no longer relevant or has been superseded, propose moving it to archive with `status: abandoned`, `date_archived`, and `summary`; put the reason (e.g. "Superseded by X") in the body at the top. Get user confirmation before archiving.

## Process

1. **Assess** — Work through the hygiene checklist and, for relevance, the items the user cares about (or the full list). Do not make edits yet.
2. **Report** — Present findings: hygiene issues, relevance/clarify/abandon recommendations. Give the user full context so they can decide what to do.
3. **Confirm** — Wait for the user to confirm which updates to apply (all, some, or none).
4. **Update** — After confirmation, make the agreed changes. Update backlog README, move items to archive as needed, and fix frontmatter (e.g. `implements`, `depends_on`) where agreed.

## See also

- [Backlog README](../../product/backlog/README.md) — Backlog view (generated); [TEMPLATE](../../product/backlog/TEMPLATE.md) — structure, frontmatter, archive
- [Roadmap](../../product/README.md#roadmap) — Current focus (grooming may inform roadmap-review)
- [How we work](./how-we-work.md) — Intended development loop
