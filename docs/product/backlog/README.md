[Docs](../../README.md) / [Product](../README.md) / Backlog

# Backlog

Backlog view — generated from frontmatter. Structure and frontmatter: [TEMPLATE.md](./TEMPLATE.md). Order: [Product README](../README.md#roadmap). Themes: [themes](../themes/README.md).


## Active

| ready to test | in progress | designing |
|--------|--------|--------|
| — | **[Tool Permission System](./tool-permission-system.md)** — Foundational tool definitions and user-controlled permissions (modes, runtime approval). Critical for trust and extensibility. [Feb 16 Tool Permission System Phase 1](../devlogs/2026-02-16-tool-permission-system-phase-1.md)<br>[Feb 23 Tool Permission Modes Ui And Shared Config](../devlogs/2026-02-23-tool-permission-modes-ui-and-shared-config.md)<br>[Mar 8 Tool Permission System Phase 8](../devlogs/2026-03-08-tool-permission-system-phase-8.md) | — |

## Considering

| Item | Summary |
|------|--------|
| [Chat Attachments And Context](./chat-attachments-and-context.md) | Attach items (e.g. past summaries) to a chat; visualize what is in context (graph nodes, files, view context). |
| [Chat Attachments](./chat-attachments.md) | File and image attachments in chat prompt (drag-drop, paste); backend sends attachments with the message. |
| [Chat Conversation Threads](./chat-conversation-threads.md) | Threads on messages for clarifying questions without sending thread content to the main conversation. |
| [Chat Quick Launcher](./chat-quick-launcher.md) | Hotkey + overlay to start a chat with input, model, and agent selection without opening chat view. |
| [Chat Sidebar Integration](./chat-sidebar-integration.md) | Add chat to right sidebar; context injection from views; chat about what I |
| [Chat Summaries](./chat-summaries.md) | One Markdown summary per conversation; review past chats; agent can discover and use other summaries. |
| [Component Composition System](./component-composition-system.md) | Build custom views by assembling widgets; save and load view configurations. |
| [Configuration System](./configuration-system.md) | User configuration via config files, preferences UI, and runtime overrides; control LLM, tools, and plugin settings. |
| [Context Window And Costs](./context-window-and-costs.md) | Token usage, cost, processing time, and context window visibility (past and before send). |
| [Custom Agents](./custom-agents.md) | Create and manage custom agents (instructions, tools, model, params); switch in conversation; smart suggestions. |
| [Custom Hotkeys Prompt Input](./custom-hotkeys-prompt-input.md) | Configurable hotkeys for chat prompt input; same bindings in Plaintext and Live Preview. |
| [Deep Agents Adoption](./deep-agents-adoption.md) | Migrate to LangChain Deep Agents for planning, filesystem, sub-agents, memory; foundation for Custom Agents. |
| [Defining Graph Node Types](./defining-graph-node-types.md) | User-defined graph node types (labels, properties, indexes, constraints) and Source (connection + import rule + property mapping); connection data structure. |
| [Drag And Drop System](./drag-and-drop-system.md) | Drag-and-drop to move widgets from component library to sidebars and assemble custom views. |
| [Execution Trace Persistence](./execution-trace-persistence.md) | Persist execution trace (tool calls, durations) so history shows full trace details. |
| [Kbar Smart Chat Detection](./kbar-smart-chat-detection.md) | KBar detects long-form questions and offers to start a chat with that text. |
| [Llm Tool Hallucination Guardrails](./llm-tool-hallucination-guardrails.md) | Reduce incorrect tool usage (unwanted invokes, wrong commands, invalid args); only use tools when intent warrants. |
| [Loading Custom Connection Types](./loading-custom-connection-types.md) | Future: load user-created and marketplace connection types; plugin execution, manifest contract, extensibility points. |
| [Multi Knowledge Graphs](./multi-knowledge-graphs.md) | Create and manage multiple Neo4j Knowledge Graphs; switch between them; app reopens last active on startup. |
| [Neo4j Enterprise Upgrade](./neo4j-enterprise-upgrade.md) | Upgrade to Neo4j Enterprise for native multi-database support; no data dir switching or restarts. |
| [Ollama Connection](./ollama-connection.md) | Detect Ollama, connect to server, discover models, set default for LLM operations. |
| [Ollama Model Management](./ollama-model-management.md) | Browse Ollama library, install/remove models from the app, view installed models with details. |
| [Plugin Extensibility Framework](./plugin-extensibility-framework.md) | Plugin system for custom tools, data integrations, UI components, and workflows; marketplace-ready. |
| [Sub Agent Delegation](./sub-agent-delegation.md) | Agents delegate tasks to other agents (sub-agents) for task decomposition and collaboration. |
| [Ui Layout Framework](./ui-layout-framework.md) | Collapsible/resizable sidebars, tabbed center, extensible component architecture; foundation for drag-and-drop. |


## Archived

Items in [archive](./archive/), sorted by `date_archived` (newest first). Archive is just a directory; no separate index.

| Item | Summary |
|------|--------|
| [`completed`] [Chat History Load Single Row And Thinking](./archive/chat-history-load-single-row-and-thinking.md) | One assistant row per turn on load; restore thinking in trace from checkpointer. |
| [`completed`] [Bounded Tool Results And Chat Ui Stability](./archive/bounded-tool-results-and-chat-ui-stability.md) | Content length guardrails for UI and agent context; prevent freezes and context blow-up from large tool results. |
| [`completed`] [Agent Streaming Llm](./archive/agent-streaming-llm.md) | Stream LLM response and thinking as it is generated instead of waiting for the full reply. |
| [`completed`] [Chat Rich Markdown Input](./archive/chat-rich-markdown-input.md) | Rich markdown editing in chat composer with paste-to-render, plaintext/preview toggle; content sent as markdown. |
| [`completed`] [Cursor Style Chat Ui](./archive/cursor-style-chat-ui.md) | Full-width chat turns, multi-line input, sticky prompt deferred; Cursor-style layout. |
| [`completed`] [Multi Provider Model Selection](./archive/multi-provider-model-selection.md) | Multi-provider LLM support (Ollama, Anthropic), model selector, per-conversation and per-message model tracking. |
| [`merged`] [Declarative Tool Definitions](./archive/declarative-tool-definitions.md) | Declarative tool definitions and factory pattern; merged into Tool Permission System. |
| [`completed`] [Chat Interface Mvp](./archive/chat-interface-mvp.md) | Production chat interface with streaming, traces, conversation management, and AI integration patterns. |
| [`decomposed`] [Chat Interface](./archive/chat-interface.md) | Original broad chat interface; decomposed into MVP, Sidebar, KBar, Quick Launcher, Custom Agents. |
| [`completed`] [Settings Command Palette Hotkeys](./archive/settings-command-palette-hotkeys.md) | Settings system, command palette (Kbar), app-level hotkeys; theme in settings. |


*Generated by `npm run build:product-docs` (frontmatter only).*
