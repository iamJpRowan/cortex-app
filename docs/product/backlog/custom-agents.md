---
status: considering
themes: [chat-ai]
summary: Create and manage custom agents (instructions, tools, model, params); switch in conversation; smart suggestions.
devlogs: [2025-01-27-chat-interface-scoping, 2025-01-31-custom-agents-design, 2025-02-01-layered-prompts-dev-workflow]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Custom Agents

# Custom Agents

## Goal

Enable users to create and manage custom AI agents—bespoke configurations of instructions, tool permissions, model preferences, and runtime parameters. Users can switch agents during conversations and have the system suggest agent switches when requests match different agent capabilities.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Must be complete. Provides agent type definitions and agent parameter wiring.
- **[Deep Agents Adoption](./deep-agents-adoption.md)** - Must be complete. Provides runtime harness for agent execution.
- **[Tool Permission System](./tool-permission-system.md)** - Should be complete so that modes exist for agents to reference (mode OR custom permissions). Defines the permission hierarchy and mode format; this backlog defines how agents use a mode or supply a custom set.

## Key Capabilities

### Agent Data Model

Agent configurations are stored as Markdown files with YAML frontmatter, enabling extensibility, import/export, and marketplace distribution.

**Frontmatter Schema:**
```yaml
---
id: research-assistant              # Unique identifier (required)
name: Research Assistant            # User-defined display name (required)
description: Specialized for knowledge graph exploration  # Optional
version: 1.0.0                      # For marketplace/sharing

# Display
accentColor: "#4f46e5"              # Hex color for UI theming
icon: search                        # Icon name from app icon system

# Runtime Parameters
model: llama3.2:3b                  # Default model (optional, inherits global default)
temperature: 0.7                    # Temperature setting
# Additional runtime params as needed (max_tokens, top_p, etc.)

# Tool Permissions (scoped to this agent)
# Agent cannot grant permissions that are globally denied
tools:
  allow:                            # Tools this agent can use
    - neo4j.count-nodes
    - neo4j.query
    - web.search
  ask:                              # Tools requiring human approval (human-in-the-loop)
    - filesystem.write_file
    - email.send
  deny:                             # Tools explicitly denied for this agent
    - system.exec

# Memory Configuration (optional, requires Deep Agents)
memory:
  namespace: research-assistant     # Isolated memory namespace for this agent
  persistent: true                  # Enable long-term memory across conversations
---

# Research Assistant

You are a research assistant specialized in exploring knowledge graphs...

## Guidelines

- Always cite sources
- Prefer structured queries over free-form exploration
```

**Attributes:**
- ID (unique identifier, required)
- Name (user-defined display name, required)
- Description (optional)
- Version (for sharing/marketplace)
- Accent color (UI theming)
- Icon/avatar (from app icon system)
- Model preference (optional, inherits global default)
- Temperature and other runtime parameters
- Tool permissions (allow/ask/deny lists)
- Memory configuration (namespace, persistence)
- Instructions (markdown body = system prompt)

**Tool Permission Levels:**
- `allow`: Tool is available to the agent without prompts
- `ask`: Tool requires human approval before each use (human-in-the-loop)
- `deny`: Tool is never available to the agent

**Tool IDs:** Entries in `tools.allow` / `ask` / `deny` are **canonical tool names** from the tool registry (see [Tool Permission System](./tool-permission-system.md) Part I: Tool Definitions)—e.g. `neo4j.count_nodes`, `web.search`, `command.invoke`. The agent editor gets the list of available tools from the registry (same source as the permission UI) so users assign allow/ask/deny from the current set. On save or load, validate that every referenced tool ID exists in the registry; see Notes → Validation for behavior when a tool is missing (e.g. plugin uninstalled).

**Agent permission model: mode OR custom**

Each agent uses **mode** OR **custom** permissions—not both. This keeps the model explicit for users.

- **Mode**: The agent references a named permission mode from the [Tool Permission System](./tool-permission-system.md) (e.g. Local Read Only, Read Only, or a user-defined mode). The agent's effective tool set is that mode's definition (category → connection type → connection → tool hierarchy). Here "connection" means **data-source connections** only (e.g. Folder, Slack); **graph access** (which knowledge graphs the agent can read) is a separate axis.
- **Custom**: The agent has its own permission definition with the **same structure as a mode**: category-level defaults (six categories: read local, write local, read external, write external, read app, write app) plus optional overrides at connection type, connection, and tool level. Stored in the agent's frontmatter or a linked definition; same resolution hierarchy as a mode file.

Effective permissions for a chat = most restrictive of **conversation's mode** and **agent's mode or custom set**. The conversation's mode caps what is available in that chat; the agent's mode or custom set defines what that agent can use (and may further restrict). The [Tool Permission System](./tool-permission-system.md) defines modes and the resolution hierarchy; this backlog defines how agents reference a mode or supply a custom permission set.

**Permission Inheritance (when Tool Permission System exists):**
- Agent tool permissions **intersect** with the conversation's mode (principle of least privilege)
- An agent cannot grant a tool that the conversation's mode denies
- Effective permissions for a chat are the intersection of **conversation's mode** and **agent's mode or custom set**. The chat's mode is the cap for that conversation; the agent's mode/custom further scopes what that agent can use.

### Prompt Layering

Agent instructions are layered on top of a base system prompt that is always applied:

| Layer | Source | Editable | Purpose |
|-------|--------|----------|---------|
| Base System Prompt | Hardcoded in app | No | Tool usage rules, response formatting, core behaviors |
| Agent Instructions | Agent MD body | Yes | Role, persona, domain expertise, specific guidelines |

**Base System Prompt includes:**
- Tool result handling ("use tool results in your answer")
- Response formatting (markdown guidelines)
- Core behavioral constraints

**Why layering?**
- Prevents users from accidentally breaking core behaviors (e.g., tool result handling)
- Agent authors focus on persona/expertise, not boilerplate
- Consistent formatting across all agents

**Future consideration:** `inherits_base: false` frontmatter flag for power users who want full control over the system prompt.

### Agent Management

- Create new agent (creates MD file)
- Edit existing agent (opens MD file in editor or dedicated UI)
- Delete agent (removes MD file)
- Duplicate agent (copy to create variant)
- Default agent setting (stored in user settings as `settings.defaultAgentId`)
- Agent library view (list all agents)
- Import agent from MD file
- Export agent to MD file

### Agent Editor UI

- Form for frontmatter attributes (name, description, icon, color, model, temperature)
- Markdown editor for instructions (body content)
- Tool permission checkboxes (if Tool Permission System exists)
- Model selector
- Save/cancel actions
- Validation and error handling

### Agent Usage in Chat

- Agent selector in chat UI (dropdown or menu)
- **Mode selector** shown near the agent selector (Tool Permission System): the chat's mode caps which tools are available regardless of agent
- Switch agent mid-conversation
- Conversation tracks which agent was used at each step (similar to model tracking)
- Switching agent updates current instructions and permissions; the chat's **mode** still caps which tools the agent can use
- Visual indication of current agent (name, color, icon)

### Smart Agent Suggestions

- Detect when user request seems suited for different agent
- Heuristics: keywords, request type, context
- Show brief prompt: "This sounds like a job for [AgentName]. Switch?"
- User can accept or dismiss
- Learn from user choices (optional enhancement)

### Agent Storage & Files

- Agents stored in dedicated `agents/` directory in userData
- One MD file per agent
- File watcher detects changes and updates registry
- Built-in default agent ships with app (can be renamed/configured)
- Export/import for sharing or backup
- Agents persist across app restarts

### Conversation Tracking

- Each conversation step records which agent was active
- Agent changes mid-conversation are tracked in history
- Audit trail shows: user-initiated switch, smart suggestion accepted, etc.

## Phase 1: Agent Data Model & Storage

1. Define `AgentMetadata` and `AgentConfig` TypeScript interfaces
2. Create `AgentDefinition` type (metadata + config combined)
3. Create `agents/` directory in userData on first launch
4. Create default agent MD file if none exists
5. Implement MD file parser (YAML frontmatter + markdown body)
6. Test parsing and validation

## Phase 2: Agent Registry Service

1. Create `AgentRegistry` service (singleton pattern, like `ToolRegistry`)
2. Load all agent MD files on startup
3. Implement CRUD operations (create, read, update, delete)
4. Add file watcher for external changes
5. Emit events when agents change
6. Implement `getAgent(id)`, `listAgents()`, `getDefaultAgent()`

## Phase 3: Agent Editor UI

1. Create agent editor component
2. Form for frontmatter fields (name, description, icon, color, model, temperature)
3. Markdown editor for instructions field
4. Model selector (if Multi-Provider exists)
5. Tool permissions UI (if Tool Permission System exists)
6. Save/cancel/delete actions
7. Validation (required fields, valid tool references)

## Phase 4: Agent Library View

1. Create agent list/library UI
2. Display all agents with name, description, icon, color
3. Actions: edit, delete, duplicate
4. "New Agent" button
5. Search/filter agents (optional)
6. Show which agent is default

## Phase 5: Agent Selector in Chat

1. Add agent selector to chat UI (dropdown with icons/colors)
2. Wire selector to active conversation
3. Update conversation with selected agent
4. Apply agent instructions and permissions to LLMAgentService
5. Visual indication of current agent
6. Handle agent switch mid-conversation
7. Track agent in conversation history (each step records agent ID)

## Phase 6: Smart Agent Suggestions

1. Implement detection logic (keywords, patterns)
2. Show suggestion UI when match detected
3. Handle user acceptance (switch agent)
4. Handle dismissal
5. Tune heuristics for good UX

## Phase 7: Import/Export

1. Export agent to MD file (save dialog)
2. Import agent from MD file
3. Validation on import (required fields, valid references)
4. Handle duplicates (rename or replace)
5. Marketplace integration prep (source tracking, version checking)

## Success Criteria

- [ ] User can create, edit, delete agents via UI
- [ ] Agents stored as MD files in `agents/` directory
- [ ] Agent frontmatter includes: id, name, description, icon, color, model, temperature, tool permissions (allow/ask/deny)
- [ ] Agent markdown body serves as system prompt/instructions
- [ ] Agent editor UI is intuitive and functional
- [ ] Agent selector appears in chat UI with visual styling (color, icon)
- [ ] User can switch agent during conversation
- [ ] Conversation tracks which agent was used at each step
- [ ] Agent permissions intersect with global permissions (cannot exceed global)
- [ ] `tools.ask` triggers human-in-the-loop approval flow
- [ ] Memory namespace isolation works when configured
- [ ] Smart suggestions detect when different agent would be better
- [ ] Agents persist across app restarts
- [ ] Export/import works for sharing agents
- [ ] Default agent setting stored in user settings
- [ ] File watcher updates registry when MD files change externally
- [ ] Agent MD configs correctly convert to Deep Agents format at runtime
- [ ] Base system prompt is always prepended to agent instructions (layered prompts)

## Deep Agents Integration

Custom Agents are designed to leverage LangChain Deep Agents at runtime. The MD-based agent definitions provide a user-friendly configuration layer on top of Deep Agents' capabilities.

### Runtime Mapping

When an agent is loaded, the `AgentRegistry` converts the MD configuration to Deep Agents format:

| Agent MD Field | Deep Agents Field |
|----------------|-------------------|
| `name` | `name` |
| `description` | `description` |
| Base prompt + Markdown body | `system_prompt` (concatenated) |
| `tools.allow` (resolved) | `tools` |
| `tools.ask` | `interrupt_on` configuration |
| `model` | `model` override |
| `memory.namespace` | `StoreBackend` namespace |

**Note:** The `system_prompt` is constructed by concatenating the hardcoded base system prompt with the agent's markdown body instructions.

### Deep Agents Features Used

- **Filesystem tools**: Agents can use `read_file`, `write_file`, etc. for intermediate results
- **Large result eviction**: Automatic offloading of large tool outputs to filesystem
- **Human-in-the-loop**: `tools.ask` maps to Deep Agents' `interrupt_on` for approval flows
- **Long-term memory**: `memory.persistent: true` enables cross-conversation persistence via `StoreBackend`
- **Conversation summarization**: Automatic compression of long conversations

### What Custom Agents Adds

Our custom layer on top of Deep Agents provides:
- **User-facing management**: Create/edit/delete agents via UI without code changes
- **MD file format**: Version control, external editing, marketplace distribution
- **Permission intersection**: Layered permission model (global → agent → effective)
- **Visual customization**: Icons, colors, display properties for UI
- **Agent switching**: Mid-conversation agent switching with tracking
- **Smart suggestions**: Auto-detect when different agent would be better

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./archive/chat-interface-mvp.md) - Agent type definitions and wiring
- [Deep Agents Adoption](./deep-agents-adoption.md) - Provides runtime capabilities

**Related:**
- [Tool Permission System](./tool-permission-system.md) - Tool definitions (Part I) and registry as source for canonical tool names and agent editor tool list; permission modes and resolution.
- [Tool Permission System](./tool-permission-system.md) - Defines modes and resolution hierarchy; agents use a mode or a custom permission set (mode OR custom), and effective permissions intersect with the conversation's mode
- [Chat Quick Launcher](./chat-quick-launcher.md) - Uses agent selector
- [Multi-Provider Model Selection](./archive/multi-provider-model-selection.md) - Agents can have default model preference
- [Sub-Agent Delegation](./sub-agent-delegation.md) - Agents can delegate to other agents

## Notes

### Examples of Custom Agents

- **Research Assistant**: Has graph query tools, web search, citation requirements
- **Code Helper**: Has filesystem access, terminal tools, code analysis tools
- **General Chat**: Minimal tools, conversational tone
- **Data Analyst**: Graph queries, aggregation tools, structured output format

### Smart Suggestions

The smart suggestion feature ("This sounds like a job for...") helps users discover the right agent for their task without requiring them to think about it upfront.

### Prep Work in Chat MVP

The Chat MVP includes agent type definitions (`Agent` type, optional `agent` parameter) which means integration is clean—just implement the management UI and wire the selector to the existing parameter.

### Prep Work: Layered Prompts

Prior to custom agents implementation, the codebase has been prepared with:
- **Base system prompt** (`base-system.md`): Hardcoded prompt with tool usage rules and response formatting
- **Default agent instructions** (`default-agent.md`): Editable default persona, will become the built-in default agent
- **Prompt concatenation**: `getFullSystemPrompt()` combines base + agent instructions
- **Reload command**: `llm:reloadAgent` IPC handler allows prompt iteration without server restart

This establishes the layered prompt architecture that custom agents will build upon.

### Design Decisions

1. **MD file format**: Enables version control, external editing, and marketplace distribution
2. **Agent permissions: mode OR custom (not both)**: Each agent either references a named **mode** from the Tool Permission System or defines **custom** permissions (same structure as a mode: category → connection type → connection → tool). Keeps the model explicit; effective permissions = conversation's mode ∩ agent's mode or custom set. See Key Capabilities → Agent permission model.
3. **Intersection permissions**: Agent cannot grant more than the conversation's mode allows (principle of least privilege)
4. **Default agent setting**: Stored in user settings (`settings.defaultAgentId`) rather than flag on agent
5. **File watcher**: Allows external editing of agent files with automatic registry updates
6. **Deep Agents as runtime**: Use LangChain Deep Agents harness for execution; our layer provides user-facing management
7. **Three-tier permissions**: `allow`/`ask`/`deny` aligns with Tool Permission System and Deep Agents' `interrupt_on`
8. **Memory via filesystem**: Leverage Deep Agents' `StoreBackend` for persistent memory, not a separate system
9. **Layered prompts**: Base system prompt (hardcoded) + agent instructions (editable). Prevents users from accidentally breaking core behaviors like tool result handling or markdown formatting. Agent authors focus on persona and expertise rather than boilerplate.

### Open Questions for Implementation

- **Validation (missing tools)**: Validate agent tool IDs against the current tool registry (e.g. `toolRegistry.list()`) on save and load. When an agent references a tool that no longer exists (e.g. plugin uninstalled, tool renamed): **graceful** = skip missing tools, show warning in UI, load agent with remaining tools; **strict** = refuse to load or save until the user removes or fixes the reference. Decide during implementation.
- **Versioning**: Schema versioning for future frontmatter changes?
- **Marketplace**: Namespace for marketplace agents? Trust/sandboxing?
- **Memory UI**: Should users be able to view/edit agent memory contents?

These questions can be addressed during implementation.
