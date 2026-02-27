[Docs](../README.md) / Development

# Development Guide

This guide covers the development workflow for building Cortex as a native Electron desktop application with embedded Neo4j and Ollama. The architecture prioritizes rapid iteration, clear separation of concerns, and a streamlined developer experience.

## Documentation

### Getting started

- **[setup.md](./setup.md)** — Prerequisites, initial setup, and project structure
- **[workflow.md](./workflow.md)** — Running the app, hot reload, and debugging

### Development patterns

- **[feature-development.md](./feature-development.md)** — Adding features: sequence, example, IPC and UI checklists, React lifecycle and IPC cleanup
- **[electron-guidance.md](./electron-guidance.md)** — Process boundaries, IPC, state, embedded services, AI (main process)

### Architecture

- **[chat-streaming-and-blocks.md](./chat-streaming-and-blocks.md)** — How chat content flows from the LangGraph stream and checkpoint to the UI (blocks, segments, single block builder).

### Feature guides

How to add specific capabilities:

- **[adding-a-tool.md](./adding-a-tool.md)** — Add a tool (definition + handler, registration)
- **[ai-elements.md](./ai-elements.md)** — Install AI Elements components into the renderer
- **[commands-and-hotkeys.md](./commands-and-hotkeys.md)** — Register a command and hotkey
- **[settings.md](./settings.md)** — Create a new setting
- **[ui-state-persistence.md](./ui-state-persistence.md)** — Persist UI state across restarts
- **[user-docs.md](./user-docs.md)** — Create and build in-app user docs (Help)

### Quality and release

- **[testing.md](./testing.md)** — Testing strategies and pre-commit checks
- **[build.md](./build.md)** — Production builds and distribution
- **[code-style.md](./code-style.md)** — Naming conventions and style guide
- **[guardrails.md](./guardrails.md)** — Technical constraints, decision shortcuts, and red flags
- **[performance.md](./performance.md)** — Lazy loading, DB and IPC optimization

## Design Documentation

Design system documentation has been moved to the [Design](../design/README.md) directory:
- Design tokens, UI guide, accessibility, and terminology

---

*This development guide evolves with the project. As patterns emerge and tools improve, update this document to reflect best practices.*
