---
title: Key Concepts
summary: Details regarding the core concepts that the Cortex app is comprised of.
---

# Key Concepts

## Connections

A **connection** is a **data source** that the application can read from and write to. Data from connections is used to build or update the app’s knowledge graph(s); updates can also be written back to the connection. Connections are not the graph store itself.

### What counts as a connection

- **Local**: A folder on the system, or an app/process on the system that exposes data.
- **External/cloud**: A cloud or remote service (e.g. Slack, Google Drive, a REST API, Notion) that the user configures (credentials, endpoint, workspace, etc.).

### Capabilities

- **Read**: Ingest or sync data from the connection into the knowledge graph(s). For external sources, we first **extract and localize** the data in a format that involves the bare minimum transformation—ideally none. How that localized data gets into the graph is defined via **Types** (see below).
- **Write**: Update or sync data back to the connection (e.g. push notes, sync state). Connections are inherently read+write capable; permissions and UX control which of read/write (or both) are allowed for a given connection or tool.

### What is not a connection

- **Neo4j** is the **built-in graph database**. It is where graph data lives inside the app, not an external “source” in the connection sense. It does **not** fit the definition of a connection.
- **Which graphs (Neo4j DBs) an agent can use** is a **separate concept**: graph-level or knowledge-graph-level access control. That should be documented and designed alongside the permission system but under a different heading (e.g. “Graph access” or “Knowledge graph access”), not under “Connections.”

## Types

Getting data from a connection into the graph is governed by **Types**.

- **Type**: The user’s way to define **node (label) structures** for the graph—properties, indexes, and constraints. A Type describes a kind of node (e.g. Person, Location, Book).
- **Source**: A Type can have one or more **sources**. Each source binds to a **connection** and defines:
  - The **rule for import** (how to interpret or select data from that connection).
  - **Property mapping** (connection fields → node properties).

So: **Connection** (data source, read/write) → **Type** (node shape + optional sources) → **Source** (connection + import rule + property mapping) → **Graph**. A Type can source data from multiple connections; the Type and its sources define how that becomes graph nodes.

## Permission system

- **Connection type**: The kind of data source (e.g. Folder, Slack, Google Drive). Not Neo4j.
- **Connection**: A specific instance (e.g. “My Project Folder”, “Slack #general”, “Drive – Work”).
- **Tools** that operate on a connection are associated with a **connection type** and optionally a **connection** (instance). Permission hierarchy (in modes) remains: **category** → **connection type** → **connection** → **tool**, but only for tools that act on connections (data sources). Neo4j/graph tools are governed by **graph access** (and category), not by connection type/connection.

## Summary

- **Connections** = data sources (folder, app, cloud). Read: extract/localize with minimal transformation; path to graph is via **Types** (node structures) and **Source** (connection + import rule + property mapping). Write: sync back to the connection.
- **Neo4j** = built-in graph DB; not a connection. **Graph access** (which knowledge graphs agents can use) is a separate concept.
