[Docs](../../README.md) / [Development](../README.md) / [Architecture](./README.md)

# Connections

This document defines **Connections** and related concepts as the shared reference for current state. Implementation backlog is grouped under the **connections** theme; see **Backlog and theme** and **Doc updates** below.

**Primary goals:** Give agents safe, scoped read and write access to connection data, and enable bringing data from disparate sources into knowledge graphs so both the user and the agent can reason across those sources.

---

## What is a Connection?

A **connection** is a **data source** that the application can read from and write to. Data from connections is used to build or update the app’s knowledge graph(s); updates can also be written back to the connection. Connections are not the graph store itself.

### What counts as a connection

- **Local**: A folder on the system, or an app/process on the system that exposes data.
- **External/cloud**: A cloud or remote service (e.g. Slack, Google Drive, a REST API, Notion) that the user configures (credentials, endpoint, workspace, etc.).

**Local first, cloud later.** Implementation starts with **local connection types**. For **cloud/external** connections we support two paths: (1) **Load directly from source into the graph**—no local copy; read and write go to the cloud source. (2) **Localize** (optional, later feature): extract and store a local copy with minimal transformation; the user chooses whether they want a local copy of the external data. Write-back is always to the source (cloud or local); the only difference is whether the user also keeps a localized copy. The design below (registration, data structure, tools) should accommodate both local and cloud; cloud can be implemented without requiring localization first.

### Capabilities

- **Read**: Ingest or sync data from the connection into the knowledge graph(s). For local connections, data is read from the source. For cloud, we can load **directly from the source** into the graph, or (as a later feature) **localize** first with minimal transformation. How data gets into the graph is defined via **Types** (see below).
- **Write**: Update or sync data back to the **connection** (the source—folder, cloud API, etc.). Connections are inherently read+write capable; permissions and UX control which of read/write (or both) are allowed for a given connection or tool.

---

## Path from connection to graph: Types

Getting data from a connection into the graph is governed by **Types**.

- **Type**: The user’s way to define **node (label) structures** for the graph—properties, indexes, and constraints. A Type describes a kind of node (e.g. Person, Location, Book).
- **Source**: A Type can have one or more **sources**. Each source binds to a **connection** and defines:
  - The **rule for import** (how to interpret or select data from that connection).
  - **Property mapping** (connection fields → node properties).
  - A **source reference** on each node (connection id + path or id) so the agent can fetch long-form content from the connection when permitted.

So: **Connection** (data source, read/write) → **Type** (node shape + optional sources) → **Source** (connection + import rule + property mapping) → **Graph**. A Type can source data from multiple connections; the Type and its sources define how that becomes graph nodes. How graph and connection permissions interact: [Knowledge graphs](./knowledge-graphs.md).

---

## Permission system

- **Connection type**: The kind of data source (e.g. Folder, Slack, Google Drive).
- **Connection**: A specific instance (e.g. “My Project Folder”, “Slack #general”, “Drive – Work”).
- **Tools** that operate on a connection are associated with a **connection type** and optionally a **connection** (instance). Permission hierarchy (in modes) remains: **category** → **connection type** → **connection** → **tool**, for tools that act on connections (data sources). For tools that query or modify the graph, see [Knowledge graphs](./knowledge-graphs.md) (graph access).

---

## Design areas (foundation for implementation)

Three areas are planned into the design so that shared services and the first connection types can be built on a consistent foundation. Local connection types are the initial focus; the same concepts extend to cloud (direct load from source into graph; optional localization is a later feature).

### 1. Registration of connection types

A **connection type** must be defined and registered so that shared services (permissions, Types/sources, UI) can work with it. Registration is the contract: once a connection type is registered, the user can create **instances** of that type (e.g. “My Project Folder” for type Folder, “Slack #general” for type Slack).

- **Built-in**: The app ships with some connection types (e.g. Local Folder).
- **User-created**: Users can define new connection types (schema, capabilities, how to scan or list data).
- **Marketplace**: Connection types can be loaded from a marketplace or shared manifests.

The registration of a connection type should be enough for the app to offer “create connection of this type,” validate instance config, and plug into permissions and tools. What exactly is stored at registration (manifest, schema, capabilities) can be refined when building the first type.

#### Built-in vs user/marketplace: how connection types are defined and loaded

We need a design that supports **built-in** connection types (shipped with the app), **user-created** types, and **marketplace** types (loaded from elsewhere). Below are options and trade-offs so we can plan for extensibility without over-engineering the first type.

**Option A: Manifest + bundled code (built-in only for now; same manifest shape for later)**

- **Built-in**: Connection types are defined in code (handlers, tools, scan logic). A **manifest** (JSON/YAML) describes each type: id, name, instance config schema, list of tool names, optional data-structure hints. The app loads manifests from a known directory or bundle and wires them to the bundled handlers.
- **User/marketplace later**: Same manifest format. User or marketplace types would supply a manifest plus **some way to run** the type's logic (see B/C). Built-ins stay as bundled code; no dynamic code load for v1.
- **Trade-offs**: Simple for built-in. Extensibility requires deciding how user/marketplace code runs (next options).

**Option B: Manifest + sandboxed in-process code (e.g. isolated VM or restricted Node)**

- **User/marketplace**: A connection type package contains a **manifest** plus **code** (e.g. JS/TS or a small runtime). The app loads the package and runs the code in a **sandbox** (e.g. isolated Node worker, VM2, or QuickJS) with a narrow API: "list," "read," "write," "scan" — no raw filesystem or arbitrary network unless the type declares and the user approves.
- **Trade-offs**: Flexible; authors can implement any connection type. Sandboxing is hard to get right (escape risks, supply-chain). Performance and debugging can be painful. May require a small "connection SDK" so authors don't touch internals.

**Option C: Manifest + out-of-process runner (local subprocess or sidecar)**

- **User/marketplace**: A connection type package contains a **manifest** plus an **executable or script** that the app invokes as a **subprocess**. Communication via stdin/stdout or a tiny local socket. The manifest declares the binary/command and the protocol (e.g. JSON-RPC: list, read, write, scan). The app runs it with strict env and (where possible) resource limits.
- **Trade-offs**: Strong isolation; process boundary limits abuse. Cross-platform (Windows/Mac/Linux) and packaging (where does the binary come from, how is it updated) are non-trivial. Users must trust the binary. Good fit for marketplace if we're willing to ship or download platform-specific runtimes.

**Option D: Manifest + remote service (connection type runs elsewhere)**

- **User/marketplace**: The "code" for the connection type runs in a **remote service** (marketplace-hosted or user's own). The app talks to it over HTTPS with a defined API. Manifest points to the endpoint and auth method (API key, OAuth). No local code execution for the type logic.
- **Trade-offs**: No local sandbox to secure; trust and data leave the machine. Good for "connect to our SaaS" style types. Privacy and offline use are limited. Likely a later addition.

**Recommendation for planning**

- **Short term**: Implement **Option A** for built-ins. Use a **manifest shape** (id, name, instance config schema, tools, optional scan/data hints) that we can later reuse for user and marketplace types. No dynamic code load in v1. We will make a clearer decision on how to execute plugin code (B vs C vs D) later, once we learn more about how connections are used and what extensibility points are needed for an effective plugin/custom-connection-type story.
- **Medium term**: Choose between **B** (in-process sandbox) and **C** (subprocess) for user/marketplace when ready. B is simpler to ship (no binaries) but riskier; C is more work (packaging, platform matrix) but clearer isolation. We can document the manifest and a "connection type contract" (list/read/write/scan) so that when we add B or C, built-in and extensible types behave the same from the app's perspective.

### 2. Data structure for a given connection

Once a **connection instance** exists, the user (and the system) need a way to know **what data is available** from that connection.

**Predetermined by connection type**: Types will often have a fixed or well-known structure (e.g. Slack: users, conversations, threads, channels). The connection type declares or discovers this shape.

**Discoverable and Customizable** Whether or no the connection type has predetermined data types, there will be the need to allow the user to define additional data types and customize the predefined ones. To some degree scanning of the files (JSON, csv, YAML, MD Frontmatter) should enable a starting point to define these data structures.

In all cases the user should have the ability to refine the definition. The purpose of defining data types is to 1. enable mapping of the connection sourced data into knowledge graph types and 2. create permission boundaries around what an agent can or can't access for a given type

### 3. Tools available for a connection type

Each connection type defines (or declares) **what tools** are available for LLMs to work with that connection’s data. These are the abilities we expose to agents, scoped by permission (category → connection type → connection → tool).

- **Read**: Ability to read from the connection (e.g. read file, list directory, get channel). May be coarse (“read source”) or more granular (read metadata vs content, by path or query).
- **Write**: Ability to write back to the connection (e.g. create/update/delete file, post message). Again, can be coarse or granular.

Registration (or a manifest per connection type) should indicate which tools exist for that type so that permissions and mode editor can list them and so that only allowed tools are passed to the agent. The first implementation (e.g. Local Folder) can start with a small set (e.g. read file, list, write file) and expand later.

---

## First connection type (Local Folder): requirements and clarifications

Decisions below are grouped into **Requirements-ready** (clear enough to write implementation requirements) and **Needs clarification** (discuss further or decide one-by-one). This list is updated as the design firms up.

### Requirements-ready

**Registration**

- **Register a connection type**: A connection type is defined by a manifest (or in-code equivalent) with: id, display name, instance config schema, list of tool names. Optional: scan capabilities. Built-in types live in the app bundle (e.g. manifest + handlers in a known module); user/marketplace loading is future backlog.
- **Local Folder instance config**: One required field—**filesystem path**. Access to that folder **includes all subfolders and files** under it (no separate recursion depth or include/exclude patterns in v1).

**Data structure**

- **File formats (v1)**: Format-agnostic. Local Folder exposes opaque files by path; no format-specific parsing or structure in v1. (Format awareness can be added when we build Types/sources.)

**Tools**

- **Local Folder v1 tool set**: At least `list_directory`, `read_file`, `write_file`. Schemas: paths relative to connection root, encoding, and size/result limits per existing content-guardrails patterns. Single `write_file` that creates or overwrites is sufficient for v1 (no separate create/update/delete).
- **Foundation scope**: Registration API for built-in types, connection instance CRUD and storage, wiring connection type/instance into tool definitions and `getToolsForAgent`, and permission UI that supports both connection type and connection instance. Tools receive a **connection context** (e.g. connection instance id + resolved config such as path) so the handler can operate on the correct instance.

**Permissions and mode**

- **Connection instances**: Stored in a dedicated connection store (e.g. connection instances list). Mode definition is **extended** so that for a given category (e.g. local read, local write), the user can **customize** by choosing a **connection instance** (or path to a specific resource within that category) and specifying a permission value (allow/ask/deny) different from the category default. So the existing mode gains per-connection-instance overrides within categories.
- **Permission scope (v1)**: Permission **MUST** be **connection-instance-specific** and **MUST** include **connection type** as well. So the hierarchy is used in full: category default → connection type override → connection instance override → (optionally) tool override. v1 implements at least category + connection type + connection instance.
- **Allowed connections at runtime**: Resolved from the **conversation's mode**: load the mode, resolve allow/ask/deny per connection type and per connection instance from the mode's category defaults and overrides. Only connection instances that are allowed (or ask) are available to the agent. When invoking a connection-scoped tool, the runner passes the allowed connection instance id(s) and resolved config (e.g. path) into the tool context. For now the determination is the mode we are running in; **custom agents** (when implemented) will further scope down the mode (e.g. intersection of conversation mode and agent permissions).
- **Tool-call time: connection context.** When the agent calls a connection-scoped tool, the runner resolves allowed instances from the conversation's mode and passes connection instance id + resolved config (e.g. root path) into the tool handler; the tool validates that the requested path is under that root (or otherwise scoped to the instance). Confirmed.

### Needs clarification

- **Data structure (formal scan, structure for Type/source mapping).** Deferred. We do not need to define the data structure for a connection until we build support for **graph node types** (Type definitions). The backlog item for defining graph node types (see Doc updates) should include requirements for: when and how to expose connection data structure (e.g. formal scan result shape, inferred formats), and how that feeds into Type/source mapping and permission boundaries. For the first connection type (Local Folder), tools-only (list path, read file, write file) is sufficient.
---

## Summary

- **Connections** = data sources (folder, app, cloud). Read: from source into graph (local or cloud); cloud can load directly or (later) localize. Path to graph is via **Types** and **Source**. Write: sync back to the connection (source). How permissions apply to graphs vs connections: [Knowledge graphs](./knowledge-graphs.md).
- **Design areas** for implementation: (1) **Registration** of connection types (built-in, user, marketplace) so instances can be created; (2) **Data structure** for a connection (predetermined or discovered by scanning); (3) **Tools** per connection type (read/write abilities for agents, permission-scoped). Local first; cloud can load directly; optional localization is a later feature. **Built-in vs user/marketplace**: Option A (manifest + bundled code) for v1; same manifest shape for later. Options B–D (sandboxed in-process, subprocess runner, remote service) and trade-offs are documented for planning user/marketplace loading.
- **First connection type (Local Folder)**: **Requirements-ready** decisions are recorded (registration, Local Folder path = all subfolders/files, format-agnostic v1, tool set, mode extension for per-connection-instance overrides, permission type+instance, runtime resolution from mode; tool-call time connection context confirmed; custom agents will further scope mode later). **Data structure** (formal scan, structure for Type/source) deferred to the **defining graph node types** backlog item. No other open clarifications for the first connection type at this time.

---

## Backlog and theme

Backlog items that implement or extend this concept are grouped under the **connections** theme. See [Themes](../../product/themes/README.md) (theme: `connections`); the theme doc lists those items and is kept in sync via frontmatter.

---

## Doc updates (after refinement)

Updates applied: tool-permission-system, adding-a-tool, custom-agents, and multi-knowledge-graphs now align with this concept; connection-type examples use data sources only. Graph access is in [Knowledge graphs](./knowledge-graphs.md). The developer guide for adding a connection type is a **success criterion** of the connections foundation item (written after the code is in place), not a standalone doc. Backlog items are in the **connections** theme.

**Remaining:** Code — Neo4j tool definitions currently use `connectionType: 'Neo4j'`. Update so graph tools are not tagged as a connection type and are documented as subject to graph access, not connections.
