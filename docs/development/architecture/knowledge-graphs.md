[Docs](../../README.md) / [Development](../README.md) / [Architecture](./README.md)

# Knowledge Graphs

Lightweight concept: what knowledge graphs are in Cortex and how permissions apply.

## What is a knowledge graph

The app uses a graph database (Neo4j) to store **knowledge graphs**. The user can create and manage multiple graphs (e.g. for different domains). Data gets into the graph from **connections** (data sources) via **Types** and **Source**—see [Connections](./connections.md).

**What the graph holds:** Relationship and property data (structure, metadata, links). Long-form content (document body, file content) remains in the **source** (the connection). The graph is the place to reason over structure; to get full content for a node, the agent reads from the connection via connection tools.

**Source reference:** Nodes that come from a connection carry a source reference (connection id + path or id) so the agent knows where to fetch content. Connection tools enforce **connection permission** when returning that content.

## Permissions (graph access)

**Which graphs an agent can read from** is a separate permission from connection access. The user chooses which knowledge graphs each agent (or conversation mode) is allowed to query. This is **graph access** (or “knowledge graph access”): graph-level or knowledge-graph-level allow/deny.

**Two permission paths:** (1) **Graph read** — which graphs the agent can query. (2) **Connection permission** — which connections the agent can read from or write to via connection tools. Both apply: the agent needs graph read to see nodes/relationships, and connection permission to fetch long-form content from a connection for a node. Tools that query or modify the graph are governed by graph access (and category); tools that act on connection data are governed by connection type/connection in the mode. See [Tool Permission System](../../product/backlog/tool-permission-system.md) and [Connections](./connections.md).
