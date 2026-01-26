[Docs](../README.md) / Development

# Development Guide

This guide covers the development workflow for building Cortex as a native Electron desktop application with embedded Neo4j and Ollama. The architecture prioritizes rapid iteration, clear separation of concerns, and a streamlined developer experience.

## Documentation

### Getting started

- **[setup.md](./setup.md)** — Prerequisites, initial setup, and project structure
- **[workflow.md](./workflow.md)** — Running the app, hot reload, and debugging

### Development patterns

- **[patterns.md](./patterns.md)** — Adding features, JSX, state, IPC, and services
- **[use-case-workflow.md](./use-case-workflow.md)** — Four-phase feature implementation workflow
- **[feature-development.md](./feature-development.md)** — Feature workflow summary
- **[component-lifecycle.md](./component-lifecycle.md)** — Component initialization and cleanup patterns

### Feature guides

How to add specific capabilities:

- **[commands-and-hotkeys.md](./commands-and-hotkeys.md)** — Register a command and hotkey
- **[settings.md](./settings.md)** — Create a new setting

### Quality and release

- **[testing.md](./testing.md)** — Testing strategies and pre-commit checks
- **[build.md](./build.md)** — Production builds and distribution
- **[code-style.md](./code-style.md)** — Naming conventions and style guide
- **[guardrails.md](./guardrails.md)** — Technical constraints, decision shortcuts, and red flags

## Design Documentation

Design system documentation has been moved to the [Design](../design/README.md) directory:
- Design tokens, UI guide, accessibility, and terminology

---

*This development guide evolves with the project. As patterns emerge and tools improve, update this document to reflect best practices.*
