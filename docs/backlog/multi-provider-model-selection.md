[Docs](../README.md) / [Backlog](./README.md) / Multi-Provider Model Selection

# Multi-Provider Model Selection

## Goal

Enable users to choose from multiple LLM providers (Ollama local models, OpenAI, Anthropic, Groq, Together, etc.) and select specific models per conversation. Provides flexibility to use the best model for each task, balancing cost, speed, capability, and privacy.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Should be complete. Includes `model` parameter in IPC/agent and conversation storage.

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

### Ollama Model Management
- Browse available models from Ollama library
- Search and filter available models
- Install new models directly from app
- View installation progress and status
- List installed models with details (size, last used, etc.)
- Remove/delete installed models
- Update existing models to latest versions

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
- Used in chat input and Quick Launcher

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

## Implementation Approach

### Phase 1: Provider Abstraction & Configuration
1. Define provider interface/adapter pattern
2. Create provider registry service
3. Implement Ollama provider adapter (already mostly exists)
4. Add provider configuration storage (settings system)
5. Secure storage for API keys

### Phase 2: Additional Provider Adapters
1. Implement OpenAI provider adapter
2. Implement Anthropic provider adapter
3. Implement Groq provider adapter
4. Test each provider with authentication
5. Error handling and connection validation

### Phase 3: Model Discovery & Metadata
1. Model discovery for each provider
2. Create model registry/cache
3. Define model metadata structure
4. Populate metadata for common models
5. Refresh model list periodically
6. Query Ollama library for available models (not just installed)

### Phase 3.5: Ollama Model Management
1. Create Ollama model browser UI
2. Display available models from Ollama library
3. Search and filter functionality
4. Install model action with progress tracking
5. List installed models with metadata (size, last used)
6. Remove/delete installed models
7. Check for and install model updates

### Phase 4: Provider Configuration UI
1. Create provider settings panel
2. Add/edit provider credentials UI
3. API key input with secure storage
4. Test connection functionality
5. Display configured providers and status

### Phase 5: Model Selector Component
1. Create model selector dropdown component
2. Group models by provider
3. Display model metadata (context window, cost)
4. Search/filter functionality
5. Handle disabled state (provider not configured)
6. Integrate into chat input

### Phase 6: Per-Conversation Model
1. Update conversation metadata to store `currentModel` (default/last-used)
2. Update message storage to include `model` field (which model generated it)
3. Pass selected model to agent query
4. Agent uses specified model (or default)
5. Display model used per message in UI
6. Switch models mid-conversation (updates `currentModel`, new messages use new model)
7. Default model preference in settings

### Phase 7: Usage Tracking (Optional Enhancement)
1. Track token usage per request
2. Store usage history
3. Calculate costs for cloud providers
4. Usage analytics UI
5. Budget alerts and warnings

## Success Criteria

- [ ] Multiple providers configured (Ollama, OpenAI, Anthropic, etc.)
- [ ] Provider credentials stored securely
- [ ] Model selector shows available models from all configured providers
- [ ] User can select model before starting conversation
- [ ] User can switch model mid-conversation
- [ ] Conversation stores current model (`currentModel` field)
- [ ] Each message stores which model generated it (`model` field)
- [ ] Agent correctly uses specified model
- [ ] Model metadata displayed (context window, cost, etc.)
- [ ] Connection testing works for each provider
- [ ] Ollama models work as before (backward compatibility)
- [ ] Cloud providers work with API keys
- [ ] Error handling for missing/invalid credentials
- [ ] Model selector search/filter works
- [ ] User can browse available Ollama models from library
- [ ] User can install new Ollama models from app
- [ ] Installation progress displayed
- [ ] User can view installed Ollama models with details
- [ ] User can remove installed Ollama models

## Related Backlog Items

**Depends on:**
- [Chat Interface (MVP)](./chat-interface-mvp.md) - Model parameter and conversation storage

**Related:**
- [Custom Agents](./custom-agents.md) - Agents can have default model preference
- [Chat Quick Launcher](./chat-quick-launcher.md) - Model selector in launcher
- [Configuration System](./configuration-system.md) - Settings storage for provider credentials

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

### Agent Integration

When Custom Agents is implemented, agents can specify default model:
- **General Chat** agent: Uses smaller, faster model (e.g., GPT-3.5, llama3.2:3b)
- **Code Assistant** agent: Uses more capable model (e.g., GPT-4, Claude Sonnet)
- **Research Assistant** agent: Uses model with large context window

This allows "load agent, get right model" workflow without manual model selection each time.

### Ollama Model Management

**Why Include Model Installation:**
- Users shouldn't need to leave the app to install Ollama models
- Seamless workflow: discover model → install → use in conversation
- Manage local models directly (view size, usage, remove unused)
- Check for updates and upgrade models

**Implementation:**
- Use Ollama API: `ollama list` (installed), `ollama pull <model>` (install), `ollama rm <model>` (remove)
- Progress tracking during installation (model download can be large)
- Disk space awareness (show model sizes, warn if low disk space)
- UI integrated with model selector (e.g., "Install" button for unavailable models)

### Extensibility

The provider abstraction should make adding new providers straightforward:
1. Implement provider adapter (often just wrapping LangChain provider)
2. Add provider metadata (name, auth requirements, etc.)
3. Register in provider registry
4. Provider automatically appears in model selector

This supports future providers (Mistral, Cohere, local llama.cpp, etc.) without architectural changes.
