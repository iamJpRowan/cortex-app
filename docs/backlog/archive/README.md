[Docs](../../README.md) / [Backlog](../README.md) / Archive

# Archived Backlog Items

This directory contains backlog items that are no longer active. Items are archived for three reasons:

- **Completed**: Feature is implemented and shipped
- **Decomposed**: Large item was broken into multiple focused items
- **Merged**: Content was combined into another backlog item

Each archived item has YAML frontmatter indicating its status and date.

## Completed

- **[chat-interface-mvp.md](./chat-interface-mvp.md)** — Production chat interface with streaming, traces, conversation management, and AI integration patterns. Completed 2025-01-31.
- **[multi-provider-model-selection.md](./multi-provider-model-selection.md)** — Multi-provider support (Ollama, Anthropic), model selector, per-conversation and per-message model tracking, reasoning in trace. Remaining work: additional provider adapters and usage/cost/context (see [Context Window and Costs](../context-window-and-costs.md)). Completed 2025-02-09.
- **[cursor-style-chat-ui.md](./cursor-style-chat-ui.md)** — Full-width chat turns with top border + avatar on line (agent left, user right), container cap, AI Elements Conversation/Message/MessageResponse, copy/timestamp/model. Sticky prompt deferred. Completed 2025-02-11.
- **[settings-command-palette-hotkeys.md](./settings-command-palette-hotkeys.md)** — Settings system, command palette (Kbar), app-level hotkeys. Completed 2025-01-25.

## Merged

- **[declarative-tool-definitions.md](./declarative-tool-definitions.md)** — Declarative definition + factory pattern for LLM tools. Merged 2025-02 into [Tool Permission System](../tool-permission-system.md) as Part I: Tool Definitions (Foundation).

## Decomposed

- **[chat-interface.md](./chat-interface.md)** — Production chat interface (original broad scope). Decomposed 2025-01-27 into: Chat Interface (MVP), Chat Sidebar Integration, KBar Smart Chat Detection, Chat Quick Launcher, Custom Agents.
