---
status: completed
date_archived: 2026-02-22
summary: Content length guardrails for UI and agent context; prevent freezes and context blow-up from large tool results.
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](../README.md) / Bounded Tool Results and Chat UI Stability

**Why archived:** Implemented. Backend (1.1 at-source, 1.2 factory cap, 1.4 opt-out) and Part 2 UI (display cap, throttle, memoization) complete. See devlog [2026-02-22-bounded-tool-results](../../devlogs/2026-02-22-bounded-tool-results.md).

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

## Implemented

- **1.1 Cap at source:** Neo4j handlers cap every string in `valueToJson` with `capPropertyValue`; Cypher result total capped with `capToolResult`. See `content-guardrails.ts` and `builtin/neo4j/handlers.ts`.
- **1.2 Central factory cap:** `createToolFromDefinition` wraps handler return with `capToolResult(result, DEFAULT_MAX_TOOL_RESULT_LENGTH)` unless opted out.
- **1.3 Agent IPC truncation:** Tool result and error in trace truncated to 4k; accumulated content in events to 8k; error message lengths bounded. Implemented in `agent.ts`.
- **1.4 Opt-out:** `ToolDefinitionMetadata.capResultLength` (default `true`); when `false`, factory skips the central cap.
- **Part 2 UI:** Tool result display capped (4k) with “Show more”; streaming updates throttled (~80ms); trace updates use rAF; `ToolInvocationDetails` memoized.

User-facing “allow full result” and “confirm oversized prompt” are implemented via the [Tool Permission System](../tool-permission-system.md) runtime approval flow.

## Success criteria

- [x] Tools that return structured data (e.g. Neo4j) cap string values at serialization time.
- [x] Factory applies a default tool result length cap to all tools created from definitions.
- [x] Agent truncates content in trace/events so payloads sent to the renderer never exceed safe sizes; 429 / “prompt too long” handled appropriately.
- [x] Tool definitions can opt out via metadata (`capResultLength: false`); docs explain when and risks.
- [x] Tool result display capped with “Show more”; streaming/trace updates throttled or rAF; heavy components memoized.

## Related

- [Tool Permission System](../tool-permission-system.md) — runtime approval (including “allow full result” and “confirm oversized prompt”).
- [Context Window and Costs](../context-window-and-costs.md) — token estimation and “used / limit” display; prerequisite for oversized-prompt confirmation.
