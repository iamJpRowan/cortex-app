---
status: considering
themes: [chat-ai]
summary: User-facing "allow full tool result" and "confirm oversized prompt" confirmations via the same approval UI pattern as tool permission runtime approval.
depends_on: [context-window-and-costs]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Content and Token Guardrail Confirmations

# Content and Token Guardrail Confirmations

## Goal

Let users override default guardrails when they choose: (1) **Allow full tool result** when the tool factory would cap a result, and (2) **Confirm oversized prompt** when the estimated input tokens exceed a threshold. Both use the same interrupt → approval UI → approve/deny pattern as the [Tool Permission System](./tool-permission-system.md) Phase 9 runtime approval (inline in-conversation; no separate stack).

## Prerequisites

- **[Tool Permission System](./tool-permission-system.md)** — Phase 9 (runtime approval flow) must be complete so the app has interrupt, inline approval UI, and sidebar indicator. This item adds two additional **interrupt reasons** and reuses that UI.
- **[Bounded Tool Results and Chat UI Stability](./archive/bounded-tool-results-and-chat-ui-stability.md)** (archived, implemented) — Factory cap (1.2) and opt-out metadata (1.4) are in place; the factory is the single place that can offer "allow full result" for a given invocation.
- **[Context Window and Costs](./context-window-and-costs.md)** — Token estimation and "used / limit" display must be in place so the app has an estimate and the model's limit before prompting; required for "confirm oversized prompt".

## Requirements

### Allow full tool result

When the tool factory would **cap** a result (because it exceeds the default max length), optionally **interrupt** and show approval UI: "This result is large and will be truncated for context. Include full result anyway?" If the user approves, skip the cap for that invocation only (the ToolMessage gets the uncapped string). If denied, use the capped result. Requires the bounded-tool-results factory cap and opt-out metadata (already implemented).

### Confirm oversized prompt

Before calling the LLM, **estimate input token count** (conversation + system + current prompt). If the estimate exceeds a threshold (e.g. 80% of the model's context window or a configurable "expensive" limit), interrupt and show approval UI: "This request will use approximately X tokens (or $Y if cost is available). Continue?" Approve/deny. Depends on [Context Window and Costs](./context-window-and-costs.md) (token estimation and context window display).

### Implementation approach

Implement both as additional **interrupt reasons** in the same runtime-approval pipeline (same approval UI component as Phase 9, different copy and payload). No separate "content guardrail" interrupt stack—one human-in-the-loop flow for tool permission, full-result allowance, and oversized-prompt confirmation.

## Success criteria

- [ ] When a tool result would be capped by the factory, user can be prompted to allow full result for that invocation; approve skips cap, deny uses capped result.
- [ ] When estimated input tokens exceed a configured threshold, user can be prompted before the request is sent; approve continues, deny cancels.
- [ ] Same inline approval UI and sidebar-indicator behavior as Tool Permission System Phase 9; only trigger and copy differ.

## Related

- [Tool Permission System](./tool-permission-system.md) — Phase 9 provides the approval flow and UI this item extends.
- [Bounded Tool Results and Chat UI Stability](./archive/bounded-tool-results-and-chat-ui-stability.md) — Factory cap and opt-out implemented; this item adds the user-facing "allow full result" confirmation.
- [Context Window and Costs](./context-window-and-costs.md) — Token estimation and context window; prerequisite for "confirm oversized prompt".
