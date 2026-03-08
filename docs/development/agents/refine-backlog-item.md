[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Refine backlog item

# Refine backlog item

**Intent:** Take a `planned` backlog item and refine it to the point where an agent can decompose it into session-sized Beads tasks without further human input. The item moves from `planned` to `refined`.

**How the user may start:** The user points at a `planned` backlog item (by name, file, or link). They may have context from the `plan-goal` session or may be picking up a `planned` item cold.

**Doc as state:** The backlog doc is the source of truth. Prefer updating the doc over long chat replies. Use chat for questions and short summaries.

## What "refined" means

A backlog item is `refined` when it has all of the following:

- **Goal** — Clear statement of what the feature achieves.
- **Out-of-scope** — What this item explicitly does not cover.
- **Requirements and constraints** — Functional (and non-functional) requirements, prerequisites, limitations. Enough detail that an agent can make implementation decisions without guessing.
- **Success criteria** — How to verify the feature is complete. Must be concrete and testable.
- **Dependencies** — `depends_on` in frontmatter for any blocking backlog items.
- **References** — Architecture, development, and design docs that implementers will need. If the item has UI, include [design README](../design/README.md), [ui-guide](../design/ui-guide.md), and [app-components](../design/app-components.md).

Implementation approach is **not** decided here — that happens when the work is done (see [work-backlog-item](./work-backlog-item.md)).

## Process

1. **Open the backlog item.** Read the current state. If it's a lightweight placeholder from `plan-goal`, it may only have a goal statement.

2. **Clarify and flesh out.** Work through each element of "refined" above. Ask the user when requirements are ambiguous. If a concept doc needs refinement first, stop and suggest a [defining-core-concepts](./defining-core-concepts.md) session for that concept before continuing.

3. **Consider splitting.** If the item is too large or covers multiple independent capabilities, help the user split it into multiple items. Each item should be independently implementable and testable.

4. **Update the doc.** Ensure the backlog item has all required elements. Set status to `refined` in frontmatter.

5. **Review related docs.** Update architecture, development, or design docs if this refinement changes or clarifies anything. Note updates in the backlog item body or devlog.

**Output:** A `refined` backlog item. No further human input is needed — the next step ([decompose-backlog-item](./decompose-backlog-item.md)) is fully automated.

## See also

- [How we work](./how-we-work.md) — Backlog lifecycle
- [plan-goal](./plan-goal.md) — Workflow that produces `planned` items
- [decompose-backlog-item](./decompose-backlog-item.md) — Next workflow (automated)
- [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md) — Structure and frontmatter
- [defining-core-concepts](./defining-core-concepts.md) — Use when a concept needs refinement first
