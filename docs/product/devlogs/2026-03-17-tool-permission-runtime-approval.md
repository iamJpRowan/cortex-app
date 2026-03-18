---
date: 2026-03-17
developer:
agent: Claude
model: claude-sonnet-4-6
session_id:
tags: []
backlog_items: ["[[tool-permission-runtime-approval]]"]
related_issues: []
outcome: complete
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

## Task 3: Approval card UI in renderer — complete

Added the inline `ToolApprovalCard` component and wired `tool_approval_request` events into `ChatView`.

**New file: `src/renderer/src/components/ai-elements/tool-approval-card.tsx`**

- `ToolApprovalCard` component renders: tool name with a `ShieldQuestion` icon, `toolDescription`, args via `ToolInvocationDetails`, and Approve/Deny buttons
- Approve/Deny buttons disable themselves (`clicked` state) immediately on click to prevent double-submits
- Exported props: `event: StreamToolApprovalEvent`, `onApprove: () => void`, `onDeny: () => void`
- Follows `tool-invocation.tsx` visual patterns (icon, label, `ToolInvocationDetails` args block)

**Changes to `src/renderer/src/types/api.d.ts`**

- Added `StreamToolApprovalEvent` to the import and re-export list
- Added `approveTool(streamId)` and `denyTool(streamId, message?)` method stubs to the `llm` API namespace

**Changes to `src/renderer/src/components/ChatView.tsx`**

- Imported `ToolApprovalCard` and `StreamToolApprovalEvent`
- Added `pendingApproval: StreamToolApprovalEvent | null` state (cleared on `complete`, `error`, `cancelled`, or button click)
- Added `case 'tool_approval_request'` in `handleStreamEvent` — sets `pendingApproval`
- Cleared `pendingApproval` in `complete`, `cancelled`, and `error` cases
- Added `handleApproveTool` and `handleDenyTool` callbacks (call `window.api.llm.approveTool/denyTool`, clear state)
- Added `pendingApproval`, `onApproveTool`, `onDenyTool` props to `ChatTurn` (optional, only the streaming turn passes them)
- `ToolApprovalCard` is rendered inside `ChatTurn` after the `Message` block when `pendingApproval` is set

`npm run type-check` passes; no new lint errors.

## Task 4: Sidebar pending-approval indicator — complete

Added the sidebar indicator so that when any conversation has a pending "ask" tool approval, its row in the conversation list shows a distinct badge — even when that conversation is not in focus.

**Changes to `src/renderer/src/components/ChatView.tsx`:**

- Added `pendingApprovalConversationIds: Set<string>` state alongside the existing `streamingConversationId` state
- In `handleStreamEvent`, in the "always-run" block (before the per-conversation early return): on `complete`, `error`, or `cancelled` events, removes the conversation's ID from `pendingApprovalConversationIds` — this fires even when the user is viewing a different conversation
- In the `tool_approval_request` switch case: adds the event's `conversationId` to `pendingApprovalConversationIds` in addition to setting `pendingApproval`
- In `handleApproveTool` and `handleDenyTool`: clears the active `conversationId` from `pendingApprovalConversationIds` immediately on click
- Passes `pendingApprovalConversationIds` as a new prop to `ConversationList`

**Changes to `src/renderer/src/components/ConversationList.tsx`:**

- Added `ShieldQuestion` to lucide-react imports
- Added `pendingApprovalConversationIds?: Set<string>` to `ConversationListProps`
- Derives `hasPendingApproval` per conversation row in the render loop
- Renders a `<ShieldQuestion>` icon with `text-warning-600` color and `title="Awaiting tool approval"` when `hasPendingApproval` is true — placed after the streaming spinner so the two indicators are visually distinct

`npm run type-check` passes; no lint errors.
