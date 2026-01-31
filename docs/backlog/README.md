[Docs](../README.md) / Backlog

# Backlog

This directory contains feature backlog items for Cortex development. Each file represents a discrete feature or enhancement that can be implemented independently.

## Structure

Backlog items are organized as standalone markdown files. Each file contains:
- **Goal**: What the feature aims to achieve
- **Constraints and Requirements**: Prerequisites, functional requirements, and limitations
- **Approach**: High-level strategy for implementation
- **Architectural Choices**: Predetermined technical decisions and patterns
- **Success Criteria**: How to verify the feature is complete

When backlog items are being implemented the file should reflect the current state. Completed items are moved to the [Archive](./archive/README.md) with YAML frontmatter (`status: completed`, `completed_date`).

## Current Backlog


### Database & Knowledge Graphs
- **[multi-knowledge-graphs.md](./multi-knowledge-graphs.md)** - Enable users to create and manage multiple Neo4j databases (Knowledge Graphs)
- **[neo4j-enterprise-upgrade.md](./neo4j-enterprise-upgrade.md)** - Upgrade to Neo4j Enterprise Edition for native multi-database support

### Configuration & Extensibility
- **[configuration-system.md](./configuration-system.md)** - User configuration system with file loading, UI, and hot reload
- **[plugin-extensibility-framework.md](./plugin-extensibility-framework.md)** - Plugin system for user-contributed tools and integrations. requires: LangChain Integration, Configuration System, Tool Permission System

### Chat & AI Interface
- **[chat-interface-mvp.md](./chat-interface-mvp.md)** - Production chat interface with streaming, traces, conversation management, and AI integration patterns
- **[tool-permission-system.md](./tool-permission-system.md)** - User-controlled tool permissions with runtime approval
- **[multi-provider-model-selection.md](./multi-provider-model-selection.md)** - Support for multiple LLM providers (Ollama, OpenAI, Anthropic, etc.) and model selection. requires: Chat Interface (MVP)
- **[chat-sidebar-integration.md](./chat-sidebar-integration.md)** - Add chat to right sidebar, implement context injection from views. requires: Chat Interface (MVP), UI Layout Framework
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

