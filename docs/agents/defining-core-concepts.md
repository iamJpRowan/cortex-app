[Docs](../README.md) / [Agents](./README.md) / Defining core concepts

# Defining core concepts

**Intent:** Define or refine how the product or system works (e.g. connections, permissions, data flow) so it can be implemented cleanly and deliver value. The result is an updated concept doc and a **trickle-down** of documentation: architecture, user docs, developer guides, and backlog items.

## Concept doc location

The concept doc lives in:

- **`docs/development/architecture/`** — For technical/system concepts (e.g. connections, data flow, principles). Example: [connections.md](../architecture/connections.md).
- **`docs/product/`** — For product-level concepts or direction (e.g. product principles, vision).

Create or open the appropriate file; that file is the **source of truth** you refine.

## Process

1. **Identify the concept doc** — User may point at a file (e.g. `architecture/connections.md`) or name a concept; open or create the doc in `docs/development/architecture/` or `docs/product/`.
2. **Doc as state** — All refinement happens by **editing the concept doc**. Use chat for questions, short summaries, and "should we add X?" Do not keep the full definition in chat. Update the doc after each non-trivial agreement.
3. **Iterate** — Clarify boundaries (in/out), relationships to other concepts, and behavior. Repeat until the user is satisfied.
4. **Ripple (after concept is stable)** — Update the rest of the docs so they align:
   - **Architecture** — Ensure the concept doc is linked from [architecture/README.md](../architecture/README.md). Update other architecture docs (e.g. principles, data-flow) if they reference this concept.
   - **User docs** — Add or update `docs/user/` so users understand the concept (e.g. extend [concepts.md](../../user/concepts.md) or add a dedicated user-facing doc). Use [user-docs](../feature-guides/user-docs.md) for conventions.
   - **Developer docs** — Add or update guides so implementers follow the concept (e.g. "when adding a connection type…" in a development doc). Put mandatory rules in developer docs, not only in the concept doc.
   - **Backlog** — Create or update backlog items that implement or refine the concept. Link the **concept doc** from those items (e.g. in frontmatter: `implements: "[[development/architecture/connections]]"`). Add **themes** in frontmatter if applicable (plain string IDs, e.g. `["connections"]`). In the concept doc, add or update **implemented_by** in frontmatter (list of backlog slugs/paths) or a "Backlog items" section. See [Backlog TEMPLATE](../../product/backlog/TEMPLATE.story.md) for structure and frontmatter.
5. **Checklist** — Confirm: concept doc updated; architecture linked; user docs updated; developer docs updated; backlog items created/updated and linked both ways (concept + themes).

## See also

- [Agents guide](./README.md) — Development loop and lifecycle
- [Story TEMPLATE](../../product/backlog/TEMPLATE.story.md) — Backlog structure and frontmatter (`implements`, `depends_on`, `devlogs`, `themes`)
- [User docs](../feature-guides/user-docs.md) — Creating user docs
- [Architecture](../architecture/README.md) — Architecture docs index
