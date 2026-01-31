[Docs](../README.md) / [Backlog](./README.md) / Tool Permission System

# Tool Permission System

## Goal

Implement user-controlled tool permission system that allows users to authorize which tools the LLM can use, either through pre-configuration or runtime approval. Ensures users maintain control over what actions the LLM can take on their behalf. Critical for user trust and safety.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Should be complete. Includes `getToolsForAgent()` helper function that this system enhances.
- **[Configuration System](./configuration-system.md)** - Should be complete. Provides settings storage for permission preferences.

Can be implemented without these, but integration is cleaner if prep work exists.

## Key Capabilities

### Permission Levels (Per-Tool)
- **Allow (Yes)**: Tool is always available to the LLM, no prompts
- **Ask**: LLM can request tool, user approves/denies each use at runtime
- **Deny (No)**: Tool is never available to the LLM

### Pre-Authorization Settings
- Settings UI to view all available tools
- Set default permission level per tool
- Organize by category (filesystem, network, database, system, etc.)
- Safe defaults: conservative permissions out of the box
- Bulk actions (allow all in category, deny all dangerous tools)

### Runtime Approval Flow
- LLM requests tool with "ask" permission
- Modal/notification shows:
  - Tool name and description
  - What the tool does
  - Arguments the LLM wants to pass
  - Approve/Deny buttons
- "Remember this decision" checkbox
- User approves or denies
- Decision optionally saved to settings

### Permission Storage
- Store permission decisions in user settings
- Per-tool permission level (allow/ask/deny)
- Remembered runtime decisions
- Export/import permission profiles

### Audit & History
- Log all tool invocations (what, when, arguments, result)
- Permission audit trail (what was allowed/denied)
- View history in UI
- Clear history or specific entries
- Export audit log

### Tool Metadata
- Tool registry includes permission metadata:
  - Category (filesystem, network, database, etc.)
  - Risk level (safe, caution, dangerous)
  - Description of what tool does
  - Required permissions explanation

## Implementation Approach

### Phase 1: Tool Metadata & Categories
1. Add category and risk level to existing tool definitions
2. Categorize all built-in tools
3. Define safe defaults per category
4. Update tool registry schema

### Phase 2: Permission Storage & Service
1. Create permission service (`src/main/services/permissions.ts`)
2. Define permission data structure
3. Implement CRUD for permission settings
4. Load/save to settings system
5. Default permission policy

### Phase 3: Enhance `getToolsForAgent()` Function
1. Load user permission settings
2. Filter tools based on permission level
3. Remove "deny" tools from list
4. Mark "ask" tools for runtime approval
5. Pass only allowed tools to agent
6. **Single touch point**: Only this function changes, no other code affected

### Phase 4: Runtime Approval Flow
1. Detect when LLM requests "ask" tool
2. Show approval modal with tool details and arguments
3. Handle user approve/deny
4. Optionally save decision to settings
5. Return result to LLM (allow tool use or block)

### Phase 5: Permission Settings UI
1. Create permission settings view/panel
2. List all available tools with metadata
3. Permission level selector per tool (allow/ask/deny)
4. Category grouping and filtering
5. Bulk actions UI
6. Save settings

### Phase 6: Audit & History
1. Log tool invocations to database or file
2. Create audit log viewer UI
3. Display tool usage history
4. Permission decision history
5. Export functionality
6. Clear history actions

## Success Criteria

- [ ] User can view all available tools with descriptions
- [ ] User can set permission level (allow/ask/deny) per tool
- [ ] Tools organized by category
- [ ] Safe defaults applied for new users
- [ ] `getToolsForAgent()` filters tools based on permissions
- [ ] Agent only receives allowed tools
- [ ] Runtime approval modal appears for "ask" tools
- [ ] User can approve/deny with "remember" option
- [ ] Decisions saved to settings when remembered
- [ ] Audit log records all tool invocations
- [ ] Permission settings persist across app restarts
- [ ] Bulk actions work (allow/deny by category)
- [ ] Export/import permission profiles

## Deep Agents Integration

The "ask" permission level (runtime approval) maps directly to LangChain Deep Agents' `interrupt_on` feature.

**How it works:**
- Tools with "ask" permission are registered with `interrupt_on: True` in Deep Agents
- When the agent attempts to use an "ask" tool, Deep Agents pauses execution
- Our UI shows the approval modal with tool details and arguments
- User approves or denies; Deep Agents resumes or blocks accordingly

**Benefits:**
- Leverages Deep Agents' built-in human-in-the-loop mechanism
- No custom interruption handling needed
- Works with sub-agents (approval happens at any depth)

## Related Backlog Items

**Depends on (recommended):**
- [Chat Interface (MVP)](./chat-interface-mvp.md) - Includes `getToolsForAgent()` helper function
- [Configuration System](./configuration-system.md) - Settings storage for permissions
- [Deep Agents Adoption](./deep-agents-adoption.md) - Provides `interrupt_on` for "ask" permissions

**Prerequisite for:**
- [Plugin Extensibility Framework](./plugin-extensibility-framework.md) - Permission system critical before community tools

**Related:**
- [Custom Agents](./custom-agents.md) - Agents can have per-agent permission overrides

## Notes

### Integration with Chat Interface

The Chat Interface (MVP) includes prep work to make permission integration non-breaking:

**Prep work (in Chat Interface MVP):**
- Agent initialization refactored to use `getToolsForAgent()` helper function instead of directly calling `toolRegistry.getAll()`
- This helper initially returns all tools without filtering (simple passthrough)
- Tool registry already has `permissions?: string[]` metadata field

**Permission system implementation (this backlog item):**
- Enhance `getToolsForAgent()` function to:
  - Load user permission settings from settings system
  - Filter tool registry based on allow/ask/deny per tool
  - Handle runtime approval flow for "ask" tools
  - Return only allowed tools for agent initialization
- **Single touch point**: Only the `getToolsForAgent()` function needs modification
- **Zero changes to chat code**: Chat interface, agent initialization, and all callers remain unchanged

**Result**: Minimal refactoring required when adding permissions. The abstraction layer is already in place.

### Critical for Safety

This system is critical for user trust and safety, especially when the plugin ecosystem enables community-contributed tools. Should be implemented before allowing user-installable plugins.

Users need confidence that:
- They know what tools are available
- They control what the LLM can do
- They can audit what the LLM has done
- Dangerous operations require explicit approval

### Permission Scope

Permissions are for **tools** (agent capabilities), not for **commands** (user-initiated actions). When the user clicks a button or uses a hotkey, they're explicitly authorizing that action. Permissions only apply to what the LLM can do autonomously or when requested by the user in chat.

### Future: Agent Integration

When Custom Agents is implemented, agents can have per-agent permission overrides. For example:
- **General Chat** agent: minimal tools, very restricted
- **Code Assistant** agent: filesystem and terminal access allowed
- **Research Assistant** agent: graph queries and web search allowed

This allows users to grant different capabilities to different agents while maintaining global defaults.
