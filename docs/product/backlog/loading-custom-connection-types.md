---
status: considering
summary: Future: load user-created and marketplace connection types; plugin execution, manifest contract, extensibility points.
themes: [connections, extensions]
implements: development/architecture/connections.md
depends_on: [connections-foundation, local-folder-connection-type]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Loading Custom Connection Types

# Loading Custom Connection Types

## Goal

Enable **user-created** and **marketplace** connection types so that connection types are not limited to built-ins. This includes how plugin/custom type code is executed (sandboxed in-process, subprocess runner, or remote service), the manifest contract, and the extensibility points required for an effective plugin story. Detailed design is deferred until we have more experience with built-in connection types.

## Prerequisites / Dependencies

- **[Connections Foundation](./connections-foundation.md)** and at least one built-in connection type (e.g. Local Folder) so the manifest shape and connection-type contract are stable.
- Concept: [Connections](../../development/architecture/connections.md) — Built-in vs user/marketplace (Options A–D and trade-offs).

## Requirements and constraints

- Same manifest shape as built-ins (id, name, instance config schema, tool names, optional scan/data hints) so the app can register and offer “create connection of this type.”
- Decision required: how to execute plugin code (in-process sandbox, subprocess, or remote service); security, packaging, and cross-platform implications.
- Document a “connection type contract” (e.g. list/read/write/scan) so that built-in and extensible types behave the same from the app’s perspective.

## Success criteria

- Users can add connection types from a marketplace or user-defined package.
- Registration, instance creation, permissions, and tools work for custom types as for built-ins.
- Security and packaging approach is documented and implemented.

## References

- [Connections](../../development/architecture/connections.md) — Built-in vs user/marketplace: options and trade-offs.
