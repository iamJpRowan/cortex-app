---
status: planned
summary: View and edit markdown files from a connected local folder within the app.
themes: [ui-features, connections]
depends_on: [local-folder-connection-type]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Markdown Viewer Editor

# Markdown Viewer Editor

## Goal

Allow the user to view and edit markdown files from a connected local folder directly within the app. This is the first file-type-specific capability built on top of the local folder connection.

## Prerequisites / Dependencies

- **[Local Folder Connection Type](./local-folder-connection-type.md)** — The app must be able to read and write files from a connected folder before it can render or edit them.

## Requirements and constraints

*Needs refinement.* Open design questions:

- Where does the markdown viewer live in the UI? A panel? A tab? A sidebar view?
- What level of editing? Basic text editing with preview, or a rich markdown editor?
- How does the user navigate to a file? File tree, search, or agent-suggested?
- Save behavior: auto-save, explicit save, or both?

## Success criteria

*To be defined during refinement.*

## References

- [Connections](../../development/architecture/connections.md) — Connection concept and Local Folder requirements.
- [Local Folder Connection Type](./local-folder-connection-type.md) — Prerequisite backlog item.
