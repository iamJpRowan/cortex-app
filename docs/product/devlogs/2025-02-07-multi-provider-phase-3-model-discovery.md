[Docs](../README.md) / [Devlogs](./README.md) / Multi-Provider Phase 3 — Model Discovery & Metadata

---
date: 2025-02-07
developer: jprowan
agent: Cursor (Auto)
model: —
tags: [multi-provider, model-selection, phase-3]
related_files:
  - docs/product/backlog/archive/multi-provider-model-selection.md
  - src/main/services/llm/providers/model-metadata.ts
  - src/main/services/llm/providers/model-list-service.ts
  - src/shared/types/llm.ts
related_issues: []
related_devlogs: []
session_duration: single session
iterations: decisions confirmed then implementation
outcome: Phase 3 complete
---

# Context

Phase 1 (provider abstraction) and Phase 2 (Anthropic adapter) of Multi-Provider Model Selection were done. Phase 3 adds model discovery with full metadata and an IPC API for the future Model Selector (Phase 5).

# Problem

- No aggregated “list of all models” with metadata for the UI.
- No shared type for model metadata (context window, cost, capabilities, privacy).
- Cache and refresh strategy for the list needed to align with existing LLM cache invalidation.

# Solution

- **Full metadata spec:** `ModelMetadata` in `shared/types/llm.ts` with id, label, contextWindow, costPerTokenInput, costPerTokenOutput, capabilities (tools, vision), privacyNote. `ListModelsResult` with `byProvider` and `all`.
- **Static metadata:** `providers/model-metadata.ts` — per-provider map for common Ollama and Anthropic models; tag suffix matching so e.g. `llama3.2:3b-q4_0` gets metadata for `llama3.2:3b`.
- **Model list service:** `providers/model-list-service.ts` — `getModelsWithMetadata()` calls `providerRegistry.listModels()` per provider, merges with static metadata, caches result. Subscribes to settings on first use; clears cache when `llm.providers` or `llm.defaultModel` changes (no TTL).
- **Registry:** Added `getProviderIds()` to iterate adapters.
- **IPC:** `llm:listModels` returns `ListModelsResult`; preload and renderer API types updated.
- **Ollama:** Phase 3 uses installed-only discovery; “Ollama library” (browse/install) left for Phase 3.5.

# Outcome

- Phase 3 is complete. Renderer can call `api.llm.listModels()` to get all tool-capable models with full metadata, grouped by provider. Cache invalidates on provider/default-model settings change. Phase 5 (Model Selector) can consume this API without further backend work.

# Notes

- Decision 13 (Ollama library) in the backlog still shows the old “Decision” paragraph in the file due to a character encoding quirk; the “Decided” summary was added for 11, 12, 14.
