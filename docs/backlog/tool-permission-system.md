[Docs](../README.md) / [Backlog](./README.md) / Tool Permission System

# Tool Permission System

## Goal

Establish a **foundational tool system** (declarative definitions + factory, single source of truth for metadata) and a **user-controlled permission system** so that (1) tools are defined consistently and scale to many tools and plugins, and (2) users authorize which tools the LLM can use via pre-configuration or runtime approval. Critical for user trust, safety, and extensibility.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Must be complete. Includes `getToolsForAgent()` helper function that this system enhances.
- **[Configuration System](./configuration-system.md)** - Should be complete. Main settings stores only the default mode key (e.g. `agents.defaultModeId`) for new chats; mode definitions live in separate files.

Can be implemented without these, but integration is cleaner if prep work exists.

## Part I: Tool Definitions (Foundation)

Tools are defined as **data** (schema, metadata, handler reference) and instantiated by a shared **factory**. This gives a single source of truth for metadata (required for the permission system), scalable registration, and a consistent path for built-in and future plugin tools.

### Why declarative definitions

The current pattern—one file per tool with a `DynamicStructuredTool` instance plus separate registration with duplicated metadata—does not scale: hundreds of tools or dozens of graph-DB tools make manual imports and `toolRegistry.register()` unmaintainable; plugins need a consistent way to define tools without reimplementing registration. A declarative approach separates **what** a tool is (name, description, schema, category) from **how** it runs (handler implementation). Definitions are easy to scan and generate; the registry’s `list()` is the single source for permission UI and mode builder.

### Constraints

- Must remain compatible with the existing Tool Registry and `getToolsForAgent()` flow. Tool instances passed to the agent must still be LangChain `StructuredTool` (or equivalent).
- Metadata (name, description, category) must be the single source of truth—no duplication between definition and registration.
- The pattern must allow future user/plugin tools to be loaded from manifests or user-defined modules without diverging from built-in tool structure.

### Tool definition shape

A **tool definition** is a declarative object (no LangChain types at definition time):

- **name**: string (unique tool id). **Canonical tool ID** used in permission modes and [Custom Agents](./custom-agents.md) frontmatter. Use **namespaced names** (e.g. `neo4j.count_nodes`, `web.search`, `command.invoke`) to avoid collisions when plugins add tools.
- **description**: string (for the LLM and for UI/documentation).
- **schema**: Zod schema (parameters the tool accepts).
- **handler**: string key that maps to an implementation function (or, for plugins, a loadable module path).
- **metadata**: **scope** (required)—`local` | `external` | `app`. **access** (required)—`read` | `write`. Category for permission resolution is derived (e.g. `"read local"`, `"write app"`). All tools, including App tools, must specify both. Optional: **connectionType** and **connection** (e.g. "Neo4j", "production"); **risk** (`safe` | `caution` | `dangerous`); **permissionExplanation** (short text for the permission UI). The factory derives category from scope + access and copies into `ToolMetadata` at registration. Tools missing scope or access are **rejected at registration**; no runtime fallback.

Definitions live in **definition files** (e.g. per-domain: `neo4j/tools.ts`, `command/tools.ts`) or in a single registry file for small sets. No `DynamicStructuredTool` or `toolRegistry` imports in definition files—only data and Zod schemas.

### Handler registry and factory

- **Handlers**: Pure async functions with typed inputs (inferred from the schema). A **handler registry** (or map) associates handler keys with implementations. Built-in tools use a direct map; user tools could resolve handler keys from a plugin or user script.
- **Factory**: `createToolFromDefinition(def, handlers, category)` takes a definition and the handler map, returns `{ tool, metadata }` compatible with `toolRegistry.register()`. Instantiates `DynamicStructuredTool` with `name`, `description`, `schema`, `func` bound to the correct handler; derives metadata from the definition. No business logic in the factory—only wiring.
- **Batch factory**: `createToolsFromDefinitions(definitions, handlers, category)` maps an array of definitions to `{ tool, metadata }[]` for registration.
- **Registration**: Each domain (neo4j, command, etc.) exports definitions and a handler map. The built-in entry point calls the batch factory per domain and registers each result with `toolRegistry.register(tool, metadata)`. No per-tool `toolRegistry.register()` calls; only domain-level loops. User/plugin (future): same factory produces tools; registration is identical.

### Discovery

- Definitions can be walked to generate docs or a UI list of tools without loading handlers.
- The tool registry’s `list()` (name + metadata for every registered tool) is the single source for “all available tools.” Permission settings UI, mode builder, and agent editor use this list. When new tools are registered (built-in or plugin), they appear automatically.

### Architectural choices

- **Definitions as data**: Tool definitions are plain objects (or JSON-serializable) plus Zod schemas. Handlers are the only place with I/O and side effects.
- **Single factory**: One code path turns a definition + handlers into a LangChain tool and metadata. Built-in and user tools use the same path.
- **Scope and access at registration**: Each tool definition has required **scope** (`local` | `external` | `app`) and **access** (`read` | `write`). Category is derived (six values: read local, write local, read external, write external, read app, write app). The factory derives category and copies into the registry. Tools missing scope or access are rejected at registration; access stays read/write for now (expandable later if needed).
- **No dynamic import in core**: Built-in tools are statically imported for the initial implementation. Optional discovery/loading of user tools can be added later without changing the factory signature.

## Part II: Key Capabilities (Permissions)

### Permission Levels
- **Allow**: Tool is always available to the LLM, no prompts
- **Ask**: LLM can request tool, user approves/denies each use at runtime
- **Deny**: Tool is never available to the LLM

### Categories and Connections

- **Categories** (six): Derived from **scope** × **access**. Each tool definition has required **scope** (`local` | `external` | `app`) and **access** (`read` | `write`). Category = e.g. `"read local"`, `"write external"`, `"read app"`, `"write app"`. Every tool belongs to exactly one category. App tools follow the same convention (e.g. `invoke_command` → scope `app`, access `write`). The tool registry **requires** scope and access for every tool; tools missing either are **rejected at registration** (no runtime fallback).
- **Connection type**: The kind of resource—e.g. "Folder", "Slack", "Neo4j". Connection types can have multiple **connections** (instances), e.g. "My Project Folder", "Slack #general", "Neo4j production". Most tools are associated with a connection type and optionally a specific connection; app-scope tools typically are not.
- **Permission hierarchy** (within a mode): **category** (default allow/ask/deny for the category) → **connection type** (override for that type) → **connection** (override for that instance) → **tool** (override for that tool). Resolution: tool override ?? connection override ?? connection type override ?? category default.

### Permission Modes

A **mode** is a named permission set: category-level defaults plus optional overrides at connection type, connection, and tool level. Modes are self-contained (no "global" permission store); each mode file uses the same convention as settings (dot notation, explicit overrides).

#### Built-in mode definitions (exact category permissions)

Each prebuilt mode defines allow/ask/deny for all six categories:

| Category       | Local Read Only | Read Only | Local Only | Full   |
|----------------|-----------------|-----------|------------|--------|
| read local     | allow           | allow     | allow      | allow  |
| write local    | deny            | deny      | allow      | allow  |
| read external  | deny            | allow     | deny       | allow  |
| write external | deny            | deny      | deny       | allow  |
| read app       | allow           | allow     | allow      | allow  |
| write app      | ask             | ask       | ask        | allow  |

**Rationale:** Local Read Only = local reads + app reads allowed; writes (local, external, write app) denied or ask. Read Only = all reads allowed; all writes denied or ask. Local Only = local read/write allowed; external denied; app read allow, write app ask. Full = all allow. Write app (e.g. invoke_command) as **ask** in restricted modes so the user is prompted before app actions; **allow** in Full.

- **Prebuilt modes**: **Local Read Only**, **Read Only**, **Local Only**, **Full**—each with category-level allow/ask/deny as in the table above. Prebuilt mode names are fixed and cannot be renamed; they can be **reset to default**. Modes can be **disabled** (hidden from selector, cannot be default).
- **User modes**: Users can **duplicate** an existing mode and **rename** (mode names must be unique). Stored as one file per mode in a dedicated directory; registry loads built-in + user mode files.
- **Scope**: One mode per conversation. Stored on the conversation (`modeId`); set at creation from default chat mode; updated when the user changes mode. Loading a conversation restores its last mode.
- **Default chat mode**: Stored in **main settings** as a single key (e.g. `agents.defaultModeId`). Only permission-related value in the main settings file.
- **Resolution**: Effective permissions are determined by the **conversation's mode** only. No global permission store; the mode is the source of truth for this backlog. (When [Custom Agents](./custom-agents.md) exist, per-agent permissions—mode or custom set—are defined there and combined with the conversation's mode.)
- **UI**: Settings tab is **Agents**. Below LLM providers, **Agent Permission** (mode) definitions are managed. Mode selector in chat is near the agent selector. Custom Agents will be added to this tab in a separate backlog item.

### Pre-Authorization (Agents tab)
- **Agents** settings tab: LLM providers at top; **Agent Permission** (mode) definitions below. Custom Agents will be added to this tab in a separate backlog item.
- View and edit modes: category-level defaults (six categories: read local, write local, read external, write external, read app, write app), then overrides by connection type, connection, and tool. One file per mode; dot notation and explicit overrides (same convention as settings).
- Prebuilt modes (Local Read Only, Read Only, Local Only, Full) can be reset to default; cannot be renamed. User modes: duplicate, rename (unique names), disable.
- All tools (from registry `list()`) must have a category; permission UI is organized by category and connection. Tools are defined via the foundation in Part I (Tool Definitions) above.

### Runtime Approval Flow
- LLM requests tool with "ask" permission
- Modal/notification shows:
  - Tool name and description
  - What the tool does
  - Arguments the LLM wants to pass
  - Approve/Deny buttons
- "Remember this decision" checkbox
- User approves or denies
- Decision optionally saved to settings

### Permission Storage

- **Main settings file**: Contains **only** the default mode for new chats (e.g. `agents.defaultModeId`). No other permission data in the main settings file.
- **Mode definitions**: One **file per mode** in a dedicated directory (e.g. `userData/modes/`). Same convention as settings: dot notation, explicit overrides. Mode registry loads built-in + user mode files. Enables sharing and extensibility.
- **No global permission store**: Each mode is self-contained. Resolution uses only the conversation's mode. (Per-agent permissions are defined in [Custom Agents](./custom-agents.md) when that primitive exists.)
- **Per-conversation mode**: Each conversation stores `modeId` in conversation metadata. Set at creation from default chat mode; updated when the user changes mode. Loading a conversation restores its last mode. **Conversation migration**: When adding `modeId` to existing conversations, use **lazy handling**—if `modeId` is null, treat as **Full** mode and optionally backfill on write. No one-off migration required; existing conversations get Full until backfilled.
- **Tools without required metadata**: Not allowed. Tool registry requires every tool to have **scope** and **access**; category is derived. Tools missing either are **rejected at registration**. No runtime fallback.
- **Tool default in a mode**: A tool's permission comes from the mode's hierarchy (category → connection type → connection → tool); see Key Capabilities.

- **Export/import**: Permission profiles and custom modes (e.g. mode files).

### Audit & History
- Log all tool invocations (what, when, arguments, result)
- Permission audit trail (what was allowed/denied)
- View history in UI
- Clear history or specific entries
- Export audit log

### Tool Metadata

Tool registry requires permission metadata per tool as specified in **Part I: Tool Definition shape**. **Scope** (`local` | `external` | `app`) and **access** (`read` | `write`) are required; category is derived (six values). Connection type and connection are optional; description, risk, permissionExplanation are supported. Registry rejects tools missing scope or access at registration.

## Phase 1: Factory and Types (Tool Definitions)
1. Add `ToolDefinition` type (name, description, schema, handler key, metadata including required **scope** and **access** and optional connectionType/connection).
2. Add `createToolFromDefinition(def, handlers, category)` and `createToolsFromDefinitions(defs, handlers, category)` that return `{ tool, metadata }[]` compatible with `toolRegistry.register()`. Derive category from scope + access (six values); **reject at registration** if scope or access is missing.
3. Add a minimal test: one definition + one handler → one registered tool that the agent can call.
4. Update tool registry schema so `ToolMetadata` includes scope, access, derived category, connectionType, connection, risk, permissionExplanation.

## Phase 2: Migrate One Domain and Categorize
1. Extract one domain (e.g. Neo4j) into definition file (e.g. `neo4j/tools.ts`) and handlers (e.g. `neo4j/handlers.ts`). Wire through the factory and register in the built-in index. Assign **scope** and **access** (and connection type where applicable) to each tool.
2. Remove the old per-tool files for that domain (or keep as re-exports during transition). Verify tools still work in chat.
3. Add scope and access to all other built-in tools so registry has full metadata; reject at registration if missing.

## Phase 3: Migrate Remaining Built-in Tools; Remove Echo
1. **Remove the echo tool** — No longer needed (was only for testing); delete `builtin/echo/` and its registration.
2. Migrate command and any other built-in domains to the definition + handler pattern. Built-in index: for each domain, `createToolsFromDefinitions(domainDefs, domainHandlers, category)` then register each result.
3. No per-tool `toolRegistry.register()` calls; only domain-level loops. Document the definition shape and “adding a new tool” guide (add definition, add handler, register the domain).

## Phase 4: Mode Storage & Permission Service
1. Permission/mode service (e.g. `src/main/services/permissions.ts` or mode registry). **Main settings**: single key for default mode (e.g. `agents.defaultModeId`). No other permission data in main settings.
2. **Mode definitions**: One file per mode in dedicated directory (e.g. `userData/modes/`); dot notation, explicit overrides. Load built-in modes (Local Read Only, Read Only, Local Only, Full) + user mode files.
3. Mode registry API: list, get, save, duplicate, reset prebuilt, disable. Add `modeId` to conversation metadata (set on create from default, update when user changes mode).

## Phase 5: Enhance `getToolsForAgent()` Function
1. Extend signature to accept conversation context so the chat's mode can be applied. (When Custom Agents exist, callers will also pass agent; see [Custom Agents](./custom-agents.md).)
2. Load conversation's mode from mode registry.
3. Resolve effective permissions per tool using the mode's hierarchy: category → connection type → connection → tool. No global permission store.
4. Filter tools: remove "deny", mark "ask" for runtime approval; pass only allowed tools to agent.
5. **Single touch point**: Callers pass conversation; executor cache key includes `modeId`. (When Custom Agents affect tool sets, cache key will include `agentId`; see Custom Agents backlog.)

## Phase 5b: Chat Mode Selector & Persistence
1. Add mode selector to chat UI, placed near the agent selector.
2. On new conversation: set conversation `modeId` from default chat mode (settings).
3. When user changes mode in chat: update conversation's `modeId` and persist.
4. When loading a conversation: restore and display its stored mode; use it in `getToolsForAgent()`.

## Phase 6: Runtime Approval Flow

**Depends on:** Minimal [Deep Agents](./deep-agents-adoption.md) adoption—harness plus `interrupt_on` for tool calls. Phase 6 does not implement custom interrupt logic; it uses Deep Agents' human-in-the-loop so one implementation path applies.

1. Adopt Deep Agents harness to the extent needed to support `interrupt_on` for tools (see Deep Agents backlog: MVP slice for this use case).
2. When LLM requests "ask" tool, Deep Agents pauses; show approval modal with tool details and arguments.
3. Handle user approve/deny; Deep Agents resumes or blocks accordingly.
4. Optionally save decision to settings ("remember this decision").
5. Return result to LLM (allow tool use or block).

## Phase 7: Agents Tab & Permission UI
1. Rename settings tab to **Agents**. LLM providers at top; **Agent Permission** (modes) below. (Custom Agents will be added to this tab later.)
2. Mode list: prebuilt (Local Read Only, Read Only, Local Only, Full) + user modes. Duplicate, rename (unique), reset prebuilt to default, disable.
3. Mode editor: category-level defaults (six categories: read local, write local, read external, write external, read app, write app), then overrides by connection type, connection, tool. Dot notation, explicit overrides. One file per mode; save to mode directory.
4. Default mode selector for new chats (reads/writes `agents.defaultModeId` in main settings).

## Phase 8: Audit & History
1. Log tool invocations to database or file
2. Create audit log viewer UI
3. Display tool usage history
4. Permission decision history
5. Export functionality
6. Clear history actions

## Phase 9 (Future): User and Plugin Tools
- When [Plugin Extensibility Framework](./plugin-extensibility-framework.md) or user-defined tools are implemented, load definitions (and optionally handlers) from plugin manifests or user directories.
- Use the same factory to produce tools; register them with a distinct category (e.g. `plugin`, `user`). Permission system treats user/plugin tools with appropriate defaults (e.g. ask or deny until explicitly allowed in a mode).

## Success Criteria

**Tool definitions (foundation):**
- [ ] `ToolDefinition` type and factory exist; a single definition + handler produce a working tool with metadata (category, etc.) in the registry
- [ ] All built-in tools are defined declaratively and instantiated via the factory; no duplicated metadata between definition and registration
- [ ] Every tool has required scope and access; category derived (six values); tools missing scope or access rejected at registration
- [ ] Built-in registration is a domain-based loop (no long list of per-tool imports and registers); echo tool removed
- [ ] Documentation describes how to add a new tool (definition + handler + register domain); pattern is the intended approach for future user/plugin tools

**Permissions:**
- [ ] Modes: prebuilt (Local Read Only, Read Only, Local Only, Full) + user modes; one file per mode; duplicate, rename (unique), reset prebuilt, disable
- [ ] Main settings contains only default mode for new chats (`agents.defaultModeId`); no other permission data in main settings
- [ ] Agents tab: LLM providers + Agent Permission (mode) management; mode editor uses category → connection type → connection → tool hierarchy
- [ ] `getToolsForAgent()` resolves permissions from the conversation's mode
- [ ] Executor cache key includes `modeId` (and later `agentId` when Custom Agents affect tools; see Custom Agents backlog)
- [ ] Runtime approval modal for "ask" tools; user can approve/deny with "remember" option
- [ ] Audit log records tool invocations; permission settings (mode files) persist across restarts
- [ ] User can select and change mode per chat; default mode for new chats; loading a conversation restores its last mode
- [ ] Export/import permission profiles and mode files

## Deep Agents Integration

The "ask" permission level (runtime approval) maps directly to LangChain Deep Agents' `interrupt_on` feature.

**How it works:**
- Tools with "ask" permission are registered with `interrupt_on: True` in Deep Agents
- When the agent attempts to use an "ask" tool, Deep Agents pauses execution
- Our UI shows the approval modal with tool details and arguments
- User approves or denies; Deep Agents resumes or blocks accordingly

**Benefits:**
- Leverages Deep Agents' built-in human-in-the-loop mechanism
- No custom interruption handling needed
- Works with sub-agents (approval happens at any depth)

## Related Backlog Items

**Depends on (recommended):**
- [Chat Interface (MVP)](./archive/chat-interface-mvp.md) - Includes `getToolsForAgent()` helper function
- [Configuration System](./configuration-system.md) - Settings storage for permissions
- [Deep Agents Adoption](./deep-agents-adoption.md) - Phase 6 (runtime approval) requires a minimal Deep Agents slice: harness + `interrupt_on` for tool calls. Implement this MVP for the single use case rather than custom interrupt logic.

**Prerequisite for:**
- [Plugin Extensibility Framework](./plugin-extensibility-framework.md) - Permission system critical before community tools

**Related:**
- [Custom Agents](./custom-agents.md) - When implemented, per-agent permissions (mode or custom set) are defined there and combined with the conversation's mode. Agent editor gets tool list from registry (same source as permission UI).
- [Configuration System](./configuration-system.md) - Per-tool or per-plugin config can be keyed by tool name from definitions.

## Notes

### Integration with Chat Interface

The Chat Interface (MVP) includes prep work to make permission integration non-breaking:

**Prep work (in Chat Interface MVP):**
- Agent initialization refactored to use `getToolsForAgent()` helper function instead of directly calling `toolRegistry.getAll()`
- This helper initially returns all tools without filtering (simple passthrough)
- Tool registry already has `permissions?: string[]` metadata field

**Permission system implementation (this backlog item):**
- Enhance `getToolsForAgent()` to accept conversation; load conversation's mode; resolve using category → connection type → connection → tool; filter and return allowed tools; mark "ask" for runtime approval. (When Custom Agents exist, agent will be passed and resolution may combine mode and agent permissions; see Custom Agents backlog.)
- Chat code: conversation metadata includes `modeId`; callers pass conversation; mode selector near agent selector. Executor cache key includes `modeId`.

**Result**: Minimal refactoring required when adding permissions. The abstraction layer is already in place.

### Critical for Safety

This system is critical for user trust and safety, especially when the plugin ecosystem enables community-contributed tools. Should be implemented before allowing user-installable plugins.

Users need confidence that:
- They know what tools are available
- They control what the LLM can do
- They can audit what the LLM has done
- Dangerous operations require explicit approval

### Permission Scope

Permissions are for **tools** (agent capabilities), not for **commands** (user-initiated actions). When the user clicks a button or uses a hotkey, they're explicitly authorizing that action. Permissions only apply to what the LLM can do autonomously or when requested by the user in chat.

### Executor cache key

The LLM executor is created with a fixed set of tools and is cached to avoid rebuilding it on every message. Because effective tools depend on the conversation's mode (and later, agent), the cache key must include those dimensions.

**Decision:**
- **Cache key (initial):** `(modelId, modeId)`. The code that gets or creates the executor (e.g. `getExecutorForModel`) accepts conversation context (at least `modeId`) and calls `getToolsForAgent({ conversation })` when building the executor. Cache lookup uses `(modelId, modeId)`.
- **When the user changes mode in a chat:** The next message uses the new mode; cache lookup with the new `modeId` may miss, creating a new executor with the new tool set. No explicit invalidation required.
- **Extensibility:** The key will be extended to `(modelId, modeId, agentId)` when Custom Agents is implemented and agents affect tool sets. No backwards compatibility concerns: the executor cache is in-memory only (cleared on restart), so extending the key simply stops hitting old entries; new entries are created with the new key shape. Existing conversations without an agent can use a default agent id (e.g. `'default'`).
- **Rationale:** Users may switch between 2–3 modes in a chat and between multiple chats; sub-agents will add more combinations. A bounded pool of executors per (model, mode [, agent]) is the right tradeoff.

### Permission storage (design decisions)

- **Main settings**: Only **default mode** for new chats (e.g. `agents.defaultModeId`). Permission data is not stored in the main settings file.
- **Mode definitions**: **One file per mode** in a dedicated directory; same convention as settings (dot notation, explicit overrides). Enables sharing, extensibility, and plugin-contributed modes.
- **Categories and connections**: Six categories derived from **scope** × **access** (scope: local | external | app; access: read | write). Hierarchy: category → connection type → connection → tool. All tools must have scope and access; rejected at registration if missing. Connection type = e.g. Folder, Slack, Neo4j; connection = instance.

### Tool definitions (foundation)

- **Incremental**: Phase 1 is additive (factory + types); Phase 2 migrates one domain; existing tools can stay on the old pattern until migrated. No big-bang rewrite required.
- **Zod in definitions**: Preserves type safety and reuse with LangChain’s structured tools; if plugin authors use JSON schema, a small adapter can convert or the factory can accept both.
- **Handler key**: Use namespaced string (e.g. `neo4j.countNodes`) to avoid collisions when merging user and built-in handlers later.
- **Single source of truth**: Definition metadata (category, connectionType, connection, risk, permissionExplanation) is copied into the registry at registration; permission UI and resolution use the registry only.

