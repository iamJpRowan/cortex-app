---
status: considering
themes: [chat-ai]
summary: Reduce incorrect tool usage (unwanted invokes, wrong commands, invalid args); only use tools when intent warrants.
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / LLM Tool Hallucination Guardrails

# LLM Tool Hallucination Guardrails

## Goal

Reduce or eliminate incorrect tool usage by the LLM: invoking tools when the user did not ask, calling non-existent commands, or passing invalid arguments. The agent should only use tools when the user intent clearly warrants it.

## Problem

Local models (e.g. Ollama) frequently misuse `invoke_command`:

- **Most common**: Toggle theme (or run other app commands) during conversations that have nothing to do with user settings or appearance—e.g. the user asks about data, code, or general questions and the agent still invokes theme-toggle.
- Invoke with non-existent command IDs (e.g. "explain-oauth-workflow").
- Use the tool for writing or explanation tasks instead of answering in text.

Current mitigations (dynamic `z.enum()` from registered command IDs, strict tool descriptions, system prompt rules) reduce frequency but do not fix the issue.

## Options to Evaluate

### A) Pre-execution validation and rejection

Validate tool calls before execution. If `commandId` is not in the allowed set, return a structured error to the agent without executing, and optionally log. Schema already restricts values; the issue is the model sometimes still produces invalid IDs—could add a runtime check that refuses execution and returns a clear message so the agent can retry or respond in text.

### B) Explicit user confirmation for app commands

Require user approval before executing `invoke_command` (e.g. "The assistant wants to toggle the theme. Allow?"). Prevents unwanted side effects but adds friction.

### C) Remove or gate `invoke_command` for weak models

Do not register `invoke_command` when using a model known to hallucinate tool use, or only register it when the user has opted in. Reduces functionality but eliminates the class of errors.

### D) Stronger prompt and tool-scoping patterns

Further narrow when the tool is presented (e.g. only inject `invoke_command` when the last user message clearly requests a UI action). Requires clear heuristics or a separate classifier.

### E) Model upgrade path

Document that tool reliability improves with more capable models and treat guardrails as a bridge until multi-provider/model selection is in place.

## Success Criteria

- [ ] Unwanted `invoke_command` invocations are rare or require user confirmation
- [ ] Invalid command IDs never execute; agent receives a clear error and can recover
- [ ] Approach works with local (Ollama) models; optional improvements for cloud models

## Related

- **[multi-provider-model-selection.md](./archive/multi-provider-model-selection.md)** - Better models may reduce hallucination; guardrails still valuable for edge cases.
- **[tool-permission-system.md](./tool-permission-system.md)** - User-controlled tool permissions could overlap with confirmation flows.
