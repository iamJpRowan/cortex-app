---
status: refined
summary: Registration, connection instance store, and wiring so modes and agents can use connection-scoped tools.
themes: [connections]
implements: development/architecture/connections.md
depends_on: [tool-permission-system]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Connections Foundation

# Connections Foundation

## Goal

Implement the foundational framework for **connections**: connection type registration (manifest shape + built-in wiring), connection instance storage and CRUD, and wiring into the permission system and `getToolsForAgent` so that modes can scope permissions by connection type and connection instance, and connection-scoped tools receive the correct connection context at runtime.

## Out of scope

- **User-created or marketplace connection types** — No dynamic loading of plugins or external manifests; built-in types only (see [Loading Custom Connection Types](./loading-custom-connection-types.md) for future work).
- **Graph node Types and Sources** — No definition of graph node types, property mapping, or connection data structure for graph import; deferred to [Defining Graph Node Types](./defining-graph-node-types.md).
- **Full Local Folder tool implementation** — Real tools (e.g. `list_directory`, `read_file`, `write_file`) and their handlers are implemented in [Local Folder Connection Type](./local-folder-connection-type.md). This item may register a minimal built-in type (e.g. Local Folder manifest + stub handlers that receive connection context) only to validate the registration and runtime pipeline.
- **Tool-level permission overrides** — v1 implements category + connection type + connection instance; per-tool overrides within the hierarchy are not required for this item.
- **Custom agents** — Scoping mode by agent is future work; resolution uses the conversation's mode only.

## Prerequisites / Dependencies

- **[Tool Permission System](./tool-permission-system.md)** — Modes and category/permission resolution exist; this work extends modes to support connection type and connection instance overrides within categories.
- Concept: [Connections](../../development/architecture/connections.md) (requirements-ready decisions for registration, instance config, permissions, runtime resolution).

## Requirements and constraints

- **Registration**: Built-in connection types are defined by a manifest (id, name, instance config schema, list of tool names). Manifests and handlers live in the app bundle; no dynamic loading in this item. Instance config schema can be JSON Schema or Zod; the architecture doc specifies the manifest shape. At least one built-in type must be registerable to validate the API.
- **Connection instance store**: Dedicated store (file-based or DB; implementer's choice) for connection instances with a CRUD API. Each instance has: type id, user-defined name, and config (e.g. for Local Folder: path). Store is the single source of truth for instances; no duplication in mode files.
- **Mode extension**: Extend mode definition and serialization so that within each category (e.g. read local, write local) the user can add overrides per connection type and per connection instance (allow/ask/deny). Same resolution order as in [Tool Permission System](./tool-permission-system.md): category default → connection type override → connection instance override.
- **Mode editor UI**: Extend the existing mode editor so users can view and edit connection-type and connection-instance overrides within categories. Use existing design system and app components (see References).
- **getToolsForAgent**: Signature accepts conversation (with modeId). Load the conversation's mode; resolve allowed connection types and instances from the mode's category defaults and overrides; filter tools to those allowed for those instances; bind tools to allowed connection instances. At tool-call time, the runner passes connection context (instance id + resolved config for that instance) to the handler. Tools that are not connection-scoped are unchanged (no connection context).
- **Permission hierarchy**: Category → connection type → connection instance → tool. v1 implements at least category + connection type + connection instance (tool-level override optional for this item).
- **Connection context at invocation**: Handlers for connection-scoped tools receive a connection context object (e.g. instance id, resolved config such as path) so they can operate on the correct instance; the runner is responsible for injecting this from the conversation's mode and allowed instances.

## Success criteria

- Connection type registration API exists; at least one built-in type (e.g. Local Folder) can be registered with a manifest and handlers (stub handlers acceptable to validate the pipeline).
- Connection instances can be created, read, updated, and deleted; stored in a dedicated store.
- Mode editor supports per–connection type and per–connection instance permission overrides within categories; overrides persist and load correctly.
- `getToolsForAgent(conversation)` resolves allowed connection instances from the conversation’s mode and returns only tools for those instances; at tool-call time, the runner passes connection context (instance id + resolved config) to the handler.
- **Developer guide**: A guide for implementers is written: **Adding a connection type** (or equivalent), covering manifest shape, where to register, how to implement handlers that receive connection context, and how permissions apply.

## References

- [Connections](../../development/architecture/connections.md) — Concept and requirements-ready decisions (registration, instance config, permissions, runtime resolution, Local Folder instance config).
- [Tool Permission System](./tool-permission-system.md) — Mode shape, category resolution, and existing mode editor; this item extends both.
- [Design README](../../development/design/README.md) — Design system and doc index.
- [UI guide](../../development/design/ui-guide.md) — Component usage and styling conventions.
- [App components](../../development/design/app-components.md) — App-level components and consistency patterns for mode editor UI.
