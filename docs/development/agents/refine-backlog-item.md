[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Refine backlog item

# Refine backlog item

**Intent:** Take a `planned` epic (or story) and refine it to the point where an agent can decompose it without further human input. The item moves from `planned` to `refined`.

**How the user may start:** The user points at a `planned` epic or story (by name, file, or link). They may have context from the `plan-goal` session or may be picking up a `planned` item cold.

**Doc as state:** The backlog doc is the source of truth. Prefer updating the doc over long chat replies. Use chat for questions and short summaries.

## What "refined" means

An epic or story is `refined` when it has all of the following:

- **Goal** — Clear statement of what the feature achieves.
- **Out-of-scope** — What this item explicitly does not cover.
- **Requirements and constraints** — Functional (and non-functional) requirements, prerequisites, limitations. Enough detail that an agent can make implementation decisions without guessing.
- **Success criteria** — How to verify the feature is complete. Must be concrete and testable.
- **Dependencies** — `depends_on` in frontmatter for any blocking backlog items.
- **References** — Architecture, development, and design docs that implementers will need. If the item has UI, include [design README](../design/README.md), [ui-guide](../design/ui-guide.md), and [app-components](../design/app-components.md).

Implementation approach is **not** decided here — that happens when the work is done (see [work-backlog-item](./work-backlog-item.md)).

## Process

1. **Open the epic or story doc.** Read the current state. If it's a lightweight placeholder from `plan-goal`, it may only have a goal statement.

2. **Clarify and flesh out.** Work through each element of "refined" above. Ask the user when requirements are ambiguous. If a concept doc needs refinement first, stop and suggest a [defining-core-concepts](./defining-core-concepts.md) session for that concept before continuing.

3. **Consider splitting or phasing.** If the epic is too large or covers multiple independent capabilities, help the user split it into multiple epics. Each epic should be independently implementable and testable. If the epic is best delivered incrementally (e.g. story 1 builds the foundation, story 2 adds on top), use story phases instead of splitting. Each story phase gets its own `## Phase N: Title` section with its own scope and success criteria. Stories are worked sequentially — each produces a separate branch and PR for review before the next begins.

4. **Update the doc.** Ensure the epic or story has all required elements. Set status to `refined` in frontmatter.

5. **Review related docs.** Update architecture, development, or design docs if this refinement changes or clarifies anything. Note updates in the epic body or devlog.

**Output:** A `refined` epic or story. No further human input is needed — the next step ([decompose-backlog-item](./decompose-backlog-item.md)) is fully automated.

## See also

- [How we work](./how-we-work.md) — Backlog lifecycle and hierarchy
- [plan-goal](./plan-goal.md) — Workflow that produces `planned` epics
- [decompose-backlog-item](./decompose-backlog-item.md) — Next workflow (automated)
- [Backlog TEMPLATE](../../product/backlog/story.TEMPLATE.md) — Structure and frontmatter
- [defining-core-concepts](./defining-core-concepts.md) — Use when a concept needs refinement first
