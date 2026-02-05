[Docs](../README.md) / [Backlog](./README.md) / Tool Permission System

# Tool Permission System

## Goal

Implement user-controlled tool permission system that allows users to authorize which tools the LLM can use, either through pre-configuration or runtime approval. Ensures users maintain control over what actions the LLM can take on their behalf. Critical for user trust and safety.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Must be complete. Includes `getToolsForAgent()` helper function that this system enhances.
- **[Configuration System](./configuration-system.md)** - Should be complete. Provides settings storage for permission preferences.

Can be implemented without these, but integration is cleaner if prep work exists.

## Key Capabilities

### Permission Levels (Per-Tool)
- **Allow (Yes)**: Tool is always available to the LLM, no prompts
- **Ask**: LLM can request tool, user approves/denies each use at runtime
- **Deny (No)**: Tool is never available to the LLM

### Permission Modes (Chat-Level Cap)

A **mode** is a named permission set (allow/ask/deny per tool) that acts as the permission cap for a conversation. The user selects a mode per chat and can change it at any time during the chat to limit or change the current agent's capabilities.

- **Built-in modes**: **Ask**, **Agent**, and **Local** (app-defined permission sets; semantics TBD per mode).
- **User-configured modes**: Custom named permission sets (same structure as built-in; create/edit in settings).
- **Scope**: One mode per conversation. Stored on the conversation (e.g. `modeId`); set when the conversation is created (from default chat mode) and updated whenever the user changes mode in that chat. When the user loads a previous chat, the conversation opens in the same mode as when they last used it.
- **Default chat mode**: User can configure the default mode for new chats (in settings). New conversations get this mode until the user changes it.
- **Resolution**: Effective permissions = most restrictive of global defaults, agent permissions, and the conversation's mode. Order of application does not change the result (min is commutative); conceptually: global → agent → mode.
- **UI**: Mode selector is shown near the agent selector so the user can choose both "which agent" and "which permission cap for this chat" in one place.

### Pre-Authorization Settings
- Settings UI to view **all available tools** (source: tool registry `list()`; see [Declarative Tool Definitions](./declarative-tool-definitions.md)). When new tools are registered (e.g. after plugin install), they appear in the list automatically.
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
- **Modes**: Built-in mode definitions (Ask, Agent, Local); user-configured mode definitions (same schema); **default chat mode** in user settings (mode ID used for new conversations).
- **Per-conversation mode**: Each conversation stores `modeId` (or equivalent) in conversation metadata. Set at creation from default chat mode; updated when the user changes mode during the chat. Used when loading a conversation so the chat opens in the same mode as last used.
- **Default for tools with no stored permission**: When a tool has no explicit permission (e.g. newly installed plugin, or a tool not yet configured by the user), apply a **default policy** (e.g. deny or ask). This ensures new tools appear in the permission UI with a safe default until the user sets allow/ask/deny. The list of tools for the UI comes from the tool registry (see [Declarative Tool Definitions](./declarative-tool-definitions.md)), not from the permission store—so new tools automatically appear for configuration.
- **Tools not listed in a mode**: For resolution, a tool that is not listed in the conversation’s mode is treated as **deny** for that mode (the mode caps which tools are available; unspecified = not allowed). Alternatively, modes could define an explicit “default for unspecified tools” (e.g. use global default). Document the chosen behavior in implementation.
- Export/import permission profiles (and custom modes)

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
6. **Modes**: Define built-in modes (Ask, Agent, Local); support user-configured modes; store default chat mode in settings; add `modeId` to conversation metadata (set on create, update when user changes mode)

### Phase 3: Enhance `getToolsForAgent()` Function
1. Extend signature to accept conversation context (e.g. `conversationId` or conversation object) so the chat's mode can be applied.
2. Load user permission settings (global), agent permissions (if any), and conversation's mode.
3. Resolve effective permissions: most restrictive of global, agent, and mode per tool.
4. Filter tools based on effective permission level; remove "deny" tools; mark "ask" tools for runtime approval.
5. Pass only allowed tools to agent.
6. **Single touch point**: Only this function changes for resolution logic; callers must pass conversation when resolving tools for a chat.

### Phase 3b: Chat Mode Selector & Persistence
1. Add mode selector to chat UI, placed near the agent selector.
2. On new conversation: set conversation `modeId` from default chat mode (settings).
3. When user changes mode in chat: update conversation's `modeId` and persist.
4. When loading a conversation: restore and display its stored mode; use it in `getToolsForAgent()`.

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
- [ ] User can select mode for a chat (built-in: Ask, Agent, Local; or user-configured mode)
- [ ] User can change mode during a chat
- [ ] User can set default chat mode for new chats
- [ ] Mode selector is shown near the agent selector
- [ ] User loads previous chats in same mode as last message

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
- [Chat Interface (MVP)](./archive/chat-interface-mvp.md) - Includes `getToolsForAgent()` helper function
- [Configuration System](./configuration-system.md) - Settings storage for permissions
- [Deep Agents Adoption](./deep-agents-adoption.md) - Provides `interrupt_on` for "ask" permissions

**Prerequisite for:**
- [Plugin Extensibility Framework](./plugin-extensibility-framework.md) - Permission system critical before community tools

**Related:**
- [Declarative Tool Definitions](./declarative-tool-definitions.md) - Tool definitions supply metadata (category, risk) and canonical tool names; registry `list()` is the source for permission UI and mode builder.
- [Custom Agents](./custom-agents.md) - Agents can have per-agent permission overrides; agent frontmatter references the same canonical tool names.

## Notes

### Integration with Chat Interface

The Chat Interface (MVP) includes prep work to make permission integration non-breaking:

**Prep work (in Chat Interface MVP):**
- Agent initialization refactored to use `getToolsForAgent()` helper function instead of directly calling `toolRegistry.getAll()`
- This helper initially returns all tools without filtering (simple passthrough)
- Tool registry already has `permissions?: string[]` metadata field

**Permission system implementation (this backlog item):**
- Enhance `getToolsForAgent()` function to:
  - Accept conversation context so the chat's mode can be applied
  - Load user permission settings (global), agent permissions, and conversation's mode
  - Resolve effective permissions (most restrictive of global, agent, mode per tool)
  - Filter tool registry, handle runtime approval for "ask" tools, return only allowed tools
- Chat code: conversation metadata must include `modeId`; callers pass conversation when resolving tools; mode selector UI near agent selector

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

When Custom Agents is implemented, agents can have per-agent permission overrides. Effective permissions for a chat are the intersection of **global defaults → agent permissions → chat mode**. The conversation's mode is the final cap: it cannot be exceeded even if the user switches to a more capable agent mid-chat. For example:
- **General Chat** agent: minimal tools, very restricted
- **Code Assistant** agent: filesystem and terminal access allowed
- **Research Assistant** agent: graph queries and web search allowed

Users grant different capabilities to different agents while maintaining global defaults; the chat's mode further caps what is available for that conversation.
