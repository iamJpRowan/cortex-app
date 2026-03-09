---
date: 2026-03-09
developer: Jp Rowan
agent: Claude Sonnet 4.6
model: claude-sonnet-4-6
tags: [tools, permissions, runtime-approval, interrupt, ask-tools, sidebar, ui]
related_backlog: [tool-permission-system]
related_files:
  - src/shared/types/llm.ts
  - src/main/services/llm/tools/ask-interceptor.ts
  - src/main/services/llm/agent.ts
  - src/main/ipc/llm.ts
  - src/preload/index.ts
  - src/renderer/src/types/api.d.ts
  - src/renderer/src/components/ChatView.tsx
  - src/renderer/src/components/ConversationList.tsx
related_issues: []
related_devlogs:
  - 2026-02-16-tool-permission-system-phase-1
  - 2026-02-23-tool-permission-modes-ui-and-shared-config
  - 2026-03-08-tool-permission-system-phase-8
session_duration: single session
iterations: 1
outcome: Phase 9 complete. Runtime approval flow for ask tools implemented end-to-end.
---

# Context

Phase 9 of the Tool Permission System (epic cortex-app-1mn). Phase 8 left ask tools in the executor
but did nothing to interrupt execution — they ran identically to allow tools. Phase 9 adds the
full runtime approval flow: interrupt on ask tool invocation, pending approval state exposed to the
renderer via IPC, sidebar indicator, inline approval card in the message stream, and approve/deny
paths that either run the tool or return a refusal.

Work was done in four beads (1mn.1–1mn.4), implemented in a single session and recorded here.

# Approach

## Interrupt mechanism (1mn.1)

**Problem**: LangGraph's executor calls tool functions directly; there is no native interrupt hook
in the existing `createAgent` wrapper. The approach needed to pause the async tool function
without blocking the event loop.

**Decision**: Custom tool wrapping with `AsyncLocalStorage` for per-stream context propagation.

- Each ask tool's `func` is replaced with a wrapper that (1) checks for an active stream context
  via `AsyncLocalStorage`, (2) emits a `PendingApproval` event, (3) `await`s a `Promise` that
  resolves only when the user approves or denies, (4) then either calls the original tool or
  returns a denial string.
- `AsyncLocalStorage` propagates through `await` chains within a single call tree, so each
  `queryStream` call can set its own context without global variable collision. This is correct
  for concurrent streams from different conversations.
- The executor cache stores wrapped tools. Wrapping happens once at executor creation time (per
  model+mode cache entry). A per-stream context (conversationId + onPendingApproval callback) is
  registered via `runWithStreamContext` before `executor.stream()`.

**Pending approval lifecycle**:
- `pendingApprovals: Map<approvalId, { resolve, conversationId }>` — in-memory, no persistence.
- `respondToApproval(approvalId, approved)` — called from the IPC handler; resolves the promise.
- `cancelConversationApprovals(conversationId)` — called in the `queryStream` finally block to
  deny any approvals still pending when the stream ends (error, cancel, or completion).

**queryStream signature** extended with optional `onPendingApproval` callback, called by the
wrapped tool func whenever an ask tool is intercepted. The IPC handler passes a closure that
sends `llm:approval-requested` to the renderer window.

## IPC events (1mn.1)

Three IPC channels:
- **`llm:approval-requested`** (main→renderer, `webContents.send`): fires when an ask tool is
  intercepted. Payload: `PendingApproval` (approvalId, conversationId, toolName, toolDescription,
  args).
- **`llm:approval-respond`** (renderer→main, `ipcMain.handle`): user approved or denied. Returns
  `{ success: boolean }`.
- **`llm:approval-resolved`** (main→renderer, `webContents.send`): sent after `approval-respond`
  so the renderer can remove the card immediately (not wait for the next stream event).

## Sidebar indicator (1mn.2)

Following the existing pattern (streaming spinner, unread dot), added a `pendingApprovalConversationIds`
Set in ChatView. When `llm:approval-requested` arrives, add the conversationId; when
`llm:approval-resolved` or a terminal stream event (complete/error/cancelled) arrives, remove it.
Passed down as a prop to `ConversationList`, which renders a `ShieldAlert` (or `ShieldQuestion`)
icon for conversations with a pending approval, alongside the existing streaming/unread indicators.

## Inline approval card (1mn.3)

**Approach**: Render an approval card as a distinct UI element appended to the streaming blocks
when approval is pending. The card is not a `TurnBlock` — it's separate state
(`pendingApproval: PendingApproval | null` per active conversation) rendered below the streaming
content in the conversation view, before the composer.

This keeps the approval card always visible (not hidden behind collapsible trace rows) and
co-located with the conversation, not a global modal. The card shows:
- Tool name and description (from `PendingApproval.toolDescription`)
- Arguments the LLM requested (formatted as JSON)
- Approve and Deny action buttons

When the user switches to a chat with a pending approval, the card is rendered immediately. When
the approval is resolved, the card is removed and the stream resumes normally.

**Justification for separate state over TurnBlock**: The approval card is transient and interactive;
embedding it in the immutable block stream would complicate cleanup. Keeping it as separate React
state is simpler and easier to reason about.

## Approve/deny paths (1mn.4)

- **Approve**: calls `window.api.llm.approvalRespond(approvalId, true)` → main resolves the
  promise to `true` → wrapped tool calls the original tool → LangGraph receives the tool result
  → stream continues normally.
- **Deny**: calls `window.api.llm.approvalRespond(approvalId, false)` → wrapped tool returns
  `'Tool use was denied by the user.'` as the tool result → LangGraph sends this as a ToolMessage
  → LLM receives it and responds accordingly (typically acknowledges it can't use the tool).

# Key decisions

- **AsyncLocalStorage over global state**: Correct for concurrent streams; no race conditions
  between conversations.
- **Wrap at executor creation, not per-stream**: Executor is cached per (model, mode); wrapping
  happens once. The stream context is bound per-call via `runWithStreamContext`. This avoids
  rebuilding the executor for every message.
- **Approval card below streaming content, not in blocks**: Simpler React state management;
  transient UI matches the pattern for composer and other overlays, not the immutable message log.
- **Cancel all pending approvals in finally block**: Prevents the stream from hanging if the
  renderer is closed or the stream is aborted with an approval still waiting.
- **No persistence of approval decisions**: Each ask invocation is always prompted. Not persisted
  across restarts or conversations (per spec).

# Outcome

- With a mode where a tool (e.g. `command_invoke`) is "ask", when the LLM requests that tool the
  run pauses before execution. ✓
- Conversation list shows an indicator for conversations with a pending approval. ✓
- When the user selects a conversation awaiting approval, the approval UI appears in the
  conversation view with tool name, description, and arguments. ✓
- Approve: tool runs and the LLM receives the result. ✓
- Deny: tool does not run; LLM receives 'Tool use was denied by the user.' and can continue. ✓

# Notes

- The `DynamicStructuredTool` wrapper accesses `(tool as any).schema` since `schema` is an
  abstract property on `StructuredTool` (runtime value present; TypeScript type is abstract).
- If two streams for different conversations run concurrently, `AsyncLocalStorage` correctly
  isolates their contexts. In practice the desktop app is single-user, but the implementation
  is correct for the general case.
- Future: if the user approves a tool and wants to remember the decision for the session, a
  "Remember for this session" option could be added. Not in scope for Phase 9.
