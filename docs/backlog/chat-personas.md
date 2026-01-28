[Docs](../README.md) / [Backlog](./README.md) / Chat Personas

# Chat Personas

## Goal

Enable users to create and manage chat "personas" or "modes"—bespoke sets of instructions and tool permissions that customize chat behavior. Users can switch personas during conversations and have system suggest persona switches when requests match different persona types.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Must be complete. Provides persona type definitions and persona parameter wiring.
- **[Tool Permission System](./tool-permission-system.md)** - Should be complete for per-persona permission sets. Can ship basic personas without if permissions are global.

## Key Capabilities

### Persona Data Model
- Persona attributes:
  - ID (unique identifier)
  - Name (user-defined)
  - Description (optional)
  - Instructions (system prompt / custom behavior)
  - Tool permissions (per-tool allow/deny, if Tool Permission System exists)
  - Model preference (optional)
  - Other settings (temperature, etc.)

### Persona Management
- Create new persona
- Edit existing persona
- Delete persona
- Duplicate persona (copy to create variant)
- Default persona (used when none selected)
- Persona list/library view

### Persona Editor UI
- Form for all persona attributes
- Markdown editor for instructions
- Tool permission checkboxes (if Tool Permission System exists)
- Model selector
- Save/cancel actions
- Validation and error handling

### Persona Usage in Chat
- Persona selector in chat UI (dropdown or menu)
- Switch persona mid-conversation
- Conversation remembers which persona was used
- Switching persona updates current instructions and permissions
- Visual indication of current persona

### Smart Persona Suggestions
- Detect when user request seems suited for different persona
- Heuristics: keywords, request type, context
- Show brief prompt: "This sounds like a job for [PersonaName]. Switch?"
- User can accept or dismiss
- Learn from user choices (optional enhancement)

### Persona Storage
- Personas stored in user settings or separate JSON file
- Export/import personas (share with others or backup)
- Personas persist across app restarts

## Implementation Approach

### Phase 1: Persona Data & Storage
1. Define persona schema (building on prep work from Chat MVP)
2. Create persona storage service
3. Implement CRUD operations (create, read, update, delete)
4. Add default persona
5. Test persistence

### Phase 2: Persona Editor UI
1. Create persona editor component
2. Form for name, description, instructions
3. Markdown editor for instructions field
4. Model selector (if relevant)
5. Tool permissions UI (if Tool Permission System exists)
6. Save/cancel/delete actions
7. Validation

### Phase 3: Persona Library View
1. Create persona list/library UI
2. Display all personas with names and descriptions
3. Actions: edit, delete, duplicate
4. "New Persona" button
5. Search/filter personas (optional)

### Phase 4: Persona Selector in Chat
1. Add persona selector to chat UI (dropdown)
2. Wire selector to active conversation
3. Update conversation with selected persona
4. Apply persona instructions and permissions to agent
5. Visual indication of current persona
6. Handle persona switch mid-conversation

### Phase 5: Smart Persona Suggestions
1. Implement detection logic (keywords, patterns)
2. Show suggestion UI when match detected
3. Handle user acceptance (switch persona)
4. Handle dismissal
5. Tune heuristics for good UX

### Phase 6: Import/Export
1. Export persona to JSON file
2. Import persona from JSON file
3. Validation on import
4. Handle duplicates (rename or replace)

## Success Criteria

- [ ] User can create, edit, delete personas
- [ ] Personas include name, description, instructions, and permissions
- [ ] Persona editor UI is intuitive and functional
- [ ] Persona selector appears in chat UI
- [ ] User can switch persona during conversation
- [ ] Conversation applies selected persona's instructions and permissions
- [ ] Smart suggestions detect when different persona would be better
- [ ] Personas persist across app restarts
- [ ] Export/import works for sharing personas

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./chat-interface-mvp.md) - Persona type definitions and wiring

**Related:**
- [Tool Permission System](./tool-permission-system.md) - Per-tool permissions (personas can override defaults)
- [Chat Quick Launcher](./chat-quick-launcher.md) - Uses persona selector

## Notes

Personas enable powerful customization without overwhelming the default chat experience. Examples:
- **Research Assistant**: Has graph query tools, web search, citation requirements
- **Code Helper**: Has filesystem access, terminal tools, code analysis tools
- **General Chat**: Minimal tools, conversational tone
- **Data Analyst**: Graph queries, aggregation tools, structured output format

The smart suggestion feature ("This sounds like a job for...") helps users discover the right persona for their task without requiring them to think about it upfront.

Prep work in Chat MVP (persona type, optional parameter) means this integration is clean—just implement the management UI and wire the selector to the existing parameter.
