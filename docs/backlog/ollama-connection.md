[Docs](../README.md) / [Backlog](./README.md) / Ollama Connection Integration

# Ollama Connection Integration

## Goal

Integrate local Ollama installation into the Cortex application lifecycle. The app should detect if Ollama is installed, connect to the running Ollama server, discover available models, and establish a default model for future LLM operations. This enables the application to use local LLM capabilities for query generation and processing.

## Constraints and Requirements

### Prerequisites
- Ollama must be installed locally (via `brew install ollama` on macOS)
- Ollama server must be running (typically via `ollama serve` or as a background service)
- At least one model must be available (preferably `llama3.2` or similar)
- Default connection endpoint: `http://localhost:11434`

### Functional Requirements
- Detect if Ollama binary is installed on the system
- Verify Ollama server is running and accessible
- List all available models from the local Ollama instance
- Select a default model (preferring `llama3.2` if available, otherwise first available)
- Execute test queries to verify connectivity and model functionality
- Provide clear error messages if Ollama is not installed, not running, or has no models

### Non-Functional Requirements
- Must integrate with existing app startup lifecycle (similar to Neo4j integration)
- Should fail gracefully if Ollama is unavailable (app can still run without it, but with limited functionality)
- Error messages should guide users on how to resolve issues (installation, starting server, pulling models)

## Approach

### Service Layer Pattern
Follow the established service layer pattern used for Neo4j:
- Create a service module in `src/main/services/ollama.ts`
- Maintain singleton client instance
- Export initialization function and accessor functions
- Handle connection state and error conditions

### Lifecycle Integration
- Initialize Ollama during app startup, after Neo4j initialization
- If initialization fails, log error but allow app to continue (Ollama is optional for Phase 0)
- No cleanup needed on shutdown (Ollama runs independently)

### IPC Communication
- Add test handlers in `src/main/ipc/test.ts` following existing pattern
- Expose handlers for: test query, list models
- Update preload script to expose API methods
- Update TypeScript API definitions for renderer

### Model Selection Strategy
- Query available models on initialization
- Prefer models containing "llama3.2" in name
- Fall back to first available model if preferred not found
- Store default model name for use in test queries

## Architectural Choices

### Client Library
- Use official `ollama` npm package for client communication
- Connect to localhost endpoint (no remote connections in Phase 0)
- Use non-streaming mode for test queries (simpler error handling)

### Error Handling
- Check installation via `which ollama` command execution
- Catch connection errors and provide user-friendly messages
- Distinguish between "not installed", "not running", and "no models" scenarios

### State Management
- Maintain singleton client instance (similar to Neo4j driver pattern)
- Store default model name in module scope
- No persistent state needed (re-initialize on each app start)

### Dependencies
- **Requires:** Step 2 (Neo4j integration) - establishes service pattern and IPC structure
- **Enables:** Step 4 (Test UI) - provides Ollama test functionality for UI
- **Future:** Phase 1 features that require LLM query generation

## Success Criteria

- Application detects Ollama installation status
- Successfully connects to running Ollama server
- Lists all available models
- Selects appropriate default model
- Executes test query and receives response
- Provides helpful error messages for common failure scenarios
- Integrates cleanly with existing app lifecycle

## Notes

- Ollama runs as a separate service, not managed by the app (unlike Neo4j which is a subprocess)
- This is a connection-only feature - no LLM query generation logic yet
- Model selection is simple preference-based; more sophisticated selection can be added later
- Test queries use simple prompts to verify connectivity, not real use cases
