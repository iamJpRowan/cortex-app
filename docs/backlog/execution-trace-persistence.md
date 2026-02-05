[Docs](../README.md) / [Backlog](./README.md) / Execution Trace Persistence

# Execution Trace Persistence

## Goal

Persist execution trace data (tool calls, durations, timing) so historical conversations display full trace details. Currently, duration is only available during live sessions because the LangGraph checkpointer stores conversation state, not execution telemetry.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Streaming trace events and trace display UI.

## Problem

| Trace Detail | Live Session | Historical |
|--------------|--------------|------------|
| Tool name | ✓ | ✓ |
| Arguments | ✓ | ✓ |
| Result | ✓ | ✓ |
| Duration | ✓ | ✗ |
| Errors | ✓ | ✓ |

Duration is lost because the checkpointer only persists messages, not timing metadata.

## Options to Evaluate

### A) LangSmith Integration
Use LangChain's official observability platform. Set `LANGCHAIN_TRACING_V2=true` and traces are captured automatically.

**Pros:** Full-featured, no custom code, includes analytics and debugging tools
**Cons:** External service, data leaves device, requires account

### B) Local Trace Storage
Store traces in SQLite alongside conversation metadata.

**Pros:** Offline-first, data stays local, no external dependencies
**Cons:** Custom implementation, no built-in analytics

### C) Hybrid
Use local storage as primary with optional LangSmith export for advanced analysis.

## Success Criteria

- [ ] Historical conversations display duration for tool executions
- [ ] Trace data persists across app restarts
- [ ] Traces cleaned up when conversation is deleted

## Related

- [Tool Permission System](./tool-permission-system.md) - Audit logging may share infrastructure
