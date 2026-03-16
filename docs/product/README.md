---
current_focus: []
---

[Docs](../README.md) / Product

# Product

This directory holds **product direction**, **backlog**, **devlogs**, and **roadmap**—what we're building and in what order. For visual/UI design (tokens, components, accessibility), see [Design](../development/design/README.md).

## Roadmap

The **roadmap** captures the current goal and the backlog items needed to achieve it. Update it via [plan-goal](../development/agents/plan-goal.md). Grouping by theme: [Themes](./themes/).

### Current goal

**App reads and writes to the repo.** The app can connect to a local folder (the project repo), agents can read and write files via connection-scoped tools with permissions, and the user can view/edit markdown files and see diffs of agent changes.

### Items for this goal

| Backlog item | Status | Depends on |
|---|---|---|
| [Tool Permission System](./backlog/tool-permission-system.md) (Phase 8+) | `in progress` | — |
| [Connections Foundation](./backlog/connections-foundation.md) | `planned` | tool-permission-system |
| [Local Folder Connection Type](./backlog/local-folder-connection-type.md) | `planned` | connections-foundation |
| [Markdown Viewer/Editor](./backlog/markdown-viewer-editor.md) | `planned` | local-folder-connection-type |
| [Diff Viewer](./backlog/diff-viewer.md) | `planned` | local-folder-connection-type |

## Themes

- **[chat-ai](./themes/chat-ai.md)** — Chat interface, AI/LLM features, agents, tools, and related UX.
- **[configuration-extensibility](./themes/configuration-extensibility.md)** — User configuration, file loading, UI, hot reload, and plugin system for tools and integrations.
- **[connections](./themes/connections.md)** — Data sources (connections), connection types, instances, permissions, and loading data into the graph.
- **[extensions](./themes/extensions.md)** — Extensibility: custom connection types, plugins, marketplace, and user-defined integrations.
- **[knowledge-graphs](./themes/knowledge-graphs.md)** — Neo4j, multiple knowledge graphs, and enterprise upgrade.
- **[ui-features](./themes/ui-features.md)** — Layout system, sidebars, tabs, panels, drag-and-drop, and component composition.

## See also

- [How we work](../development/agents/how-we-work.md) — Backlog lifecycle and development loop
- [Backlog](./backlog/) — Backlog items
- [Design](../development/design/README.md) — Visual system and UI patterns
