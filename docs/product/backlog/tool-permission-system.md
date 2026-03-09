---
status: in progress
themes: [chat-ai]
summary: Foundational tool definitions and user-controlled permissions (modes, runtime approval). Critical for trust and extensibility.
depends_on: [configuration-system]
devlogs: [2026-02-16-tool-permission-system-phase-1, 2026-02-23-tool-permission-modes-ui-and-shared-config, 2026-03-08-tool-permission-system-phase-8, 2026-03-09-tool-permission-system-phase-9]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Tool Permission System

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

- **name**: string (unique tool id). **Canonical tool ID** used in permission modes and [Custom Agents](./custom-agents.md) frontmatter. Use **namespaced names** with underscores (e.g. `neo4j_count_nodes`, `command_invoke`). Many provider APIs (e.g. Anthropic) require names to match `^[a-zA-Z0-9_-]{1,128}$`—no dots.
- **description**: string (for the LLM and for UI/documentation).
- **schema**: Zod schema (parameters the tool accepts).
- **handler**: string key that maps to an implementation function (or, for plugins, a loadable module path).
- **metadata**: **scope** (required)—`local` | `external` | `graph` | `app`. **access** (required)—`read` | `write`. Category for permission resolution is derived (e.g. `"read local"`, `"write graph"`, `"write app"`). All tools, including App tools, must specify both. Optional: **connectionType** and **connection** for tools that operate on **data-source connections** (e.g. "Folder", "Slack", "Google Drive"—see [Connections](../../development/architecture/connections.md)). Graph tools use scope **graph** and are governed by **graph access** (which graphs the agent can use). Optional: **risk** (`safe` | `caution` | `dangerous`); **permissionExplanation** (short text for the permission UI). The factory derives category from scope + access and copies into `ToolMetadata` at registration. Tools missing scope or access are **rejected at registration**; no runtime fallback.

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
- **Scope and access at registration**: Each tool definition has required **scope** (`local` | `external` | `graph` | `app`) and **access** (`read` | `write`). Category is derived (eight values: read local, write local, read external, write external, read graph, write graph, read app, write app). The factory derives category and copies into the registry. Tools missing scope or access are rejected at registration; access stays read/write for now (expandable later if needed).
- **No dynamic import in core**: Built-in tools are statically imported for the initial implementation. Optional discovery/loading of user tools can be added later without changing the factory signature.

## Part II: Key Capabilities (Permissions)

### Permission Levels
- **Allow**: Tool is always available to the LLM, no prompts
- **Ask**: LLM can request tool, user approves/denies each use at runtime
- **Deny**: Tool is never available to the LLM

### Categories and Connections

- **Categories** (eight): Derived from **scope** × **access**. Each tool definition has required **scope** (`local` | `external` | `graph` | `app`) and **access** (`read` | `write`). Category = e.g. `"read local"`, `"write external"`, `"read graph"`, `"write graph"`, `"read app"`, `"write app"`. Every tool belongs to exactly one category. Graph tools use scope **graph** so users can allow/deny graph access independently of external (APIs, Slack, etc.). App tools follow the same convention (e.g. `invoke_command` → scope `app`, access `write`). The tool registry **requires** scope and access for every tool; tools missing either are **rejected at registration** (no runtime fallback).
- **Connection type**: The kind of **data source** (e.g. "Folder", "Slack", "Google Drive"). Connection types can have multiple **connections** (instances), e.g. "My Project Folder", "Slack #general", "Drive – Work". Most tools that act on data sources are associated with a connection type and optionally a specific connection; app-scope and graph-scope tools typically are not. Which graphs an agent can read from is a separate concept (**graph access**).
- **Permission hierarchy** (within a mode): **category** (default allow/ask/deny for the category) → **connection type** (override for that type) → **connection** (override for that instance) → **tool** (override for that tool). Resolution: tool override ?? connection override ?? connection type override ?? category default.

### Permission Modes

A **mode** is a named permission set: category-level defaults plus optional overrides at connection type, connection, and tool level. Modes are self-contained (no "global" permission store); each mode file uses the same convention as settings (dot notation, explicit overrides).

#### Built-in mode definitions (exact category permissions)

Each prebuilt mode defines allow/ask/deny for all eight categories:

| Category        | Local Read Only | Read Only | Local Only | Full   |
|-----------------|-----------------|-----------|------------|--------|
| read local      | allow           | allow     | allow      | allow  |
| write local     | deny            | deny      | allow      | allow  |
| read external   | deny            | allow     | deny       | allow  |
| write external  | deny            | deny      | deny       | allow  |
| read graph      | deny            | deny      | deny       | allow  |
| write graph     | deny            | deny      | deny       | allow  |
| read app       | allow           | allow     | allow      | allow  |
| write app      | ask             | ask       | ask        | allow  |

**Rationale:** Local Read Only = local reads + app reads allowed; writes (local, external, graph, write app) denied or ask. Read Only = all reads allowed; all writes denied or ask. Local Only = local read/write allowed; external and graph denied; app read allow, write app ask. Full = all allow. Graph is a separate scope so users can control graph-DB access independently. Write app (e.g. invoke_command) as **ask** in restricted modes so the user is prompted before app actions; **allow** in Full.

- **Prebuilt modes**: **Local Read Only**, **Read Only**, **Local Only**, **Full**—each with category-level allow/ask/deny as in the table above. Prebuilt mode names are fixed and cannot be renamed; they can be **reset to default**. Modes can be **disabled** (hidden from selector, cannot be default).
- **User modes**: Users can **duplicate** an existing mode and **rename** (mode names must be unique). Stored as one file per mode in a dedicated directory; registry loads built-in + user mode files.
- **Scope**: One mode per conversation. Stored on the conversation (`modeId`); set at creation from default chat mode; updated when the user changes mode. Loading a conversation restores its last mode.
- **Default chat mode**: Stored in **main settings** as a single key (e.g. `agents.defaultModeId`). Only permission-related value in the main settings file.
- **Resolution**: Effective permissions are determined by the **conversation's mode** only. No global permission store; the mode is the source of truth for this backlog. (When [Custom Agents](./custom-agents.md) exist, per-agent permissions—mode or custom set—are defined there and combined with the conversation's mode.)
- **UI**: Settings tab is **Agents**. Below LLM providers, **Agent Permission** (mode) definitions are managed. Mode selector in chat is near the agent selector. Custom Agents will be added to this tab in a separate backlog item.

### Pre-Authorization (Agents tab)
- **Agents** settings tab: LLM providers at top; **Agent Permission** (mode) definitions below. Custom Agents will be added to this tab in a separate backlog item.
- View and edit modes: category-level defaults (eight categories: read local, write local, read external, write external, read graph, write graph, read app, write app), then overrides by connection type, connection, and tool. One file per mode; dot notation and explicit overrides (same convention as settings).
- Prebuilt modes (Local Read Only, Read Only, Local Only, Full) can be reset to default; cannot be renamed. User modes: duplicate, rename (unique names), disable.
- All tools (from registry `list()`) must have a category; permission UI is organized by category and connection. Tools are defined via the foundation in Part I (Tool Definitions) above.

### Runtime Approval Flow
- LLM requests tool with "ask" permission; execution pauses until user acts.
- User must be able to (1) see that a chat is awaiting approval when that chat is not in focus (e.g. sidebar indicator), and (2) see and use the approval UI when they switch to that chat (approval lives in-conversation, not in a global modal).
- Approval UI shows: tool name, description, arguments the LLM wants to pass; Approve and Deny actions.
- User approves or denies; result returned to LLM (tool runs) or request blocked (LLM receives refusal).

### Permission Storage

- **Main settings file**: Contains **only** the default mode for new chats (e.g. `agents.defaultModeId`). No other permission data in the main settings file.
- **Mode definitions**: One **file per mode** in a dedicated directory (e.g. `userData/modes/`). Same convention as settings: dot notation, explicit overrides. Mode registry loads built-in + user mode files. Enables sharing and extensibility.
- **No global permission store**: Each mode is self-contained. Resolution uses only the conversation's mode. (Per-agent permissions are defined in [Custom Agents](./custom-agents.md) when that primitive exists.)
- **Per-conversation mode**: Each conversation stores `modeId` in conversation metadata. Set at creation from default chat mode; updated when the user changes mode. Loading a conversation restores its last mode. **Conversation migration**: When adding `modeId` to existing conversations, use **lazy handling**—if `modeId` is null, treat as **Full** mode and optionally backfill on write. No one-off migration required; existing conversations get Full until backfilled.
- **Tools without required metadata**: Not allowed. Tool registry requires every tool to have **scope** and **access**; category is derived. Tools missing either are **rejected at registration**. No runtime fallback.
- **Tool default in a mode**: A tool's permission comes from the mode's hierarchy (category → connection type → connection → tool); see Key Capabilities.

- **Export/import**: Permission profiles and custom modes (e.g. mode files).

### Audit & History *(deferred)*
- *Not in current scope.* Per-conversation trace already shows tool use in that chat. A dedicated audit log (cross-conversation tool invocations, permission decision history, viewer, export, clear) was Phase 10 and is **skipped** for now; may be revisited when plugins or compliance needs justify it.
- If implemented later: log tool invocations and permission decisions, viewer UI, export, clear.

### Tool Metadata

Tool registry requires permission metadata per tool as specified in **Part I: Tool Definition shape**. **Scope** (`local` | `external` | `graph` | `app`) and **access** (`read` | `write`) are required; category is derived (eight values). Connection type and connection are optional; description, risk, permissionExplanation are supported. Registry rejects tools missing scope or access at registration.

## Phase 1: Factory and Types (Tool Definitions)

**Status:** Done. Minimal test delayed (per decision).

### Approach (Phase 1)

- **Scope**
  - **Declarative tool type:** Add a new type for the declarative definition (name, description, schema, handler key, metadata with required `scope` and `access`, optional connectionType, connection, risk, permissionExplanation). The registry currently uses `ToolDefinition` for the *registered* pair `{ tool, metadata }`; we will rename that to `RegisteredTool` (or `ToolEntry`) and use `ToolDefinition` for the declarative shape so the backlog’s naming is the source of truth.
  - **Factory:** New module `src/main/services/llm/tools/factory.ts` with:
    - `createToolFromDefinition(def, handlers)` → `{ tool, metadata }` (category derived from def.scope + def.access; no separate category parameter).
    - `createToolsFromDefinitions(defs, handlers)` → `{ tool, metadata }[]`.
  - Factory rejects definitions missing `scope` or `access` (throws or returns error); derives category as one of eight values (`read local`, `write local`, `read external`, `write external`, `read graph`, `write graph`, `read app`, `write app`) and sets it on metadata.
  - **ToolMetadata:** Extend in `registry.ts` with required `scope` and `access`, and optional `connectionType`, `connection`, `risk`, `permissionExplanation`. Category remains (derived). Existing call sites (builtin index) will be updated to pass at least `scope` and `access` for each tool so registration still succeeds (e.g. echo: `scope: 'app', access: 'read'`; count_nodes: `scope: 'external', access: 'read'`; invoke_command: `scope: 'app', access: 'write'`).
  - **Minimal test:** One test file that creates one definition, one handler, runs the factory, registers with the registry, and asserts the tool is listed and callable (or that metadata is correct). If the project has no test runner yet, add Vitest and one test as in the development testing guide.
- **Recommendations**
  - Place declarative types and factory in `tools/` (e.g. `tools/definition-types.ts` and `tools/factory.ts`) so definition files can import types without importing the registry.
  - Handler type: `Record<string, (input: unknown) => Promise<string>>` or a generic keyed by handler key; handler receives parsed schema output so the factory binds the correct handler by key.
- **Decisions**
  - Registry’s current `ToolDefinition` → `RegisteredTool`. (No preference; chosen for clarity.)
  - Minimal test delayed until project has a test framework; Phase 1 does not add Vitest.

1. Add `ToolDefinition` type (name, description, schema, handler key, metadata including required **scope** and **access** and optional connectionType/connection).
2. Add `createToolFromDefinition(def, handlers, category)` and `createToolsFromDefinitions(defs, handlers, category)` that return `{ tool, metadata }[]` compatible with `toolRegistry.register()`. Derive category from scope + access (eight values); **reject at registration** if scope or access is missing.
3. Add a minimal test: one definition + one handler → one registered tool that the agent can call. **(Delayed:** test deferred until project has a test framework.)
4. Update tool registry schema so `ToolMetadata` includes scope, access, derived category, connectionType, connection, risk, permissionExplanation. **Done.**

## Phase 2: Migrate One Domain and Categorize
**Status:** Done.
1. Extract one domain (e.g. Neo4j) into definition file (e.g. `neo4j/tools.ts`) and handlers (e.g. `neo4j/handlers.ts`). Wire through the factory and register in the built-in index. Assign **scope** and **access** (and connection type where applicable) to each tool. **Done:** `builtin/neo4j/tools.ts`, `builtin/neo4j/handlers.ts`; tool name `neo4j.count_nodes` (namespaced).
2. Remove the old per-tool files for that domain (or keep as re-exports during transition). Verify tools still work in chat. **Done:** Deleted `builtin/neo4j/count-nodes.tool.ts`.
3. Add scope and access to all other built-in tools so registry has full metadata; reject at registration if missing. **Done** (in Phase 1).

## Phase 3: Migrate Remaining Built-in Tools; Remove Echo
**Status:** Done.
1. **Remove the echo tool** — No longer needed (was only for testing); delete `builtin/echo/` and its registration. **Done:** Removed `builtin/echo/` and echo registration.
2. Migrate command and any other built-in domains to the definition + handler pattern. Built-in index: for each domain, `createToolsFromDefinitions(domainDefs, domainHandlers)` then register each result. **Done:** `builtin/command/tools.ts` (getCommandToolDefinitions), `builtin/command/handlers.ts`; tool name `command_invoke`. Deleted `invoke-command.tool.ts`.
3. No per-tool `toolRegistry.register()` calls; only domain-level loops. Document the definition shape and “adding a new tool” guide (add definition, add handler, register the domain). **Done:** [docs/development/feature-guides/adding-a-tool.md](../../development/feature-guides/adding-a-tool.md).

## Phase 4: Mode Storage & Permission Service
**Status:** Done.
1. Permission/mode service (e.g. `src/main/services/permissions.ts` or mode registry). **Main settings**: single key for default mode (e.g. `agents.defaultModeId`). No other permission data in main settings. **Done:** `src/main/services/modes/` (registry, builtins, types); settings `agents.defaultModeId`, `agents.disabledModeIds`.
2. **Mode definitions**: One file per mode in dedicated directory (e.g. `userData/modes/`); dot notation, explicit overrides. Load built-in modes (Local Read Only, Read Only, Local Only, Full) + user mode files. **Done.**
3. Mode registry API: list, get, save, duplicate, reset prebuilt, disable. Add `modeId` to conversation metadata (set on create from default, update when user changes mode). **Done.** Conversation create uses default from settings; backfill modeId on write when null.
4. **UI for current API:** Chat mode selector (near model selector); Settings > Agents tab: default mode for new chats, mode list (Duplicate, Reset, Disable), hidden modes (Enable), mode editor (name + eight category allow/ask/deny, Save). **Done.**

## Phase 5: Chat Mode Selector & Persistence
**Status:** Done (backend sets modeId on create; Phase 8 wired mode into `getToolsForAgent()`).
1. Add mode selector to chat UI, placed near the agent selector. **Done.**
2. On new conversation: set conversation `modeId` from default chat mode (settings). **Done** (backend).
3. When user changes mode in chat: update conversation's `modeId` and persist. **Done.**
4. When loading a conversation: restore and display its stored mode; use it in `getToolsForAgent()`. **Done** (display + persist); tool filtering in Phase 8 (done).

## Phase 6: Agents Tab & Permission UI
**Status:** Done. Implementation order below. Phases 7–9 done; Phase 10 skipped; Phase 11 (future) remains.

**Completed (in order of implementation):**
1. Rename settings tab to **Agents**; two sections: LLM Providers (default model, Ollama, Anthropic) and Agent Permission (modes). **Done.**
2. Mode registry: built-in modes as file-shaped content (id, name, description, categories.*), user mode files in `userData/modes/`. API: getMode, listModes, listAllModes, saveMode, duplicateMode, resetMode, setModeDisabled. **Done.**
3. IPC: modes:list, listAll, get, save, duplicate, reset, setDisabled; preload and api.d.ts. **Done.**
4. Mode editor UI: category-level defaults (eight categories), load/save from registry. **Done.** Overrides by connection type, connection, tool (future).
5. Default mode selector for new chats; `agents.defaultModeId` and `agents.disabledModeIds` in main settings. **Done.**
6. ModeSelector in chat; conversation `modeId` on create (from default), on user change, and on load. **Done.**
7. Mode file path: getModeFilePath, modes:getFilePath; expanded mode card shows path in footer. **Open in Editor:** modes:openInEditor (creates file if missing, opens in system editor). **Done.**
8. Mode description: optional `description` in mode type and file shape; built-ins use same file-shaped content; editor and card show description; user overrides without description get built-in default. **Done.**
9. getBuiltinDefault, modes:getBuiltinDefault; Reset action only when mode differs from built-in default (collapsed and expanded); builtinDefaults loaded for comparison. **Done.**
10. deleteMode (non–built-in only: unlink file, clear from disabled list); modes:delete; Delete first in actions for custom modes; confirm before delete; clear agents.defaultModeId if deleted mode was default. **Done.**
11. Shared **SettingsExpandableCard**: title, description, actionIcons, chevron, collapsible body; provider and mode cards use it; expand/collapse animation (CSS grid 0fr/1fr, always-mounted content). Action order: Delete (custom only), Reset (built-in when differs), Copy, Disable. **Done.**

## Phase 7: Shared user-config / file watcher (next)

**Status:** Done. Shared `UserConfigWatcher` service; settings and modes use it; renderer subscribes via `user-config:changed` and refetches; see [File-backed config watcher](../../development/architecture/file-backed-config-watcher.md).

**Goal:** Mode configuration (and future user-managed config such as custom agents) should listen to file updates the same way the settings view does, so external edits to mode JSON files are reflected without switching tabs or triggering an in-app action.

**Scope:**

1. **Shared pattern:** Settings today uses a file watcher inside `SettingsService` (watch directory, debounce, emit `change`, IPC forwards to renderer, renderer subscribes and reloads). There is no shared "user config watcher" service. Implement one of:
   - **Option A (minimal):** Add a directory watcher in the modes layer; emit a generic "modes changed" event; IPC sends to renderer; renderer subscribes and calls `loadModes()`. Same pattern as settings but no shared abstraction.
   - **Option B (reusable):** Introduce a small shared service (e.g. `UserConfigWatcher` or `FileBackedConfigService`) that can watch a path per "domain" (file or directory), debounce, and emit a domain-level event. Consumers (modes, future custom agents) register their path and subscribe; IPC forwards domain events to renderer; each feature subscribes and refetches. Enables consistent behavior for modes, custom agents, and other file-backed user config.
2. **Modes:** Use the chosen approach so that when `userData/modes/*.json` (or the modes directory) changes on disk, the Settings mode list and any open mode editor state refresh (e.g. reload list, refresh builtin defaults; if a mode file was edited externally, show updated data).
3. **Documentation:** Document the pattern so future additions (e.g. custom agents in a directory) can reuse it.

**Depends on:** Phase 6 done. No dependency on Phase 8/9.

## Phase 8: Enhance `getToolsForAgent()` Function

**Status:** Done. Mode is loaded from registry; permissions resolved per tool; deny filtered, ask returned for Phase 9; executor cache key includes `modeId`.

**Beads:** Phase 8 was decomposed into tasks under epic `cortex-app-8an` (Tool Permission System). All beads complete.

1. Extend signature to accept conversation context so the chat's mode can be applied. (When Custom Agents exist, callers will also pass agent; see [Custom Agents](./custom-agents.md).)
2. Load conversation's mode from mode registry.
3. Resolve effective permissions per tool using the mode's hierarchy: category → connection type → connection → tool. No global permission store.
4. Filter tools: remove "deny", mark "ask" for runtime approval; pass only allowed tools to agent.
5. **Single touch point**: Callers pass conversation; executor cache key includes `modeId`. (When Custom Agents affect tool sets, cache key will include `agentId`; see Custom Agents backlog.)

## Phase 9: Runtime Approval Flow

**Beads:** Epic `cortex-app-1mn` (Phase 9: Runtime Approval Flow). Tasks: 1mn.1 interrupt + pending state, 1mn.2 sidebar indicator, 1mn.3 inline approval card, 1mn.4 approve/deny paths.

**Goal:** When the LLM invokes a tool that has "ask" permission in the conversation's mode, execution pauses, the user sees approval UI (in-conversation), and on approve the tool runs and its result is returned to the LLM; on deny the request is blocked and the LLM receives a refusal. No persistence of approval decisions—each "ask" invocation is prompted. The user must be able to tell when a chat is awaiting approval even when that chat is not in focus, and when they switch to that chat the approval UI must be visible and usable there.

**Functional scope (what must be implemented):**

1. **Interrupt on "ask" tool invocation.** When the executor would run a tool whose name is in `getToolsForAgent()`'s `askToolNames`, pause before executing the tool and hand control to the app (callback, event, or harness hook). Implementation may use a framework that supports interrupt (e.g. LangChain Deep Agents' `interrupt_on`) or a minimal custom interrupt layer; this backlog does not depend on another backlog item.
2. **Sidebar indicator for awaiting approval.** When a conversation has a pending "ask" tool approval, the conversation list must show that state (e.g. icon or badge on the conversation row), using the same pattern as existing "streaming" and "unread" indicators, so the user knows which chat needs attention without having it focused.
3. **Approval UI in-conversation.** When the user has the conversation in focus, the approval UI must appear in the context of that conversation (not as a global modal). It must show: tool name, tool description, and the arguments the LLM is requesting; Approve and Deny actions. When the user switches to a chat that is awaiting approval, the approval UI must be visible and actionable immediately in that view. UI should follow [design README](../../development/design/README.md) and [ui-guide](../../development/design/ui-guide.md) where applicable.
4. **Approve path.** User clicks Approve → run the tool with the requested arguments, return the tool result to the executor so the LLM receives it as the tool response.
5. **Deny path.** User clicks Deny → do not run the tool; return a refusal message to the executor so the LLM sees that the tool use was denied (e.g. short ToolMessage indicating user denied).
6. **Single flow.** All "ask" tools go through this same interrupt → approval UI → approve/deny path. No per-tool or per-conversation persistence of decisions.

**Out of scope for Phase 9:** Content-length and token-limit confirmations (see [Content and Token Guardrail Confirmations](./content-and-token-guardrail-confirmations.md)). Any "remember this decision" or approval-override persistence.

**Approval UI approach:** Use the **inline approval card**. Render the pending tool request as a card in the message stream (same area as existing tool steps: collapsible row with icon, label, then expanded content). The card shows tool name, description, arguments, and Approve/Deny buttons. When the user switches to the chat, they see the approval in place with the rest of the turn; no separate overlay. Aligns with existing `TraceDisplay` / `ToolInvocationDetails` patterns and keeps context in one scrollable view.

**Success criteria (testable):**

- With a mode where a tool (e.g. `command_invoke`) is "ask", when the LLM requests that tool the run pauses before execution.
- Conversation list shows an indicator for conversations that have a pending approval (when that conversation is not selected).
- When the user selects a conversation that is awaiting approval, the approval UI is visible in that conversation view and shows the tool's name, description, and requested arguments; Approve and Deny are available.
- Approve: tool runs with those arguments; the LLM receives the tool result and can continue.
- Deny: tool does not run; the LLM receives a clear refusal and can continue the conversation.

## Phase 10 (Skipped): Audit & History

**Decision:** Skipped for now. Per-conversation trace provides visibility of tool use within each chat; control and runtime approval (Phases 1–9) deliver the core permission-system goal. A dedicated audit log (persistent store, cross-conversation viewer, permission decision history, export, clear) is cost-heavy for current use; may be revisited when plugins or compliance needs justify it.

*Original scope:* Log tool invocations and permission decisions; audit log viewer UI; tool usage and permission decision history; export; clear.

## Phase 11 (Future): User and Plugin Tools
- When [Plugin Extensibility Framework](./plugin-extensibility-framework.md) or user-defined tools are implemented, load definitions (and optionally handlers) from plugin manifests or user directories.
- Use the same factory to produce tools; register them with a distinct category (e.g. `plugin`, `user`). Permission system treats user/plugin tools with appropriate defaults (e.g. ask or deny until explicitly allowed in a mode).

## Success Criteria

**Tool definitions (foundation):**
- [ ] `ToolDefinition` type and factory exist; a single definition + handler produce a working tool with metadata (category, etc.) in the registry
- [ ] All built-in tools are defined declaratively and instantiated via the factory; no duplicated metadata between definition and registration
- [ ] Every tool has required scope and access; category derived (eight values); tools missing scope or access rejected at registration
- [ ] Built-in registration is a domain-based loop (no long list of per-tool imports and registers); echo tool removed
- [ ] Documentation describes how to add a new tool (definition + handler + register domain); pattern is the intended approach for future user/plugin tools

**Permissions:**
- [ ] Modes: prebuilt (Local Read Only, Read Only, Local Only, Full) + user modes; one file per mode; duplicate, rename (unique), reset prebuilt, disable
- [ ] Main settings contains only default mode for new chats (`agents.defaultModeId`); no other permission data in main settings
- [ ] Agents tab: LLM providers + Agent Permission (mode) management; mode editor uses category → connection type → connection → tool hierarchy
- [ ] `getToolsForAgent()` resolves permissions from the conversation's mode
- [ ] Executor cache key includes `modeId` (and later `agentId` when Custom Agents affect tools; see Custom Agents backlog)
- [ ] Runtime approval UI for "ask" tools (in-conversation; sidebar indicator when chat not in focus); user can approve or deny each request (no persistence of decisions)
- [ ] Permission settings (mode files) persist across restarts; tool use is visible per conversation in the trace (dedicated audit log deferred)
- [ ] User can select and change mode per chat; default mode for new chats; loading a conversation restores its last mode
- [ ] Export/import permission profiles and mode files

## Implementation note: Interrupt and Deep Agents

The "ask" permission level requires pausing execution when the LLM requests an "ask" tool, showing the approval UI (in-conversation; see Phase 9), then resuming with the tool result or a refusal. A framework that provides an interrupt/human-in-the-loop hook (e.g. LangChain Deep Agents' `interrupt_on` for tool calls) can be used to implement this; if so, tools in `askToolNames` are registered with that hook and the approval UI is shown when the framework yields control. Alternatively, a minimal custom interrupt layer can be implemented within the existing executor flow. This backlog does not add a dependency on the [Deep Agents Adoption](./deep-agents-adoption.md) backlog; Phase 9's scope is the behavior above, however it is implemented.

## Related Backlog Items

**Depends on (recommended):**
- [Chat Interface (MVP)](./archive/chat-interface-mvp.md) - Includes `getToolsForAgent()` helper function
- [Configuration System](./configuration-system.md) - Settings storage for permissions

**Prerequisite for:**
- [Plugin Extensibility Framework](./plugin-extensibility-framework.md) - Permission system critical before community tools

**Related:**
- [Custom Agents](./custom-agents.md) - When implemented, per-agent permissions (mode or custom set) are defined there and combined with the conversation's mode. Agent editor gets tool list from registry (same source as permission UI).
- [Configuration System](./configuration-system.md) - Per-tool or per-plugin config can be keyed by tool name from definitions.
- [Content and Token Guardrail Confirmations](./content-and-token-guardrail-confirmations.md) - "Allow full tool result" and "confirm oversized prompt" are tracked there; they reuse this item's approval UI pattern but are out of scope for this backlog.

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
- They can see what the LLM did in each conversation (trace); a dedicated cross-conversation audit log is deferred
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
- **Categories and connections**: Eight categories derived from **scope** × **access** (scope: local | external | graph | app; access: read | write). Hierarchy: category → connection type → connection → tool. All tools must have scope and access; rejected at registration if missing. Connection type = e.g. Folder, Slack, Google Drive (data sources). Connection = instance. Graph tools use scope **graph**; graph access (which graphs) is separate.

### Tool definitions (foundation)

- **Incremental**: Phase 1 is additive (factory + types); Phase 2 migrates one domain; existing tools can stay on the old pattern until migrated. No big-bang rewrite required.
- **Zod in definitions**: Preserves type safety and reuse with LangChain’s structured tools; if plugin authors use JSON schema, a small adapter can convert or the factory can accept both.
- **Handler key**: Use namespaced string (e.g. `neo4j.countNodes`) to avoid collisions when merging user and built-in handlers later.
- **Single source of truth**: Definition metadata (category, connectionType, connection, risk, permissionExplanation) is copied into the registry at registration; permission UI and resolution use the registry only.

