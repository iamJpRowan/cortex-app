---
type: story
title: Tool Permission Runtime Approval
alias: Tool Permission Runtime Approval
status: in progress
summary: Inline approval UI for "ask" tools — execution pauses, user approves or denies in-conversation, sidebar indicator when chat not in focus.
themes:
  - chat-ai
parent: "[[tool-permission-system.story.md]]"
depends_on:
  - "[[tool-permission-system.story.md]]"
milestones:
  - "[[app-reads-and-writes-files.milestone]]"
devlogs:
  - "[[2026-03-17-tool-permission-runtime-approval]]"
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Tool Permission Runtime Approval

# Tool Permission Runtime Approval

## Goal

When the LLM invokes a tool that has "ask" permission in the conversation's mode, pause execution, show an inline approval card in the message stream, and on approve run the tool and return its result to the LLM; on deny block the request and return a refusal. The user must be able to tell when any chat is awaiting approval even when that chat is not in focus.

## Prerequisites / Dependencies

- **[[tool-permission-system.story.md]]** — Phases 1–8 complete: tool definitions, mode storage, `getToolsForAgent()` filtering, and `askToolNames` produced by the executor.

## Requirements and constraints

1. **Interrupt on "ask" tool invocation.** When the executor would run a tool whose name is in `getToolsForAgent()`'s `askToolNames`, pause before executing and hand control to the app (callback, event, or harness hook). May use a framework that supports interrupt (e.g. LangChain Deep Agents' `interrupt_on`) or a minimal custom interrupt layer.
2. **Sidebar indicator for awaiting approval.** When a conversation has a pending "ask" tool approval, the conversation list must show that state (e.g. icon or badge on the conversation row), using the same pattern as existing "streaming" and "unread" indicators.
3. **Approval UI in-conversation.** When the conversation is in focus, the approval UI appears in the message stream as an inline card (not a global modal). Shows: tool name, description, and the arguments the LLM is requesting; Approve and Deny actions. Follows [[ui-guide]] and [[design/README]] where applicable.
4. **Approve path.** User clicks Approve → run the tool with the requested arguments, return the tool result to the executor so the LLM receives it as the tool response.
5. **Deny path.** User clicks Deny → do not run the tool; return a refusal message to the executor so the LLM sees that the tool use was denied.
6. **Single flow.** All "ask" tools go through this same interrupt → approval UI → approve/deny path. No per-tool or per-conversation persistence of decisions.

**UI approach:** Render the pending tool request as a card in the message stream (same area as existing tool steps: collapsible row with icon, label, then expanded content). The card shows tool name, description, arguments, and Approve/Deny buttons. Aligns with existing `TraceDisplay` / `ToolInvocationDetails` patterns.

**Out of scope:** Content-length and token-limit confirmations (see [[content-and-token-guardrail-confirmations]]). Any "remember this decision" or approval-override persistence.

## Success criteria

- With a mode where a tool (e.g. `command_invoke`) is "ask", when the LLM requests that tool the run pauses before execution.
- Conversation list shows an indicator for conversations that have a pending approval when that conversation is not selected.
- When the user selects a conversation awaiting approval, the approval UI is visible in that conversation view and shows the tool's name, description, and requested arguments; Approve and Deny are available.
- Approve: tool runs with those arguments; the LLM receives the tool result and can continue.
- Deny: tool does not run; the LLM receives a clear refusal and can continue the conversation.

## References

- [[tool-permission-system.story.md]] — Parent story; Phases 1–8 context and architecture.
- [[content-and-token-guardrail-confirmations]] — Reuses this approval UI pattern for content/token guardrails.
- [[deep-agents-adoption]] — `interrupt_on` hook from Deep Agents may be used for the interrupt mechanism.

## Tasks

### Task 1: Types and IPC stubs — `complete`

**Scope:** Add `tool_approval_request` to `StreamEventType` in shared types; add `StreamToolApprovalEvent` type (carrying `toolCallId`, `toolName`, `toolDescription`, `args`); register `llm:approve-tool` and `llm:deny-tool` IPC handlers (stubs that return `{ success: true }`); expose them in preload as `window.api.llm.approveTool(streamId)` and `window.api.llm.denyTool(streamId)`; add `approveTool` and `denyTool` method stubs to `LLMAgent`.

**Acceptance criteria:**
- [x] `StreamEventType` includes `'tool_approval_request'`
- [x] `StreamToolApprovalEvent` interface exists in `src/shared/types/llm.ts` with fields: `type: 'tool_approval_request'`, `streamId`, `conversationId`, `toolCallId`, `toolName`, `toolDescription`, `args`
- [x] `StreamEvent` union includes `StreamToolApprovalEvent`
- [x] `ipcMain.handle('llm:approve-tool', ...)` and `ipcMain.handle('llm:deny-tool', ...)` registered in `src/main/ipc/llm.ts`
- [x] `window.api.llm.approveTool` and `window.api.llm.denyTool` exposed in `src/preload/index.ts`
- [x] `LLMAgent` has `approveTool(streamId: string): void` and `denyTool(streamId: string, message?: string): void` stubs
- [x] TypeScript compiles without errors (`npm run type-check`)

**References:** `src/shared/types/llm.ts`, `src/main/ipc/llm.ts`, `src/preload/index.ts`, `src/main/services/llm/agent.ts`

---

### Task 2: HITL interrupt mechanism in main process — `complete`

**Scope:** Wire up `humanInTheLoopMiddleware` from `langchain` and implement the pause/resume loop in `streamQuery`. In `getExecutorForModel`: when `askToolNames` is non-empty, add `humanInTheLoopMiddleware({ interruptOn: Object.fromEntries(askToolNames.map(n => [n, { allowedDecisions: ['approve', 'reject'] }])) })` to `createAgent`. In `LLMAgent`: add a `Map<string, { resolve(d: Decision): void; reject(e: Error): void }>` for pending approvals; implement `approveTool` and `denyTool` to resolve entries in this map. Refactor the `streamQuery` loop: wrap the `for await` in a `while(true)` that detects `__interrupt__` in `values` chunks, emits a `tool_approval_request` stream event, awaits the pending approval, and calls `executor.stream(new Command({ resume: { decisions: [decision] } }), config)` to continue; handle `signal.aborted` to reject pending approvals. Import `Command` from `@langchain/langgraph` and `humanInTheLoopMiddleware`, `HITLResponse`, `Decision` from `langchain`.

**Acceptance criteria:**
- [x] When a tool with "ask" permission is called by the LLM, a `tool_approval_request` stream event is emitted (verified via log or manual test)
- [x] `approveTool(streamId)` resolves the pending approval with `{ type: 'approve' }`, the tool runs, and the LLM receives its result
- [x] `denyTool(streamId)` resolves with `{ type: 'reject', message: 'Tool use denied by user.' }`, the tool does not run, the LLM receives the refusal
- [x] Cancelling the stream (AbortSignal) rejects any pending approval and cleans up the map entry
- [x] `npm run type-check` passes

**References:** `src/main/services/llm/agent.ts`, `node_modules/langchain/dist/agents/middleware/hitl.d.ts`, `src/main/ipc/llm.ts`

---

### Task 3: Approval card UI in renderer — `pending`

**Scope:** Add a `ToolApprovalCard` component in `src/renderer/src/components/ai-elements/`; wire `tool_approval_request` events in `ChatView.tsx` to display the card inline in the message stream. `ToolApprovalCard` renders tool name, description (from the event), and args (using the existing `ToolInvocationDetails` args block pattern); Approve and Deny buttons call `window.api.llm.approveTool(streamId)` and `window.api.llm.denyTool(streamId)` and disable themselves after click. In `ChatView`: track `pendingApproval: StreamToolApprovalEvent | null` state; on `tool_approval_request` set it; render the card below `streamingContent` in the streaming message area; clear on `complete`, `error`, `cancelled`, or when either button is clicked.

**Acceptance criteria:**
- [ ] `ToolApprovalCard` component exists; renders tool name, description, args, Approve and Deny buttons
- [ ] Approval card appears in the message stream when an "ask" tool is invoked
- [ ] Clicking Approve calls `window.api.llm.approveTool(streamId)`; clicking Deny calls `window.api.llm.denyTool(streamId)`
- [ ] Buttons are disabled (or card removed) after user clicks
- [ ] Card is removed when stream ends (`complete`, `error`, `cancelled`)
- [ ] Follows existing `tool-invocation.tsx` visual patterns (icon, label, collapsible details)
- [ ] `npm run type-check` passes; no lint errors

**References:** `src/renderer/src/components/ai-elements/tool-invocation.tsx`, `src/renderer/src/components/ChatView.tsx`, `src/renderer/src/components/ai-elements/message.tsx`, `docs/development/design/ui-guide.md`

---

### Task 4: Sidebar pending-approval indicator — `pending`

**Scope:** Track which conversations have a pending approval in `ChatView` state; pass the set to `ConversationList`; show an icon or badge on conversation rows awaiting approval, matching the existing "streaming" indicator pattern (`streamingConversationId`). Clear the indicator when the stream's approval is resolved or the stream ends.

**Acceptance criteria:**
- [ ] When conversation A has a pending approval and the user switches to conversation B, conversation A's row in the sidebar shows a pending-approval indicator (icon or badge)
- [ ] The indicator is distinct from the streaming spinner
- [ ] The indicator is cleared when the stream completes (approve, deny, cancel, or error)
- [ ] No indicator shown for conversations without a pending approval
- [ ] `npm run type-check` passes; no lint errors

**References:** `src/renderer/src/components/ConversationList.tsx`, `src/renderer/src/components/ChatView.tsx`
