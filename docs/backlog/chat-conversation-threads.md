[Docs](../README.md) / [Backlog](./README.md) / Chat Conversation Threads

# Chat Conversation Threads

## Goal

Allow users to start **threads** attached to a specific message in a conversation—e.g. for clarifying questions—without the content of that thread being sent as context to the **primary** conversation. This keeps the main conversation focused and avoids context overload from sidebar or follow-up Q&A.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Must be complete. Provides working chat and conversation model.
- **[Chat Sidebar Integration](./chat-sidebar-integration.md)** - Recommended for UX (thread as sidebar or panel). Can be deferred if threads are implemented in the dedicated chat view first.

## Key Capabilities

### Thread Model

- User can open a **thread** from any message (user or assistant) in the primary conversation.
- Thread is a **subordinate** conversation: multi-turn, isolated from the main conversation's context.
- Main conversation's context **does not** include the full thread transcript (avoids bloat).
- Optional: User can **bring thread content back** to the main conversation (e.g. paste summary, quote, or "add to context").

### Context Isolation

- Thread context = conversation history **up to and including** the message the thread is attached to (and optionally that message only), plus the thread's own messages.
- Primary conversation context = main thread only; thread messages are excluded (or optionally a short summary is injectable).
- Clear UX indication that the user is "in a thread" (e.g. breadcrumb, thread title, or visual nesting).

### UX

- Entry point: e.g. "Open thread" / "Ask about this" on a message.
- Thread can be shown inline (expand under message), in a sidebar panel, or in a nested view—design TBD.
- Thread has its own scroll/view; closing thread returns focus to main conversation.
- Threads are persisted and listable (e.g. "Threads on this message" or per-conversation thread index).

### Scope

- One primary conversation can have multiple threads (each attached to a different message).
- No requirement for threads to support sub-threads in MVP (flat model is enough).

## Implementation Approach

### Phase 1: Data Model & API

1. Extend conversation/message model to support thread ownership (e.g. `threadParentMessageId`, or separate `Thread` entity linking to conversation + message).
2. Store thread messages separately or with clear association so primary context builder can exclude them.
3. IPC/API: e.g. `llm:query` with `conversationId`, `threadParentMessageId?`, and context that omits other threads when building primary context.
4. When building context for the **primary** conversation, exclude messages that belong to any thread (or include only a configurable summary).

### Phase 2: Context Builder

1. Context builder for primary conversation filters out thread messages (or replaces with optional summary).
2. Context builder for a **thread** includes: (a) main conversation history up to the parent message, and (b) this thread's messages. Optionally restrict to parent message only for minimal token use.
3. Ensure trace/telemetry distinguishes thread vs primary turns if needed.

### Phase 3: UI

1. Add "Open thread" (or equivalent) action on messages.
2. Implement thread view/panel (inline, sidebar, or modal) and navigation (open/close, "back to main").
3. Show thread indicator on messages that have threads (e.g. icon, count).
4. Optional: "Add to main conversation" (summary or selected text) from thread.

### Phase 4: Polish

1. Persist thread state and restore when reopening conversation.
2. List threads in conversation metadata or message detail.
3. Documentation and any settings (e.g. default context for thread: full history to parent vs parent message only).

## Success Criteria

- [ ] User can open a thread from any message in a conversation.
- [ ] Thread supports multi-turn conversation; same agent/model as main (or configurable).
- [ ] Primary conversation context does not include thread message content (only optional summary if implemented).
- [ ] Thread context includes main conversation up to parent message (or parent message only) plus thread messages.
- [ ] Clear UX indication when the user is in a thread vs the main conversation.
- [ ] Threads are persisted and associated with the correct message and conversation.
- [ ] Optional: User can bring thread content (summary or quote) back into the main conversation.

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./archive/chat-interface-mvp.md) - Core chat and conversation model

**Recommended:**
- [Chat Sidebar Integration](./chat-sidebar-integration.md) - Natural place for thread panel when chat is in sidebar

**Related:**
- [Sub-Agent Delegation](./sub-agent-delegation.md) - Same goal (context isolation) but agent-initiated and stateless; threads are user-initiated and multi-turn. Implementation may share context-isolation patterns.
- [Chat Features (Future)](./chat-features-future.md) - Conversation branching is a sibling concept (parallel branches); threads are subordinate clarification conversations.

## Notes

### Why Threads vs Branching

- **Branching** (see Chat Features Future): Fork the whole conversation at a message → two parallel *main* paths. "What if I asked differently?"
- **Threads**: Attach a *child* conversation to a message. "I want to ask a few clarifying questions here without polluting the main context." Different shape and purpose.

### Relation to Sub-Agent Delegation

Sub-agent delegation provides **agent-initiated** context isolation (the model calls `delegate()`; sub-agent runs statelessly and returns one result). Conversation threads provide **user-initiated** context isolation (the user opens a thread for multi-turn clarification). Both address context overload; they complement each other. Implementation might reuse ideas (e.g. how to build an isolated context window) without sharing the trigger or execution model.

### Design Choices to Confirm

- **Thread context**: Full main history up to parent message vs. parent message only (latter saves tokens).
- **Bring-back**: Whether to support "add thread summary to main" and how (manual paste vs one-click inject).
- **Placement**: Thread as inline expansion vs sidebar panel vs dedicated sub-view—may depend on Chat Sidebar Integration.
