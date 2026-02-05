[Docs](../README.md) / [Backlog](./README.md) / Chat Summaries

# Chat Summaries

## Goal

Make past chats more useful to both users and AIs by maintaining a **summary document** per conversation. Users can review summaries when paging through chats to get the gist without reading the full thread, spot misunderstandings early, and estimate the outcome of a request. Summaries are portable Markdown files. The agent updates summaries regularly and can discover and use other conversations' summaries when the user asks about something discussed before.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Must be complete. Provides working chat, conversation model, and persistence.

## Key Capabilities

### Summary Document

- One **Markdown file** per conversation, stored alongside conversation data for portability and reuse.
- Summary captures key points, decisions, progress, and context so users can quickly understand what the conversation covered.
- Summary includes a **list of all attachments** to the conversation (e.g. a "References / Attachments" section)—graph nodes, files, uploads, past summaries, view-derived context—so readers see the full set of what the conversation referenced. Optionally indicate which items are currently "in context" vs "excluded from context" (see Chat Attachments and Context Visibility).
- Agent (or background process) updates the summary regularly—e.g. each turn, every N turns, or when length threshold is reached; exact policy TBD to balance freshness, cost, and latency.
- Summary is distinct from internal context-window summarization (e.g. Deep Agents' compression at context limit); this is a persistent, user-visible artifact.

### Chat View: Summary vs Thread Toggle

- User can **toggle between full conversation** and **summary view** for the current chat.
- In summary mode, user sees the summary document; they can still ask questions in either mode (chat or summary).
- Optional: prefer summary view when opening a conversation (e.g. for quick scan); design TBD.
- Conversation list may show a short snippet or title derived from the summary to aid skimming.

### Agent Discovery Over Past Summaries

- **Index** over summary content (full-text and/or semantic) so summaries are searchable.
- Agent has a **tool or pipeline step** to find "past summaries about X" when the user asks about prior discussions (e.g. "we talked about this before", "like in my last chat on project Y").
- Relevant summary snippets can be injected into context so the agent can leverage prior conversation outcomes without re-reading full transcripts.

## Implementation Approach

### Phase 1: Summary Document & Updates

1. Define storage for one summary per conversation (e.g. MD file in conversation directory or linked from conversation metadata).
2. Define summary schema/structure (e.g. sections: overview, key points, decisions, open questions, references/attachments—TBD).
3. Implement summary generation: trigger from agent turn or background job; call LLM to produce/update summary from conversation history (and existing summary if incremental).
4. Include **list of all attachments** for the conversation in the summary (from conversation metadata when Chat Attachments is implemented); optionally show "in context" vs "excluded from context" per item.
5. Persist summary and associate with conversation; ensure portable path so users can move/copy MD files.

### Phase 2: Summary vs Thread Toggle UI

1. Add toggle in chat UI to switch between "Chat" (full thread) and "Summary" views.
2. Render summary as Markdown in summary view; keep input available so user can ask questions in either mode.
3. Optional: show summary-derived snippet in conversation list.
4. Ensure layout works in both dedicated chat view and sidebar (if Chat Sidebar Integration is present).

### Phase 3: Index and Agent Discovery

1. Build index over summary content (full-text and/or embeddings); update index when summaries are created or updated.
2. Expose search over summaries to the agent (tool or context step): e.g. "search_past_summaries(query)" returning relevant summary excerpts and conversation IDs.
3. Integrate with context builder so agent can inject relevant past-summary context when the user's message implies prior discussion.
4. Document when and how much summary context is injected to avoid context bloat.

### Phase 4: Polish

1. Handle empty or very short conversations (no summary or placeholder).
2. Settings or heuristics for update frequency (every turn vs threshold vs on-demand).
3. Quality considerations: avoid misattribution or misrepresentation in summaries (reference: Google Chat's approach to summary quality).

## Success Criteria

- [ ] Each conversation has an associated Markdown summary file; summary is updated regularly as the conversation progresses.
- [ ] Summary includes a list of all attachments/references for the conversation (when Chat Attachments is implemented).
- [ ] User can toggle between full chat view and summary view; can ask questions in either mode.
- [ ] Summary is portable (MD file) and readable outside the app.
- [ ] Summaries are indexed and searchable; agent can find and use relevant past summaries when the user refers to prior discussions.
- [ ] Conversation list supports quick scanning (e.g. summary-derived title or snippet) where implemented.

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./archive/chat-interface-mvp.md) - Core chat and conversation model

**Related:**
- [Chat Sidebar Integration](./chat-sidebar-integration.md) - Summary toggle and list must work in sidebar layout.
- [Chat Attachments and Context Visibility](./chat-attachments-and-context.md) - User can attach a past summary to another chat; artifact list may include link to this conversation's summary.
- [Chat Features (Future)](./chat-features-future.md) - Context Window Management describes internal summarization; In-Conversation Search may overlap with summary index. Chat Summaries is the user-facing summary document and cross-chat discovery.

## Notes

### References

- **Exponent** ([Chat Summaries](https://docs.exponent.run/features/chat-summaries)): Summaries to condense long chats and "start fresh"; capture key progress, file paths, current work state, next steps; prompt at length threshold or manual summarize.
- **Google Chat** ([Conversation summaries](https://research.google/blog/conversation-summaries-in-google-chat)): Abstractive summaries; card on entering Space with unread; update on each new message; toggle between summary and full thread; quality controls for misattribution/misrepresentation.
- **CometChat**: Toggle between summary and full thread; summary as first-class view.

### Design Choices to Confirm

- **Update frequency**: Every turn vs every N messages vs length threshold vs on-demand. Tradeoffs: freshness vs latency and cost.
- **Summary structure**: Fixed sections (overview, key points, decisions) vs free-form; incremental update vs full regeneration.
- **Agent discovery**: When to search (every query vs only when user language suggests prior discussion); how much summary context to inject.
