---
date: 2026-02-16
tags: [tools, permissions, backlog]
related_files: [docs/backlog/tool-permission-system.md, src/main/services/llm/tools/]
outcome: Phase 1 (Factory and Types) implemented; minimal test delayed.
---

# Context

Started implementing the [Tool Permission System](docs/backlog/tool-permission-system.md) backlog item. Phase 1 establishes the foundational tool definition shape and factory so tools can be defined declaratively and metadata (scope, access, category) is the single source of truth for the future permission system.

# Solution

- **Definition types** (`definition-types.ts`): Added `ToolScope`, `ToolAccess`, `ToolCategory`, `deriveCategory()`, `ToolDefinitionMetadata`, and declarative `ToolDefinition` (name, description, schema, handler key, metadata). No LangChain imports in this file.
- **Registry** (`registry.ts`): Extended `ToolMetadata` with required `scope`, `access`, and `category`, plus optional `connectionType`, `connection`, `risk`, `permissionExplanation`. Renamed the stored shape from `ToolDefinition` to `RegisteredTool` so "ToolDefinition" is the declarative input type.
- **Factory** (`factory.ts`): `createToolFromDefinition(def, handlers)` and `createToolsFromDefinitions(defs, handlers)` build a LangChain `DynamicStructuredTool` and `ToolMetadata` from a definition and handler map. Category is derived from scope + access; definitions missing scope or access (or a missing handler key) throw at creation.
- **Built-in registration**: Updated the three existing tools (echo, count_nodes, invoke_command) to pass `scope`, `access`, and `category` so they satisfy the new metadata shape.

# Outcome

- Phase 1 is done. Tool definitions can be added in a separate step (Phase 2) by migrating one domain (e.g. Neo4j) to the definition + handler pattern and wiring it through the factory.
- Minimal test was deferred until the project has a test framework (per user decision).

# Notes

- The factory does not take a `category` parameter; category is always derived from definition metadata.
- Exports: `tools/index.ts` now exports `definition-types` and `factory` so domain definition files can import types without pulling in the registry.

---

## Phase 2 (same session)

- Migrated Neo4j domain to definition + handler pattern: `builtin/neo4j/tools.ts` (one definition), `builtin/neo4j/handlers.ts`. Built-in index registers Neo4j via `createToolsFromDefinitions(neo4jToolDefinitions, neo4jHandlers)` in a loop. Removed `builtin/neo4j/count-nodes.tool.ts`.
- Tool name **`neo4j_count_nodes`** (namespaced with underscore). Provider APIs (e.g. Anthropic) require tool names to match `^[a-zA-Z0-9_-]{1,128}$`—no dots. Use underscores for namespacing (e.g. `neo4j_count_nodes`, `command_invoke`).
- Type fix: factory returns `DynamicStructuredTool` with generics that don’t match `StructuredTool` in the registry; added `as StructuredTool` when registering factory-created tools.

---

## Phase 3 (same session)

- **Echo removed:** Deleted `builtin/echo/` and its registration.
- **Command domain migrated:** `builtin/command/tools.ts` exports `getCommandToolDefinitions()` (dynamic schema from command registry); `builtin/command/handlers.ts` exports `commandHandlers` with `command_invoke`. Tool name **`command_invoke`** (was `invoke_command`). Deleted `builtin/command/invoke-command.tool.ts`.
- **Adding-a-tool guide:** [docs/development/adding-a-tool.md](docs/development/adding-a-tool.md), linked from the development guide.
