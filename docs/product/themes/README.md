[Docs](../README.md) / [Product](../README.md) / Themes

# Themes

Themes group backlog items by outcome or technical area. **Theme ID = theme file name** (without `.md`). Backlog items use `themes: [id1, id2]` in frontmatter; theme docs list items (bi-directional). Create themes when [defining core concepts](../../development/agents/defining-core-concepts.md).

### chat-ai

Chat interface, AI/LLM features, agents, tools, and related UX.

| Item | Summary | Status |
|------|--------|--------|
| [Tool Permission System](../backlog/tool-permission-system.md) | Foundational tool definitions and user-controlled permissions (modes, runtime approval). Critical for trust and extensibility. | in progress |
| [Chat Attachments](../backlog/chat-attachments.md) | File and image attachments in chat prompt (drag-drop, paste); backend sends attachments with the message. | considering |
| [Chat Attachments And Context](../backlog/chat-attachments-and-context.md) | Attach items (e.g. past summaries) to a chat; visualize what is in context (graph nodes, files, view context). | considering |
| [Chat Conversation Threads](../backlog/chat-conversation-threads.md) | Threads on messages for clarifying questions without sending thread content to the main conversation. | considering |
| [Chat Quick Launcher](../backlog/chat-quick-launcher.md) | Hotkey + overlay to start a chat with input, model, and agent selection without opening chat view. | considering |
| [Chat Sidebar Integration](../backlog/chat-sidebar-integration.md) | Add chat to right sidebar; context injection from views; chat about what I | considering |
| [Chat Summaries](../backlog/chat-summaries.md) | One Markdown summary per conversation; review past chats; agent can discover and use other summaries. | considering |
| [Context Window And Costs](../backlog/context-window-and-costs.md) | Token usage, cost, processing time, and context window visibility (past and before send). | considering |
| [Custom Agents](../backlog/custom-agents.md) | Create and manage custom agents (instructions, tools, model, params); switch in conversation; smart suggestions. | considering |
| [Custom Hotkeys Prompt Input](../backlog/custom-hotkeys-prompt-input.md) | Configurable hotkeys for chat prompt input; same bindings in Plaintext and Live Preview. | considering |
| [Deep Agents Adoption](../backlog/deep-agents-adoption.md) | Migrate to LangChain Deep Agents for planning, filesystem, sub-agents, memory; foundation for Custom Agents. | considering |
| [Execution Trace Persistence](../backlog/execution-trace-persistence.md) | Persist execution trace (tool calls, durations) so history shows full trace details. | considering |
| [Kbar Smart Chat Detection](../backlog/kbar-smart-chat-detection.md) | KBar detects long-form questions and offers to start a chat with that text. | considering |
| [Llm Tool Hallucination Guardrails](../backlog/llm-tool-hallucination-guardrails.md) | Reduce incorrect tool usage (unwanted invokes, wrong commands, invalid args); only use tools when intent warrants. | considering |
| [Ollama Connection](../backlog/ollama-connection.md) | Detect Ollama, connect to server, discover models, set default for LLM operations. | considering |
| [Ollama Model Management](../backlog/ollama-model-management.md) | Browse Ollama library, install/remove models from the app, view installed models with details. | considering |
| [Sub Agent Delegation](../backlog/sub-agent-delegation.md) | Agents delegate tasks to other agents (sub-agents) for task decomposition and collaboration. | considering |

### configuration-extensibility

User configuration, file loading, UI, hot reload, and plugin system for tools and integrations.

| Item | Summary | Status |
|------|--------|--------|
| [Configuration System](../backlog/configuration-system.md) | User configuration via config files, preferences UI, and runtime overrides; control LLM, tools, and plugin settings. | considering |
| [Plugin Extensibility Framework](../backlog/plugin-extensibility-framework.md) | Plugin system for custom tools, data integrations, UI components, and workflows; marketplace-ready. | considering |

### connections

Data sources (connections), connection types, instances, permissions, and loading data into the graph.

| Item | Summary | Status |
|------|--------|--------|
| [Connections Foundation](../backlog/connections-foundation.md) | Registration, connection instance store, and wiring so modes and agents can use connection-scoped tools. | next |
| [Defining Graph Node Types](../backlog/defining-graph-node-types.md) | User-defined graph node types (labels, properties, indexes, constraints) and Source (connection + import rule + property mapping); connection data structure. | considering |
| [Loading Custom Connection Types](../backlog/loading-custom-connection-types.md) | Future: load user-created and marketplace connection types; plugin execution, manifest contract, extensibility points. | considering |
| [Local Folder Connection Type](../backlog/local-folder-connection-type.md) | First connection type: Local Folder (path = all subfolders/files); agent tools list_directory, read_file, write_file. | considering |

### extensions

Extensibility: custom connection types, plugins, marketplace, and user-defined integrations.

| Item | Summary | Status |
|------|--------|--------|
| [Loading Custom Connection Types](../backlog/loading-custom-connection-types.md) | Future: load user-created and marketplace connection types; plugin execution, manifest contract, extensibility points. | considering |

### knowledge-graphs

Neo4j, multiple knowledge graphs, and enterprise upgrade.

| Item | Summary | Status |
|------|--------|--------|
| [Defining Graph Node Types](../backlog/defining-graph-node-types.md) | User-defined graph node types (labels, properties, indexes, constraints) and Source (connection + import rule + property mapping); connection data structure. | considering |
| [Multi Knowledge Graphs](../backlog/multi-knowledge-graphs.md) | Create and manage multiple Neo4j Knowledge Graphs; switch between them; app reopens last active on startup. | considering |
| [Neo4j Enterprise Upgrade](../backlog/neo4j-enterprise-upgrade.md) | Upgrade to Neo4j Enterprise for native multi-database support; no data dir switching or restarts. | considering |

### ui-features

Layout system, sidebars, tabs, panels, drag-and-drop, and component composition.

| Item | Summary | Status |
|------|--------|--------|
| [Chat Sidebar Integration](../backlog/chat-sidebar-integration.md) | Add chat to right sidebar; context injection from views; chat about what I | considering |
| [Component Composition System](../backlog/component-composition-system.md) | Build custom views by assembling widgets; save and load view configurations. | considering |
| [Drag And Drop System](../backlog/drag-and-drop-system.md) | Drag-and-drop to move widgets from component library to sidebars and assemble custom views. | considering |
| [Ui Layout Framework](../backlog/ui-layout-framework.md) | Collapsible/resizable sidebars, tabbed center, extensible component architecture; foundation for drag-and-drop. | considering |

*Generated by `npm run build:product-docs` (frontmatter only).*
