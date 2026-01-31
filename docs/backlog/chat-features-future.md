[Docs](../README.md) / [Backlog](./README.md) / Chat Features (Future Considerations)

# Chat Features (Future Considerations)

## Purpose

This document captures potential chat features for future consideration. These are not committed backlog items but rather a collection of ideas to evaluate as the chat system matures. Features may be promoted to standalone backlog items when prioritized.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Core chat must be complete before considering enhancements.
- **[Deep Agents Adoption](./deep-agents-adoption.md)** - Many features leverage Deep Agents capabilities (noted inline).

---

## High Priority Considerations

Features that align strongly with Cortex's vision of AI-powered personal knowledge management.

### Memory / Persistent Knowledge

Enable agents to remember information across conversations, building up knowledge about the user and their work over time.

**Capabilities:**
- User preferences learned over time ("I prefer concise answers", "I use TypeScript")
- Facts about the user ("I work in healthcare", "My project uses React")
- Previous decisions and their outcomes
- Explicit "remember this" commands
- Implicit learning from conversation patterns

**Scope Options:**
- Global memory (shared across all agents)
- Agent-scoped memory (each agent has its own memory)
- Conversation-scoped memory (within a conversation only)

**Storage:**
- Natural fit with Neo4j graph database
- Memory nodes linked to user, agents, topics
- Queryable and editable by user

**Privacy Considerations:**
- User can view all memories
- User can delete specific memories
- User can disable memory entirely
- Clear distinction between remembered and inferred

**Relevance:** Core to personal AI assistant experience. The graph database makes this architecturally natural.

**Deep Agents Foundation:** Deep Agents provides `StoreBackend` for persistent cross-conversation storage. Memory can be implemented as files in a `/memories/` namespace that persists across threads. Custom Agents already includes `memory.namespace` configuration that maps to this.

---

### RAG / Knowledge Base Integration

Connect chat to document collections with semantic search, enabling agents to reference and cite user knowledge.

**Capabilities:**
- Embed and index user documents (Obsidian vault, PDFs, code repos)
- Semantic search during conversations
- Citation of sources in responses ("Based on your note from 2024-03-15...")
- Per-agent knowledge bases (Research Agent → papers, Code Agent → repos)
- Automatic re-indexing when documents change

**Architecture:**
- Embedding model (local or cloud)
- Vector storage (could use Neo4j vector index or separate store)
- Retrieval pipeline integrated with agent queries
- Chunk management and relevance scoring

**Integration Points:**
- Agents can specify which knowledge bases they access
- Context injection from knowledge base before LLM query
- Tool for explicit knowledge base search

**Relevance:** Very high—core to "AI-powered knowledge management." Enables chat to leverage user's existing knowledge.

---

### Conversation Export / Sharing

Export conversations for external use, aligning with data portability principles.

**Capabilities:**
- Export to Markdown (primary format, fits data philosophy)
- Export to PDF (for sharing)
- Export to JSON (for programmatic use)
- Selective export (date range, specific conversations)
- Include or exclude traces/tool calls

**Import:**
- Import conversations from Markdown/JSON
- Merge with existing history
- Handle conflicts (duplicate IDs)

**Relevance:** Aligns with local-first, data-ownership principles. Users should be able to take their conversation history anywhere.

---

### Feedback & Learning

Enable user feedback on responses to improve agent behavior over time.

**Capabilities:**
- Thumbs up/down on messages
- "This was helpful" / "This was wrong" / "This was incomplete"
- Free-form feedback comments
- Flag hallucinations or factual errors
- Rate overall conversation quality

**Learning Integration:**
- Aggregate feedback per agent
- Identify patterns (what works, what doesn't)
- Feed into memory system ("User prefers X approach")
- Optional: fine-tuning data export

**UI:**
- Unobtrusive feedback buttons on messages
- Optional feedback prompt after conversations
- Feedback history viewable by user

**Relevance:** Enables continuous improvement of agents. Particularly valuable when combined with memory.

---

## Medium Priority Considerations

Features that enhance the chat experience but aren't core to the knowledge management mission.

### Attachments / Multimodal Input

Upload files, images, or documents directly to chat.

**Capabilities:**
- Drag-and-drop files into chat input
- Image understanding (if model supports vision)
- Document parsing (PDF, DOCX → text)
- Screenshot analysis
- File preview in conversation

**Supported Types:**
- Images (PNG, JPG, GIF, WebP)
- Documents (PDF, Markdown, plain text)
- Code files
- Data files (CSV, JSON)

**Processing:**
- Extract text content for non-vision models
- Store attachments with conversation
- Reference attachments in follow-up messages

**Relevance:** Useful for knowledge capture workflows. Depends on model capabilities.

**Deep Agents Foundation:** Deep Agents provides filesystem tools (`write_file`, `read_file`) that can store attachments. Attachments could be saved to the agent's working directory and referenced in conversations.

---

### Message Editing & Regeneration

Edit past messages and regenerate responses from that point.

**Capabilities:**
- Edit any previous user message
- Regenerate conversation from edited message
- "Regenerate response" with same or different model/agent
- Compare multiple regenerations side-by-side
- Preserve original conversation branch

**UI:**
- Edit button on user messages
- Regenerate button on assistant messages
- Branch indicator when conversation has been edited

**Relevance:** Common UX pattern users expect from chat interfaces.

---

### Conversation Branching / Forking

Explore alternative conversation paths without losing original context.

**Capabilities:**
- Fork conversation at any message
- Explore different approaches in parallel
- Compare branches side-by-side
- Merge insights from different branches
- Name and organize branches

**Use Cases:**
- "What if I asked this differently?"
- Explore multiple solutions to a problem
- A/B test different agents on same question

**Relevance:** Power user feature for exploration and experimentation.

---

### Context Window Management

Handle long conversations gracefully as they approach model limits.

**Capabilities:**
- Automatic summarization when context gets long
- "Compress conversation" manual action
- Visual indicator of context usage
- Strategy selection: truncate vs. summarize vs. selective
- Preserve important messages (user-marked or auto-detected)

**Strategies:**
- Rolling window (keep most recent N messages)
- Summarization (compress old messages into summary)
- Selective (keep important messages, compress filler)
- Hybrid (summary + recent window)

**Relevance:** Important for production use with long conversations. May be implementation detail of Chat MVP.

**Deep Agents Foundation:** Deep Agents provides automatic conversation history summarization. When context approaches limits (85% of model's max tokens), older messages are compressed into a summary. This is built-in middleware—no custom implementation needed. Large tool result eviction also helps by auto-saving large outputs to filesystem.

---

### Saved Prompts / Templates

Reusable message templates for common tasks.

**Capabilities:**
- Save frequently-used prompts
- Parameterized templates ("Summarize {topic} in {style}")
- Quick-insert from template library
- Organize templates by category
- Share templates (export/import)

**Integration:**
- Templates can be agent-specific
- Agents can include starter prompts
- Command palette integration for quick access

**Relevance:** Productivity enhancement for power users.

---

### Scheduled / Triggered Conversations

Automated chat initiation based on time or events.

**Capabilities:**
- Scheduled conversations (daily briefing, weekly review)
- Event-triggered (new file in vault, calendar event approaching)
- Periodic analysis (weekly graph insights, project status)
- Notification when triggered chat is ready

**Examples:**
- "Every morning at 9am, ask Research Agent for today's priorities"
- "When a new markdown file is added, summarize it"
- "Weekly: analyze my knowledge graph for new connections"

**Configuration:**
- Schedule editor UI
- Event trigger configuration
- Agent and prompt selection
- Enable/disable individual schedules

**Relevance:** Aligns with proactive AI mentioned in Vision doc. Transforms chat from reactive to proactive.

---

### In-Conversation Search

Search within conversation history.

**Capabilities:**
- Full-text search across all conversations
- Filter by agent, date range, topic
- Search within current conversation
- Jump to specific messages from search results
- Highlight matches in context

**Relevance:** Increasingly important as conversation history grows.

---

### Code Execution Sandbox

Run code snippets from chat responses in a safe environment.

**Capabilities:**
- Execute Python/JavaScript snippets
- Display results inline in chat
- Iterative code refinement ("fix this error")
- Sandboxed execution (no filesystem access by default)
- Configurable permissions per agent

**Safety:**
- Execution timeout limits
- Resource limits (memory, CPU)
- Network access controls
- Explicit user approval for execution

**Relevance:** Useful for Code Helper agent use cases. Depends on security requirements.

**Deep Agents Foundation:** Deep Agents' `FilesystemBackend` supports virtual/sandboxed mode with path validation, size limits, and symlink prevention. Code execution could leverage this for sandboxed file I/O. The `interrupt_on` mechanism provides user approval before execution.

---

## Lower Priority / Future Ideas

Features to revisit once core chat is mature.

### Voice Input/Output
- Speech-to-text for chat input
- Text-to-speech for responses
- Voice-activated chat ("Hey Cortex...")

### Conversation Analytics
- Usage patterns and statistics
- Topic analysis over time
- Agent effectiveness metrics
- Personal insights from conversation history

### Collaborative Chat
- Multiple users in same conversation (if Cortex ever becomes multi-user)
- Shared conversation spaces
- Role-based access to conversations

### Webhooks / External Integrations
- Trigger external actions from chat
- Receive external events into chat
- Integration with automation tools (Zapier, n8n)

### Message Reactions / Annotations
- Emoji reactions on messages
- Annotations and notes on messages
- Highlight important passages

---

## Promotion Process

When a feature is ready to be prioritized:

1. Create a standalone backlog item with full specification
2. Define prerequisites and dependencies
3. Add implementation phases and success criteria
4. Link back to this document for context
5. Remove or mark as "promoted" in this document

---

## Related Backlog Items

**Core Chat:**
- [Chat Interface (MVP)](./chat-interface-mvp.md)
- [Custom Agents](./custom-agents.md)
- [Sub-Agent Delegation](./sub-agent-delegation.md)
- [Tool Permission System](./tool-permission-system.md)
- [Deep Agents Adoption](./deep-agents-adoption.md) - Provides foundation for Memory, Context Management, Attachments

**Chat Enhancements:**
- [Chat Sidebar Integration](./chat-sidebar-integration.md)
- [Chat Quick Launcher](./chat-quick-launcher.md)
- [KBar Smart Chat Detection](./kbar-smart-chat-detection.md)
- [Multi-Provider Model Selection](./multi-provider-model-selection.md)
