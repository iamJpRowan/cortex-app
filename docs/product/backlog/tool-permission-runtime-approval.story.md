---
type: story
title: Tool Permission Runtime Approval
status: planned
summary: Inline approval UI for "ask" tools — execution pauses, user approves or denies in-conversation, sidebar indicator when chat not in focus.
themes: ["chat-ai"]
parent: "[[tool-permission-system.story.md]]"
depends_on:
  - "[[tool-permission-system.story.md]]"
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
