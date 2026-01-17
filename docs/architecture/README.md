# Architecture

This directory contains documentation about Cortex's architecture, design principles, and technical decisions.

## Overview

Cortex is a **native desktop application** built on Electron that provides a truly self-contained, local-first experience. The application manages Neo4j as a subprocess for graph database capabilities and connects to locally installed Ollama for AI processing, requiring no Docker containers or cloud services.

The architecture follows **local-first data sovereignty** principles with an **ELT (Extract-Load-Transform)** approach where the embedded graph database serves as a disposable, intelligent index over your source data stored in open formats.

## Application Structure

### Native Desktop Architecture

```
Cortex Desktop App
├── Main Process (Node.js/TypeScript)
│   ├── Neo4j Server (subprocess)
│   ├── Ollama Server (subprocess)
│   ├── Filesystem Access (Obsidian Vault)
│   ├── Application State Management
│   └── IPC Handlers (API for renderer)
│
└── Renderer Process (Chromium/TypeScript)
    ├── UI Layer (Vanilla JSX + Tailwind)
    ├── Component System (No React)
    └── IPC Client (calls main process)
```

**Key Characteristics:**
- **Single packaged application**: Initial download ~500MB-1GB
- **Minimal external dependencies**: Requires Ollama installed locally (one-time setup)
- **Managed services**: Neo4j runs as subprocess, Ollama connects to local installation
- **Direct access**: Main process has native filesystem and database access
- **Secure by default**: Renderer process sandboxed, only accesses data via IPC

## Documentation

- **[principles.md](./principles.md)** - Core architectural principles and development philosophy
- **[technical-stack.md](./technical-stack.md)** - Technology choices and stack details
- **[process-architecture.md](./process-architecture.md)** - Main and renderer process responsibilities
- **[data-flow.md](./data-flow.md)** - ELT architecture, storage formats, and data flow patterns
- **[security.md](./security.md)** - Security model and sandboxing
- **[deployment.md](./deployment.md)** - Distribution and deployment model

---

*This architecture is designed to evolve. As capabilities are proven through use, the system will adapt its structure to better serve the vision of transparent, local-first personal knowledge management.*
