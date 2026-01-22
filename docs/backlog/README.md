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

When backlog items are being implemented the file should reflect the current state.  When the backlog item is completed it should be deleted and removed from this page.  There is no need to perserve backlog history.

## Current Backlog

### Infrastructure
- **[deep-agents-adoption.md](./deep-agents-adoption.md)** - Migrate to Deep Agents when advanced capabilities (planning, filesystem, sub-agents) are needed. requires: LangChain Integration


### Database & Knowledge Graphs
- **[multi-knowledge-graphs.md](./multi-knowledge-graphs.md)** - Enable users to create and manage multiple Neo4j databases (Knowledge Graphs)
- **[neo4j-enterprise-upgrade.md](./neo4j-enterprise-upgrade.md)** - Upgrade to Neo4j Enterprise Edition for native multi-database support

### Configuration & Extensibility
- **[configuration-system.md](./configuration-system.md)** - User configuration system with file loading, UI, and hot reload
- **[tool-permission-system.md](./tool-permission-system.md)** - User-controlled tool permissions with runtime approval. requires: LangChain Integration
- **[plugin-extensibility-framework.md](./plugin-extensibility-framework.md)** - Plugin system for user-contributed tools and integrations. requires: LangChain Integration, Configuration System, Tool Permission System

### User Interface Features
- **[basic-layout-structure.md](./basic-layout-structure.md)** - Minimal layout foundation with collapsible left sidebar and center area
- **[ui-layout-framework.md](./ui-layout-framework.md)** - Complete layout system with sidebars, tabs, panels, and extensible component architecture. requires: Basic Layout Structure
- **[drag-and-drop-system.md](./drag-and-drop-system.md)** - Drag-and-drop functionality for widgets. requires: UI Layout Framework
- **[component-composition-system.md](./component-composition-system.md)** - Custom view builder for assembling widgets. requires: UI Layout Framework, Drag and Drop System, Plugin Extensibility Framework
- **[chat-interface.md](./chat-interface.md)** - Production chat interface with conversation management and audit trail. requires: LangChain Integration

