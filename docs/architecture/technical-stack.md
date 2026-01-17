# Technical Stack

## Main Process (Backend)
- **Runtime**: Node.js (bundled with Electron)
- **Language**: TypeScript
- **Database**: Neo4j Embedded (runs as library)
- **AI Runtime**: Ollama (user-installed, app connects to local instance)
- **Filesystem**: Direct access to Obsidian vault and application data

## Renderer Process (Frontend)
- **Runtime**: Chromium (bundled with Electron)
- **Language**: TypeScript with JSX
- **UI**: Vanilla JSX (no React) + Tailwind CSS
- **Components**: Custom createElement function for JSX transformation
- **State**: Driven by main process via IPC, minimal local UI state

## Communication Layer
- **IPC (Inter-Process Communication)**: Electron's built-in IPC for main ↔ renderer
- **Pattern**: Renderer invokes main process functions, main process sends state updates
- **Security**: Renderer is sandboxed, only accesses approved IPC channels

## Data Layer
- **Source Files**: Markdown (YAML frontmatter) + JSON/CSV for metrics
- **Graph Index**: Neo4j embedded database
- **Transformation**: Custom TypeScript logic for ELT pipeline
- **Sync**: Bidirectional with external platforms (Strava, GitHub, etc.)
