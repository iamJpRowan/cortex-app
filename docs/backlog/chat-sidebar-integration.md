[Docs](../README.md) / [Backlog](./README.md) / Chat Sidebar Integration

# Chat Sidebar Integration

## Goal

Add chat to right sidebar panel as an additional way to access chat (alongside the existing dedicated `/chat` view), implement context injection from center views, and refine interaction patterns now that multiple views exist. Makes chat available alongside other content and enables "chat about what I'm looking at" functionality.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Must be complete. Provides working chat with location-agnostic components.
- **[UI Layout Framework](./ui-layout-framework.md)** - Must be complete. Provides right sidebar, panels, and layout system.

## Key Capabilities

### Sidebar Placement
- Chat available in right sidebar as a panel (in addition to dedicated `/chat` view)
- Both access methods work: dedicated view and sidebar panel
- Right sidebar collapsible (chat shows/hides with sidebar)
- Chat panel resizable within sidebar
- Chat persists across all views when in sidebar (global panel)
- Shared state: same conversations accessible from both dedicated view and sidebar

### Context Injection
- Implement context collector for all existing views (Home, Settings, Graph, Notes, etc.)
- Each view implements `getContextForAI()` contract (defined in Chat MVP)
- Context automatically includes current view info when chat is active
- User can see what context is being sent ("Conversation includes context from: Graph View")
- Optional: Per-view context opt-out (e.g., "never send Settings context")

### Interaction Patterns
- Open/close sidebar via command or hotkey
- Chat aware of which view is active in center content
- Center view can trigger "Ask about this" that opens chat with prefilled context
- Chat state persists when switching between views
- Hotkey to focus chat input from anywhere

### UI Adjustments
- Chat UI adapts to narrow sidebar width
- Conversation list optimized for sidebar (compact view)
- Trace displays work in narrow layout
- Mobile-responsive considerations

## Implementation Approach

### Phase 1: Context Collector Enhancement
1. Enhance context collector from Chat MVP (currently has one view)
2. Implement `getContextForAI()` for all existing views
3. Wire context collector to active route/view
4. Add context visibility UI ("Context from: X")
5. Test context injection with different views active

### Phase 2: Sidebar Panel Setup
1. Create chat panel definition (id, title, collapsible)
2. Register chat panel with right sidebar
3. Render chat component in panel container (reuse existing component from dedicated view)
4. Handle show/hide with sidebar collapse
5. Implement resizable panel
6. Ensure conversation state is shared between dedicated view and sidebar panel

### Phase 3: Layout & Styling Adjustments
1. Adapt chat UI for narrow sidebar width
2. Optimize conversation list for compact view
3. Adjust trace display for narrow layout
4. Test responsive behavior
5. Handle edge cases (very narrow widths)

### Phase 4: Interaction Enhancements
1. Add "Open Chat" command that shows right sidebar
2. Add hotkey to toggle sidebar visibility
3. Implement "Ask about this" pattern (views can open chat with context)
4. Add "focus chat input" hotkey
5. Test interaction flows

### Phase 5: Polish & Refinement
1. Smooth transitions when opening/closing sidebar
2. Persist sidebar state (open/closed, width)
3. Context opt-out settings (per-view)
4. Test with multiple views and context switching
5. Documentation and patterns guide

## Success Criteria

- [ ] Chat appears in right sidebar panel (in addition to dedicated view)
- [ ] Both access methods work: navigate to `/chat` view OR open sidebar panel
- [ ] Conversations are shared between dedicated view and sidebar panel
- [ ] Sidebar collapsible, chat shows/hides correctly
- [ ] All views contribute context via `getContextForAI()`
- [ ] User can see what context is included in conversation
- [ ] Chat UI works well in narrow sidebar layout
- [ ] Hotkeys work (open sidebar, focus input)
- [ ] Views can trigger "Ask about this" to open chat with context (opens sidebar)
- [ ] Chat state persists when switching views
- [ ] Sidebar state persists across app restarts

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./chat-interface-mvp.md) - Chat implementation
- [UI Layout Framework](./ui-layout-framework.md) - Sidebar and panel system

**Enables:**
- Future features with "AI aware of context" patterns
- Graph exploration with chat sidebar
- Notes editing with chat assistance

## Notes

This item fulfills the "app awareness" vision from the original chat-interface doc. With chat available in the sidebar and multiple views contributing context, the AI can truly be "aware" of what the user is viewing and working on.

**Additive, Not Replacement:** The sidebar panel is an additional way to access chat. The dedicated `/chat` view remains available. Users can choose:
- **Dedicated view**: Full-screen chat, focused conversation experience
- **Sidebar panel**: Chat alongside other content, "ask about what I'm looking at" workflow

Both share the same conversation data and state—switching between them shows the same conversations.

**Component Reuse:** The sidebar panel reuses the same chat component as the dedicated view. Only the container/placement differs. This ensures consistent UX and behavior across both access methods.

The context injection pattern established in Chat MVP (contract + collector + optional parameter) makes this integration straightforward—just implement the contract for each view and wire the collector to the active route.
