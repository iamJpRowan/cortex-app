[Docs](../README.md) / [Backlog](./README.md) / KBar Smart Chat Detection

# KBar Smart Chat Detection

## Goal

Enhance KBar command palette to detect when user types long-form questions that don't match any commands, and offer to start a chat with that text. Provides intelligent fallback that turns "typing in wrong place" into a productive action.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Must be complete. Provides chat interface to receive questions.

## Key Capabilities

### Smart Detection
- Detect when KBar input looks like a question or long-form text
- Heuristics:
  - Text longer than X characters (e.g., 50+)
  - Contains question words ("how", "what", "why", "when", "where")
  - Doesn't match any command name/keyword
  - Multiple words (not single command-like term)

### Action Offer
- Show "Start chat with this question" as an action when detected
- Position at top or highlighted in results
- Clear indication this is a chat action, not a command
- Icon distinct from regular commands (e.g., chat bubble icon)

### Chat Integration
- Selecting action navigates to `/chat` (or opens sidebar if that exists)
- Creates new conversation with detected text as initial message
- No model/persona selection—uses defaults
- Seamless transition from KBar to chat

## Implementation Approach

### Phase 1: Detection Logic
1. Add detection function to KBar logic
2. Implement heuristics (length, question words, no command match)
3. Test detection with various inputs
4. Tune thresholds for good UX

### Phase 2: Action Display
1. Create "Start chat" action dynamically when detected
2. Add chat icon and styling
3. Position prominently in results
4. Handle action selection

### Phase 3: Chat Integration
1. Wire action to navigate to chat
2. Pass detected text as initial message
3. Create new conversation with that message
4. Test full flow

### Phase 4: Polish
1. Smooth transition from KBar to chat
2. Clear visual feedback
3. Handle edge cases (very long text, special characters)
4. Add keyboard shortcuts if helpful

## Success Criteria

- [ ] KBar detects long-form text that doesn't match commands
- [ ] "Start chat with this question" action appears when detected
- [ ] Selecting action opens chat with text as initial message
- [ ] New conversation created with detected text
- [ ] Detection heuristics feel smart, not overeager
- [ ] Smooth UX transition from KBar to chat

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./chat-interface-mvp.md) - Chat to receive questions

**Related:**
- [Chat Quick Launcher](./chat-quick-launcher.md) - Dedicated chat overlay (different use case)

## Notes

This is a lightweight enhancement that makes KBar more intelligent. Users often start typing in command palette before realizing they want a conversation, not a command. This feature gracefully handles that case.

Key distinction from Chat Quick Launcher: This is a fallback in the existing KBar when input doesn't match commands. Chat Quick Launcher is a separate, dedicated hotkey with richer controls (model/persona selection).
