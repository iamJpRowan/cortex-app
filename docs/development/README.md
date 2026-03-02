[Docs](../README.md) / Development

# Development Guide

Development docs include [architecture](./architecture/README.md), [design](./design/README.md), and [agents](./agents/README.md) workflows.

This guide covers the development workflow for building Cortex as a native Electron desktop application with embedded Neo4j and Ollama. The architecture prioritizes rapid iteration, clear separation of concerns, and a streamlined developer experience.

## Documentation

### Getting started

- **[setup.md](./getting-started/setup.md)** — Prerequisites, initial setup, and project structure
- **[workflow.md](./getting-started/workflow.md)** — Running the app, hot reload, and debugging

### Development patterns

- **[feature-development.md](./development-patterns/feature-development.md)** — Adding features: sequence, example, IPC and UI checklists, React lifecycle and IPC cleanup
- **[electron-guidance.md](./development-patterns/electron-guidance.md)** — Process boundaries, IPC, state, embedded services, AI (main process)

### Architecture

- **[chat-streaming-and-blocks.md](./architecture/chat-streaming-and-blocks.md)** — How chat content flows from the LangGraph stream and checkpoint to the UI (blocks, segments, single block builder).
- **[file-backed-config-watcher.md](./architecture/file-backed-config-watcher.md)** — Shared watcher for settings, modes, and other file-based config; how to add a new domain.

### Feature guides

How to add specific capabilities:

- **[adding-a-tool.md](./feature-guides/adding-a-tool.md)** — Add a tool (definition + handler, registration)
- **[ai-elements.md](./feature-guides/ai-elements.md)** — Install AI Elements components into the renderer
- **[commands-and-hotkeys.md](./feature-guides/commands-and-hotkeys.md)** — Register a command and hotkey
- **[settings.md](./feature-guides/settings.md)** — Create a new setting
- **[ui-state-persistence.md](./feature-guides/ui-state-persistence.md)** — Persist UI state across restarts
- **[user-docs.md](./feature-guides/user-docs.md)** — Create and build in-app user docs (Help)

### Quality and release

- **[testing.md](./quality-and-release/testing.md)** — Testing strategies and pre-commit checks
- **[build.md](./quality-and-release/build.md)** — Production builds and distribution
- **[code-style.md](./quality-and-release/code-style.md)** — Naming conventions and style guide
- **[guardrails.md](./quality-and-release/guardrails.md)** — Technical constraints, decision shortcuts, and red flags
- **[performance.md](./quality-and-release/performance.md)** — Lazy loading, DB and IPC optimization

## Design Documentation

Design system documentation is in the [Design](./design/README.md) directory:
- Design tokens, UI guide, accessibility, and terminology

---

*This development guide evolves with the project. As patterns emerge and tools improve, update this document to reflect best practices.*
