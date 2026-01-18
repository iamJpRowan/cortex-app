[Docs](../README.md) / Agents

# AI Agent Development Guide

This guide defines how AI agents (Cursor, Claude Desktop, GitHub Copilot, autonomous bots, etc.) should collaborate with developers when working on Cortex as a native Electron application.

## Documentation

- **[conversation-workflow.md](./conversation-workflow.md)** - Structured conversation workflow (Goal → Steps → Propose → Discuss → Implement → Test → Commit)
- **[agent-patterns.md](./agent-patterns.md)** - Agent-specific patterns for Cursor, Claude, Copilot
- **[electron-guidance.md](./electron-guidance.md)** - Electron-specific reminders and IPC patterns
- **[common-pitfalls.md](./common-pitfalls.md)** - What not to do
- **[checklists.md](./checklists.md)** - Development checklists for agents

## References to Development Documentation

For detailed implementation patterns, refer to the [development guide](../development/README.md):

- **JSX Patterns**: See [development/patterns.md](../development/patterns.md#working-with-jsx-no-react) for JSX without React implementation
- **Testing Patterns**: See [development/testing.md](../development/testing.md) for testing strategies
- **Performance**: See [development/patterns.md](../development/patterns.md#performance-optimization) for optimization patterns
- **Embedded Services**: See [development/patterns.md](../development/patterns.md#embedded-services) for Neo4j and Ollama management
- **IPC Patterns**: See [development/patterns.md](../development/patterns.md) for detailed IPC implementation examples

---

*This guide evolves as development patterns emerge. Update it when new best practices are discovered.*
