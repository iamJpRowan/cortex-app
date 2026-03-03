---
status: next
summary: Registration, connection instance store, and wiring so modes and agents can use connection-scoped tools.
themes: [connections]
implements: development/architecture/connections.md
depends_on: [tool-permission-system]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Connections Foundation

# Connections Foundation

## Goal

Implement the foundational framework for **connections**: connection type registration (manifest shape + built-in wiring), connection instance storage and CRUD, and wiring into the permission system and `getToolsForAgent` so that modes can scope permissions by connection type and connection instance, and connection-scoped tools receive the correct connection context at runtime.

## Prerequisites / Dependencies

- **[Tool Permission System](./tool-permission-system.md)** — Modes and category/permission resolution exist; this work extends modes to support connection type and connection instance overrides within categories.
- Concept: [Connections](../../development/architecture/connections.md) (requirements-ready decisions for registration, instance config, permissions, runtime resolution).

## Requirements and constraints

- **Registration**: Built-in connection types are defined by a manifest (id, name, instance config schema, list of tool names). Manifests and handlers live in the app bundle; no dynamic loading in this item.
- **Connection instance store**: Dedicated store (e.g. file or DB) for connection instances; CRUD API; each instance has type id, user-defined name, and config (e.g. for Local Folder: path).
- **Mode extension**: Extend mode definition and UI so that within a category (e.g. local read, local write) the user can add overrides per connection type and per connection instance (allow/ask/deny).
- **getToolsForAgent**: Accept conversation (with modeId); resolve allowed connection types and instances from the mode; return tools filtered and bound to allowed connection instances; pass connection context (instance id + resolved config) into tool invocation.
- **Permission hierarchy**: Category → connection type → connection instance → tool. v1 implements at least category + connection type + connection instance.

## Success criteria

- Connection type registration API exists; at least one built-in type (e.g. Local Folder) can be registered with a manifest and handlers.
- Connection instances can be created, read, updated, and deleted; stored in a dedicated store.
- Mode editor supports per–connection type and per–connection instance permission overrides within categories.
- `getToolsForAgent(conversation)` resolves allowed connection instances from the conversation’s mode and returns only tools for those instances; at tool-call time, the runner passes connection context (instance id + resolved config) to the handler.
- **Developer guide**: A guide for implementers is written: **Adding a connection type** (or equivalent), covering manifest shape, where to register, how to implement handlers that receive connection context, and how permissions apply.

## References

- [Connections](../../development/architecture/connections.md) — Concept and requirements-ready decisions.
