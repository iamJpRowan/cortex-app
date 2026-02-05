[Docs](../README.md) / [Backlog](./README.md) / Declarative Tool Definitions

# Declarative Tool Definitions

## Goal

Refactor the LLM tool system to use a **declarative definition + factory** pattern so that tools are defined as data (schema, metadata, handler reference) and instantiated by a shared factory. This establishes a single, scalable pattern for both built-in and user-contributed tools and prepares the codebase for user extensibility from the start.

## Motivation

The current pattern—one file per tool with a `DynamicStructuredTool` instance plus separate registration with duplicated metadata—does not scale:

- **Hundreds of tools**: Manual imports and `toolRegistry.register()` calls become unmaintainable.
- **Dozens of graph-DB tools**: Neo4j (and future graph) tools will grow; registration boilerplate multiplies.
- **User extensibility**: A plugin or user-tool system needs a consistent way to define tools without each contributor reimplementing registration, metadata, and wiring.

A declarative approach separates **what** a tool is (name, description, schema, category) from **how** it runs (handler implementation). Definitions become easy to scan, document, and generate; handlers stay testable and isolated; and a single factory can serve both built-in and user-loaded tools.

## Constraints and Requirements

- Must remain compatible with the existing [Tool Registry](../architecture/README.md) and `getToolsForAgent()` flow.
- Tool instances passed to the agent must still be LangChain `StructuredTool` (or equivalent) so the agent contract does not change.
- Metadata (name, description, category) must be the single source of truth—no duplication between definition and registration.
- The pattern should allow future user/plugin tools to be loaded from manifests or user-defined modules without diverging from built-in tool structure.

## Approach

### 1. Tool Definition Shape

A **tool definition** is a declarative object (no LangChain types at definition time):

- **name**: string (unique tool id). This is the **canonical tool ID** used in [Tool Permission System](./tool-permission-system.md) (permission sets, modes) and [Custom Agents](./custom-agents.md) frontmatter (`tools.allow` / `ask` / `deny`). Use **namespaced names** (e.g. `neo4j.count_nodes`, `web.search`, `command.invoke`) to avoid collisions when plugins add tools.
- **description**: string (for the LLM and for UI/documentation).
- **schema**: Zod schema (parameters the tool accepts).
- **handler**: string key that maps to an implementation function (or, for plugins, a loadable module path).
- **metadata**: category; **risk** (`safe` | `caution` | `dangerous`) for permission defaults and bulk actions; optional **permissionExplanation** (short text for the permission UI). The factory copies this into `ToolMetadata` at registration so the registry is the single source for permission UI and mode builder.

Definitions live in **definition files** (e.g. per-domain: `neo4j/tools.ts`, `command/tools.ts`) or in a single registry file for small sets. No `DynamicStructuredTool` or `toolRegistry` imports in definition files—only data and Zod schemas.

### 2. Handler Registry

Handlers are pure async functions with typed inputs (inferred from the schema). They live in **handler files** (e.g. `neo4j/handlers.ts`) or alongside definitions. A **handler registry** (or map) associates handler keys with implementations. Built-in tools use a direct map; user tools could resolve handler keys to loaded functions from a plugin or user script.

### 3. Factory

A single **factory** (e.g. `createToolFromDefinition(def, handlers, category)`) takes a definition and the handler map, and returns a `{ tool, metadata }` pair:

- Instantiates `DynamicStructuredTool` (or equivalent) with `name`, `description`, `schema`, and `func` bound to the correct handler.
- Derives `metadata` from the definition (and category).
- No business logic in the factory—only wiring.

A **batch factory** (e.g. `createToolsFromDefinitions(definitions, handlers, category)`) maps an array of definitions to an array of `{ tool, metadata }` for registration.

### 4. Registration

- **Built-in**: Each domain (neo4j, command, etc.) exports a list of definitions and a handler map. The built-in entry point calls the batch factory per domain and registers each result with `toolRegistry.register(tool, metadata)`.
- **User/plugin (future)**: User or plugin provides definitions (and optionally handler keys resolved from their module). The same factory produces tools; registration is identical. No second code path for “user tools.”

### 5. Documentation and Discovery

- Definitions can be walked to generate docs or a UI list of tools without loading handlers.
- **Permission system and Custom Agents**: The tool registry’s `list()` (name + metadata for every registered tool) is the single source for “all available tools.” Permission settings UI, mode builder, and agent editor all use this list to show tools and store allow/ask/deny by canonical tool name. When new tools are registered (built-in or plugin), they appear automatically. See [Tool Permission System](./tool-permission-system.md) and [Custom Agents](./custom-agents.md).
- Plugin manifests can declare tools by referencing definition shapes (e.g. JSON schema of a tool definition).

## Architectural Choices

- **Definitions as data**: Tool definitions are plain objects (or JSON-serializable) plus Zod schemas. Handlers are the only place with I/O and side effects.
- **Single factory**: One code path turns a definition + handlers into a LangChain tool and metadata. Built-in and user tools use the same path.
- **Category at registration**: Category is supplied when creating tools (e.g. `neo4j`, `builtin`, `user`) so the same definition shape can be used in different contexts.
- **No dynamic import in core**: Built-in tools are statically imported; the factory does not require dynamic `import()` for the initial implementation. Optional discovery/loading of user tools can be added later without changing the factory signature.

## Implementation Phases

### Phase 1: Factory and Types

- Add a `ToolDefinition` type (name, description, schema, handler key, optional metadata).
- Add `createToolFromDefinition(def, handlers, category)` and `createToolsFromDefinitions(defs, handlers, category)` that return `{ tool, metadata }[]` compatible with `toolRegistry.register()`.
- Add a minimal test: one definition + one handler → one registered tool that the agent can call.

### Phase 2: Migrate One Domain (e.g. Neo4j)

- Extract Neo4j tools into `neo4j/tools.ts` (definitions) and `neo4j/handlers.ts` (implementations).
- Wire definitions and handlers through the factory and register in the built-in index.
- Remove the old per-tool files (or keep them as re-exports that use the factory for a transition period).
- Verify all Neo4j tools still work in chat.

### Phase 3: Migrate Remaining Built-in Tools and Remove Echo

- **Remove the echo tool** — It is no longer needed (was only for testing); delete `builtin/echo/` and its registration.
- Migrate command and any other built-in domains to the definition + handler pattern.
- Built-in index becomes: for each domain, `createToolsFromDefinitions(domainDefs, domainHandlers, category)` then register each result.
- No per-tool `toolRegistry.register()` calls; only domain-level loops.

### Phase 4: Documentation and Conventions

- Document the definition shape and factory usage for contributors.
- Add a short “adding a new tool” guide that says: add a definition, add a handler, register the domain (or add to an existing domain list). No need to touch the registry directly.

### Phase 5 (Future): User and Plugin Tools

- When [Plugin Extensibility Framework](./plugin-extensibility-framework.md) or user-defined tools are implemented, load definitions (and optionally handlers) from plugin manifests or user directories.
- Use the same factory to produce tools; register them with a distinct category (e.g. `plugin`, `user`).
- [Tool Permission System](./tool-permission-system.md) can treat user/plugin tools with appropriate defaults (e.g. ask or deny until explicitly allowed).

## Success Criteria

- [ ] `ToolDefinition` type and factory exist; a single definition + handler produce a working tool.
- [ ] All built-in tools (including Neo4j) are defined declaratively and instantiated via the factory.
- [ ] No duplicated tool metadata (name, description) between definition and registration.
- [ ] Built-in registration is a small, domain-based loop (no long list of per-tool imports and registers).
- [ ] Documentation describes how to add a new tool using definitions and handlers.
- [ ] Pattern is documented as the intended approach for future user/plugin tools.
- [ ] Echo tool removed (no longer needed).

## Related Backlog Items

- **[Plugin Extensibility Framework](./plugin-extensibility-framework.md)** – User and plugin tools will use this definition + factory pattern; the framework can load definitions from manifests and resolve handlers from plugin code.
- **[Tool Permission System](./tool-permission-system.md)** – Tool metadata (category, risk, description) lives on definitions; permission UI and resolution can operate on definition lists without loading handlers.
- **[Configuration System](./configuration-system.md)** – Per-tool or per-plugin config can be keyed by tool name from definitions.

## Notes

- This refactor is intentionally incremental: Phase 1 is additive (factory + one migrated domain); existing tools can stay on the old pattern until migrated. No big-bang rewrite required.
- Keeping Zod in the definition (rather than raw JSON schema) preserves type safety and reuse with LangChain’s structured tools; if plugin authors use JSON schema, a small adapter can convert to Zod or the factory can accept both.
- The handler key can be a symbol or namespaced string (e.g. `neo4j.countNodes`) to avoid collisions when merging user and built-in handlers later.
- **Alignment with Tool Permission System**: Definition metadata (category, risk, permissionExplanation) is the single source of truth; the factory copies it into the registry at registration. Tool Permission System Phase 1 (Tool Metadata & Categories) is satisfied by this shape—no separate permission-specific definition is needed.
