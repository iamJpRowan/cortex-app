---
date: 2025-01-21
developer: Jp Rowan
agent: Auto (Cursor)
model: claude-sonnet-4.5
tags: [langchain, langgraph, llm, agents, tools, neo4j, ollama, sqlite, phase-0, infrastructure]
related_files:
  - docs/backlog/langchain-integration.md
  - src/main/services/llm/agent.ts
  - src/main/services/llm/state.ts
  - src/main/services/llm/tools/registry.ts
  - src/main/services/llm/tools/builtin/echo/echo.tool.ts
  - src/main/services/llm/tools/builtin/neo4j/count-nodes.tool.ts
  - src/main/services/llm/tools/builtin/index.ts
  - src/main/services/llm/index.ts
  - src/main/ipc/llm.ts
  - src/main/config/defaults.ts
  - src/preload/index.ts
  - src/renderer/src/types/api.d.ts
  - src/renderer/src/components/TestPanel.tsx
  - electron-builder.config.js
  - package.json
related_issues: []
related_devlogs: []
session_duration: ~6 hours (across multiple sessions)
iterations: 8 implementation steps with incremental testing
outcome: Complete LangChain/LangGraph integration with stateful agents, tool registry, conversation persistence, execution tracing, and Test UI integration
---

[Docs](../README.md) / [Devlogs](./README.md) / LangChain Integration

# Context

Cortex needed a foundation for intelligent LLM agents that could use tools to answer user questions. The goal was to integrate LangChain/LangGraph to enable stateful, tool-using agents that could orchestrate multiple tools (like Neo4j queries) while maintaining conversation context. This provides the core infrastructure for future features like chat interfaces, plugin systems, and automated workflows.

Prerequisites were already in place:
- Ollama connection working (provides LLM)
- Neo4j connection working (provides first tool capability)
- Test UI established (for verification)

# Problem

Several challenges needed addressing:

1. **Agent Infrastructure**: No framework for stateful LLM agents with tool support
2. **Tool Management**: Need extensible system for managing tools (built-in and future plugins)
3. **State Persistence**: Conversation history must survive app restarts
4. **Model Discovery**: Ollama model names include tags (e.g., `llama3.2:3b`) that must match exactly
5. **Native Module Compatibility**: `better-sqlite3` needs to be rebuilt for Electron's Node.js version
6. **Error Handling**: Clear error messages for common failure scenarios (Ollama not running, model not found, etc.)
7. **Execution Tracing**: Need audit trail of tool calls, parameters, and results for debugging and UI display

# Solution

## Approach: Staged Implementation with Proactive Model Discovery

Implemented in 8 steps following the backlog item structure, with key architectural decisions made upfront:

### Phase 1: Service Layer Setup (Step 1)

**LLM Service Architecture**
- Created dedicated service layer in `src/main/services/llm/`
- Separated concerns: agent setup, tool management, state persistence
- Used singleton pattern for agent service
- Structured config in `src/main/config/defaults.ts` with merge pattern

**Key Decision: ChatOllama vs Ollama**
- Initially used `Ollama` class, but `createAgent` requires `bindTools` method
- Switched to `ChatOllama` which implements tool calling support
- This was discovered during implementation and required refactoring

### Phase 2: Tool Registry Foundation (Step 2)

**Registry Pattern**
- Created `ToolRegistry` class with metadata support
- Central registry manages all tools (built-in and future plugins)
- Auto-registration pattern via `tools/builtin/index.ts`
- Directory-per-tool structure (plugin-ready organization)

**Tool Metadata Structure**
```typescript
interface ToolMetadata {
  name: string
  description: string
  category?: string
  permissions?: string[]
}
```

### Phase 3: Echo Tool (Step 3)

**Test Tool Implementation**
- Simple echo tool to verify infrastructure
- Uses `DynamicStructuredTool` from LangChain
- Registered via auto-registration pattern
- Verified via direct tool testing (`llm:tools:test`)

### Phase 4: Neo4j Tool (Step 4)

**Count Nodes Tool**
- Implemented `count-nodes.tool.ts` using Neo4j driver
- Proper session management (open/close)
- Error handling with clear messages
- Registered in builtin tools index

**Import Path Fix**
- Initial import path was incorrect (`../../../neo4j` instead of `../../../../neo4j`)
- Fixed during build error resolution

### Phase 5: State Persistence (Step 5)

**SQLite Integration**
- Used `@langchain/langgraph-checkpoint-sqlite` with `better-sqlite3`
- Database location: `app.getPath('userData') + '/conversations.db'`
- Enabled WAL mode for better concurrency
- Fixed imports: replaced `require()` with ES6 imports

**Native Module Rebuild**
- `better-sqlite3` compiled for system Node.js, not Electron
- Added `electron-rebuild` as dev dependency
- Added `postinstall` script: `electron-rebuild -f -w better-sqlite3`
- Added `asarUnpack` to `electron-builder.config.js` for packaged builds

### Phase 6: IPC Handlers (Step 6)

**Lazy Initialization Pattern**
- Agent initializes on first query, not at app startup
- Matches Ollama service pattern (non-blocking)
- Graceful error handling with clear messages

**IPC API Design**
- `llm:query(message, conversationId?)` - main agent query
- `llm:tools:list()` - list available tools
- `llm:tools:test(toolName, args)` - test tool directly
- Type-safe communication via shared TypeScript types

### Phase 7: Logging & Audit Trail (Step 7)

**Trace Extraction**
- Extracts tool calls, tool results, and assistant messages from agent execution
- Structured trace format for UI display
- Verbose console logging for debugging
- Timestamps on all trace steps

**Trace Structure**
```typescript
Array<{
  type: 'tool_call' | 'tool_result' | 'assistant_message'
  toolName?: string
  args?: Record<string, any>
  result?: string
  content?: string
  timestamp?: number
}>
```

### Phase 8: Test UI Integration (Step 8)

**TestPanel Enhancements**
- Added agent query input field
- Response display area
- Execution trace display with formatted output
- Visual indicators for tool calls, results, and messages

## Critical Refactoring: Proactive Model Discovery

**Problem Discovered**: Model name mismatch (`llama3.2` vs `llama3.2:3b`)

**Initial Approach**: Created ChatOllama in constructor with guessed/fallback model name
- Failed when model name didn't match exactly
- Reactive error handling (catch errors after creation)

**Final Solution**: Proactive model discovery
- Deferred ChatOllama creation until `initialize()`
- Query Ollama for installed models first
- Select best matching model (exact match → partial match → first available)
- Create ChatOllama with verified model name
- Prevents model mismatch errors entirely

**Model Selection Logic**:
1. Try exact match (e.g., `llama3.2:3b` === `llama3.2:3b`)
2. Try partial match (e.g., `llama3.2` matches `llama3.2:3b`)
3. Fall back to first available model

## Error Handling Improvements

**Connection Issues**:
- Detect `ECONNREFUSED` errors
- Clear message: "Ollama server is not running"
- Suggestion: `ollama serve`

**Model Not Found**:
- Detect 404 errors and "model not found" messages
- Show exact model name that failed
- Suggestion: `ollama pull <model-name>`

**IPv6 vs IPv4**:
- Changed default from `localhost` to `127.0.0.1`
- Prevents IPv6 connection issues (`::1:11434` refused)

# Outcome

## Deliverables

1. **Complete Agent Infrastructure**
   - LangGraph agent with tool support
   - Lazy initialization pattern
   - Conversation state persistence
   - Execution trace extraction

2. **Tool Registry System**
   - Central registry with metadata
   - Auto-registration pattern
   - Plugin-ready directory structure
   - Two built-in tools (echo, count_nodes)

3. **State Persistence**
   - SQLite database with WAL mode
   - Conversation history survives app restarts
   - LangGraph checkpoint integration

4. **IPC Communication**
   - Type-safe API between main and renderer
   - Query, tool listing, and tool testing endpoints
   - Graceful error handling

5. **Test UI Integration**
   - Agent query interface
   - Execution trace display
   - Formatted tool call visualization

6. **Native Module Support**
   - `better-sqlite3` rebuild automation
   - Electron-builder configuration
   - Postinstall script for automatic rebuilds

## What Works Now

- **Agent Queries**: Natural language queries that trigger tool use
- **Tool Execution**: Echo and Neo4j count_nodes tools work correctly
- **Model Discovery**: Automatically finds and uses installed Ollama models
- **State Persistence**: Conversations persist across app restarts
- **Execution Tracing**: Complete audit trail of agent execution
- **Error Handling**: Clear messages for common failure scenarios
- **Test UI**: Full end-to-end testing via TestPanel

## Technical Achievements

- **Proactive Model Discovery**: Prevents model mismatch errors
- **Lazy Initialization**: Non-blocking app startup
- **Type Safety**: Full TypeScript coverage for IPC communication
- **Extensibility**: Registry pattern supports future plugins
- **Verbose Logging**: Comprehensive debugging information
- **Native Module Compatibility**: Automated rebuild process

## Files Created/Modified

**New Files:**
- `src/main/services/llm/agent.ts` - LLM agent service with proactive model discovery
- `src/main/services/llm/state.ts` - SQLite state persistence
- `src/main/services/llm/tools/registry.ts` - Tool registry with metadata
- `src/main/services/llm/tools/builtin/echo/echo.tool.ts` - Echo test tool
- `src/main/services/llm/tools/builtin/neo4j/count-nodes.tool.ts` - Neo4j count nodes tool
- `src/main/services/llm/tools/builtin/index.ts` - Auto-registration
- `src/main/services/llm/tools/index.ts` - Tool exports
- `src/main/services/llm/index.ts` - Service exports

**Modified Files:**
- `src/main/ipc/llm.ts` - Added `llm:query` handler with lazy initialization
- `src/main/config/defaults.ts` - LLM service config with IPv4 default
- `src/preload/index.ts` - Added `llm.query` API
- `src/renderer/src/types/api.d.ts` - Added query and trace types
- `src/renderer/src/components/TestPanel.tsx` - Added agent query UI
- `electron-builder.config.js` - Added `asarUnpack` for better-sqlite3
- `package.json` - Added `postinstall` script and `electron-rebuild` dependency

# Notes

## Key Insights

1. **Proactive Model Discovery is Essential**: Querying Ollama for installed models before creating ChatOllama prevents model mismatch errors. This was discovered after initial implementation failed.

2. **ChatOllama vs Ollama**: The `Ollama` class doesn't support `bindTools`, which is required by `createAgent`. Must use `ChatOllama` for tool calling support.

3. **Lazy Initialization Works Well**: Initializing the agent on first query (not at app startup) matches the Ollama service pattern and provides better error handling.

4. **Native Modules Need Rebuilding**: `better-sqlite3` must be rebuilt for Electron's Node.js version. Automation via `postinstall` script prevents future issues.

5. **IPv4 vs IPv6 Matters**: Using `127.0.0.1` instead of `localhost` prevents IPv6 connection issues.

6. **Registry Pattern Enables Extensibility**: The tool registry with metadata structure prepares for future plugin system without requiring refactoring.

## Challenges Overcome

1. **Model Name Mismatch**: Initial implementation used guessed model names, causing "model not found" errors. Solution: Proactive model discovery during initialization.

2. **bindTools Method Missing**: `Ollama` class doesn't support tool calling. Solution: Switched to `ChatOllama` which implements `bindTools`.

3. **Native Module Version Mismatch**: `better-sqlite3` compiled for wrong Node.js version. Solution: Added `electron-rebuild` with postinstall automation.

4. **Import Path Errors**: Incorrect relative paths in Neo4j tool. Solution: Fixed path depth calculation.

5. **IPv6 Connection Issues**: `localhost` resolved to IPv6, causing connection refused. Solution: Use `127.0.0.1` explicitly.

6. **Type Safety**: `getDefaultModel()` returns `string | null`, but `selectModel` expects `string | undefined`. Solution: Added `|| undefined` conversion.

## Tradeoffs Made

**Chose:**
- Proactive model discovery over reactive error handling (prevents errors)
- Lazy initialization over eager (non-blocking startup)
- ChatOllama over Ollama (tool calling support required)
- SQLite over in-memory state (persistence requirement)
- Registry pattern over hardcoded tool lists (extensibility)
- Verbose logging over minimal (debugging requirement)

**Did Not Choose:**
- Deep Agents (deferred to separate backlog item)
- Streaming responses (complete trace returned post-execution)
- Dynamic tool loading (registry pattern prepares for it)
- User configuration (structured hardcoding for Phase 0)
- Tool permission system (deferred to separate backlog item)

## Future Considerations

1. **Plugin System**: The registry pattern and directory structure are ready for user-installable tools. Need to add:
   - Manifest system for plugin metadata
   - Plugin loading from user directory
   - Plugin validation and sandboxing

2. **Tool Permission System**: Registry already supports permissions metadata. Need to add:
   - User approval for tool usage
   - Permission persistence
   - UI for managing permissions

3. **Configuration System**: Service accepts config objects, ready for file loading. Need to add:
   - Config file parsing
   - Hot reload
   - UI for configuration

4. **Chat Interface**: Trace format is suitable for UI rendering. Need to add:
   - Conversation list UI
   - Message history display
   - Tool call visualization

5. **Deep Agents**: Migration path is straightforward (~1-2 hours). Need when:
   - Multi-step planning required
   - Filesystem operations needed
   - Sub-agents for complex tasks

## Gotchas to Remember

- **ChatOllama Required**: `Ollama` class doesn't support `bindTools`, must use `ChatOllama` for agents
- **Model Names Must Match Exactly**: Ollama requires exact model names including tags (e.g., `llama3.2:3b`)
- **Proactive Discovery**: Always query Ollama for installed models before creating ChatOllama instance
- **Native Module Rebuild**: `better-sqlite3` must be rebuilt for Electron after `npm install`
- **IPv4 Explicit**: Use `127.0.0.1` instead of `localhost` to avoid IPv6 issues
- **Lazy Initialization**: Agent initializes on first query, not at app startup
- **Type Safety**: `getDefaultModel()` returns `string | null`, convert to `undefined` if needed

## Related Resources

- [LangChain Integration Backlog](../backlog/langchain-integration.md)
- [Deep Agents Adoption](../backlog/deep-agents-adoption.md)
- [LangChain Documentation](https://js.langchain.com/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)
- [Ollama Documentation](https://ollama.com/docs)
