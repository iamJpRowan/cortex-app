---
status: planned
summary: Rebuild the agent layer with two execution paths — Claude Agent SDK natively for Anthropic, LangChain/LangGraph for Ollama — behind a single IPC interface.
themes: [chat-ai]
depends_on: [tool-permission-system]
references:
  - product/how-it-works.md
  - product/migration-to-graph-shell.md
---

# Agent Layer Rebuild

## Goal

Rebuild `agent.ts` and the surrounding agent layer to use two distinct execution paths behind a single IPC interface:

- **Anthropic** — `@anthropic-ai/claude-agent-sdk` natively. All SDK features (permissionMode, allowedTools, canUseTool, hooks, skills, subagents, AskUserQuestion) work as-is. No LangChain involved.
- **Ollama** — LangChain/LangGraph as today, mirroring SDK conventions manually. SqliteSaver checkpointer, LangGraph agent loop, HumanInTheLoopMiddleware for interrupt/resume.

The chat UI and IPC interface are unchanged — both paths expose the same streaming events, conversation metadata, and permission concepts. LangChain is used **only** for the Ollama provider.

## Background and rationale

The current agent layer uses LangChain/LangGraph for all providers. This was necessary to share a single agent loop and checkpointer across Anthropic and Ollama. However the Claude Agent SDK is an npm package (`@anthropic-ai/claude-agent-sdk`) that can be embedded directly in the Electron main process, and it manages its own session state via `sessionId` — making it possible to use it natively for the Anthropic path without losing conversation persistence.

The Agent SDK provides everything the Anthropic path needs without any custom implementation: `permissionMode`, `allowedTools`, `disallowedTools`, `canUseTool`, hooks, skills loaded from the filesystem, subagents, and `AskUserQuestion`. These would otherwise need to be built manually on top of LangGraph.

Conversation metadata (title, modeId, timestamps) stays in `ConversationService` for both paths. The Agent SDK's `sessionId` and LangGraph's `headCheckpointId` serve the same purpose — a resume reference — stored in the same field.

## Prerequisites

- **[Tool Permission System](./tool-permission-system.md)** — Phases 1–8 complete (done). The mode system, `getToolsForAgent()`, and `askToolNames` are inputs to the Ollama path.
- Phase 9 of the Tool Permission System (runtime approval flow) is **included in this rebuild** — implemented via the Agent SDK's native `canUseTool` for Anthropic, and LangGraph's `HumanInTheLoopMiddleware` for Ollama.

## Architecture

```
Chat UI (renderer)
  ↓  IPC: llm:queryStream / llm:query  (single interface, unchanged)
  ↓  LLMQueryOptions (SDK-shaped)

Agent Layer (main process)
  ↓
  if provider = Anthropic:
    @anthropic-ai/claude-agent-sdk
    - permissionMode, allowedTools, disallowedTools → native SDK options
    - canUseTool callback → native SDK (approval UI wired via IPC)
    - hooks → native SDK hooks
    - skills → loaded from filesystem by SDK
    - subagents → native SDK
    - AskUserQuestion → native SDK built-in tool
    - session resume → Agent SDK sessionId (stored in ConversationService)

  if provider = Ollama:
    LangChain + LangGraph (unchanged runtime)
    - permissionMode, allowedTools resolved from mode → executor filter
    - canUseTool → HumanInTheLoopMiddleware + interrupt_on
    - hooks → pre/post LangGraph node callbacks
    - AskUserQuestion → implemented manually
    - session resume → SqliteSaver headCheckpointId (stored in ConversationService)
```

## Conversation persistence

Both paths store a session reference in `ConversationService.headCheckpointId` (field reused, not renamed):

- **Anthropic**: Agent SDK `sessionId` string (e.g. `"abc123"`). Agent SDK stores the session file at `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl`. Resume by passing `resume: sessionId` to `query()`.
- **Ollama**: LangGraph checkpoint ID as today. Resume by passing `checkpointId` to the LangGraph executor.

`ConversationService` metadata (title, modeId, model, timestamps, messageModels) is unchanged for both paths.

## IPC interface (SDK-aligned, unchanged from chat UI perspective)

`LLMQueryOptions` gains SDK-aligned fields:

```typescript
interface LLMQueryOptions {
  // existing
  conversationId?: string
  model?: string
  modeId?: string | null

  // SDK-aligned additions
  permissionMode?: 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  allowedTools?: string[]
  disallowedTools?: string[]
}
```

When absent, the conversation's `modeId` resolves these fields before they are passed to whichever execution path is active.

## Mode resolution (both paths)

Custom modes always resolve to `permissionMode: "default"` — the category system does the work via `allowedTools` and `disallowedTools`, and anything uncovered falls through to `canUseTool`:

```
Custom mode (e.g. "Graph Read Only")
  categories.readGraph  = allow
  categories.writeGraph = deny
  categories.writeApp   = ask
        ↓ resolves at runtime
  permissionMode:  "default"    ← always default for custom modes
  allowedTools:    [tools with allow permission]
  disallowedTools: [tools with deny permission]
  askToolNames:    [tools with ask permission → canUseTool]
```

SDK `permissionMode` shortcuts (`bypassPermissions`, `acceptEdits`, `dontAsk`, `plan`) bypass mode resolution entirely — they are selected directly by the user and passed straight to the Agent SDK (Anthropic) or mirrored via LangGraph conventions (Ollama).

The Always Ask fallback (no mode set) maps to `permissionMode: "default"` with empty `allowedTools` and `disallowedTools` — identical to the SDK's default behaviour.

For Anthropic, resolved options map directly to Agent SDK `query()` options. For Ollama, they map to LangGraph executor configuration and `HumanInTheLoopMiddleware.interrupt_on`.

## Tool registration

- **Anthropic path**: Tools registered as an in-process MCP server via the Agent SDK's `createSdkMcpServer` and `tool` helper. Existing tool definitions (name, description, Zod schema, handler) map directly to this shape.
- **Ollama path**: Tools registered with LangGraph via the existing factory and registry. No change.

The tool registry, tool definitions, and `adding-a-tool` guide are unchanged for both paths.

## Phase 1: Anthropic path — Agent SDK integration

**Scope:**
- Install `@anthropic-ai/claude-agent-sdk` in the main process
- New `AnthropicAgentProvider` that replaces `ChatAnthropic` for the Anthropic path
- Implements `query()` and `queryStream()` using `@anthropic-ai/claude-agent-sdk`
- Registers Cortex tools as an in-process MCP server via `createSdkMcpServer`
- Mode resolution: `modeId` → `{ permissionMode, allowedTools, disallowedTools }` passed to Agent SDK `query()` options
- Session persistence: capture `sessionId` from `ResultMessage`; store in `ConversationService`; pass `resume: sessionId` on subsequent turns
- Stream event translation: Agent SDK messages → existing Cortex stream event types (`start`, `token`, `trace`, `complete`, `error`, `cancelled`)

**Success criteria:**
- Chat UI sends a message with Anthropic model selected; Agent SDK executes; response streams correctly
- Conversation resumes across app restarts using stored `sessionId`
- `permissionMode: "bypassPermissions"` passed to Agent SDK bypasses all tool checks
- `permissionMode: "plan"` blocks all tool execution
- Custom mode resolves to correct `allowedTools`/`disallowedTools` before Agent SDK call
- Existing streaming event types (`token`, `trace`, `complete`) work unchanged from chat UI perspective

## Phase 2: canUseTool and approval UI (Anthropic path)

**Scope:**
- Wire Agent SDK `canUseTool` callback to IPC: sends `approval` stream event to renderer with tool name, description, arguments, and `requestId`
- New IPC handlers: `llm:approveToolCall`, `llm:denyToolCall` — return `PermissionResultAllow` or `PermissionResultDeny` to the SDK callback
- Sidebar indicator: pending badge on conversation list when `canUseTool` is waiting
- Inline approval card: renders in message stream at point of interruption; Approve / Deny actions; persists when user switches away

**Success criteria:**
- With a tool set to `ask` in the active mode, Agent SDK pauses and `approval` event fires
- Conversation list shows pending indicator
- Approval card shows tool name, description, and arguments
- Approve: tool executes, LLM receives result, conversation continues
- Deny: tool blocked, LLM receives refusal, conversation continues

## Phase 3: Ollama path — LangGraph SDK conventions

**Scope:**
- Add `permissionMode`, `allowedTools`, `disallowedTools` to `LLMQueryOptions` wired into the LangGraph executor
- Configure `HumanInTheLoopMiddleware` with `interrupt_on` from `askToolNames` for the Ollama path
- Same IPC approval events (`llm:approveToolCall`, `llm:denyToolCall`) as Phase 2 — LangGraph resumes via `Command(resume=...)`
- Implement `AskUserQuestion` as a manual tool for the Ollama path

**Success criteria:**
- Ollama path honours `permissionMode`, `allowedTools`, `disallowedTools` from mode resolution
- `ask` tools on Ollama path pause and surface the same approval UI as Anthropic path
- `AskUserQuestion` works on Ollama path
- All existing Ollama streaming, checkpointing, and restore behaviour unchanged

## Phase 4: Hooks and AskUserQuestion (Anthropic path)

**Scope:**
- Expose Agent SDK hooks (`PreToolUse`, `PostToolUse`) via IPC so app-level logic can intercept tool calls
- `AskUserQuestion` is already native to the Agent SDK — wire renderer to present question UI and return answers via IPC
- IPC: `llm:askUserQuestion` event with question payload; `llm:answerUserQuestion` response

**Success criteria:**
- Registered `PreToolUse` hook can block a tool call on the Anthropic path
- When Claude calls `AskUserQuestion`, renderer receives structured question payload
- User selects answer; answer returned to Agent SDK; conversation continues

## What does not change

- **Tool registry and definitions** — declarative format, factory, registration unchanged
- **Mode system** — mode storage, mode registry, mode UI unchanged
- **ConversationService** — metadata structure unchanged; session reference field used for both `sessionId` and `headCheckpointId`
- **LangChain/LangGraph** — retained in full for Ollama; no removal
- **Streaming event types** — `start`, `token`, `trace`, `complete`, `error`, `cancelled` unchanged; `approval` and `askUserQuestion` are additive
- **Chat UI** — `ChatView` and AI elements unchanged except to handle `approval` and `askUserQuestion` event types

## Success criteria (overall)

- [ ] Anthropic path uses `@anthropic-ai/claude-agent-sdk`; LangChain not involved for Anthropic
- [ ] Ollama path uses LangChain/LangGraph unchanged
- [ ] Both paths present identical IPC interface to the chat UI
- [ ] Agent SDK `sessionId` stored in `ConversationService`; conversations resume correctly across restarts
- [ ] Mode resolution produces correct SDK options for both paths
- [ ] `canUseTool` approval UI works identically for both paths
- [ ] Agent SDK skills, subagents, and `AskUserQuestion` work natively on Anthropic path
- [ ] Ollama path mirrors equivalent behaviour via LangGraph
- [ ] All existing streaming, checkpointing, and conversation restore behaviour unchanged

## Product context and vision alignment

This work is part of a broader product pivot. The pivoted positioning is:

> Cortex is a local-first knowledge graph and visual shell that augments AI assistants with your personal data. It exposes data through a local MCP server, provides a composable UI for exploring it, and supports portable skills that work across Cortex and the broader Claude ecosystem.

Cortex is **not** a custom agent runtime or AI platform — Claude Code handles orchestration. Cortex owns the data layer (Neo4j graph), the MCP interface, and the visual shell. The agent layer rebuild is the critical path before any new features.

### Supporting documents to create

Two new product docs were drafted as part of this work and should be committed alongside or before the agent layer rebuild begins:

**`docs/product/how-it-works.md`** — Full system architecture describing:
- Three layers: data layer (Neo4j), MCP server, app shell
- Embedded chat with two execution paths (Agent SDK / LangGraph)
- Permission modes and custom mode resolution
- Connections primitive: data ingestion + optional connection-scoped tools (independent concepts)
- Tools primitive: scope + access level, registered as in-process MCP server
- Skills format: `SKILL.md` + optional `reference.md`, `examples/`, `scripts/`; portable between Cortex and Claude Code
- Plugins format: `.claude-plugin/plugin.json` manifest; `connections/` and `widgets/` as Cortex-specific extension points; Claude plugin format compatible
- Widget UI: composable shell, tabbed views, plugin-contributed widgets, MCP Apps rendering
- MCP server: exposes graph query tools and connection-scoped tools to any MCP-compatible client

**`docs/product/migration-to-graph-shell.md`** — Migration guide with four buckets:
- Remove, keep, rebuild, add (see backlog cleanup section below)
- Sequencing: agent layer rebuild → MCP server → connections update → plugins → widget UI

**`docs/user/vision.md`** — Rewrite from "AI-powered PKM" framing to "local knowledge graph + MCP + visual shell":
- Core principles: own your data, privacy-first, transparent intelligence
- Explains the MCP server as the bridge to Claude Desktop / Claude Code
- Skills use Claude's standard format (marketplace = Claude ecosystem)
- Cortex does not reimplement what Claude already does well (no custom agent runtime, no model management UI)

### Backlog cleanup (do before or alongside this rebuild)

**Archive these items** — out of scope, replaced by the agent layer rebuild or Claude ecosystem:
- `deep-agents-adoption.md` — LangChain/LangGraph agent runtime replaced by SDK-shaped layer
- `sub-agent-delegation.md` — Claude Code handles subagent orchestration natively
- `custom-agents.md` — replaced by plugin/skill format
- `llm-tool-hallucination-guardrails.md` — agent runtime concern, no longer Cortex's responsibility
- `ollama-model-management.md` — model management is not a product feature
- `ollama-connection.md` — Ollama is already wired as a provider

**Simplify but keep:**
- `chat-summaries.md` — local storage only; no agent discovery of summaries
- `context-window-and-costs.md` — defer until agent layer rebuild is stable
- `custom-hotkeys-prompt-input.md` — valid but not a blocker

### Follow-on stories (not in scope here, but flagged)

After the agent layer rebuild is stable, the next foundational items are:

**MCP server** — Local MCP server process running alongside the Electron app:
- Exposes graph query tools and connection-scoped tools
- Registered in Claude Desktop / Claude Code via standard MCP config
- Supports MCP Apps (tool responses that return interactive UI components)
- Without this, Cortex cannot be used from Claude Desktop or Claude Code

**Plugin format support** — Replace `custom-agents.md` with Claude-compatible plugin folders:
- Load and validate plugin folders (`.claude-plugin/plugin.json` manifest)
- Register skills, tools, and connection types contributed by plugins
- Plugin manager UI: install, enable/disable, uninstall
- `connections/` and `widgets/` as Cortex-specific extension points

**Widget system update** — Treat widgets as the primary extension point for visualising graph data; support plugin-contributed widgets; define the interface MCP Apps responses render into.

## References

- [How It Works](../how-it-works.md) — architecture overview
- [Migration Guide](../migration-to-graph-shell.md) — agent layer rebuild in context
- [Tool Permission System](./tool-permission-system.md) — mode system, getToolsForAgent, askToolNames
- `@anthropic-ai/claude-agent-sdk` — npm package, TypeScript
- Claude Agent SDK docs: permissions, user-input, hooks, sessions, custom-tools, skills
- LangChain: `HumanInTheLoopMiddleware`, `interrupt_on`, `Command(resume=...)`
