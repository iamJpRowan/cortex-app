[Docs](../README.md) / [Agents](./README.md) / Agent-Specific Patterns

# Agent-Specific Patterns

## Cursor IDE
**Primary Use:** File-focused operations, code generation, refactoring

**Context Provided:**
- `.cursorrules` file with project-specific guidance
- Current file being edited
- Project structure

**Best For:**
- Implementing IPC handlers
- Creating UI components
- Writing tests
- Refactoring existing code

**Pattern:**
```
User: "Add handler for querying person occurrences"
Cursor: [Generates IPC handler in appropriate file]
User: Tests, commits
```

## Claude Desktop (via MCP)
**Primary Use:** High-level architecture, documentation, complex problem-solving

**Context Provided:**
- Full project documentation
- Architecture decisions
- Cross-file understanding

**Best For:**
- Architectural planning
- Documentation updates
- Multi-file refactors
- Debugging complex issues

**Pattern:**
```
User: "How should we structure the state management?"
Claude: [Proposes architecture with rationale]
User: Discusses tradeoffs
Claude: [Updates architecture docs]
```

## GitHub Copilot
**Primary Use:** Inline code suggestions, boilerplate generation

**Context Provided:**
- Current file and nearby files
- Function signatures

**Best For:**
- Auto-completing function implementations
- Generating test cases
- Creating similar patterns to existing code

**Pattern:**
```
User: Types function signature
Copilot: [Suggests implementation]
User: Accepts or modifies
```

## Autonomous Agents (Future)
**Primary Use:** Scheduled tasks, data maintenance, pattern recognition

**Context Provided:**
- Full vault access
- Graph database state
- Historical patterns

**Best For:**
- Identifying missing connections
- Suggesting entity enhancements
- Running scheduled data syncs
- Pattern-based insights

**Pattern:**
```
Agent: Runs on schedule
Agent: Analyzes recent vault changes
Agent: Proposes graph enhancements
User: Reviews and approves
Agent: Executes approved changes
```
