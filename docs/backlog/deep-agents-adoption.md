[Docs](../README.md) / [Backlog](./README.md) / Deep Agents Adoption

# Deep Agents Adoption

## Goal

Migrate from standard LangGraph agents to LangChain Deep Agents when tasks require advanced capabilities like multi-step planning, filesystem operations, sub-agent delegation, and sophisticated memory management.

## When to Consider Migration

Migrate to Deep Agents when you encounter:

- **Multi-step planning needs**: Tasks that require breaking down into subtasks with progress tracking
- **Filesystem operations**: Need to store intermediate results, notes, or artifacts to avoid context window bloat
- **Sub-agent delegation**: Complex tasks that benefit from spawning specialized sub-agents with isolated context
- **Long-running workflows**: Tasks that span hours or days requiring persistent memory and state management
- **Context management challenges**: Tool outputs or conversation history exceeding context limits

## Migration Path

The migration is straightforward because Deep Agents are built on top of LangGraph:

- **Tools remain compatible**: Existing tools (echo, Neo4j, etc.) work without changes
- **State is extensible**: Deep Agents add planning/filesystem state to existing conversation state
- **IPC interface unchanged**: Same query interface, no breaking changes
- **Optional features**: Can enable/disable middleware (planning, filesystem, subagents) as needed

**Migration effort**: ~1-2 hours, primarily swapping agent creation method and optionally enabling middleware.


## Notes

- Deep Agents add complexity and overhead that should only be adopted when needed
- Migration is low-risk: same foundation, additive features, no breaking changes
- Can be adopted incrementally: enable specific middleware (planning, filesystem, subagents) as requirements emerge
