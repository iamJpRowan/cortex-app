---
date: 2026-02-23
developer: cortex-app
agent: Cursor (Auto)
model: -
tags: [chat, streaming, thinking, tool-result, trace, blocks]
related_files:
  - src/renderer/src/components/ChatView.tsx
  - src/renderer/src/lib/chat-blocks.ts
  - src/main/services/llm/agent.ts
  - src/shared/lib/chat-blocks.ts
  - docs/development/chat-streaming-and-blocks.md
related_issues: []
related_devlogs:
  - 2026-02-22-bounded-tool-results.md
  - 2026-02-17-chat-trace-token-usage-and-cleanup.md
session_duration: single
iterations: four (thinking merge; tool spew reverted then fix; single block builder + data flow doc)
outcome: One Thinking row per thought; tool spew fixed; single block builder (shared + renderer libs) and reload block order normalized; data flow documented.
---

# Context

Two chat UX bugs were reported in the same conversation: (1) multiple "Thinking" blocks rendered for a single thought (e.g. 1ms, 482ms, 935ms, 1.4s with progressively longer content), and (2) during streaming the full tool result content appeared in the assistant's response text (outside the tool block), but on reload that content was not part of the response.

# Problem

**Thinking blocks**

- The backend streams multiple `reasoning` trace entries for one thought (incremental reasoning emits).
- The UI was creating one display item per reasoning block, so each entry became its own "Thinking" row with its own timestamp and content.
- Users saw several redundant Thinking blocks instead of one that reflects the final thought.

**Tool result in response text**

- Whatever ends up in `currentSegment` right before we process a tool result (from the **values** stream) gets flushed and sent as `completedSegment` when we emit the `tool_result` trace entry. That segment was being pushed as a text block in the UI.
- In practice that segment often contained the full tool result (either the model echoing it or tool content appearing in the token stream). So the UI showed a huge block of raw tool output as "response text" during streaming. On reload we build only from **AIMessage** content, so that text was never persisted—mismatch between stream and reload.

# Solution

**Thinking: one row per thought**

- In `buildDisplayItems` (ChatView.tsx), when we see a `reasoning` trace block we now collect all **consecutive** reasoning blocks into a single `traceGroup` (one display item) and advance the index past them.
- `buildOrderedTraceItems` already merges consecutive reasoning entries into one row (last content wins). So one TraceDisplay receives all reasoning entries for that thought and shows a single "Thinking" row with the final content.

**Tool result: don’t push segment as response text when emitting tool_result**

- **Tried first (reverted):** Skip message chunks whose type is `tool` in the messages stream, so we never add tool content to `currentSegment`. That made things worse (likely chunk type detection or stream order), so we reverted.
- **Current fix:** In `emitTraceEntry` (agent.ts), when the entry type is `tool_result`, we still clear `currentSegment` (so it isn’t pushed again later) but we **do not** add that segment to `blocks` and **do not** send it as `completedSegment` in the trace event. So any content that accumulated right before the tool result (echo or interleaved tool output) is discarded from the response text. Tool results are shown only in the tool row (trace). Real model commentary after the tool lives in the next segment and is flushed on the next trace or at stream end.

# Outcome

- **Thinking:** A single "Thinking" row per thought; content reflects the final, most complete reasoning. No more duplicate rows (1ms, 482ms, 935ms, 1.4s) for the same chain of thought.
- **Tool spew:** Response text during streaming no longer includes the pre–tool_result segment. Reload and streaming agree: only AIMessage-derived content is shown as the assistant’s reply; tool results stay in the tool block only.

## Follow-up: single block builder and data flow doc

- **Shared lib (`src/shared/lib/chat-blocks.ts`):** `interleaveToolCallsWithResults(turnBlocks)` reorders blocks from reload so each tool_call is immediately followed by its matching tool_result (by toolCallId/toolName). Reload used to emit tool_call, tool_call, tool_result, tool_result; the display builder expects streaming order (tool_call, tool_result, …). Agent calls this in `getConversationMessages` before pushing assistant messages.
- **Renderer lib (`src/renderer/src/lib/chat-blocks.ts`):** All block-to-display logic moved here: `buildDisplayItems(blocks)`, `buildOrderedTraceItems(trace)`, types (`DisplayItem`, `OrderedTraceItem`, `GroupedToolExecution`), and helpers (`getToolStatus`, `formatStepDuration`, `formatToolStepForCopy`). ChatView imports from `@/lib/chat-blocks`; no duplicate logic in the component.
- **Data flow doc (`docs/development/chat-streaming-and-blocks.md`):** Describes stream path (messages + values → segments and blocks → events), reload path (checkpoint → turn blocks → interleave → messages), and frontend (single builder). Linked from the development guide. Contract: backend produces canonical `TurnBlock[]` order; frontend consumes it in one place.

---

# Critical evaluation: patchwork vs holistic, and whether to rearchitect

## Issues we had to address (this conversation and related)

1. **Thinking:** Multiple reasoning entries per thought → merge consecutive reasoning into one display row.
2. **Tool spew:** Segment flushed before `tool_result` contained tool output → discard that segment (don’t add to blocks / completedSegment) when emitting `tool_result`.
3. **(Earlier in same thread)** Single assistant row per turn; blocks (message, tool, message, tool); tool_call + tool_result grouped into one row; icon flicker; streaming appending from ref; completedSegment ordering (tool row then commentary).

Broader backlog over time: bounded tool results (IPC + UI + factory cap); chat history load with blocks + thinking; streaming stability (no disappearing text, no tool results “taking over”).

## Patchwork vs holistic?

**Patchwork elements**

- **Two pipelines, one shape:** We maintain “same look” for streaming and reload, but they’re built differently: streaming = main process accumulates segments and emits trace + blocks; reload = `getConversationMessages` walks checkpoint messages and builds blocks. Every new bug tends to get a special case in one or both (e.g. “when entry is tool_result, don’t push segment”).
- **Stream not designed for our UX:** LangGraph gives us `messages` (raw AIMessageChunk / ToolMessage chunks) and `values` (full state). We have to infer “this is the end of a thought,” “this text belongs to the assistant, not the tool,” and “group these into one tool row.” So we have a lot of adapter logic (flush here, discard there, group consecutive reasoning, skip text-between when grouping tools).
- **Many special cases:** `emitTraceEntry` behaves differently for `tool_result`; `buildDisplayItems` has special handling for reasoning (consecutive group), tool_call (look ahead for tool_result, emit tool row then text), and orphan tool_result. That’s a sign we’re compensating for the stream shape rather than owning a single turn model.

**Holistic elements**

- **Single turn shape:** We do have one *output* shape: `blocks` (text + trace) and derived `content`. So the *contract* with the UI is clear; the pain is in producing that contract from two different sources (stream vs checkpoint).
- **Guardrails are layered:** Bounded tool results are cap-at-source, factory cap, IPC truncation, and UI guardrails. That’s a coherent policy even if it touches many files.

So: the *data shape* (blocks, one row per tool, one Thinking per thought) is intentional; the *way we fill that shape* from the stream is where patchwork accumulates.

## Common practices for chat + tools

- **Simple model:** Messages are a list; each has `role`, `content`, and optionally `attachments` or `tool_calls`. Tools are often one line (“Used X”) with an expandable result. No separate “trace” vs “content”—tool use is part of the message.
- **We’re more like an IDE/agent UI:** We want thinking, tool calls with full result, and commentary in order. That’s closer to Cursor/Copilot: collapsible thinking, compact tool rows, then the reply. So our *goals* align with common “agent chat” practice; the complexity is in how we get there with LangGraph’s primitives.

## Are we overcomplicating?

- **Yes, in the adapter layer.** We’re not overcomplicating the UX (thinking + tool + message is good). We’re overcomplicating the *bridge* from stream/checkpoint to that UX. A cleaner approach would be: one place that turns “sequence of events from the run” into “list of display blocks,” and both streaming and reload feed that same builder. Right now the builder is split (agent builds blocks for stream and for complete; `getConversationMessages` builds blocks for reload; ChatView’s `buildDisplayItems` does another pass for grouping/ordering). That’s more branches and more “if this trace type then that” than necessary.
- **Cursor-style alignment:** Cursor likely has a single event stream from the backend (thinking, tool_use, tool_result, text) and the frontend just renders in order. We’re approximating that by post-processing two streams (messages + values) and then again in the renderer (group reasoning, group tool_call+result). So we’re in the same ballpark conceptually, but with more steps because we’re not the ones defining the stream.

## Is it time to rearchitect?

- **Not a full rewrite.** The current shape (blocks, trace, one row per tool, one Thinking per thought) is good. What’s worth improving:
  1. **Single block builder:** One function or small module that takes “ordered list of: reasoning, text, tool_call, tool_result” and produces our display blocks. Both the streaming path and `getConversationMessages` should output that intermediate list, then the same builder produces `blocks`. That would reduce duplicate logic and make new edge cases fixable in one place.
  2. **Document the data flow:** A short doc (or section in a dev guide) that says: “Stream gives messages + values; we do X to get segments and trace; we emit Y; frontend builds blocks by Z.” Right now the contract is in types and code; making it explicit would help.
  3. **Optional: backend-owned stream shape:** If we ever control the stream (e.g. our own adapter over LangGraph that emits “thinking_done,” “tool_result,” “text_chunk” in our format), we could drop a lot of the “if tool_result then discard segment” and “group consecutive reasoning” logic and do it once on the main side. That’s a larger change and only worth it if we keep hitting stream-related bugs.

**Verdict:** The fixes in this session are correct and consistent with the current design. The design itself is not wrong, but the *path* from LangGraph to our blocks is patchy. Prioritize a single block builder and clearer documentation; consider a backend-owned event shape only if stream-related bugs keep recurring.
