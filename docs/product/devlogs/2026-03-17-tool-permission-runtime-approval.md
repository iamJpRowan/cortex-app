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

_To be filled as tasks complete._
