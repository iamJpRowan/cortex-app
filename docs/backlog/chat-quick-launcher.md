[Docs](../README.md) / [Backlog](./README.md) / Chat Quick Launcher

# Chat Quick Launcher

## Goal

Implement dedicated hotkey that opens a rich overlay for starting a chat, with controls for message input, model selection, and agent selection. Provides fast, focused way to initiate conversations without navigating to chat view or sidebar.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Must be complete. Provides chat to receive launched conversations and reusable input component.

## Key Capabilities

### Overlay UI
- Dedicated hotkey (e.g., `Cmd+Shift+K` or `Cmd+J`)
- Overlay/modal appears over current view (KBar-style)
- Focused, distraction-free input area
- Esc to close overlay

### Input Controls
- **Reuse chat input component** from Chat Interface (MVP)
- All existing chat input features available (message field, model selector, agent selector if agents exist)
- Controls visible by default (not hidden/collapsed)
- Sensible defaults applied (last-used model/agent)

### Chat Integration
- Submit creates new conversation
- Opens chat view (or sidebar if that exists) with new conversation
- Initial message from overlay becomes first user message
- Selected model and agent applied to conversation
- Smooth transition from overlay to chat

### State Persistence
- Remember last-used model
- Remember last-used agent
- Restore these as defaults next time overlay opens

## Implementation Approach

### Phase 1: Overlay Component
1. Create overlay component (modal/sheet)
2. Add hotkey registration (separate from KBar)
3. Implement show/hide with keyboard shortcut
4. Handle ESC to close
5. Test overlay appearance and focus

### Phase 2: Reuse Chat Input Component
1. Extract/import chat input component from Chat Interface (MVP)
2. Render input component in overlay
3. All existing controls work automatically (message, model, agent if exists)
4. Apply default values (last-used model/agent)
5. Wire to overlay state

### Phase 3: Chat Integration
1. Wire submit to create new conversation
2. Pass message, model, and agent to chat
3. Navigate to chat view or open sidebar
4. Create conversation with selected settings
5. Test full flow

### Phase 4: State Persistence
1. Store last-used model in settings or local storage
2. Store last-used agent
3. Restore defaults when overlay opens
4. Handle edge cases (model/agent no longer exists)

### Phase 5: Polish
1. Smooth animations for overlay
2. Keyboard navigation within overlay (tab between fields)
3. Enter to submit (with shift+enter for newlines if multi-line)
4. Visual feedback and loading states
5. Handle errors gracefully

## Success Criteria

- [ ] Dedicated hotkey opens chat launcher overlay
- [ ] Overlay shows message input, model selector, agent selector
- [ ] Defaults applied (last-used model and agent)
- [ ] Submit creates new conversation with selected settings
- [ ] Chat opens with new conversation
- [ ] ESC closes overlay
- [ ] Last-used model and agent persist across sessions
- [ ] Smooth UX and transitions

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./chat-interface-mvp.md) - Chat to receive conversations and reusable input component

**Related:**
- [Custom Agents](./custom-agents.md) - Adds agent management; agent selector in launcher automatically shows available agents
- [KBar Smart Chat Detection](./kbar-smart-chat-detection.md) - Different use case (fallback in KBar)

## Notes

This is the "power user" way to start chats. Instead of navigating to chat view or clicking buttons, users hit a hotkey and get a focused launcher with all the controls they need.

**Component Reuse:** This item should reuse the chat input component from Chat Interface (MVP), not rebuild it. This ensures:
- Consistent UX between launcher and main chat
- Any new input features (e.g., attachments, voice input) automatically appear in launcher
- Single source of truth for chat input behavior

**Agent Integration:** If Custom Agents is implemented, the agent selector automatically appears in the launcher (since it's part of the reused input component). If agents don't exist yet, the launcher still works—just without that control.

**Key distinction from KBar Smart Chat:** This is intentional, with rich controls. KBar Smart Chat is a fallback for when user types long text in command palette.

The overlay should feel like KBar (overlay style, keyboard-focused) but with the full chat input component rather than command search.
