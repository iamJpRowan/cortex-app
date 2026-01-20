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

## Current Backlog

### Infrastructure
- **[langchain-integration.md](./langchain-integration.md)** - Integrate LangChain/LangGraph for stateful LLM agents with tool use


### Database & Knowledge Graphs
- **[multi-knowledge-graphs.md](./multi-knowledge-graphs.md)** - Enable users to create and manage multiple Neo4j databases (Knowledge Graphs)
- **[neo4j-enterprise-upgrade.md](./neo4j-enterprise-upgrade.md)** - Upgrade to Neo4j Enterprise Edition for native multi-database support

### Configuration & Extensibility
- **[configuration-system.md](./configuration-system.md)** - User configuration system with file loading, UI, and hot reload
- **[tool-permission-system.md](./tool-permission-system.md)** - User-controlled tool permissions with runtime approval. requires: LangChain Integration
- **[plugin-extensibility-framework.md](./plugin-extensibility-framework.md)** - Plugin system for user-contributed tools and integrations. requires: LangChain Integration, Configuration System, Tool Permission System

### User Interface Features
- **[chat-interface.md](./chat-interface.md)** - Production chat interface with conversation management and audit trail. requires: LangChain Integration

