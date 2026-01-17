# Setup

## Prerequisites

### Required Software
- **Node.js**: v18+ (comes with npm)
- **Git**: For version control
- **Code Editor**: Cursor IDE (recommended) or VS Code
- **Java Runtime**: JRE 11+ (for embedded Neo4j)

### Optional Tools
- **Neo4j Desktop**: For inspecting database during development (can connect to embedded instance)
- **Obsidian**: For viewing/editing vault files outside the app

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd cortex-app
npm install
```

### 2. Configure Vault Path

Create `.env` file:
```bash
VAULT_PATH=/path/to/your/obsidian/vault
```

On first launch, the app will also prompt for vault location if not set.

### 3. Verify Setup

```bash
npm run dev
```

Should open Electron window with app running. Check that:
- Neo4j embedded starts successfully (check logs)
- Ollama subprocess spawns
- UI renders with no console errors

## Project Structure

```
cortex-app/
├── src/
│   ├── main/                 # Main process (Node.js)
│   │   ├── index.ts          # Application entry point
│   │   ├── neo4j/            # Embedded Neo4j management
│   │   ├── ollama/           # Embedded Ollama management
│   │   ├── vault/            # Filesystem operations
│   │   ├── ipc/              # IPC handlers
│   │   └── state/            # Application state management
│   │
│   ├── renderer/             # Renderer process (UI)
│   │   ├── index.html        # HTML entry point
│   │   ├── index.tsx         # App initialization
│   │   ├── components/       # UI components (JSX)
│   │   ├── lib/              # Utilities and helpers
│   │   └── styles/           # Tailwind CSS
│   │
│   ├── shared/               # Shared types and constants
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── constants.ts      # App-wide constants
│   │
│   └── preload/              # Preload script (IPC bridge)
│       └── index.ts          # Exposes IPC to renderer
│
├── logs/                     # Application logs
├── data/                     # Development data (gitignored)
├── docs/                     # Architecture and guides
├── devlogs/                  # Development progress logs
└── automation-candidates/    # Ideas for future automation
```
