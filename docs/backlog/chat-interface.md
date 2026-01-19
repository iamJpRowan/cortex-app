[Docs](../README.md) / [Backlog](./README.md) / Chat Interface

# Chat Interface

## Goal

Implement production-quality chat interface for conversing with the LLM agent. Provide intuitive UI for asking questions, viewing responses, managing conversations, and inspecting agent execution details. This is the primary user-facing interface for Cortex's AI capabilities.

## Relation to LangChain Integration

The LangChain integration provides the backend infrastructure (agent, tools, state persistence) with an IPC API designed for chat interfaces. This backlog item would:
- Build chat UI in renderer
- Display conversation history with message threading
- Show agent responses with markdown rendering
- Add streaming support for real-time response display
- Surface execution traces (expandable "Show Details" for each response)
- Implement conversation management (list, create, delete, rename)
- Add conversation search and filtering
- Design detailed audit trail visualization (timeline view, tool call inspection)
- Handle loading states and error display
- Support rich content (code blocks, tables, images)

The execution trace format returned by `query()` is specifically structured for rendering in chat UI.

## Key Capabilities

- Message input with markdown support
- Streaming response display (real-time token generation)
- Conversation history persistence and navigation
- Execution trace visualization (expandable tool calls and results)
- Multi-conversation management with naming and search
- Rich content rendering (code, tables, formatting)
- Copy/export conversation functionality
- Keyboard shortcuts and accessibility
- Mobile-responsive design

## Notes

This is a major feature requiring significant UI/UX design. The audit trail specification (what execution details to show, how to present them) should be finalized as part of this work, informing what data the backend needs to persist.
