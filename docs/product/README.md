---
current_focus: []
---

[Docs](../README.md) / Product

# Product

This directory holds **product direction**, **backlog**, **devlogs**, and **roadmap**—what we're building and in what order. For visual/UI design (tokens, components, accessibility), see [Design](../development/design/README.md).

## Roadmap

The **roadmap** captures the current goal and the backlog items needed to achieve it. Update it via [plan-goal](../development/agents/plan-goal.md).

### Current goal

**App reads and writes files.** The app can connect to a local folder (the project repo), agents can read and write files via connection-scoped tools with permissions, and the user can view/edit markdown files and see diffs of agent changes.

### Items for this goal

| Backlog item | Status | Depends on |
|---|---|---|
| [Tool Permission System](./backlog/tool-permission-system.story.md) | `in progress` | — |
| [Connections Foundation](./backlog/connections-foundation.story.md) | `planned` | tool-permission-system |
| [Local Folder Connection Type](./backlog/local-folder-connection-type.story.md) | `planned` | connections-foundation |
| [Markdown Viewer/Editor](./backlog/markdown-viewer-editor.story.md) | `planned` | local-folder-connection-type |
| [Diff Viewer](./backlog/diff-viewer.story.md) | `planned` | local-folder-connection-type |

## See also

- [How we work](../development/agents/how-we-work.md) — Backlog lifecycle and development loop
- [Backlog](./backlog/) — Backlog items
- [Design](../development/design/README.md) — Visual system and UI patterns
