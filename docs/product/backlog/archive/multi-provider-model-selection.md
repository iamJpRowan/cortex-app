---
status: completed
date_archived: 2025-02-09
summary: Multi-provider LLM support (Ollama, Anthropic), model selector, per-conversation and per-message model tracking.
devlogs: [2025-02-07-multi-provider-phase-3-model-discovery, 2025-02-07-multi-provider-settings-test-refresh-ux, 2025-02-07-phase-5-model-selector-reasoning]
---

[Docs](../../../README.md) / [Product](../../README.md) / [Backlog](../README.md) / Archive / Multi-Provider Model Selection

# Multi-Provider Model Selection

## Implementation Status

Phases 1–5 are complete: provider abstraction, Anthropic adapter, model discovery and metadata, provider configuration UI, model selector, per-conversation and per-message model tracking, and reasoning in the trace UI.

**Remaining work (separate backlog items):**
- **Phase 7 (remaining provider adapters):** OpenAI, Groq, Together, etc. — to be implemented when adding additional providers.
- **Usage tracking, context window, and costs:** Moved to **[Chat Context Window and Costs](../context-window-and-costs.md)**. That item covers token usage, processing time, optional cost per message (when user sets cost per token in provider settings), dynamic context window for Ollama, and UI for tokens-for-next-request and context consumed.

## Goal

Enable users to choose from multiple LLM providers (Ollama local models, OpenAI, Anthropic, Groq, Together, etc.) and select specific models per conversation. Provides flexibility to use the best model for each task, balancing cost, speed, capability, and privacy.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Must be complete. Includes `model` parameter in IPC/agent and conversation storage.

## Key Capabilities

### Multi-Provider Support
- **Ollama** (local): Use installed local models
- **OpenAI**: GPT-4, GPT-3.5, etc.
- **Anthropic**: Claude models
- **Groq**: Fast inference for various models
- **Together AI**: Open-source models
- **Additional providers**: Extensible architecture for adding more

### Provider Abstraction Layer
- Unified interface for all providers (LangChain already provides this)
- Provider-specific configuration (API keys, base URLs, etc.)
- Connection testing and validation
- Error handling per provider
- Rate limiting and retry logic

### Model Discovery & Registry
- List available models from each provider
- Ollama: Query installed models (already implemented)
- Cloud providers: Static registry or API query for available models
- Model metadata:
  - Context window size
  - Cost per token (input/output)
  - Speed/performance characteristics
  - Capabilities (function calling, vision, etc.)
  - Privacy/data retention policies

### Ollama (this backlog)
- Use **installed** local models (discovery via existing adapter; no in-app install in this item).
- Browse library, install, remove, and update Ollama models are covered by a separate backlog item: [Ollama Model Management](../ollama-model-management.md).

### Provider Configuration UI
- Settings panel for LLM providers
- Add/edit/remove provider credentials
- Per-provider settings:
  - API keys (secure storage)
  - Base URLs (for custom endpoints)
  - Organization IDs (if applicable)
  - Model preferences
- Test connection button
- Show/hide API keys (password field)

### Model Selector Component
- Reusable dropdown component for model selection
- Available models grouped by provider
- Display model metadata (context window, cost, etc.)
- Search/filter models
- Show currently selected model
- Indicate if provider is configured (disable if not)
- Used in chat input (Quick Launcher: deferred until that feature exists)

### Per-Conversation Model Selection
- Each conversation stores current/default model (`currentModel` field)
- Each message stores which model generated it (`model` field)
- Switch models mid-conversation (new messages use new model)
- Display which model generated each message
- Default model preference (user setting)
- Last-used model as fallback

### Model Usage & Cost Tracking
- Track token usage per model/provider
- Estimate costs for cloud providers
- Usage history and analytics
- Budget alerts (optional enhancement)

## Phase 1: Provider Abstraction & Configuration
**Status: Complete.**

1. Define provider interface/adapter pattern
2. Create provider registry service
3. Implement Ollama provider adapter (already mostly exists)
4. Add provider configuration storage (settings system)
5. Secure storage for API keys

Implemented: provider types and adapter interface (`providers/types.ts`), registry with LLM cache (`providers/registry.ts`), Ollama adapter with list/getLLM and short-name normalization (`providers/ollama.ts`), settings keys `llm.defaultModel` and `llm.providers` (`settings.ts`), secure API-key decryption helper (`providers/secure-config.ts`). Agent resolves model per query via registry, caches executor per model id, clears caches on settings change. Tool-support blocklist filters listed models and rejects explicit selection of non-tool-capable models (`providers/tool-support-blocklist.ts`).

### Decisions

#### 1. Model identifier scheme
**Decided: Prefixed string.** Implemented: `providerId:modelId` (e.g. `ollama:llama3.2:3b`). Parse/build in `providers/types.ts` (`parseModelId`, `buildModelId`). **Decision:** How do we represent "which provider + which model" in one value? **Suggestion:** Prefixed string. **Justification:** One value works everywhere (IPC, `currentModel`, settings). Reserve provider ids (e.g. `ollama`, `openai`, `anthropic`, `groq`, `together`).

#### 2. Where to store provider config and API keys
**Decided: Extend existing settings.** Implemented: `llm.defaultModel` and `llm.providers` in settings schema; API key ciphertext in provider config; `getProviderConfigWithDecryptedKeys()` in main process only. **Justification:** One settings system; encrypted blobs in same store.

#### 3. Ollama adapter scope in Phase 1
**Decided: Full adapter and registry.** Implemented: `ollamaAdapter` in `providers/ollama.ts`; agent gets LLM via `providerRegistry.getLLM()`. **Justification:** Phase 2 then only adds adapters without a second refactor.

#### 4. Default model / fallback when no model is specified
**Decided: Introduce `llm.defaultModel` in Phase 1.** Implemented: agent `resolveModelId()` uses options.model, then settings `llm.defaultModel`, then first tool-capable Ollama model from registry. No UI until Phase 4/6.

#### 5. Agent lifecycle: executor/LLM per request vs cached
**Decided: Cache executor per model id; clear on config change.** Implemented: agent `executorCache`; registry LLM cache; settings `change` clears both when `llm.providers` or `llm.defaultModel` changes.

#### 6. Tool support: static blocklist
**Decided: Static blocklist.** Implemented: `tool-support-blocklist.ts`; filter and reject blocklisted models. **Per-provider onboarding:** When adding each new provider, validate tool-support and update blocklist first. See `src/main/services/llm/providers/tool-support-blocklist.ts`.

#### 7. Phase 2 scope: one provider (Anthropic) for faster e2e validation
**Decided: Phase 2 implements Anthropic only; remaining providers in Phase 7.** **Justification:** Faster feedback loop; validates adapter pattern and API-key flow with one provider.

## Phase 2: One Additional Provider (Anthropic) — E2E validation
**Status: Complete.**

Scope reduced to a single new provider so we can validate the adapter pattern and API-key flow end-to-end before adding the rest.

1. **Before enabling Anthropic:** Validate which Anthropic models do not support tools; add them to the tool-support blocklist (`tool-support-blocklist.ts`). — Done: `anthropic: []` (current Claude models support tools).
2. Implement Anthropic provider adapter — Done: `providers/anthropic.ts` (getLLM via ChatAnthropic, listModels via GET /v1/models).
3. Register adapter in provider registry — Done: `providers/index.ts`.
4. Test Anthropic with authentication — Ready for e2e (set API key in settings, set `llm.defaultModel` to e.g. `anthropic:claude-3-5-sonnet-20241022` or pass model in query).
5. Error handling and connection validation — Adapter throws on missing key; listModels returns [] without key; API errors surface from fetch.

**Phase 2 validation:** Validated e2e (chat, formatting, tools with Anthropic; Ollama backward compatibility). Devlog deferred. Unit tests for Anthropic adapter and `llm:encrypt-provider-key` deferred.

**Testing (settings file only for API key):** Use the same path the future Provider Configuration UI will use. With the app running, open DevTools (Console) and run:

```js
// Encrypt key and write directly to settings (recommended)
await api.llm.encryptProviderKey('anthropic', 'YOUR_PLAIN_API_KEY', true)
// Or only get the fragment to paste into settings.json manually:
await api.llm.encryptProviderKey('anthropic', 'YOUR_PLAIN_API_KEY')
```

Replace `YOUR_PLAIN_API_KEY` with your Anthropic API key (e.g. `sk-ant-...`). With `true`, the key is merged into `llm.providers` and saved; without it, the promise resolves with `{ success: true, fragment }` so you can copy the fragment into your settings file manually.

### Decisions

#### 8. API key entry before Provider Configuration UI (Phase 4)
**Decided: Settings file only.** For testing, provide instructions to generate the proper JSON to add to the settings file (encrypt key via dev script/flag, then merge into `llm.providers`).

#### 9. Model list source for cloud providers
**Decided: Use provider API.** Anthropic adapter calls list-models API; filter by tool-support blocklist.

#### 10. Default model when multiple providers are configured
**Suggestion:** Keep Ollama-first fallback for Phase 2; introduce explicit "default provider priority" or "require default" only if needed later.

## Phase 3: Model Discovery & Metadata
**Status: Completed.**

1. Model discovery for each provider — Uses existing adapter `listModels()`; aggregated by model list service.
2. Create model registry/cache — `model-list-service.ts`: in-memory cache, cleared when `llm.providers` or `llm.defaultModel` changes (subscribes on first use).
3. Define model metadata structure — `ModelMetadata` in `shared/types/llm.ts`: id, label, contextWindow, costPerTokenInput, costPerTokenOutput, capabilities (tools, vision), privacyNote.
4. Populate metadata for common models — `providers/model-metadata.ts`: static map for Ollama and Anthropic common models; merge with discovered ids (tag suffix matching for Ollama).
5. Refresh model list periodically — Refresh on config change only (no TTL).
6. Query Ollama library for available models (not just installed) — Out of scope; see [Ollama Model Management](../ollama-model-management.md).

**IPC:** `llm:listModels` returns `ListModelsResult` (byProvider, all). Preload and API types updated.

### Decisions

#### 11. Model metadata fields (Phase 3 scope)
**Decided: Full spec.** Implemented: `ModelMetadata` with id, label, contextWindow, costPerTokenInput, costPerTokenOutput, capabilities (tools, vision), privacyNote.

#### 12. Model registry/cache ownership and refresh
**Decided: Refresh on config change only.** No TTL. Cache invalidated when `llm.providers` or `llm.defaultModel` changes.

#### 13. Ollama "library" (available-but-not-installed) in Phase 3 vs 3.5
**Suggestion:** Phase 3 = installed only for Ollama. "Ollama library" (browse/search/pull) is [Ollama Model Management](../ollama-model-management.md) only.

#### 14. Expose model list via IPC in Phase 3
**Decided: Yes.** Implemented: `llm:listModels` IPC handler returning models grouped by provider with full metadata.

## Phase 4: Provider Configuration UI
**Status: Ready to test.**

1. Create provider settings panel
2. Add/edit provider credentials UI
3. API key input with secure storage
4. Test connection functionality
5. Display configured providers and status

**Approach:** New "LLM Providers" section in existing Settings view. Static provider list (Ollama, Anthropic). Ollama: optional base URL; Anthropic: API key (password field, save via existing `encryptProviderKey`). Test connection = call listModels for that provider and report success/error. Allow clearing provider config (remove from `llm.providers`).

**Proposed plan (Phase 4):**

- **Scope**
  - Add an **LLM Providers** section to `SettingsView` (below Keyboard Shortcuts, same pattern as Appearance).
  - **Main process:** New IPC `llm:testProvider(providerId)` that calls the existing model-list path for that provider only and returns `{ success: boolean, error?: string, modelCount?: number }` so the UI can show connection status or error message.
  - **Renderer:** Read `llm.providers` via existing `settings.get()` (or full get); never display or transmit decrypted keys. Use existing `encryptProviderKey(providerId, plainKey, true)` for Anthropic; use `settings.set('llm.providers', merged)` for Ollama base URL and for clearing a provider (get → delete key → set).

- **UI/UX**
  - **Provider list:** Static list of two entries: **Ollama**, **Anthropic** (same order). Each entry shows: provider name, short description, "Configured" / "Not configured", and per-provider controls.
  - **Ollama:** Optional "Base URL" text input (default placeholder e.g. `http://127.0.0.1:11434`). Save on blur or explicit Save (TBD: blur vs Save button). "Test connection" button → call `llm:testProvider('ollama')` → show "Connected (N models)" or "Connection failed: &lt;error&gt;". "Clear" removes `llm.providers.ollama` and updates UI.
  - **Anthropic:** API key password input (masked). "Save" → `encryptProviderKey('anthropic', value, true)`; show success or error toast/message. "Test connection" → `llm:testProvider('anthropic')`; show "Connected (N models)" or "Connection failed: &lt;error&gt;". "Clear" removes `llm.providers.anthropic` and updates UI.
  - **Status:** Show configured vs not configured; after test, show connection result (success + model count, or error). No display of key material.

- **Recommendations**
  - Implement `llm:testProvider(providerId)` in main (reuse registry + getProviderConfig; catch errors and return message) so the UI gets a clear success/error and optional model count.
  - Use existing UI primitives (Input, Button, Separator) and section layout consistent with Appearance / Hotkeys.
  - Keep Settings type in renderer extended to include `llm.providers` (and optionally `llm.defaultModel`) only for type-safe get/set; do not add decrypted keys to any type.

- **Where your input helps**
  - **Ollama base URL:** Save on blur vs "Save" button next to the field.
  - **Copy:** Exact wording for "Configured" / "Not configured" and for connection messages ("Connected (N models)", "Connection failed: …").
  - **Order:** Ollama first, then Anthropic, or prefer a different order.

**Decisions (Phase 4):**

- **Ollama base URL:** Save on blur (user confirmed).

**Refinements — Test & refresh UX (2025-02-07):**

- **When provider tests run:** Only in three cases: (1) once when opening the LLM settings view (when settings first load), to show current status; (2) after saving that provider's credentials (Anthropic API key or Ollama base URL) — test only the provider that was updated; (3) manual trigger via the per-provider refresh icon. Tests do not run on other settings changes (e.g. default model, theme).
- **Per-provider refresh:** Replaced the global "Refresh" button with a refresh icon on each provider row. Each icon runs the connection test for that provider only and shows a spinner while loading. See devlog [2025-02-07-multi-provider-settings-test-refresh-ux.md](../../devlogs/2025-02-07-multi-provider-settings-test-refresh-ux.md).

## Phase 5: Model Selector + Per-Conversation Model (combined)

Single phase so the selector and persistence ship together; no period where the selector exists but selection does not persist.

**Component and placement**

1. Add **AI Elements model-selector** via existing pattern ([AI Elements](../../../development/feature-guides/ai-elements.md)): `npx shadcn@latest add https://elements.ai-sdk.dev/api/registry/model-selector.json --path src/renderer/src/components/ai-elements -y`. Adapt to app data: `llm:listModels` → `ListModelsResult` / `ModelMetadata`; grouped by provider; handle unconfigured providers (disabled or hidden).
2. Place the model selector **below the chat input** (same column as the input area).
3. Conversation list: show **current model name** below the chat name (e.g. second line with `conversation.currentModel` → human-readable label when available).

**Persistence and wiring**

4. Conversation metadata already has `currentModel`; ensure it is set on create/update and when user changes model in selector. Message storage already has `model`; ensure agent and IPC pass/return it; display which model generated each message in the chat UI.
5. Pass selected model from selector to agent query (`options.model`); agent uses it or falls back to `llm.defaultModel`.
6. Switch models mid-conversation: updating selector updates conversation `currentModel`; new messages use the new model.
7. Default model preference in settings: `llm.defaultModel` used when opening a new conversation or when conversation has no `currentModel` set. Default model select is already in the Settings view; no new UI needed.

**Model selector scope**

- Group models by provider; display model metadata (context window, cost) where available; search/filter; show currently selected model; disable or hide models from unconfigured providers.
- Quick Launcher: not in scope for this phase (feature does not exist yet; add selector there when Quick Launcher is implemented).

**Reasoning / thinking in the trace UI**

When a provider supplies extended reasoning or thinking, capture it and show it in the chain-of-thought section so users can see the model's reasoning while the agent is working. **Reasoning is ephemeral:** useful during the response stream, not stored long-term (no requirement to persist reasoning in conversation history).

8. **Backend:** Extend the execution trace to support reasoning/thinking content:
   - Add a new trace entry type (e.g. `reasoning` or `thinking`) to `TraceEntry` / `TraceEntryType` in `shared/types/llm.ts`, with a `content` (or similar) field for the reasoning text.
   - In the agent (and streaming path), detect and capture reasoning/thinking from the provider when available. **Validate with Anthropic** (e.g. extended/deep reasoning); that is sufficient for Phase 5. Structure so other providers can be added later.
   - Emit reasoning entries in the same trace stream as tool_call/tool_result so the UI receives them in order. Do not persist reasoning to stored trace/history.
9. **Frontend:** Render reasoning/thinking in the chain-of-thought section:
   - In `TraceDisplay` (or equivalent), handle the new trace type: show reasoning content in a collapsible block (e.g. using `ChainOfThoughtStep` or a dedicated "Thinking" / "Reasoning" block) within the same trace area as tool invocations, so the user sees: reasoning (when present) → tool steps → final answer.
   - Preserve existing behavior when no reasoning is supplied (tool-only trace unchanged).

**Model metadata in UI (Phase 5):** See [Model metadata and UI](#model-metadata-and-ui) and [Chain of thought and reasoning](#chain-of-thought-and-reasoning) in Notes.

### Phase 5 delivery chunks (testable steps)

| Chunk | Status | Delivers | How to test |
|-------|--------|----------|-------------|
| **5a** | **Complete** | Model flows from caller → agent → message/conversation; conversation and message store model. | Set model via Settings default or queryStream options; send message; verify model used and stored on conversation and on message (DB or API). New conversation uses default model when no currentModel. |
| **5b** | **Complete** | Model selector below chat input; conversation list shows model; selection persists and is used. | Select model in selector, send message, verify reply uses that model; switch conversation and back, selector shows that conversation's model; sidebar shows model under title. |
| **5c** | **Complete** | Per-message model display in chat. | Send messages with different models in one thread; each assistant bubble shows correct model label. |
| **5d** | **Complete** | Reasoning in trace stream (Anthropic); not persisted. | See [Testing reasoning (5d/5e)](#testing-reasoning-5d5e) below. |
| **5e** | **Complete** | Reasoning visible in chain-of-thought UI. | Reasoning block appears for Anthropic thinking; no regression when absent. |

**Order:** 5a → 5b → 5c (5b and 5c can be parallel after 5a). 5a → 5d → 5e.

#### Testing reasoning (5d/5e)

Extended thinking is **enabled for Anthropic** in the adapter: Opus 4.6 uses `thinking: { type: 'adaptive' }`; other models use `thinking: { type: 'enabled', budget_tokens: 4096 }` with `maxTokens: 8192`. Temperature is omitted when thinking is enabled. No extra config needed to test.

1. **Prerequisites:** Anthropic API key set in Settings; app running (`npm run dev`).
2. **Model:** In the chat model selector, pick an **Anthropic** model that supports extended thinking (e.g. Claude Sonnet 4, Claude Sonnet 4.5, Claude Opus 4).
3. **Send a message** that invites reasoning, e.g.:
   - *"What is the greatest common divisor of 1071 and 462? Show your reasoning."*
   - *"Are there infinitely many primes of the form 4k+3? Explain step by step."*
4. **Check the response:**
   - Above the assistant's answer you should see the **chain-of-thought** section (e.g. "N step(s)").
   - If the model returned thinking blocks, one or more **"Thinking"** rows appear (collapsed by default). Expand one to see the reasoning text.
   - Tool steps (if any) appear in the same list, in order.
5. **No reasoning:** With Ollama or when the model doesn't return thinking blocks, the trace shows only tool steps (if any); no "Thinking" block and no regression.

**Progress notes (5a–5b):**
- 5a: Stream complete event includes `model`; conversation `currentModel` and `messageModels` updated on complete; `getMessages` merges per-message model; `ChatMessage.model` and `StreamCompleteEvent.model` added.
- 5b: Custom model selector (Select + listModels) below chat input; conversation list shows current model + icon, timestamp right-aligned; selected conversation uses `selected-item` token; last active chat restored from localStorage; sidebar title edit syncs to chat header; list row: title full width, icons expand on hover only.
- 5c: MessageBubble shows model label (provider icon + label) for assistant messages when `message.model` is set; label resolved via modelList or shortened id.

## Phase 7: Remaining Provider Adapters
Add the rest of the cloud providers once Anthropic (Phase 2) is validated e2e. To be implemented when adding additional providers.

1. **Per provider:** Validate tool-support; update blocklist; implement adapter; test.
2. Implement OpenAI provider adapter
3. Implement Groq provider adapter
4. (Optional) Together AI or other providers
5. Error handling and connection validation for each

## Phase 8: Usage Tracking (Optional Enhancement)
**Moved to [Chat Context Window and Costs](../context-window-and-costs.md).** That backlog item covers token usage, processing time, optional cost per message (when user sets cost per token), dynamic context window for Ollama, and UI for tokens-for-next-request and context consumed.

## Success Criteria

- [x] Multiple providers configured (Ollama, Anthropic; OpenAI/Groq etc. in Phase 7)
- [x] Provider credentials stored securely
- [x] Model selector shows available models from all configured providers
- [x] User can select model before starting conversation
- [x] User can switch model mid-conversation
- [x] Conversation stores current model (`currentModel` field)
- [x] Each message stores which model generated it (`model` field)
- [x] Agent correctly uses specified model
- [x] Model metadata displayed (context window in selector; cost/usage in Chat Context Window and Costs)
- [x] Connection testing works for each provider
- [x] Ollama models work as before (backward compatibility)
- [x] Cloud providers work with API keys
- [x] Error handling for missing/invalid credentials
- [x] Model selector shows enabled models; search/filter can be enhanced later
- [x] When the model supplies it, reasoning/thinking is captured in the trace and displayed in the chain-of-thought section (collapsible, with tool steps and final answer).
- [ ] *(Ollama browse/install/remove: see [Ollama Model Management](../ollama-model-management.md).)*

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./chat-interface-mvp.md) - Model parameter and conversation storage

**Related:**
- [Chat Context Window and Costs](../context-window-and-costs.md) - Token usage, processing time, cost (when user sets it), context window, and related UI
- [Ollama Model Management](../ollama-model-management.md) - Browse library, install/remove Ollama models (additive; not required for this item)
- [Custom Agents](../custom-agents.md) - Agents can have default model preference
- [Chat Quick Launcher](../chat-quick-launcher.md) - Model selector in launcher
- [Configuration System](../configuration-system.md) - Settings storage for provider credentials

## Notes

### Integration with Chat MVP

The Chat Interface MVP includes prep work to make model selection integration non-breaking:

**Prep work (in Chat MVP):**
- Optional `model` parameter added to IPC handler and agent service (`llm:query(..., model?)`)
- Agent uses specified model if provided, defaults to current behavior if not
- Message storage includes `model` field (tracks which model generated each message)
- Conversation storage includes `currentModel` field (tracks default/last-used model)
- Chat UI passes `undefined` initially (uses default model)

**Multi-Provider Model Selection implementation (this backlog item):**
- Adds provider abstraction and configuration
- Implements model selector component
- Chat UI passes selected model to IPC
- Agent routes to appropriate provider based on model
- **Zero refactoring**: Only add model selector to UI and wire to existing parameter

### Provider Architecture

Use LangChain's existing provider abstractions:
- `ChatOllama` for Ollama (already implemented)
- `ChatOpenAI` for OpenAI
- `ChatAnthropic` for Anthropic
- `ChatGroq` for Groq
- etc.

Each provider adapter:
1. Accepts model name and configuration
2. Implements streaming interface
3. Returns consistent message format
4. Handles provider-specific errors

### Security Considerations

**API Key Storage:**
- Use Electron's `safeStorage` API for encrypting API keys
- Keys encrypted at rest in settings file
- Keys decrypted only when needed for requests
- Never log or display full API keys

**Privacy:**
- Ollama: Fully local, no data leaves machine
- Cloud providers: User should understand data is sent to third party
- Display privacy information per provider in UI
- User can choose local-only if privacy is critical

### Cost Management

**Transparency:**
- Show estimated cost per model
- Track actual token usage and costs
- Allow users to set budget limits (optional)
- Warn before expensive operations

**Defaults:**
- Default to Ollama (free, local) if available
- Require explicit selection of paid models
- Save model choice per conversation (avoid accidental expensive usage)

(Detailed cost and usage tracking: see [Chat Context Window and Costs](../context-window-and-costs.md).)

### Agent Integration

When Custom Agents is implemented, agents can specify default model:
- **General Chat** agent: Uses smaller, faster model (e.g., GPT-3.5, llama3.2:3b)
- **Code Assistant** agent: Uses more capable model (e.g., GPT-4, Claude Sonnet)
- **Research Assistant** agent: Uses model with large context window

This allows "load agent, get right model" workflow without manual model selection each time.

### Ollama browse/install/remove

Handled by a separate backlog item: [Ollama Model Management](../ollama-model-management.md). Not required for this item's goal (choose and use models from multiple providers).

### Model metadata and UI

**Available metadata** (from `ModelMetadata` in `shared/types/llm.ts`):

| Field | Description | Typical UI use |
|-------|-------------|----------------|
| `id` | Prefixed model id (e.g. `ollama:llama3.2:3b`) | Value for selection; not shown as primary label |
| `label` | Human-readable name | Primary label in selector and conversation list |
| `contextWindow` | Context size in tokens | Tooltip or subtitle, e.g. "128K context" |
| `costPerTokenInput` / `costPerTokenOutput` | USD per token | Tooltip or subtitle for cost-aware users; optional cost estimate |
| `capabilities` | `{ tools?, vision? }` | Badges or icons (e.g. tools, vision) or filter hints |
| `privacyNote` | Short note (e.g. "Local only") | Subtitle or tooltip in selector |

**Recommendations:**

- **Model selector:** Show `label` (or `id` if no label) as primary text; optionally show context window and/or cost on the same row or in a tooltip; use `privacyNote` for subtle indicator where space allows.
- **Conversation list (below chat name):** Show human-readable model name for `currentModel` (resolve `id` → `label` via model list or a small lookup). If no label, show shortened id (e.g. "claude-3-5-sonnet").
- **Per-message "model" badge:** Use `label` when displaying which model generated a message; fallback to id.

Exact placement (inline vs tooltip) for context/cost/capabilities can be decided during implementation to avoid clutter.

### Chain of thought and reasoning

**Chain of thought** (execution trace) is **separate** from model metadata. The chat view already shows tool calls and results in the AI Elements `ChainOfThought` + `ToolInvocation` components. **This backlog item brings reasoning/thinking into scope:**

- **Trace today:** Tool calls, tool results, and (at the end) the final assistant message. No dedicated "reasoning" or "thinking" entry type yet.
- **In scope for Phase 5:** When a provider supplies extended reasoning or thinking (validate with Anthropic extended/deep reasoning), capture it in the trace and **display it in the chain-of-thought section** so users see the model's reasoning in the UI while the agent is working. Backend: new trace type + provider-specific capture. Frontend: render reasoning in the same trace area (e.g. collapsible "Thinking" / "Reasoning" block). **Reasoning is ephemeral:** display during the stream only; do not persist to conversation history (tool trace persistence remains in [Execution Trace Persistence](../execution-trace-persistence.md)).
- **Model metadata** (context window, cost, etc.) remains static registry data. **Trace/chain of thought** is runtime: what the model did and (when available) what it "thought" before answering.

### Extensibility

The provider abstraction should make adding new providers straightforward:
1. Implement provider adapter (often just wrapping LangChain provider)
2. Add provider metadata (name, auth requirements, etc.)
3. Register in provider registry
4. Provider automatically appears in model selector

This supports future providers (Mistral, Cohere, local llama.cpp, etc.) without architectural changes.
