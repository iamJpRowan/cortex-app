---
status: in progress
themes: [chat-ai]
summary: Content length guardrails for UI and agent context; prevent freezes and context blow-up from large tool results.
devlogs: [2026-02-22-bounded-tool-results]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Bounded Tool Results and Chat UI Stability

# Bounded Tool Results and Chat UI Stability

## Goal

**Content length guardrails for both the UI and agent context:** prevent UI freezes and context-window blow-up when tool results (or graph-stored content) are unexpectedly large, and allow intentional full-content use when needed.

## Problem

1. **UI freeze**: When the LLM stream receives a very large tool result, the renderer does heavy **markdown parsing** (Streamdown/micromark) on the accumulated string. That work blocks the main thread and freezes the chat UI.
2. **Prompt too long**: Tool results are fed back into the conversation state. If a tool returns huge content (e.g. Neo4j nodes with hour-long transcripts in properties), the next LLM call can exceed the model’s context window (e.g. 204k+ tokens), leading to 429 / “prompt too long” errors.
3. **Unbounded source data**: Some tools (e.g. Neo4j Cypher) return arbitrary graph data. Any property name can hold long-form content; we can’t rely on removing one property to fix this for all users or all graphs.

### Notes from troubleshooting

- **Two distinct failure modes:** (1) **UI freeze** — renderer does too much work (e.g. markdown parse on a huge string); fix by not sending oversized payloads over IPC and by UI guardrails. (2) **Prompt too long / 429** — the *conversation state* (what the next LLM call sees) is whatever the **tool handler returns**; truncation in trace or display does *not* change that. Only capping at source or in the factory fixes context-window blow-up. So both backend caps (for conversation state and for IPC size) and UI guardrails are needed.
- **Why the freeze occurred:** The freeze was observed when the renderer parsed the **full accumulated** streamed content (e.g. after a large tool result was included in the stream). So both the size of a single payload (e.g. tool result in a trace event) and the size of accumulated content in events matter. Throttling how often updates are sent (e.g. by time, ~80ms) can also prevent rapid parse storms from many small updates.
- **Example sizes used during troubleshooting** (as a starting point; tune as needed): tool result in trace 4k, accumulated content in events 8k, error message 500 (log) / 2k (in event); display cap 4k with initial preview ~1k before “Show more”; throttle interval ~80ms for streaming/trace updates.

## Current state

**Done (keep):**

- **1.3 Agent IPC truncation:** Tool result and error in trace truncated to 4k; accumulated content in error/cancelled events to 8k; error message in event to 2k; log error to 500 chars. Friendly 429 / “prompt too long” handling in error path. Implemented in `agent.ts`.
- **Part 2 UI:** Tool result display capped (4k) with initial preview ~1k and “Show more”; streaming updates throttled (~80ms); trace updates use rAF; `ToolInvocationDetails` memoized. Implemented in `tool-invocation.tsx` and `ChatView.tsx`.

**Done (this implementation):**

- **1.1 Cap at source:** Neo4j handlers cap every string in `valueToJson` with `capPropertyValue` (max per-property length); Cypher result total is capped with `capToolResult` before return. See `content-guardrails.ts` and `builtin/neo4j/handlers.ts`.
- **1.2 Central factory cap:** `createToolFromDefinition` wraps handler return with `capToolResult(result, DEFAULT_MAX_TOOL_RESULT_LENGTH)` so every tool’s result is capped before it becomes the ToolMessage in the graph (unless opted out).
- **1.4 Opt-out:** `ToolDefinitionMetadata.capResultLength` (default `true`); when `false`, factory skips the central cap. See definition-types and adding-a-tool docs.

**Design note:** One holistic policy—cap **agent context** (factory + optional per-tool source caps) and **UI/IPC** (agent truncation + UI guardrails). Shared constants (e.g. in a small `content-guardrails` module) keep limits consistent and tunable. User-facing “allow full result” and “confirm oversized prompt” are implemented via the [Tool Permission System](./tool-permission-system.md) runtime approval flow (same interrupt/modal pattern).

---

## Solution scope

Full scope is **content length guardrails for both the UI and agent context**:

1. **Backend:** Limit what the main process ever sends to the renderer so that no payload can cause the UI to freeze; and cap what goes into the **conversation state** (tool result length) so the next LLM call cannot exceed context window.
2. **UI:** Additional guardrails in the renderer to fail safely if oversized content still reaches it.

Implementation order: backend first (so the renderer rarely sees oversized content and context stays bounded), then UI guardrails (defense-in-depth).

---

### Part 1: Backend — never send content that would freeze the UI

Ensure the main process never sends the renderer payloads (e.g. tool results in trace/events) large enough to trigger main-thread freezes. This includes:

**1.1 Cap at source (per-tool, for structured data)**  
For tools that serialize structured data (e.g. Neo4j rows with many properties): when serializing to a string (e.g. in a `valueToJson`-style helper), **cap every string value** with a single constant (e.g. `MAX_PROPERTY_VALUE_LENGTH` in the 8k–16k range), regardless of property name. Optionally cap total result length. Ensures the tool never returns a multi-megabyte string.

**1.2 Central default cap for all tools (factory)**  
In `createToolFromDefinition`, wrap the handler’s string return with a shared `capToolResult(result, maxLength)` so every tool gets a default cap without per-handler logic. Even if a tool forgets to cap internally, the factory caps the result before it becomes the tool message in the graph.

**1.3 Agent: truncate what goes over IPC**  
Truncate content in trace/events so that what is sent to the renderer (tool result in trace, accumulated content in events, error message lengths) never exceeds safe sizes (e.g. 4k for tool result in trace, 8k accumulated, bounded error lengths). Ensures no single IPC payload can overwhelm the renderer. Friendly handling of 429 / “prompt too long” where applicable.

**1.4 Opt-out when full content is required**  
Per-tool metadata (e.g. `capResultLength?: boolean`, default `true`). When `capResultLength === false`, the factory skips the central cap. Document that disabling increases risk of freezes and “prompt too long.” Optional future: user/session setting to allow full tool results (would require passing context into factory or execution path).

---

### Part 2: UI — fail safely if oversized content reaches the renderer

Additional guardrails in the renderer so that if oversized content ever makes it over IPC, the UI degrades gracefully instead of freezing:

- **Tool result display:** Cap the amount of tool result text rendered at once (e.g. initial preview length) and provide “Show more” to expand within the already-truncated payload. Avoid parsing/rendering a single huge block.
- **Streaming/trace updates:** Throttle streaming or trace updates and use `requestAnimationFrame` where appropriate so that rapid or large updates don’t pile up on the main thread.
- **Re-renders:** Memoize heavy components (e.g. `ChatTurn`, `ToolInvocationDetails`) so that streaming updates don’t trigger unnecessary re-renders of large subtrees.

Together, Part 1 and Part 2 achieve content length guardrails for both the UI and agent context.


## Success criteria

**Backend (Part 1)**  
- [x] Tools that return structured data (e.g. Neo4j) cap string values at serialization time (per-property and optionally total length).
- [x] Factory applies a default tool result length cap to all tools created from definitions.
- [x] Agent truncates content in trace/events so payloads sent to the renderer never exceed safe sizes (tool result, accumulated, error lengths); 429 / “prompt too long” handled appropriately.
- [x] Tool definitions can opt out of the central cap via metadata (e.g. `capResultLength: false`); docs or comments explain when to use opt-out and the risks.

**UI (Part 2)**  
- [x] Tool result display is capped with “Show more” to expand; no single huge block parsed/rendered at once.
- [x] Streaming/trace updates are throttled or use rAF where appropriate; heavy components (e.g. ChatTurn, ToolInvocationDetails) are memoized to limit re-renders.

## Relevant paths

- **Content guardrails:** `src/main/services/llm/content-guardrails.ts` (DEFAULT_MAX_TOOL_RESULT_LENGTH, MAX_PROPERTY_VALUE_LENGTH, capToolResult, capPropertyValue).
- **Agent/stream/errors:** `src/main/services/llm/agent.ts` (trace/event truncation).
- **Neo4j tool:** `src/main/services/llm/tools/builtin/neo4j/handlers.ts` (valueToJson per-property cap, Cypher result total cap).
- **Tool result UI:** `src/renderer/src/components/ai-elements/tool-invocation.tsx` (display cap, “Show more”).
- **Tool factory:** `src/main/services/llm/tools/factory.ts` (central cap wrapper, capResultLength opt-out).
- **Tool definition metadata:** `src/main/services/llm/tools/definition-types.ts` (capResultLength).
- **Stream types:** `src/shared/types/llm.ts`.

## Sequencing: token limits and confirmation

Token-limit guardrails (estimate input size, show “used / limit”, and optionally require user confirmation before sending oversized requests) fit into the following order:

1. **Complete this item (bounded tool results):** Implement 1.1 (Neo4j at-source cap), 1.2 (factory cap), and 1.4 (opt-out). That caps **default** tool result size in context and prevents most “prompt too long” cases without new UX.
2. **Context Window and Costs:** Implement token estimation and display (Phases 3–4: context window, “tokens for next request”, “used / limit” by model). That gives the **inputs** needed for any confirmation flow (we need an estimate before we can prompt “this request will use ~X tokens”).
3. **Confirmation for oversized prompts:** Add “confirm when estimated input exceeds threshold” (e.g. 80% of model context or a fixed “expensive” cap). Implement this in the **[Tool Permission System](./tool-permission-system.md)** runtime approval flow (Phase 6): same interrupt → modal → approve/deny pattern, triggered by estimated token count instead of (or in addition to) “ask” permission. Optional “remember” for the conversation or globally. Depends on having token estimation (step 2) and the permission system’s interrupt/modal (Phase 6).

So: **bounded tool results** first (default caps in place), then **Context Window and Costs** (estimation and display), then **permission system Phase 6** extended with oversized-prompt confirmation. “Allow full tool result” for a single call also belongs in Phase 6 (interrupt when factory would cap, offer “include full result”; if approved, skip cap for that invocation only).

## Related

- [Agent Streaming (LLM)](./agent-streaming-llm.md) — streaming and trace UI.
- [Tool Permission System](./tool-permission-system.md) — declarative definitions, metadata, and runtime approval (including future “allow full result” and “confirm oversized prompt”).
- [Context Window and Costs](./context-window-and-costs.md) — token estimation and “used / limit” display; prerequisite for oversized-prompt confirmation.
