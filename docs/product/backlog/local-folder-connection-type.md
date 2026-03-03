---
status: considering
summary: First connection type: Local Folder (path = all subfolders/files); agent tools list_directory, read_file, write_file.
themes: [connections]
implements: development/architecture/connections.md
depends_on: [connections-foundation]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Local Folder Connection Type

# Local Folder Connection Type

## Goal

Implement the **Local Folder** connection type so users can add a folder as a connection instance and agents can read and write files within that folder (and all subfolders) via connection-scoped tools, with permissions controlled by the connection foundation (mode → connection type + instance).

## Prerequisites / Dependencies

- **[Connections Foundation](./connections-foundation.md)** — Registration, instance store, mode extension, and tool wiring must be in place.
- Concept: [Connections](../../development/architecture/connections.md) (Requirements-ready: path = all subfolders/files, format-agnostic v1, tool set).

## Requirements and constraints

- **Instance config**: Single required field — filesystem path. Access includes all subfolders and files under that path (no recursion depth or include/exclude patterns in v1).
- **Tools**: At least `list_directory`, `read_file`, `write_file`. Paths relative to connection root; encoding and size limits per content-guardrails. Single `write_file` that creates or overwrites.
- **Format**: Format-agnostic v1 (opaque files by path; no format-specific parsing or structure).
- **Connection context**: Handlers receive connection context (instance id + resolved path); validate requested path is under the connection root.

## Success criteria

- User can create a Local Folder connection instance (path only).
- Agent can call list_directory, read_file, write_file for that instance when the mode allows it; tool results are bounded per existing guardrails.
- Permission is enforced at connection type and connection instance level (mode overrides).

## References

- [Connections](../../development/architecture/connections.md) — First connection type (Local Folder) requirements-ready section.
