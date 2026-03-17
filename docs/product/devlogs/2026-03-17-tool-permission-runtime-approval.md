---
date: 2026-03-17
developer:
agent: Claude
model: claude-sonnet-4-6
session_id:
tags: []
backlog_items: ["[[tool-permission-runtime-approval]]"]
related_issues: []
outcome: in-progress
---

# Context

This story implements Phase 9 of the Tool Permission System: runtime approval for "ask" tools. When the LLM invokes a tool whose permission is "ask" in the active mode, execution pauses, an inline approval card appears in the message stream, and the user approves or denies. A sidebar indicator shows when any conversation has a pending approval. The infrastructure (getToolsForAgent returning askToolNames, modeId on conversations, executor cache keyed by modeId) is already in place from Phases 1–8.

# Approach

The implementation is structured across four layers, each building on the previous:

1. **Interrupt mechanism (main)** — Intercept "ask" tool calls in the streaming loop before execution. When the LLM emits a tool call whose name is in `askToolNames`, pause the agent and emit a new `tool_approval_request` stream event to the renderer instead of running the tool immediately. Implement a pending-approval map keyed by `toolCallId` with Promise resolvers. Expose an IPC handler (`llm:approve-tool` / `llm:deny-tool`) that resolves the corresponding promise (approve → run tool and return result; deny → return refusal text).

2. **Shared types** — Add `tool_approval_request` to `StreamEventType` and `TraceEntryType`; add `StreamToolApprovalEvent` and a `ToolApprovalRequest` type carrying toolCallId, toolName, tool description, and args.

3. **Approval UI (renderer)** — Add an inline `ToolApprovalCard` component rendered in the message stream alongside existing `tool_call` trace entries. The card shows tool name, description, arguments, and Approve/Deny buttons that call `window.api.llm.approveTool` / `window.api.llm.denyTool`.

4. **Sidebar indicator** — Track pending approvals per conversationId in ChatView/App state; pass a `pendingApprovalConversationIds` set to `ConversationList`; show an icon/badge on conversation rows that have a pending approval.

Key architectural decision: rather than patching the LangGraph executor (which does not have a built-in interrupt hook in the current setup), implement a lightweight "hold" layer that wraps tool execution: when a tool call comes through the `values` stream, check if it's an ask-tool, and if so, emit the approval event and await the IPC resolution before proceeding. This avoids deep changes to the LangGraph streaming loop.

# Outcome

## Task 1: Types and IPC stubs — complete

Added the foundational types and IPC plumbing for runtime tool approval:

- Added `'tool_approval_request'` to `StreamEventType` in `src/shared/types/llm.ts`
- Added `StreamToolApprovalEvent` interface (extends `StreamEventBase`) with fields: `type`, `toolCallId`, `toolName`, `toolDescription`, `args`
- Added `StreamToolApprovalEvent` to the `StreamEvent` union type
- Registered `llm:approve-tool` and `llm:deny-tool` IPC handlers in `src/main/ipc/llm.ts` (stubs that log and return `{ success: true }`)
- Exposed `window.api.llm.approveTool(streamId)` and `window.api.llm.denyTool(streamId, message?)` in `src/preload/index.ts`
- Added `approveTool(streamId: string): void` and `denyTool(streamId: string, message?: string): void` stub methods to `LLMAgentService` in `src/main/services/llm/agent.ts`
- `npm run type-check` passes with no errors

## Task 2: HITL interrupt mechanism in main process — complete

Wired up the full human-in-the-loop interrupt mechanism using `humanInTheLoopMiddleware` from the installed `langchain` package (confirmed available at `langchain/dist/agents/middleware/hitl`). The implementation avoids a custom interrupt layer because the framework middleware is already present.

**Changes to `src/main/services/llm/agent.ts`:**

- Imported `Command` from `@langchain/langgraph` and `humanInTheLoopMiddleware`, `HITLRequest`, `HITLResponse` from `langchain`
- Added `ApprovalResult` interface and `pendingApprovals: Map<string, { resolve, reject }>` to `LLMAgentService`
- In `getExecutorForModel`: when `askToolNames` is non-empty, pass a `humanInTheLoopMiddleware({ interruptOn: { [toolName]: { allowedDecisions: ['approve', 'reject'] } } })` instance in the `middleware` array of `createAgent`
- Refactored `queryStream` to a `while(true)` loop that re-streams with `Command({ resume })` after each interrupt:
  - On first iteration, streams from initial `{ messages }` input
  - Detects `__interrupt__` in `values` stream chunks; when found, breaks out of the `for await` and enters interrupt-handling logic
  - For each action in the HITLRequest, emits a `tool_approval_request` stream event (with `toolCallId`, `toolName`, `toolDescription` from registry, `args`) then awaits the `pendingApprovals` promise
  - Abort signal is observed: if aborted while waiting, the pending promise is rejected and the loop throws, triggering the existing `cancelled` event path
  - After all decisions are collected, resumes with `Command({ resume: HITLResponse })`
  - When no interrupt is detected, breaks out of the `while(true)` and emits the `complete` event as before
- `approveTool(streamId)`: resolves the pending approval with `{ approved: true }`, removing the entry from the map
- `denyTool(streamId, message?)`: resolves with `{ approved: false, message }`, removing the entry
- `catch` block: cleans up any remaining pending approval entry to prevent promise leaks
- The IPC handlers in `src/main/ipc/llm.ts` already forward to `getLLMAgentService().approveTool/denyTool` from Task 1; no changes needed there

`npm run type-check` passes with no errors.
