[Docs](../README.md) / [Backlog](./README.md) / LangChain Integration

# LangChain Integration

## Goal

Integrate LangChain/LangGraph to enable stateful, tool-using LLM agents. Establish foundation for multi-tool orchestration, conversation management, and extensible plugin architecture. This provides the core infrastructure for the LLM to intelligently use tools (like Neo4j queries) to answer user questions while maintaining conversation context.

## Constraints and Requirements

### Prerequisites
- Ollama connection working (provides LLM)
- Neo4j connection working (provides first tool capability)
- Test UI established (for verification)

### Functional Requirements
- Create stateful LangGraph agent that can use tools
- Implement tool registry pattern for extensible tool management
- Store conversation history and state in SQLite
- Provide test tool (echo) to verify infrastructure
- Enable Neo4j as a tool (count nodes or simple query)
- Log agent execution steps for auditability
- Expose agent via IPC for renderer communication

### Non-Functional Requirements
- Structure must support future plugin architecture (user-added tools)
- Built-in tools must use same patterns as future user plugins
- All operations must produce verbose logs for debugging and audit
- Conversation state must persist across app restarts
- Type-safe IPC communication between main and renderer
- Fail fast with clear error messages during Phase 0 development

## Approach

### Service Layer Pattern
Create dedicated LLM service layer following established patterns:
- Service module in `src/main/services/llm/`
- Separate concerns: agent setup, tool management, state persistence
- Registry pattern for tool discovery and loading
- SQLite-based conversation persistence (separate from Neo4j graph)

### Tool Architecture
Use LangChain native tool format with registry pattern:
- Tools defined using `@langchain/core/tools` decorator style
- Central ToolRegistry for managing available tools
- Directory-per-tool structure (plugin-ready organization)
- Built-in tools in `tools/builtin/` directory
- Each tool isolated in own directory (future: add manifests)

### State Management
Implement conversation persistence with SQLite:
- Use LangGraph's SqliteSaver for checkpointing
- Store conversation history and execution traces
- Support optional conversation IDs for multiple conversations
- Clear conversation capability for testing

### Logging & Auditability
Two-tier logging system:
- **Console logs:** verbose, development-focused
- **Persistent audit trail:** Store execution trace with conversation state
- Capture: tool calls, parameters, results, state transitions
- Return trace with query results for UI display
- Use LangGraph's built-in event streaming as foundation

### IPC Communication
Hybrid API design supporting both agent queries and tool testing:
- Primary: `query(message, conversationId?)` - agent orchestrates tools
- Testing: `tools.list()` and `tools.test()` - direct tool verification
- Return complete execution trace with response (no streaming in Phase 0)
- Shared TypeScript types between main and renderer
- Structure supports future tool permission system

## Architectural Choices

### Framework
- **LangChain/LangGraph:** Use TypeScript SDK for native Electron integration
- **LLM Provider:** Connect to Ollama (Claude API support deferred to future)
- **Tool Format:** LangChain native (simplest, direct integration)

### Configuration
- **Structured hardcoding:** Constants in `src/main/config/defaults.ts`
- Service layer accepts config objects (future: load from files)
- No config file loading in Phase 0 (deferred to separate Config backlog item)
- Convention: All Phase 0 services use structured defaults pattern

### Tool Registry
- Central registry manages all tools (built-in and future plugins)
- Built-in tools auto-register on initialization
- Agent queries registry for available tools (no hardcoded lists)
- Clear separation: `builtin/` vs future `user/` tools

### State Persistence
- SQLite database for conversation state (separate from Neo4j)
- Location: User's app data directory
- Schema: Leverage LangGraph's checkpointer tables
- Minimal audit data stored with conversations (proof of concept)

### File Structure
```
src/main/services/llm/
├── agent.ts                    # LangGraph agent setup
├── tools/
│   ├── registry.ts             # ToolRegistry class
│   ├── builtin/                # Built-in tools
│   │   ├── echo/
│   │   │   └── echo.tool.ts
│   │   ├── neo4j/
│   │   │   └── count-nodes.tool.ts
│   │   └── index.ts            # Auto-registration
│   └── index.ts
└── state.ts                    # Conversation state management
```

### Dependencies
- **Requires:** Ollama connection, Neo4j connection, Test UI infrastructure
- **Enables:** Chat Interface (future), Plugin Extensibility Framework (future)
- **Related:** Configuration System (separate), Tool Permission System (separate), Chat Interface (separate)

## Success Criteria

- LangGraph agent successfully initializes with Ollama
- Tool registry loads built-in tools (echo, count_nodes)
- Agent executes echo tool via natural language query
- Agent executes Neo4j count_nodes tool via natural language query
- Conversation state persists to SQLite and survives app restart
- Execution trace captured and returned with query results
- Test UI displays all execution steps for verification
- IPC handlers expose agent and tool testing capabilities
- Console logs show verbose execution details
- Code structure supports future plugin loading (directory layout, registry pattern)
- Clear error messages for common failure scenarios

## Notes

### Phase 0 Scope
This backlog item focuses on infrastructure foundation:
- Single echo tool (pure test)
- Single Neo4j tool (count nodes or simple query)
- Basic conversation persistence (proof of concept)
- No dynamic tool loading yet (registry pattern prepares for it)
- No streaming responses (complete trace returned post-execution)
- No user configuration (structured hardcoding only)

### Future Extensibility
Structure intentionally supports future enhancements:
- Plugin architecture (tools in separate directories, manifest-ready)
- Tool permission system (registry can filter tools by permission)
- Configuration system (service accepts config objects)
- Chat interface (trace format suitable for UI rendering)
- Claude API support (provider abstraction ready)

### Related Backlog Items
Features explicitly deferred to separate backlog items:
- **Configuration System:** User settings, config file loading, hot reload
- **Tool Permission System:** User controls which tools LLM can use
- **Chat Interface:** Full chat UI with detailed audit trail display
- **Plugin Extensibility Framework:** User-installable tools, manifest system, plugin marketplace

### Design Conventions
This backlog item establishes patterns for Phase 0:
- Structured hardcoding in `config/defaults.ts`
- Service layer pattern with config object acceptance
- Registry pattern for extensible component management
- Two-tier logging (console + minimal persistence)
- Verbose logging at all layers for troubleshooting
