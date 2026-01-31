[Docs](../README.md) / [Backlog](./README.md) / Deep Agents Adoption

# Deep Agents Adoption

## Goal

Migrate from standard LangGraph agents to LangChain Deep Agents to enable advanced capabilities like multi-step planning, filesystem operations, sub-agent delegation, and sophisticated memory management. Deep Agents serves as the runtime foundation for Custom Agents and Sub-Agent Delegation features.

## When to Consider Migration

Migrate to Deep Agents when you encounter:

- **Multi-step planning needs**: Tasks that require breaking down into subtasks with progress tracking
- **Filesystem operations**: Need to store intermediate results, notes, or artifacts to avoid context window bloat
- **Sub-agent delegation**: Complex tasks that benefit from spawning specialized sub-agents with isolated context
- **Long-running workflows**: Tasks that span hours or days requiring persistent memory and state management
- **Context management challenges**: Tool outputs or conversation history exceeding context limits

**Note:** Deep Agents adoption is a **prerequisite** for Custom Agents and Sub-Agent Delegation features.

## Deep Agents Capabilities

### Core Harness Features

| Feature | Description |
|---------|-------------|
| **Filesystem tools** | `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep` |
| **Large result eviction** | Auto-save large tool outputs to filesystem to prevent context bloat |
| **Conversation summarization** | Automatic compression of old conversation history |
| **Todo tracking** | `write_todos` tool for multi-step planning |
| **Human-in-the-loop** | `interrupt_on` configuration for tool approval flows |
| **Prompt caching** | Anthropic prompt caching for reduced latency/cost |
| **Streaming** | Built-in streaming with agent name metadata |

### Sub-Agent Capabilities

| Feature | Description |
|---------|-------------|
| **`task()` tool** | Built-in tool for spawning sub-agents |
| **Context isolation** | Sub-agent work doesn't clutter parent's context |
| **Parallel execution** | Multiple sub-agents can run concurrently |
| **General-purpose sub-agent** | Built-in sub-agent with parent's tools/prompt |
| **Custom sub-agents** | Define specialized sub-agents with different tools/models |

### Storage Backends

| Backend | Use Case |
|---------|----------|
| **StateBackend** | Ephemeral in-memory storage (default) |
| **FilesystemBackend** | Real filesystem access (sandboxed) |
| **StoreBackend** | Persistent cross-conversation storage |
| **CompositeBackend** | Route different paths to different backends |

## Relationship to Other Features

### Custom Agents (depends on Deep Agents)

Custom Agents provides a user-facing management layer on top of Deep Agents:

| Custom Agents Provides | Deep Agents Provides |
|------------------------|----------------------|
| MD file-based agent definitions | Runtime execution harness |
| Agent editor UI | Filesystem tools & backends |
| Permission intersection model | Human-in-the-loop via `interrupt_on` |
| Visual customization (icons, colors) | Conversation summarization |
| Agent switching & tracking | Large result eviction |
| Smart agent suggestions | Streaming |

### Sub-Agent Delegation (depends on Deep Agents)

Sub-Agent Delegation extends Deep Agents' native sub-agent capabilities:

| Sub-Agent Delegation Provides | Deep Agents Provides |
|-------------------------------|----------------------|
| Allow/deny permission lists | `task()` tool for invocation |
| Permission intersection (global ∩ parent ∩ sub-agent) | Context isolation |
| Depth limits | Parallel execution |
| Custom Agents as sub-agents (MD files) | General-purpose sub-agent |
| UI for sub-agent configuration | Streaming with agent metadata |

## Migration Path

The migration is straightforward because Deep Agents are built on top of LangGraph:

- **Tools remain compatible**: Existing tools (echo, Neo4j, etc.) work without changes
- **State is extensible**: Deep Agents add planning/filesystem state to existing conversation state
- **IPC interface unchanged**: Same query interface, no breaking changes
- **Optional features**: Can enable/disable middleware (planning, filesystem, subagents) as needed

**Migration effort**: ~1-2 hours, primarily swapping agent creation method and optionally enabling middleware.

## Implementation Approach

### Phase 1: Core Migration

1. Replace `createAgent()` with `create_deep_agent()`
2. Configure default middleware (filesystem, summarization)
3. Test existing tools work unchanged
4. Verify IPC interface unchanged

### Phase 2: Storage Backend Setup

1. Configure `CompositeBackend` for hybrid storage
2. Set up `StoreBackend` for persistent memory (`/memories/` path)
3. Configure `StateBackend` for ephemeral working files
4. Test cross-conversation persistence

### Phase 3: Custom Agents Integration

1. Implement MD → Deep Agents config conversion
2. Map `tools.ask` to `interrupt_on`
3. Map `memory.namespace` to `StoreBackend` namespacing
4. Test agent switching with Deep Agents backend

### Phase 4: Sub-Agent Integration

1. Implement `delegate` tool wrapping `task()`
2. Add permission checking before delegation
3. Implement permission intersection logic
4. Test parallel execution

## Success Criteria

- [ ] Deep Agents harness replaces standard LangGraph agent
- [ ] Existing tools work unchanged
- [ ] Filesystem tools available for intermediate results
- [ ] Large result eviction prevents context bloat
- [ ] Conversation summarization works for long conversations
- [ ] Storage backends configured (ephemeral + persistent)
- [ ] Custom Agents MD configs convert correctly at runtime
- [ ] Sub-agent delegation works via `delegate` tool

## Related Backlog Items

**Enables:**
- [Custom Agents](./custom-agents.md) - User-facing agent management layer
- [Sub-Agent Delegation](./sub-agent-delegation.md) - Agent-to-agent delegation

**Related:**
- [Tool Permission System](./tool-permission-system.md) - Permission model used by agents
- [Chat Features (Future)](./chat-features-future.md) - Memory feature leverages Deep Agents storage

## Notes

- Deep Agents add complexity and overhead that should only be adopted when needed
- Migration is low-risk: same foundation, additive features, no breaking changes
- Can be adopted incrementally: enable specific middleware (planning, filesystem, subagents) as requirements emerge
- Custom Agents and Sub-Agent Delegation build on Deep Agents—adopt Deep Agents first
