---
status: considering
themes: [chat-ai]
summary: Token usage, cost, processing time, and context window visibility (past and before send).
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Context Window and Costs

# Context Window and Costs

## Goal

Make it easy for users to understand how much each request costs, how many tokens are consumed, how long responses take, and how much of the current model’s context window is used. Users should be able to look back at past conversations and see token usage, processing time, and (when they have set pricing) cost per message. They should see before sending how many tokens will go out with the next request and how much of the context window would be consumed for the current model.

## Prerequisites

- **[Multi-Provider Model Selection](./archive/multi-provider-model-selection.md)** — Provider abstraction, model selector, per-conversation and per-message model tracking, `message_models` and conversation metadata. Context window and cost tracking were explicitly deferred to this backlog item.

## Key Capabilities

### Per-message usage and timing
- **Token usage:** Capture `input_tokens` and `output_tokens` from the provider when available (e.g. Anthropic in AIMessage response metadata); persist per assistant message alongside `message_models`.
- **Processing time:** Time from request start to stream complete; persist per assistant message (`responseTimeMs`).
- **Cost (optional):** Only when the user has entered cost per token for that provider in settings: compute and store cost per message using `inputTokens * costPerTokenInput + outputTokens * costPerTokenOutput`.

### Provider settings: cost per token
- Optional **cost per token (input and output)** per provider in LLM provider settings.
- If the user does not set cost, cost is not computed or shown in message data or history; tokens and time are still tracked and displayed.

### Context window
- **Ollama:** Obtain context window **dynamically** via `POST /api/show` (e.g. `model_info.{family}.context_length` or `parameters.num_ctx`); merge into model metadata; fallback (e.g. 4096) if missing.
- **Cloud providers (Anthropic, etc.):** No context window in provider APIs; keep **static** defaults (e.g. in code or optional override in provider settings). No user-facing “enter context window” required unless we add optional override later.

### UI
- **Under each assistant message** (same area as existing time and model): show processing time (e.g. “2.3s”), token counts (e.g. “1.2K in / 400 out”), and cost (e.g. “$0.012”) only when the user has set cost per token for that provider.
- **By the prompt input:** Show estimated (or counted) tokens that will be sent with the next request (conversation + system + current prompt).
- **Next to the model selector:** Show context consumed for the current model, e.g. “12K / 128K” (used / limit), where “used” is the same token count as “tokens for next request” and “limit” is the current model’s context window (dynamic for Ollama, static for others).

## Phase 1: Usage, time, and persistence

**Status:** Not started.

1. **Backend — read usage from stream:** In the agent’s streaming path, when processing the final `AIMessage`(s) for a turn, read `input_tokens` and `output_tokens` from the message (provider-specific: e.g. `response_metadata` or `additional_kwargs`). Validate with Anthropic; structure so other providers can be added.
2. **Backend — timing:** Record request start time when stream begins; on stream complete compute `responseTimeMs` (start → complete).
3. **Backend — extend StreamCompleteEvent:** Add `usage?: { inputTokens: number; outputTokens: number }` and `responseTimeMs?: number` to the complete event (see `shared/types/llm.ts`).
4. **Backend — persist usage and time:** In ConversationService (or equivalent), add storage for per-message usage and time, aligned with `message_models` (e.g. `message_usage` array of `{ inputTokens, outputTokens, responseTimeMs }` per assistant message). On stream complete in IPC, append to this array when usage/time are present. Do **not** extend the LangGraph checkpointer; keep all new data in app-owned DB.
5. **Renderer — display:** When loading messages, merge usage and time from conversation metadata (same pattern as `message_models`). In the per-message metadata area under assistant bubbles (where time and model are shown), add processing time and token counts. Cost is not shown in Phase 1.

### Decisions (Phase 1)
- **Persistence:** Usage and time are stored in ConversationService (e.g. new column or table keyed by conversation + message index), not in the checkpointer. Rationale: checkpointer schema is owned by LangGraph; app metadata stays in app DB.
- **Cost:** Not computed or stored in Phase 1; Phase 2 adds provider cost settings and then cost is computed only when user has set rates.

## Phase 2: Provider cost settings and cost per message

**Status:** Not started.

1. **Settings schema:** Add optional `costPerTokenInput` and `costPerTokenOutput` (e.g. USD per token) to each provider’s config in `llm.providers` (or equivalent). No default; if both are unset, cost is not used.
2. **Settings UI:** In the LLM Providers section, add optional fields for “Cost per token (input)” and “Cost per token (output)” per provider (e.g. numeric inputs with unit “USD”). Save with existing provider config.
3. **Backend — compute cost:** When persisting usage (Phase 1), if the provider has both cost fields set, compute `costUsd = inputTokens * costPerTokenInput + outputTokens * costPerTokenOutput` and store with the message usage (e.g. in `message_usage` entry or extended metadata).
4. **Renderer — display cost:** Under assistant messages, show cost (e.g. “$0.012”) only when the message has a stored cost (i.e. provider had cost set at the time of the request).

### Decisions (Phase 2)
- **Cost only when user sets it:** Cost is included in message data and history only when the user has entered cost per token for that provider. No “default” pricing from app; optional static defaults in code can be used only as placeholder or suggestion in UI, not for storage.

## Phase 3: Context window (dynamic for Ollama, static fallback)

**Status:** Not started.

1. **Ollama — dynamic context window:** In the Ollama adapter or model-list path, for each model call `POST /api/show` with `{"model": "name"}`. Parse response: from `model_info` find a key ending in `context_length` (e.g. `gemma3.context_length`); alternatively use `parameters` for `num_ctx` if we want user-configured context. Merge into `ModelMetadata.contextWindow`; use a fallback (e.g. 4096) when missing.
2. **Cloud providers:** Keep existing static `contextWindow` in `model-metadata.ts` (or equivalent) for Anthropic and others; no API for context window. Optional: allow per-provider or per-model override in settings later (not required for this phase).
3. **Model list / selector:** Ensure model list returns `contextWindow` for all models (Ollama from show, others from static). Fix any bug where only some models show context window (e.g. ensure tag/suffix matching covers all enabled Ollama models).

### Decisions (Phase 3)
- **Ollama only dynamic:** Context window is fetched from API only for Ollama. Cloud providers use static table; providers do not expose context window in list/get model APIs.

## Phase 4: UI — tokens for next request and context consumed

**Status:** Not started.

1. **Tokens for next request:** Compute (or estimate) token count for “system prompt + conversation messages + current prompt input”. Where available use provider count API (e.g. Anthropic “count tokens”); otherwise use a character-based or tiktoken-style estimate. Expose to renderer (e.g. IPC or derived in renderer from messages + input). Show near the prompt input, e.g. “~3.1K tokens” or “3,100 tokens”.
2. **Context consumed next to model:** Using the same token count as “tokens for next request” and the current model’s `contextWindow` from model list, show “used / limit”, e.g. “12K / 128K” or “12,000 / 128,000”, next to the model selector (or in the same metadata strip). Update when input or conversation changes or when model changes.

### Decisions (Phase 4)
- **Placement:** Reuse the same metadata area under the chat (where time and model are shown per message); add processing time, tokens, and optional cost there. At input level: token count for next request and context consumed next to model selector, as agreed with user.

## Success Criteria

- [ ] Per assistant message: token counts (in/out) and processing time are persisted and displayed when available.
- [ ] When the user has set cost per token for a provider, cost is computed and shown for messages from that provider; when not set, cost is not shown or stored.
- [ ] Ollama models show context window from `/api/show`; cloud models use static context window.
- [ ] By the prompt input: user sees how many tokens will be sent with the next request.
- [ ] Next to model selector: user sees how much of the current model’s context window would be consumed (used / limit).
- [ ] Users can look back at past conversations and see tokens consumed, processing time, and (if they set pricing) cost per message.
- [ ] All new data is stored in app-owned persistence (ConversationService or equivalent), not in the LangGraph checkpointer.

## Dependencies

- **Requires:** [Multi-Provider Model Selection](./archive/multi-provider-model-selection.md) (completed). Uses existing `message_models`, conversation metadata, model list, and provider settings.

## Related Backlog Items

- **[Multi-Provider Model Selection](./archive/multi-provider-model-selection.md)** — Completed; remaining provider adapters (Phase 7) and this item’s scope were split out.
- **[Ollama Model Management](./ollama-model-management.md)** — Browse/install Ollama models; independent of context/cost tracking.
- **[Configuration System](./configuration-system.md)** — Provider cost fields live in existing settings; no new config system required.

## Notes

### Why not extend the checkpointer
LangGraph’s checkpointer owns its schema; extending it with app-specific columns risks breakage on upgrades. Usage and timing are app-level metadata; storing them in ConversationService (alongside `message_models`) keeps a single place for conversation metadata and avoids touching the checkpointer.

### Cost per token source
Providers do not expose “your cost per token” in the completion API. Pricing is from public docs or user entry. So cost is either from a static table (for display hints) or from **user-entered** provider settings; only user-entered rates are used to compute and store cost in message history.

### Token counting for “next request”
Anthropic offers a “count tokens” API; we can use it when the selected model is Anthropic. For others, a character-based or tiktoken-style estimate is sufficient for “~X tokens” and “used / limit” display.
