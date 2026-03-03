---
status: considering
summary: User-defined graph node types (labels, properties, indexes, constraints) and Source (connection + import rule + property mapping); connection data structure.
themes: [connections, knowledge-graphs]
implements: development/architecture/connections.md
depends_on: [local-folder-connection-type]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Defining Graph Node Types

# Defining Graph Node Types

## Goal

Enable users to define **graph node types** (node label structures with properties, indexes, and constraints) and to bind **sources** to connections (import rule + property mapping) so that connection data can be loaded into the knowledge graph in a structured way. This item also defines when and how to expose **connection data structure** (e.g. formal scan/result shape) so that Types and sources can be configured.

## Prerequisites / Dependencies

- Connections and at least one connection type (e.g. Local Folder) so that there are connection instances to bind sources to.
- Concept: [Connections](../../development/architecture/connections.md) (path from connection to graph: Types and Source; data structure deferred to this item).

## Requirements and constraints

- **Type**: User-defined node (label) structures — properties, indexes, constraints. Types describe kinds of nodes (e.g. Person, Location, Book).
- **Source**: A Type can have one or more sources. Each source binds to a connection instance and defines: rule for import, property mapping (connection → node properties), and source reference (connection id + path/id) on each node for fetching long-form content.
- **Connection data structure**: Define when and how to expose a formal scan/result shape for a connection (e.g. list of items with inferred format: MD, JSON, CSV). Requirements for how that feeds into Type/source mapping, permission boundaries, and UI (“what’s in this connection”).

## Success criteria

- Users can define node types (label, properties, indexes, constraints) and attach sources to connection instances (import rule + property mapping).
- Data from a connection can be loaded into the graph according to Type/source definitions; nodes carry source reference for content fetch.
- Connection data structure (scan result, inferred formats) is defined and documented so implementers and UI can support Type/source configuration.

## References

- [Connections](../../development/architecture/connections.md) — Path from connection to graph: Types and Source; data structure deferred to this backlog item.
