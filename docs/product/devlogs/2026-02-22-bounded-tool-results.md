---
date: 2026-02-22
developer: cortex-app
agent: Cursor (Auto)
model: -
tags: [tools, guardrails, context-window, neo4j, factory, content-length]
related_files:
  - src/main/services/llm/content-guardrails.ts
  - src/main/services/llm/tools/factory.ts
  - src/main/services/llm/tools/definition-types.ts
  - src/main/services/llm/tools/builtin/neo4j/handlers.ts
  - src/main/services/llm/agent.ts
  - src/renderer/src/components/ai-elements/tool-invocation.tsx
  - docs/product/backlog/bounded-tool-results-and-chat-ui-stability.md
  - docs/development/feature-guides/adding-a-tool.md
related_issues: []
related_devlogs:
  - 2026-02-17-chat-trace-token-usage-and-cleanup.md
  - 2026-02-16-tool-permission-system-phase-1.md
session_duration: multi-session
iterations: multiple
outcome: Bounded tool results complete (1.1 at-source, 1.2 factory cap, 1.4 opt-out); default caps prevent context-window blow-up and UI freezes.
---

# Context

Tool results (e.g. Neo4j Cypher returning nodes with hour-long transcripts in properties) were being stored in full in the conversation state. That led to UI freezes (renderer parsing huge strings) and "prompt too long" / 429 errors when the next LLM call exceeded the model's context window. Truncation in the trace or display did not fix conversation state—only capping at source or in the factory does. The backlog item [bounded-tool-results-and-chat-ui-stability.md](../backlog/bounded-tool-results-and-chat-ui-stability.md) scoped backend caps (source + factory), agent IPC truncation, UI guardrails, and an opt-out for tools that need full content.

# Problem

- **Conversation state:** Whatever the tool handler returns becomes the ToolMessage in the graph and is sent to the next LLM call. Trace/event truncation (for IPC) did not cap that.
- **Unbounded source data:** Neo4j can return arbitrary graph data; any property can hold long-form content. Row limits alone were not enough.
- **Extensibility:** User and plugin tools will use the same factory; a single central cap had to apply by default without per-handler logic.

# Solution

**Shared guardrails (`content-guardrails.ts`)**

- `DEFAULT_MAX_TOOL_RESULT_LENGTH` (32k): max length for a single tool result that goes into conversation state.
- `MAX_PROPERTY_VALUE_LENGTH` (12k): max length for a single string when serializing structured data (e.g. Neo4j node properties).
- `capToolResult(result, maxLength)`: used by the factory and by Neo4j for total Cypher result.
- `capPropertyValue(value, maxLength)`: used by Neo4j in `valueToJson` so every string in the tree is capped.

**1.1 Cap at source (Neo4j)**

- In `valueToJson`, any string is passed through `capPropertyValue` so node/relationship properties (e.g. long transcripts) are bounded.
- The full Cypher result string is capped with `capToolResult(message, DEFAULT_MAX_TOOL_RESULT_LENGTH)` before return so the handler never returns a multi-megabyte string.

**1.2 Central factory cap**

- In `createToolFromDefinition`, the handler's return is passed through `capToolResult(result, DEFAULT_MAX_TOOL_RESULT_LENGTH)` before it becomes the tool message in the graph. Every tool created from definitions gets this cap unless opted out.

**1.4 Opt-out**

- `ToolDefinitionMetadata.capResultLength` (optional, default `true`). When `capResultLength === false`, the factory skips the central cap. Documented in definition-types and in [adding-a-tool.md](../../development/feature-guides/adding-a-tool.md) with the risk (freezes, "prompt too long").

**Existing layers (unchanged in this pass)**

- **1.3 Agent:** Trace/event truncation (4k tool result in trace, 8k accumulated in error/cancelled, 2k error in event) and friendly 429 / "prompt too long" handling remain in `agent.ts`.
- **Part 2 UI:** Tool result display cap (4k), "Show more" preview (~1k), throttle (~80ms), rAF for trace, memoized `ToolInvocationDetails` remain in `tool-invocation.tsx` and `ChatView.tsx`.

# Outcome

- Tool results are capped by default at two layers: at source for structured data (Neo4j per-property and total) and in the factory for all tools. Conversation state no longer grows unbounded from a single tool call.
- "Allow full result" and "confirm oversized prompt" are out of scope here; they are planned for the [Tool Permission System](../backlog/tool-permission-system.md) Phase 6 runtime approval flow.
- Backlog item success criteria for 1.1, 1.2, 1.4 are met. Status can be set to `ready to test` or `completed` after manual verification.

# Notes

- **Agent constants:** The agent keeps its own IPC-specific constants (4k, 8k, etc.) in `agent.ts`; they serve a different purpose (payloads to the renderer) than the context cap (32k) in content-guardrails. Unifying them in content-guardrails is optional if you want a single place to tune all limits.
- **Testing:** No test runner in the project yet. Manual: use a tool that returns a string >32k and confirm truncation; for Neo4j, return a node with a very long property and confirm per-property and total cap. Optional script or Vitest tests can assert `capToolResult` / `capPropertyValue` behavior.
- **Commit:** Use Conventional Commits, e.g. `feat(llm): bounded tool results — factory cap, Neo4j at-source cap, capResultLength opt-out`.
- **Pre-commit:** Assessment done per [prepare-to-commit.md](../../development/agents/prepare-to-commit.md); see below.
---

# Pre-commit assessment (prepare-to-commit)

**Scope:** All uncommitted changes (bounded-tool work + prior streaming/trace/docs). Bounded-tool–specific files: `content-guardrails.ts`, `factory.ts`, `definition-types.ts`, `neo4j/handlers.ts`, `bounded-tool-results-and-chat-ui-stability.md`, `adding-a-tool.md`; tool-permission-system.md (Phase 6 content/token addition). Other modified files (agent.ts, ChatView.tsx, tool-invocation.tsx, llm.ts, chat-history-load doc, backlog README) may mix streaming/trace and bounded-tool edits.

**1. Workarounds / complexity**  
- No hacks or brittle fixes. Guardrails are pure functions; factory wrapper is straightforward; Neo4j caps at serialization. Agent keeps its own IPC constants (4k, 8k)—intentional separate layer; optional later: share limits from content-guardrails if you want one place to tune.

**2. Patterns**  
- Uses `@main/` alias consistently. Factory and definition-types follow existing declarative-tool pattern. No deviations.

**3. Repo documentation**  
- CONTRIBUTING (Conventional Commits): commit message suggestion in devlog. Guardrails (TypeScript, logging): satisfied. Development/adding-a-tool and backlog doc updated.

**4. Docs updated**  
- Backlog bounded-tool doc: current state and success criteria updated; relevant paths listed. Adding-a-tool: `capResultLength` and "Result length" section added. Tool-permission-system: Phase 6 content/token confirmations and Related items added. **Optional:** Set bounded-tool backlog status from `in progress` to `ready to test` when you’re satisfied.

**5. Commit message**  
- Suggested: `feat(llm): bounded tool results — factory cap, Neo4j at-source cap, capResultLength opt-out` (or split into two commits if you separate bounded-tool-only changes from streaming/trace/doc changes).
