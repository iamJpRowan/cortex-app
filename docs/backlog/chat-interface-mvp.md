[Docs](../README.md) / [Backlog](./README.md) / Chat Interface (MVP)

# Chat Interface (MVP)

## Goal

Implement production-quality chat interface for conversing with the LLM agent. Provide intuitive UI for asking questions, viewing responses with streaming and execution traces, managing conversations, and establishing patterns that make it easy to build AI into all future features. This is the primary user-facing interface for Cortex's AI capabilities.

## Prerequisites

None. LangChain Integration is complete and provides the backend infrastructure (agent, tools, state persistence, IPC API).

## Key Capabilities

### AI Integration Patterns (Framework Setting)
- **App context for AI contract**: Define contract for views to contribute context when active (`getContextForAI()`)
- **Context collector**: Single place to gather context from active view (prep work, implemented for one view)
- **LLM actions via commands**: LLM invokes app commands (theme toggle as concrete example)
- **Single AI surface pattern**: Chat is the one AI UI; future features integrate via context + commands
- **Prep work for future features**:
  - Optional `context` parameter in IPC/agent (for future sidebar integration)
  - `getToolsForAgent()` helper function (for future tool permissions)
  - `Persona` type definitions + optional persona parameter (for future personas)
  - Optional `model` parameter in IPC/agent (for future multi-provider model selection)
  - Message storage includes `model` field (tracks which model generated each message)
  - Conversation storage includes `currentModel` field (tracks default/last-used model)

### Chat View
- Standalone chat view (`/chat` route) in center content area
- Location-agnostic component design (can move to sidebar later)
- KBar "Open Chat" navigation command

### Conversation Management
- List all conversations (sidebar or panel)
- Create new conversation
- Switch between conversations
- Delete conversations
- Rename conversations (auto-generated or user-defined)
- Search/filter conversations by content, title, or date
- Persist across app restarts

### Message Display & Interaction
- Message input field with markdown support
- Streaming response display (real-time token generation)
- Rich content rendering (markdown, code blocks, tables, images)
- Copy message content
- Message timestamps

### Execution Trace Display
- Polished trace visualization using shadcn AI components
- Display all trace elements:
  - Tool invocations (name, arguments, results)
  - Reasoning/thinking steps
  - Intermediate outputs
  - Timing/duration
  - Errors/retries
- Auto-expand during execution, auto-collapse when complete
- Manual toggle to expand/collapse completed traces
- Components: Chain of Thought, Tool, Reasoning

### Streaming Support
- IPC streaming mechanism (event-based, async iterator, or chunked responses)
- Wire LangChain/LangGraph streaming to IPC
- Leverage Ollama native streaming
- Stream tokens, trace updates, and intermediate results
- shadcn AI components handle streaming UI

### UI Framework
- shadcn AI chatbot components as foundation
- Components: Chatbot, Message, Prompt Input, Chain of Thought, Tool, Reasoning
- Consistent with existing shadcn/ui usage throughout app

## Relation to LangChain Integration

The LangChain integration provides:
- Agent with tool support
- Conversation state persistence (LangGraph checkpointer)
- IPC API: `llm:query(message, conversationId?, context?, persona?, model?)`
- Tool registry with `getToolsForAgent()` helper
- Execution trace format structured for chat UI rendering

This backlog item builds the chat UI that consumes that backend infrastructure.

## Implementation Approach

### Phase 1: AI Integration Patterns & Prep Work
1. Define `AppContext` type interface (`{ viewId?, summary?, details? }`)
2. Create context collector/registry mechanism
3. Implement context contract for one view (e.g. Home or Settings)
4. Add optional `context` parameter to IPC handler and agent service
5. Define `Persona` type interface (`{ id, name, instructions?, ... }`)
6. Add optional `persona` parameter to agent query
7. Add optional `model` parameter to IPC handler and agent service
8. Create `getToolsForAgent()` helper function (initially passthrough to `toolRegistry.getAll()`)
9. Implement one LLM-invokable command (theme toggle via command registry)
10. Update agent to accept and use command invocations

### Phase 2: Backend Streaming Support
1. Implement IPC streaming mechanism (choose: event-based, async iterator, or chunked)
2. Wire LangChain/LangGraph streaming to IPC layer
3. Stream tokens as they're generated
4. Stream trace updates as they occur
5. Handle completion and error states
6. Test streaming with Ollama

### Phase 3: Conversation Storage & Management
1. Leverage LangGraph checkpointer for conversation persistence
2. Add conversation metadata storage (title, personaId, currentModel, timestamps)
3. Add message metadata storage (model used for each message)
4. Implement conversation CRUD operations
5. Create conversation list/sidebar UI
6. Add search/filter functionality
7. Implement "New Chat" action

### Phase 4: Chat UI Components (shadcn AI)
1. Install shadcn AI components
2. Set up Chatbot component structure
3. Implement Message component with markdown rendering
4. Create Prompt Input with submission handling
5. Wire streaming UI to IPC streaming
6. Add loading/typing indicators
7. Implement rich content rendering

### Phase 5: Execution Trace Display
1. Implement Chain of Thought component for reasoning flow
2. Add Tool component for tool execution display
3. Integrate Reasoning component for thinking steps
4. Wire trace data from backend to UI components
5. Implement auto-expand during execution
6. Implement auto-collapse on completion
7. Add manual toggle for completed traces
8. Display timing, errors, and all trace elements

### Phase 6: Navigation & Integration
1. Add `/chat` route to app routing
2. Create sidebar navigation button for chat
3. Add "Open Chat" command to KBar
4. Implement conversation switching
5. Handle loading states and errors
6. Test full flow end-to-end

## Success Criteria

- [ ] User can navigate to chat view via sidebar or KBar
- [ ] User can create, rename, delete, and switch between conversations
- [ ] User can search/filter conversations
- [ ] Messages stream in real-time as LLM generates response
- [ ] Execution traces display with all tool calls, reasoning, timing
- [ ] Traces auto-expand during execution, auto-collapse when complete
- [ ] User can manually expand collapsed traces
- [ ] LLM can invoke app commands (theme toggle works)
- [ ] One view contributes context for AI (contract proven)
- [ ] Conversations persist across app restarts
- [ ] Rich content (markdown, code blocks) renders correctly
- [ ] UI is polished and uses shadcn AI components consistently
- [ ] Prep work in place for future features (context, persona, permissions parameters)

## Related Backlog Items

**Enables:**
- [Chat Sidebar Integration](./chat-sidebar-integration.md) - Move chat to right sidebar, add context injection
- [KBar Smart Chat Detection](./kbar-smart-chat-detection.md) - Long-form text in KBar → start chat
- [Chat Quick Launcher](./chat-quick-launcher.md) - Dedicated hotkey + overlay with controls
- [Chat Personas](./chat-personas.md) - Persona management and switching
- [Multi-Provider Model Selection](./multi-provider-model-selection.md) - Support for multiple LLM providers and models
- [Tool Permission System](./tool-permission-system.md) - Per-tool permissions (uses `getToolsForAgent()`)

## Notes

This is the foundational chat implementation that establishes patterns for AI integration throughout the app. Focus is on production quality (streaming, polished traces, full conversation management) while including prep work that makes future enhancements non-breaking.

The "AI integration patterns" objective means this item defines:
1. How views expose context to AI (contract + collector)
2. How AI takes actions (via command registry)
3. How AI surfaces integrate (single chat UI, others open it with context)

These patterns make it easy to add AI to future features without rebuilding infrastructure.
