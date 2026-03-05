---
current_focus: []
---

[Docs](../README.md) / Product

# Product

This directory holds **product direction**, **backlog**, **devlogs**, and **roadmap**—what we're building and in what order. For visual/UI design (tokens, components, accessibility), see [Design](../development/design/README.md).

## Roadmap

The **roadmap** is the single source of order for delivery. Update it via [roadmap-review](../development/agents/roadmap-review.md). Grouping by theme: [Themes](./themes/README.md) (theme ID = theme file name). Visual status: [Backlog](./backlog/README.md#active) (generated; runs in predev and pre-commit).

### Current goal (optional)

When you want to reach a specific capability (e.g. to support how you work), set a **current goal** and the paths below so you can see the MVP and what else to do in the same pass.

- **Current goal:** *(e.g. "Use app with this git repo" or "Prepare for meetings"—replace with your target capability.)*
- **MVP path:** *(Ordered list of backlog slugs that get you to the goal. Respects `depends_on`; keep minimal.)*
- **Also consider:** *(Slugs you might do in the same pass—related but not blocking.)*

Put the next 1–3 items from the MVP path (or your chosen sequence) into `current_focus` in the frontmatter above when you're ready to implement.

### Sequence

Order of delivery, grouped by theme. Reorder and edit to match your priorities. Use backlog slugs or links; theme IDs match [themes](./themes/README.md).

#### configuration-extensibility

1. configuration-system
2. *(add more as needed)*

#### chat-ai

1. tool-permission-system
2. bounded-tool-results-and-chat-ui-stability
3. *(order remaining chat-ai items as you prefer)*

#### ui-features

1. ui-layout-framework
2. drag-and-drop-system
3. component-composition-system
4. chat-sidebar-integration *(depends on chat + UI layout)*

#### knowledge-graphs

1. multi-knowledge-graphs
2. neo4j-enterprise-upgrade

When you run [roadmap-review](../development/agents/roadmap-review.md), update `current_focus`, this sequence, and the current goal / MVP path / Also consider section as needed.

<!-- generated -->

## Active

| ready to test | in progress | designing |
|--------|--------|--------|
| — | **[Tool Permission System](./backlog/tool-permission-system.md)** — Foundational tool definitions and user-controlled permissions (modes, runtime approval). Critical for trust and extensibility. [Feb 16 Tool Permission System Phase 1](./devlogs/2026-02-16-tool-permission-system-phase-1.md)<br>[Feb 23 Tool Permission Modes Ui And Shared Config](./devlogs/2026-02-23-tool-permission-modes-ui-and-shared-config.md) | — |

## Themes

- **[chat-ai](./themes/chat-ai.md)** — Chat interface, AI/LLM features, agents, tools, and related UX.
- **[configuration-extensibility](./themes/configuration-extensibility.md)** — User configuration, file loading, UI, hot reload, and plugin system for tools and integrations.
- **[connections](./themes/connections.md)** — Data sources (connections), connection types, instances, permissions, and loading data into the graph.
- **[extensions](./themes/extensions.md)** — Extensibility: custom connection types, plugins, marketplace, and user-defined integrations.
- **[knowledge-graphs](./themes/knowledge-graphs.md)** — Neo4j, multiple knowledge graphs, and enterprise upgrade.
- **[ui-features](./themes/ui-features.md)** — Layout system, sidebars, tabs, panels, drag-and-drop, and component composition.


<!-- /generated -->

## See also

- [How we work](../development/agents/how-we-work.md) — Intended development loop
- [Backlog](./backlog/README.md) — Backlog view (generated in predev and pre-commit)
- [Design](../development/design/README.md) — Visual system and UI patterns
