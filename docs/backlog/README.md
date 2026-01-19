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
- **[ollama-connection.md](./ollama-connection.md)** - Integrate local Ollama installation and connection
- **[langchain-integration.md](./langchain-integration.md)** - Integrate LangChain/LangGraph for stateful LLM agents with tool use
- **[structured-config-audit.md](./structured-config-audit.md)** - Audit and consolidate configuration into structured defaults pattern


### Database & Knowledge Graphs
- **[multi-knowledge-graphs.md](./multi-knowledge-graphs.md)** - Enable users to create and manage multiple Neo4j databases (Knowledge Graphs)
- **[neo4j-enterprise-upgrade.md](./neo4j-enterprise-upgrade.md)** - Upgrade to Neo4j Enterprise Edition for native multi-database support

### Configuration & Extensibility
- **[configuration-system.md](./configuration-system.md)** - User configuration system with file loading, UI, and hot reload
- **[tool-permission-system.md](./tool-permission-system.md)** - User-controlled tool permissions with runtime approval
- **[plugin-extensibility-framework.md](./plugin-extensibility-framework.md)** - Plugin system for user-contributed tools and integrations

### User Interface Features
- **[chat-interface.md](./chat-interface.md)** - Production chat interface with conversation management and audit trail

## Usage

These backlog items provide feature-level context without implementation details, making them suitable for:
- Planning and estimation
- Understanding dependencies between features
- Architectural decision reference
- Feature prioritization

## Dependencies

Key dependency relationships:
- **LangChain Integration** requires: Ollama Connection
- **Chat Interface** requires: LangChain Integration
- **Tool Permission System** requires: LangChain Integration
- **Plugin Extensibility Framework** requires: LangChain Integration, Configuration System, Tool Permission System

## Future Backlog Items

As the project progresses, additional backlog items will be added here for:
- Phase 1 features (specific use case implementations)
- Use case implementations (Person File Enhancement, Activity Tracking, etc.)
- Automation candidates
- Technical improvements
