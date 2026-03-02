---
summary: Chat interface, AI/LLM features, agents, tools, and related UX.
---

[Docs](../README.md) / [Product](../README.md) / [Themes](./README.md) / Chat & AI

# Theme: Chat & AI

Chat interface, AI/LLM features, agents, tools, and related UX.

## Backlog items

Generated from frontmatter `themes: [chat-ai, ...]`. Do not edit by hand.

## Active

| ready to test | in progress | designing |
|--------|--------|--------|
| [Chat Rich Markdown Input](../backlog/chat-rich-markdown-input.md) — Rich markdown editing in chat composer with paste-to-render, plaintext/preview toggle; content sent as markdown. | [Bounded Tool Results And Chat Ui Stability](../backlog/bounded-tool-results-and-chat-ui-stability.md) — Content length guardrails for UI and agent context; prevent freezes and context blow-up from large tool results.<br><br>[Tool Permission System](../backlog/tool-permission-system.md) — Foundational tool definitions and user-controlled permissions (modes, runtime approval). Critical for trust and extensibility. | — |

## Considering

| Item | Summary |
|------|--------|
| [Chat Attachments And Context](../backlog/chat-attachments-and-context.md) | Attach items (e.g. past summaries) to a chat; visualize what is in context (graph nodes, files, view context). |
| [Chat Attachments](../backlog/chat-attachments.md) | File and image attachments in chat prompt (drag-drop, paste); backend sends attachments with the message. |
| [Chat Context Window And Costs](../backlog/chat-context-window-and-costs.md) | Token usage, cost, processing time, and context window visibility (past and before send). |
| [Chat Conversation Threads](../backlog/chat-conversation-threads.md) | Threads on messages for clarifying questions without sending thread content to the main conversation. |
| [Chat Features Future](../backlog/chat-features-future.md) | Future chat ideas (memory, RAG, attachments, feedback, branching) for consideration. |
| [Chat Quick Launcher](../backlog/chat-quick-launcher.md) | Hotkey + overlay to start a chat with input, model, and agent selection without opening chat view. |
| [Chat Sidebar Integration](../backlog/chat-sidebar-integration.md) | Add chat to right sidebar; context injection from views; chat about what I |
| [Chat Summaries](../backlog/chat-summaries.md) | One Markdown summary per conversation; review past chats; agent can discover and use other summaries. |
| [Context Window And Costs](../backlog/context-window-and-costs.md) | Token usage, cost, processing time, and context window visibility (past and before send). |
| [Custom Agents](../backlog/custom-agents.md) | Create and manage custom agents (instructions, tools, model, params); switch in conversation; smart suggestions. |
| [Custom Hotkeys Prompt Input](../backlog/custom-hotkeys-prompt-input.md) | Configurable hotkeys for chat prompt input; same bindings in Plaintext and Live Preview. |
| [Deep Agents Adoption](../backlog/deep-agents-adoption.md) | Migrate to LangChain Deep Agents for planning, filesystem, sub-agents, memory; foundation for Custom Agents. |
| [Execution Trace Persistence](../backlog/execution-trace-persistence.md) | Persist execution trace (tool calls, durations) so history shows full trace details. |
| [Kbar Smart Chat Detection](../backlog/kbar-smart-chat-detection.md) | KBar detects long-form questions and offers to start a chat with that text. |
| [Llm Tool Hallucination Guardrails](../backlog/llm-tool-hallucination-guardrails.md) | Reduce incorrect tool usage (unwanted invokes, wrong commands, invalid args); only use tools when intent warrants. |
| [Ollama Connection](../backlog/ollama-connection.md) | Detect Ollama, connect to server, discover models, set default for LLM operations. |
| [Ollama Model Management](../backlog/ollama-model-management.md) | Browse Ollama library, install/remove models from the app, view installed models with details. |
| [Sub Agent Delegation](../backlog/sub-agent-delegation.md) | Agents delegate tasks to other agents (sub-agents) for task decomposition and collaboration. |


