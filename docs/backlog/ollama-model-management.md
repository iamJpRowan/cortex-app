[Docs](../README.md) / [Backlog](./README.md) / Ollama Model Management

# Ollama Model Management

**Status:** Considering.

## Goal

Let users browse the Ollama library (models available to install), install and remove Ollama models from the app, and view installed models with details—without leaving the app. Fully additive to multi-provider model selection; not required to reach the core goal of choosing and using models from multiple providers.

## Prerequisites

- **[Multi-Provider Model Selection](./archive/multi-provider-model-selection.md)** — Model selector and provider abstraction must be in place so installed models appear in the list and can be selected. Ollama adapter already lists installed models; this item adds library browse and install/remove.

## Key Capabilities

- Browse available models from the Ollama library (catalog of models that can be pulled)
- Search and filter available models
- Install new models directly from the app with progress tracking
- List installed models with metadata (size, last used, etc.)
- Remove/delete installed models
- Check for and install model updates
- Disk space awareness (show model sizes, warn if low disk space)
- UI integrated with model selector where appropriate (e.g. "Install" for unavailable models)

## Implementation Approach

- **Ollama API:** `GET /api/tags` (installed), `POST /api/pull` (install with progress), `DELETE /api/delete` (remove). Library/catalog may require external source (e.g. ollama.com or registry API) since Ollama’s API only lists installed models.
- **Progress:** Track download progress during install (model downloads can be large).
- **Scope:** Ollama-only; cloud providers do not have an in-app "install model" flow.

## Success Criteria

- [ ] User can browse available Ollama models from the library (catalog)
- [ ] User can install new Ollama models from the app
- [ ] Installation progress is displayed
- [ ] User can view installed Ollama models with details (size, etc.)
- [ ] User can remove installed Ollama models
- [ ] Model selector (or equivalent) can show installable models and trigger install where appropriate

## Related Backlog Items

**Depends on:**
- [Multi-Provider Model Selection](./archive/multi-provider-model-selection.md) — Model list, selector, and provider abstraction.

**Related:**
- [Configuration System](./configuration-system.md) — Settings for Ollama base URL if needed.

## Notes

- This item was originally Phase 3.5 of Multi-Provider Model Selection. It was split out because it is additive and not required to achieve the main goal (choose and use models from multiple providers). The multi-provider item delivers value with *installed* Ollama models and cloud providers; this item adds discover-and-install for Ollama only.
