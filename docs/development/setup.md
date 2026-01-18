# Setup

## Prerequisites

### Required Software
- **Node.js**: v18+ (comes with npm)
- **Git**: For version control
- **Code Editor**: Cursor IDE (recommended) or VS Code
- **Java Runtime**: JRE 17 or 21 (for embedded Neo4j)

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

### 2. Set up Neo4j

Run the setup script to download Neo4j Community Server:

```bash
npm run setup
```

This will download and extract Neo4j Community Server 5.22.0 to `resources/neo4j/`. This may take a few minutes.

### 3. Install Java Runtime

Neo4j requires Java Runtime Environment (JRE) 17 or 21:

**macOS:**
```bash
brew install --cask temurin@17
```

**Linux:**
```bash
sudo apt install openjdk-17-jre
```

**Windows:**
Download from [Adoptium](https://adoptium.net/)

**Verify installation:**
```bash
java -version
```

### 4. Manual Neo4j Setup (if needed)

If the automatic setup didn't work, you can run it manually:

```bash
npm run setup
```

This will:
- Check for Java installation
- Download Neo4j Community Server 5.22.0
- Extract it to `resources/neo4j/`
- Verify the installation

**Note:** The `resources/neo4j/` directory is gitignored (too large for version control).

### 5. Configure Vault Path (Optional - for Step 5)

Create `.env` file:
```bash
VAULT_PATH=/path/to/your/obsidian/vault
```

On first launch, the app will also prompt for vault location if not set.

### 6. Verify Setup

```bash
npm run dev
```

Should open Electron window with app running. Check that:
- Neo4j embedded starts successfully (check console logs)
- No Java or Neo4j path errors
- UI renders with no console errors

**Troubleshooting:**

- **"Java Runtime Environment is required"**: Install Java (see step 2)
- **"Neo4j binary not found"**: Run `npm run setup` to download Neo4j
- **Port conflict**: Make sure port 7687 is not in use by another Neo4j instance

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
├── scripts/                  # Setup and build scripts
│   └── setup-neo4j.js       # Automated Neo4j download script
├── resources/                # Bundled resources (gitignored)
│   └── neo4j/               # Neo4j Community Server
├── logs/                     # Application logs
├── data/                     # Development data (gitignored)
├── docs/                     # Architecture and guides
├── devlogs/                  # Development progress logs
└── automation-candidates/    # Ideas for future automation
```
