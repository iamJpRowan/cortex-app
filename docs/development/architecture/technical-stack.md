[Docs](../../README.md) / [Development](../README.md) / [Architecture](./README.md) / Technical Stack

# Technical Stack

## Main Process (Backend)
- **Runtime**: Node.js (bundled with Electron)
- **Language**: TypeScript
- **Database**: Neo4j (runs as managed subprocess, bundled with app)
- **Conversation State**: SQLite (for LLM conversation history and audit logs)
- **AI Runtime**: Ollama (auto-detects existing install or guides installation)
- **Filesystem**: Direct access to user-configured data locations

## Renderer Process (Frontend)
- **Runtime**: Chromium (bundled with Electron)
- **Language**: TypeScript with JSX
- **UI**: React + shadcn/ui + Tailwind CSS
- **Components**: React function components; shadcn/ui for primitives
- **State**: Driven by main process via IPC; React state for local UI

## Communication Layer
- **IPC (Inter-Process Communication)**: Electron's built-in IPC for main ↔ renderer
- **Pattern**: Renderer invokes main process functions, main process sends state updates
- **Security**: Renderer is sandboxed, only accesses approved IPC channels

## Data Layer
- **Source Files**: Markdown (YAML frontmatter) + JSON/CSV for metrics
- **Knowledge Graph**: Neo4j (subprocess)
- **Conversation State**: SQLite (for LLM interactions and audit trail)
- **Transformation**: Custom TypeScript logic for ELT pipeline
- **Sync**: Bidirectional with external platforms (Strava, GitHub, etc.)
