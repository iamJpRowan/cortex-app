---
date: 2026-03-08
developer: Jp Rowan
agent: Claude Sonnet 4.6
model: claude-sonnet-4-6
tags: [tools, permissions, agent, modes, executor, cache, closeout]
related_backlog: [tool-permission-system]
related_files:
  - src/main/services/llm/tools/registry.ts
  - src/main/services/llm/tools/permission-resolver.ts
  - src/main/services/llm/agent.ts
  - src/shared/types/llm.ts
  - src/main/ipc/llm.ts
  - src/renderer/src/components/ChatView.tsx
related_issues: []
related_devlogs:
  - 2026-02-16-tool-permission-system-phase-1
  - 2026-02-23-tool-permission-modes-ui-and-shared-config
session_duration: multiple
iterations: 5
outcome: Phase 8 complete. getToolsForAgent() loads mode, resolves permissions, filters deny tools, returns { tools, askToolNames }. Executor cache key includes modeId. Epic cortex-app-8an closed.
---

# Context

Phase 8 of the Tool Permission System (epic cortex-app-8an). The mode infrastructure (Phases 4–7) was complete: conversations carry `modeId`, modes are stored and managed, and the UI exposes mode selection. Phase 8 wires `modeId` into `getToolsForAgent()` and the executor creation path so tools are filtered by the conversation's permission mode.

Work was done in five beads (8an.1–8an.5), implemented in a single day and consolidated here into one devlog.

# Summary of Phase 8

## 8an.1 — Signature and threading

- **`src/shared/types/llm.ts`** — Added `modeId?: string | null` to `LLMQueryOptions`. Callers (IPC, ChatView) pass conversation mode with each query; null means treat as Full.
- **`src/main/services/llm/tools/registry.ts`** — Extended `getToolsForAgent(options?)` to accept `modeId` alongside `agent?`. Initially passthrough (`getAll()`); JSDoc updated.
- **`src/main/services/llm/agent.ts`** — `getExecutorForModel` accepts `modeId` and passes it to `getToolsForAgent({ modeId })`. Both `query()` and `queryStream()` extract `modeId` from options and forward it. Cache key left as model-only for this bead (8an.5 extends it).

IPC (`llm.ts`) and ChatView were updated to pass `modeId` from the active conversation on every query send/stream.

## 8an.2 — Load mode from registry

- **`registry.ts`** — Imported `getMode` and `getBuiltinMode`. Inside `getToolsForAgent()`: if `modeId` is non-empty, call `getMode(modeId)` and fall back to Full with a warning if not found; if null/undefined/empty, use Full. Assigned to `const mode: Mode`. Still returned all tools (passthrough); mode available for 8an.3.

## 8an.3 — Permission resolution

- **`src/main/services/llm/tools/permission-resolver.ts`** (new) — Exported `resolveEffectivePermission(metadata: ToolMetadata, mode: Mode): PermissionLevel`. Hierarchy (most specific wins): tool override ?? connection override ?? connection type override ?? category default. Only category default is implemented; tool/connection/connection-type overrides are stubbed for future phases. ToolCategory (`"read local"`) is mapped to PermissionCategory (`readLocal`) via a small converter (split on space, camelCase scope).
- **`registry.ts`** — For each registered tool, computed `{ tool, metadata, permission }` via `resolveEffectivePermission`, logged effective permissions. Still returned all tools; 8an.4 adds filtering.

## 8an.4 — Filter tools

- **`registry.ts`** — Filtered out deny tools; passed only allow + ask tools to the executor. Return type changed from `StructuredTool[]` to `{ tools: StructuredTool[]; askToolNames: string[] }`. Logged denied and ask tool names. Ask tools remain in the executor's set; Phase 9 will intercept at invocation via `interrupt_on`.
- **`agent.ts`** — Destructured `{ tools, askToolNames }` from `getToolsForAgent({ modeId })`; logged ask tools for observability.

## 8an.5 — Executor cache key

- **`agent.ts`** — `executorCache` type changed from `Map<PrefixedModelId, AgentExecutor>` to `Map<string, AgentExecutor>`. Cache key set to `` `${prefixedModelId}::${modeId ?? ''}` ``. Null/undefined modeId → empty string (Full). When the user changes mode, the next message gets a cache miss and a new executor is built with the new tool set; no explicit invalidation.

# Key decisions

- **Resolver in its own module** — Keeps registry focused on storage/lookup; permission logic is testable independently. All four hierarchy levels are stubbed so adding overrides later doesn't change the resolver interface.
- **Return `{ tools, askToolNames }`** — Phase 9 uses `askToolNames` for interrupt-on; ask tools stay in the executor so the LLM can request them; approval happens at invocation. Deny tools are fully excluded.
- **Cache key `modelId::modeId`** — Bounded pool of executors; mode change naturally causes miss. `clearCaches()` unchanged.

# Verification

- `npx tsc --noEmit` passes.
- ChatView passes `modeId` from the active conversation on every query send/stream.
- IPC handler forwards `modeId` to the agent service.

# Remaining (future phases)

- **Phase 9:** Runtime approval modal for ask tools (uses `askToolNames`).
- **Phase 9 (future):** Tool/connection/connection-type overrides in `resolveEffectivePermission` (stubs in place).
- **Phase 10:** Audit log for tool invocations.
- **Phase 11:** User/plugin tools.
