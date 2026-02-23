[Docs](../README.md) / Backlog

# Backlog

This directory contains feature backlog items for Cortex development. Each file represents a discrete feature or enhancement that can be implemented independently.

## Structure

Backlog items are organized as standalone markdown files. Each file contains:
- **Status**: Current state of the **item** (see below). Store in **YAML frontmatter** at the top of the file (e.g. `status: in progress`). **Phase** or stage status (which phase is in progress, done, ready to test, etc.) goes in the **markdown body** (e.g. a Phases or Progress section).
- **Goal**: What the feature aims to achieve
- **Constraints and Requirements**: Prerequisites, functional requirements, and limitations
- **Approach**: High-level strategy for implementation
- **Architectural Choices**: Predetermined technical decisions and patterns
- **Success Criteria**: How to verify the feature is complete

**Status values:**
- `designing` — Backlog item is being designed (design-in-progress).
- `considering` — Design complete; under consideration for when to implement.
- `soon` — Planned to be worked soon.
- `next` — Next up for implementation.
- `in progress` — Currently being implemented.
- `ready to test` — Implementation done for a phase or the item; awaiting user testing and confirmation. Do not mark complete until the user has tested and confirmed.
- `completed` — Done; item is in [Archive](./archive/README.md) with `completed_date` in frontmatter. Use only after the user has tested and confirmed.

When backlog items are being implemented the file should reflect the current state. Completed items are moved to the [Archive](./archive/README.md) with YAML frontmatter (`status: completed`, `completed_date`).

### Phased items

For items with a **phased approach**, use a phase-per-section structure so each phase is easy to follow:

- **Phases as top-level sections:** Use `## Phase N: Title` (not `### Phase N` under a single "Implementation Approach" section). Everything relevant to that phase lives under that section.
- **Details inside the phase:** Under each `## Phase N` include: **Status** (in progress, complete, etc.), steps/deliverables, **Approach** (how you will implement it), and **Decisions** (choices made or open for that phase). No separate "Decision Record" or "Decisions before Phase X" section—decisions live under the phase they apply to. Cross-phase decisions (e.g. from Phase 1 that affect all later phases) stay under Phase 1.
- **Benefits:** One place to read per phase; the agent and the user see scope, approach, and decisions together when working a phase. See [Work a backlog item](../agents/work-backlog-item.md) for the workflow that uses this structure.

## Current Backlog


### Database & Knowledge Graphs
- **[multi-knowledge-graphs.md](./multi-knowledge-graphs.md)** - Enable users to create and manage multiple Neo4j databases (Knowledge Graphs)
- **[neo4j-enterprise-upgrade.md](./neo4j-enterprise-upgrade.md)** - Upgrade to Neo4j Enterprise Edition for native multi-database support

### Configuration & Extensibility
- **[configuration-system.md](./configuration-system.md)** - User configuration system with file loading, UI, and hot reload
- **[plugin-extensibility-framework.md](./plugin-extensibility-framework.md)** - Plugin system for user-contributed tools and integrations. requires: LangChain Integration, Configuration System, Tool Permission System

### Chat & AI Interface
- **[agent-streaming-llm.md](./agent-streaming-llm.md)** - Stream LLM response and thinking in real time (replace invoke with stream in agent node). requires: Chat Interface (MVP)
- **[llm-tool-hallucination-guardrails.md](./llm-tool-hallucination-guardrails.md)** - Reduce incorrect tool usage (invoke_command, invalid args). requires: Chat Interface (MVP)
- **[bounded-tool-results-and-chat-ui-stability.md](./bounded-tool-results-and-chat-ui-stability.md)** - Content length guardrails for UI and agent context: backend (source + factory caps, agent IPC truncation, opt-out) first; then UI fail-safe (display cap, Show more, throttle/memo)
- **[execution-trace-persistence.md](./execution-trace-persistence.md)** - Persist execution traces (tool calls, durations) for historical viewing. requires: Chat Interface (MVP)
- **[tool-permission-system.md](./tool-permission-system.md)** - Foundational tool definitions (declarative + factory) and user-controlled tool permissions with modes, runtime approval, and Agents tab
- **[context-window-and-costs.md](./context-window-and-costs.md)** - Token usage, processing time, optional cost per message, context window (dynamic for Ollama), and UI for tokens/context consumed. requires: Multi-Provider Model Selection (see [archive](./archive/README.md))
- **[ollama-model-management.md](./ollama-model-management.md)** - Browse Ollama library, install/remove models from the app. requires: Multi-Provider Model Selection
- **[chat-rich-markdown-input.md](./chat-rich-markdown-input.md)** - TipTap (or equivalent) rich markdown editor for chat composer; markdown output, reusable elsewhere. requires: Cursor-Style Chat UI (see [archive](./archive/README.md))
- **[custom-hotkeys-prompt-input.md](./custom-hotkeys-prompt-input.md)** - Configurable hotkeys for prompt input; override all TipTap defaults and apply same bindings consistently in Plaintext and Live Preview. requires: Chat Rich Markdown Input
- **[chat-sidebar-integration.md](./chat-sidebar-integration.md)** - Add chat to right sidebar, implement context injection from views. requires: Chat Interface (MVP), UI Layout Framework
- **[chat-conversation-threads.md](./chat-conversation-threads.md)** - User-initiated threads on messages for clarifying questions without overloading main conversation context. requires: Chat Interface (MVP)
- **[chat-summaries.md](./chat-summaries.md)** - Per-conversation Markdown summary, chat/summary view toggle, and agent discovery over past summaries. requires: Chat Interface (MVP)
- **[chat-attachments-and-context.md](./chat-attachments-and-context.md)** - Attach items (e.g. past summaries) to a chat and visualize all artifacts in the conversation (graph nodes, files, uploads, view context). requires: Chat Interface (MVP), Chat Sidebar Integration
- **[chat-attachments.md](./chat-attachments.md)** - File and image attachments in the chat prompt input (drag-drop, paste images); backend support to send attachments with the message. requires: Chat Interface (MVP)
- **[kbar-smart-chat-detection.md](./kbar-smart-chat-detection.md)** - Detect long-form questions in KBar and offer to start chat. requires: Chat Interface (MVP)
- **[chat-quick-launcher.md](./chat-quick-launcher.md)** - Dedicated hotkey + overlay with reusable chat input. requires: Chat Interface (MVP)
- **[deep-agents-adoption.md](./deep-agents-adoption.md)** - Migrate to Deep Agents for advanced capabilities (planning, filesystem, sub-agents, memory). requires: LangChain Integration
- **[custom-agents.md](./custom-agents.md)** - Custom agent management, switching, and smart suggestions. requires: Chat Interface (MVP), Deep Agents Adoption
- **[sub-agent-delegation.md](./sub-agent-delegation.md)** - Enable agents to delegate tasks to other agents. requires: Custom Agents, Deep Agents Adoption, Tool Permission System
- **[chat-features-future.md](./chat-features-future.md)** - Future chat features to consider: memory, RAG, attachments, feedback, branching, and more

### User Interface Features
- **[ui-layout-framework.md](./ui-layout-framework.md)** - Complete layout system with sidebars, tabs, panels, and extensible component architecture. requires: React + shadcn/ui Migration
- **[drag-and-drop-system.md](./drag-and-drop-system.md)** - Drag-and-drop functionality for widgets. requires: UI Layout Framework
- **[component-composition-system.md](./component-composition-system.md)** - Custom view builder for assembling widgets. requires: UI Layout Framework, Drag and Drop System, Plugin Extensibility Framework

