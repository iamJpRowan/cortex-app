---
status: decomposed
decomposed_date: 2025-01-27
---

[Docs](../../README.md) / [Backlog](../README.md) / Archive / Chat Interface

# Chat Interface

## Status

This backlog item has been **decomposed** into multiple focused backlog items through a structured scoping conversation on 2025-01-27.

## Decomposed Into

1. **[Chat Interface (MVP)](../chat-interface-mvp.md)** - Core chat interface with streaming, traces, conversation management, and AI integration patterns
2. **[Chat Sidebar Integration](../chat-sidebar-integration.md)** - Move chat to right sidebar, implement context injection from views
3. **[KBar Smart Chat Detection](../kbar-smart-chat-detection.md)** - Detect long-form questions in KBar and offer to start chat
4. **[Chat Quick Launcher](../chat-quick-launcher.md)** - Dedicated hotkey + overlay with model/agent selectors
5. **[Custom Agents](../custom-agents.md)** - Agent management, switching, and smart suggestions

## Original Goal

Implement production-quality chat interface for conversing with the LLM agent. Provide intuitive UI for asking questions, viewing responses, managing conversations, and inspecting agent execution details. This is the primary user-facing interface for Cortex's AI capabilities.

## Scoping Decisions

Through detailed discussion, the original broad scope was narrowed and split to:
- **Build AI integration patterns** that make it easy to add AI to future features (context contract, action via commands, single AI surface)
- **Ship polished MVP** with streaming, full trace display, and conversation management
- **Defer enhancements** that can be added later without refactoring (sidebar placement, smart launchers, agents)

See [devlog 2025-01-27](../../devlogs/2025-01-27-chat-interface-scoping.md) for full scoping discussion and rationale.

## Key Architectural Decisions

1. **AI Integration Patterns**: App context contract, LLM actions via command registry, single AI surface
2. **Placement**: Start as standalone view, move to sidebar later
3. **Overlay/Launchers**: Separate backlog items (KBar detection, Quick Launcher)
4. **App Awareness**: Context injection deferred to sidebar item (when multiple views exist)
5. **Tool Permissions**: Prep work in MVP, full system is separate backlog item
6. **Agents**: Prep work in MVP, full feature is separate backlog item
7. **Execution Trace**: Polished from day 1 using shadcn AI components
8. **Streaming**: Full streaming (IPC + UI) from day 1
9. **UI Stack**: Commit to shadcn AI chatbot components
10. **Conversation Management**: Full CRUD + search from day 1

## Original Detailed Behaviors

**Interfaces**
For the UI interface I believe I want to leverage this package: https://www.shadcn.io/ai/chatbot but open to alternative suggestions

For the primary interface I would like a dedicated view that contains all of the features and configurations described in the doc. I would like to be able to initiate a chat with a hotkey and overlay similar to the KBar even when I am not currently in the chat view. I expect I will eventually want to have chat available when I am in other views of the app, so thinking this would be done leveraging a right sidebar.

**In App Functionality**
I will want to make the chat app aware, as in able to recognize what view is open and the content contained within.  The LLM should be allowed to interact with the UI change state and/or configuration to complete its tasks.  This includes user settings, and would like to use the toggle light/dark mode as the example for that

**Configurations**
I want the user to have ways to customize the chat's behavior.  I'm leaning towards being able to upload .md instruction files as the mvp for this.  I also want the user to be able to control what actions the chat is allowed to perform based on the tools (or similar) that are added into the app.  So basically some way to view available actions and toggle between "no", "ask", or "yes" for each given permission

**Custom Agents**
Additionally I have an idea to give the user the ability to create custom "agents" that are bespoke configurations of instructions, tool permissions, and runtime parameters. These agents should be accessible as a select field during a chat and can be switched at any point in the conversation to update the current instructions and permissions. Might even be nice if the chat recognizes a request sounds like it's meant for a different agent and will pause real quick before additional processing to see if the user wants to switch agent first

**Extensibility**
Following the extensibility design of this project I would like to make adding skills and tools something that can be additive, installed from a marketplace or developed locally.  The implementation should follow patterns that make internal and external features integrate similarly

**Graph Exploration**
The chat should have access to the graph DB with the ability to construct arbitrary cypher queries, but also the ability to "teach" it specific queries for specific use cases.  Schema awareness should be a first class citizen

**File Editing**
The chat should be able to suggest edits to files or create net new files.  Common cases would be to update MD files that it has been granted access to through the file system or to suggest creating app extensions or editing code repos it has access to.  For file updates it should have the ability to render diffs and have the user approve before edits are written to file
