[Docs](../README.md) / [Backlog](./README.md) / Chat Attachments and Context Visibility

# Chat Attachments and Context Visibility

## Goal

Let users **attach** items to a conversation—including past chat summaries—and **see what is already in context**: graph nodes, local files, uploads, and view-derived context (e.g. "Graph View"). This provides transparency about what the AI can see and lets users explicitly add prior summaries or other references to a new chat for continuity.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Must be complete. Provides working chat and conversation model.
- **[Chat Sidebar Integration](./chat-sidebar-integration.md)** - Provides `getContextForAI()` and context visibility; this item extends visibility to a full "artifacts in this conversation" view and adds attachment actions.

## Key Capabilities

### Attachments to a Conversation

- User can **attach** items to the current conversation so they are included in context for the agent:
  - **Past chat summary**: Reference or link another conversation's summary (e.g. "include summary from conversation X"); content of that summary is then available to the agent in this chat.
  - **Other attachment types** (in scope for this item or follow-on): e.g. local files, graph nodes, uploads—design TBD so that "attach" is the common pattern.
- **Right-click (context menu)**: Where an item can be attached, the UI offers a context-menu option such as **"Add to chat"** (or "Add to current conversation") so the user can add that item to the active conversation without leaving the current view—e.g. right-click a graph node, a file in the file tree, a past conversation in the list, or an upload.
- Attachments are stored with the conversation and persist across sessions.
- User can remove an attachment from the conversation entirely, or **exclude it from context** (see below).

### Exclude from context, keep in references

- In most chat applications, attachments are re-sent on **every turn** as part of conversation history; the model has no memory, so the client resends everything in the thread. That can bloat context and cost.
- User can **exclude an attachment from context** so it is not sent to the agent on subsequent turns, while it **remains in the conversation's reference list** (and in the chat summary). The attachment is still "part of" the conversation—visible in the artifacts list and in the summary—but the context builder does not include it when building the prompt.
- UI: list shows all attachments; each has an indicator for "in context" vs "excluded from context" and a way to toggle (e.g. "Don't send to AI for now"). User can re-include an excluded attachment later.

### Context and Artifacts Visibility

- User can **see what is in the conversation** at any time: a clear list (or panel) of **all** artifacts and context for the conversation (the full reference list).
- **Types to display**:
  - **View-derived context**: e.g. "Context from: Graph View", "Context from: Notes" (extends existing Chat Sidebar Integration visibility).
  - **Graph nodes**: Any nodes or subgraphs that have been added or referenced in the conversation.
  - **Local files**: Files attached or referenced (paths, names).
  - **Uploads**: User-uploaded files or images attached to the conversation.
  - **Past summaries**: Other conversation summaries the user has attached to this chat.
- For each item, show whether it is currently **in context** (sent to the agent this turn) or **excluded from context** (in the reference list only).
- Visibility is available in both full chat view and summary view (when Chat Summaries is implemented); design can be a collapsible section, sidebar panel, or header summary. The chat summary document also includes this list (see Chat Summaries).
- This list gives transparency: users can see what the agent receives and correct misunderstandings; they can exclude items to reduce tokens and focus context.

## Implementation Approach

### Phase 1: Artifacts and Context Visibility

1. Extend or reuse context visibility from Chat Sidebar Integration ("Context from: X").
2. Define a unified model for "artifacts in this conversation": view context, graph nodes, files, uploads, attached summaries; add per-attachment **excludedFromContext** (or equivalent) so an item can remain in the reference list but be omitted from the prompt.
3. Implement a **context collector** that gathers active view context and stored attachments; when building agent context, **include only attachments that are not excluded**. The full list (including excluded items) is used for the artifacts visibility UI and for the chat summary's references section.
4. Add UI to display the full list with "in context" vs "excluded from context" indicator and a control to toggle (e.g. "Exclude from context" / "Include in context again"). Expand/collapse or drill-down as needed.
5. Ensure this list is visible in both dedicated chat view and sidebar chat panel.

### Phase 2: Attaching Past Summaries

1. Allow user to **attach a past conversation's summary** to the current conversation (e.g. from conversation list or search: "Add summary to this chat").
2. Add **right-click context menu** option "Add to chat" (or equivalent) on conversation list items (and summary view when available) so the user can add that conversation's summary to the active chat from the list.
3. Store reference (conversation ID or summary path) with the current conversation; include that summary's content in the context sent to the agent.
4. Show attached summaries in the artifacts list; allow user to remove an attached summary.
5. When building agent context, inject attached summary content (or relevant excerpts) so the agent can use it.

### Phase 3: Other Attachment Types (Scope TBD)

1. Define support for **graph nodes** as attachments: user adds "this node" or "this subgraph" to the conversation; store references; include in context and in artifacts list. Add **right-click "Add to chat"** on graph nodes (and optionally subgraphs) in Graph view.
2. Define support for **local files** and **uploads**: user attaches files or uploads (e.g. via right-click "Add to chat" in file tree or file UI); store references and optionally content/metadata; include in context and in artifacts list.
3. Implement add/remove for each type and display in the same artifacts visibility UI.
4. May be split into a follow-on backlog item if MVP is "visibility + attach past summaries" only.

### Phase 4: Polish

1. Clear labels and tooltips for each artifact type and for "in context" vs "excluded from context."
2. Optional: indicate which artifacts were auto-injected (e.g. view context) vs user-attached.
3. Documentation for users: how to attach a summary, how to exclude/include from context, how to read the artifacts list.

## Success Criteria

- [ ] User can see a list of all artifacts and context in the current conversation (view context, graph nodes, files, uploads, attached summaries).
- [ ] User can attach a past chat summary to the current conversation; that summary is included in context for the agent and shown in the artifacts list.
- [ ] Right-click (context menu) offers "Add to chat" (or equivalent) for attachable items—e.g. past conversations/summaries in the list; graph nodes, files, and uploads where supported.
- [ ] User can remove an attached summary (or other attachment) from the conversation.
- [ ] User can exclude an attachment from context (not sent on subsequent turns); it still appears in the conversation's reference list and in the chat summary.
- [ ] Artifacts visibility is available in both full chat and summary view when Chat Summaries is implemented.
- [ ] Optional (or follow-on): User can attach graph nodes, local files, or uploads; these appear in the artifacts list and in agent context.

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./archive/chat-interface-mvp.md) - Core chat and conversation model
- [Chat Sidebar Integration](./chat-sidebar-integration.md) - Context injection and "Context from: X"; this item extends to full artifacts list and attachment actions

**Related:**
- [Chat Summaries](./chat-summaries.md) - Provides the summary documents that users can attach to another chat; summary view toggle may show the same artifacts list.
- [Chat Features (Future)](./chat-features-future.md) - Attachments / Multimodal Input describes file uploads and drag-and-drop; this item focuses on visibility of all context plus attaching past summaries (and optionally files/nodes).

## Notes

### Scope

- **MVP for this item**: (1) Visible list of everything in conversation context (view, nodes, files, uploads, summaries), (2) Attach past chat summary to current conversation and see it in the list, (3) Exclude an attachment from context while keeping it in the reference list (and in the chat summary). Graph nodes, local files, and uploads as *attachable* types may be implemented here or in a follow-on; the visibility list should be designed to include them once supported.
- **Transparency**: The main value is letting users "see any artifacts that have been added to the conversation" so they can estimate outcomes and catch misunderstandings. Attaching past summaries is the first explicit "attachment" action and sets the pattern for other types.
- **Exclude from context**: Most chat apps send attachments on every turn. Giving users the ability to exclude an attachment from context (while keeping it in the reference list and summary) reduces tokens and lets users focus what the AI sees—a deliberate product choice.
