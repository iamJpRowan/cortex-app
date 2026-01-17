# Architecture

## Overview

Cortex is a **native desktop application** built on Electron that provides a truly self-contained, local-first experience. The application manages Neo4j as a subprocess for graph database capabilities and connects to locally installed Ollama for AI processing, requiring no Docker containers or cloud services.

The architecture follows **local-first data sovereignty** principles with an **ELT (Extract-Load-Transform)** approach where the embedded graph database serves as a disposable, intelligent index over your source data stored in open formats.

---

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

---

## Core Architectural Principles

### 1. Local-First Data Sovereignty

**What it is:**
All personal data is stored locally in open, portable formats on your filesystem. The embedded Neo4j database serves as a queryable index, not the authoritative source. Your actual data lives in Markdown files, JSON documents, and other universal formats in your Obsidian vault.

**Why it matters:**
- Complete ownership: your data never depends on a third-party service
- Work offline always (no internet required after installation)
- No vendor lock-in or proprietary formats
- Privacy by default: data never leaves your machine
- Version control and backup on your own terms

**Example:**
A journal entry about a significant life event is stored as a Markdown file in your Obsidian vault. The embedded Neo4j indexes it for connections and queries, but if you delete the graph entirely, you still have the complete journal entry with all its content and metadata.

---

### 2. Embedded Services Architecture

**What it is:**
Rather than requiring external services (Docker, cloud APIs, separate database servers), Cortex bundles everything needed to run:

- **Neo4j Server**: Graph database runs as managed subprocess, bundled with app
- **Ollama Connection**: Connects to locally installed Ollama (detects existing installation)
- **Application Data**: All databases and caches stored in user data directory; models in standard Ollama location

**Why it matters:**
- Minimal configuration: install Ollama once, works forever
- No Docker or cloud services to manage
- Single application to start/stop
- Clean process separation (services can restart independently)
- Standard tooling (Neo4j Browser, ollama CLI) works for debugging
- Models shared across all apps using Ollama
- Complete control over data location

**Example:**
User installs Ollama (`brew install ollama`) and downloads a model (`ollama pull llama3.2`). Then downloads Cortex. On launch, Cortex detects existing Ollama installation, starts Neo4j server subprocess, and connects to everything automatically. No configuration needed.

---

### 3. ELT Architecture with Graph-Layer Transformation

**What it is:**
Data flows through Extract → Load → Transform stages. Source data is extracted and loaded in its native format first, preserving complete fidelity. Transformation happens only when loading into the embedded graph. The graph is completely disposable and can be rebuilt from source data at any time.

**Why it matters:**
- Iterate on graph structure without touching source files
- Schema evolution happens at the graph layer, not through data migration
- Experiment with different graph models without risk
- Source data remains pristine and untouched by processing logic
- Failed transformations can be fixed and re-run without data loss

**Example:**
Strava activity data is synced from the API and saved as JSON files in your vault data directory. The transformation logic reads these files and creates graph nodes/relationships in embedded Neo4j. If you realize a better way to model "route" relationships, you update the transformation code and rebuild the graph—no need to re-fetch from Strava or modify the stored JSON files.

---

### 4. Flexible Storage with Unified Graph

**What it is:**
Not all data belongs in Markdown files. The system uses different storage formats based on content characteristics:
- **Markdown with YAML frontmatter**: Text-heavy content you'd want to reference in notes
- **JSON/Parquet/CSV**: High-volume, data-only content (metrics, logs, continuous streams)

**The Integration Heuristic**: "Would I want to reference this in my Notes?"
- **Yes** → Create Markdown file (meaningful events, insights, reflections)
- **No** → Store as structured data (raw metrics, automated logs)

**Multi-source entity resolution**: A single graph node can reference data from multiple sources.

**Why it matters:**
- Right storage format for the right type of data
- Keeps vault navigable and meaningful
- Prevents clutter from high-volume automated data
- Enables rich cross-referencing in the graph
- Single unified view even when data comes from multiple sources

**Example:**
- **Markdown**: A note about a memorable long run, including your thoughts and photos
- **JSON**: 500 Strava activities with GPS coordinates and heart rate data
- **Graph**: Both represented as "Activity" nodes, linked to routes, people, and places
- **Multi-source**: A run tracked in both Strava and Garmin appears as one activity node in the graph, with the node referencing both data sources

---

### 5. Source-Appropriate Data Flow

**What it is:**
Different types of data have different authoritative sources and require different write paths:

- **Local-origin data** (Obsidian files, local code repos):
  - Direct local writes → Graph index
  
- **External SaaS data** (Strava, GitHub, health apps):
  - API write → Source platform → Sync to local → Graph index
  - Local copies are read-only caches

**Why it matters:**
- Respects where data truly "lives"
- Prevents sync conflicts and data loss
- Maintains clear understanding of data ownership
- Enables proper bidirectional sync when needed

**Example:**
- Adding a tag to a journal entry: Main process writes directly to the Markdown file, then updates graph
- Updating a Strava activity title: Send API request to Strava, wait for sync, then graph reflects the change
- Creating a new project note: Write Markdown file locally via main process, index to graph immediately

---

### 6. Adaptive Intelligence

**What it is:**
The system connects to locally installed Ollama for AI processing, with optional cloud API integration for complex queries. Intelligence capabilities evolve from simple queries to sophisticated agents:

- **Initial**: Direct database queries via LLM-generated Cypher
- **Intermediate**: Specialized prompts for specific tasks
- **Advanced**: Autonomous agents that improve the system itself

Ollama must be installed locally and have at least one model downloaded. The app detects available models and uses the best one for each task.

Model selection is dynamic:
- Default: Use local Ollama models (privacy, speed, offline)
- Optional: Use Claude API for complex analysis (requires API key)
- Future: Automatic selection based on task complexity

**Why it matters:**
- Privacy-first: AI processing happens locally by default
- Works offline with bundled model
- Flexibility for users who want cloud capabilities
- System learns and improves through usage patterns
- Balance between capability and privacy

**Example:**
- Analyzing daily journal entries: Uses local Ollama model
- Complex research synthesis: User enables Claude API for that session
- Pattern recognition across years of data: Runs locally overnight with Ollama

---

### 7. Progressive Enhancement

**What it is:**
Build foundational capabilities first, then add complexity incrementally. Each phase delivers immediate value. The system learns and improves both its data model and tooling continuously through AI assistance and user feedback.

**Why it matters:**
- Get value quickly rather than building everything upfront
- Learn what actually matters through real usage
- Avoid over-engineering features that won't be used
- System architecture can evolve based on patterns that emerge

**Example:**
- Phase 1: Chat interface + simple queries
- Phase 2: Bespoke visualizations for specific use cases
- Phase 3: External data integrations
- Phase 4: Autonomous agents that run on schedule
- Each phase works independently and adds value

---

## Technical Stack

### Main Process (Backend)
- **Runtime**: Node.js (bundled with Electron)
- **Language**: TypeScript
- **Database**: Neo4j Embedded (runs as library)
- **AI Runtime**: Ollama (user-installed, app connects to local instance)
- **Filesystem**: Direct access to Obsidian vault and application data

### Renderer Process (Frontend)
- **Runtime**: Chromium (bundled with Electron)
- **Language**: TypeScript with JSX
- **UI**: Vanilla JSX (no React) + Tailwind CSS
- **Components**: Custom createElement function for JSX transformation
- **State**: Driven by main process via IPC, minimal local UI state

### Communication Layer
- **IPC (Inter-Process Communication)**: Electron's built-in IPC for main ↔ renderer
- **Pattern**: Renderer invokes main process functions, main process sends state updates
- **Security**: Renderer is sandboxed, only accesses approved IPC channels

### Data Layer
- **Source Files**: Markdown (YAML frontmatter) + JSON/CSV for metrics
- **Graph Index**: Neo4j embedded database
- **Transformation**: Custom TypeScript logic for ELT pipeline
- **Sync**: Bidirectional with external platforms (Strava, GitHub, etc.)

---

## Process Architecture

### Main Process Responsibilities

**Service Management:**
- Start/stop Neo4j subprocess on application launch/quit
- Connect to locally installed Ollama
- Restart services on crashes with error reporting

**Data Operations:**
- Read/write Obsidian vault files
- Execute Neo4j Cypher queries
- Transform data for graph loading (ELT)
- Manage external API integrations

**State Management:**
- Single source of truth for application state
- Notify renderer of state changes via IPC events
- Handle user actions from renderer

**AI Orchestration:**
- Connect to local Ollama or cloud APIs
- Manage model selection logic
- Handle LLM → Cypher query generation
- Execute autonomous agent tasks

### Renderer Process Responsibilities

**UI Rendering:**
- Display data received from main process
- Handle user interactions (clicks, inputs, navigation)
- Render visualizations (graphs, timelines, maps)

**User Input:**
- Capture chat messages, commands, settings changes
- Send requests to main process via IPC
- Display loading states while main process works

**Local UI State:**
- Manage transient UI state (modals, dropdowns, scroll position)
- Animation and transition states
- Form input state before submission

---

## Development Philosophy

### Builder-Guide Paradigm

Beyond operational architecture, Cortex embodies a vision for AI-augmented development:

**Progressive AI Responsibility:**
- Initial: Human writes code with AI assistance (Cursor, Copilot)
- Mid-term: AI agents suggest improvements and generate features
- Long-term: AI agents autonomously implement based on conversational guidance
- Ultimate: System improves its own data model and tooling continuously

**Unified Development Interface:**
- Same chat interface for using AND building the system
- Request new capabilities through natural language
- AI understands vault data and system architecture to make intelligent decisions
- Features materialize within development conversation

**Focus on "What" Not "How":**
- Guide AI developers rather than writing every line of code
- Emphasize architectural decisions and tradeoffs
- Let AI handle implementation details
- System learns from each interaction to anticipate needs

---

## Deployment Model

### Distribution
- **Package Format**: .app (macOS), .exe installer (Windows), .AppImage (Linux)
- **Initial Download**: ~500MB-1GB (includes Neo4j server, app code)
- **Installation**: Drag-and-drop or installer, minimal configuration
- **Prerequisites**: Ollama must be installed separately (`brew install ollama`)
- **Updates**: Download only changed components, not entire package

### User Data Location
- **macOS**: `~/Library/Application Support/Cortex/`
- **Windows**: `%APPDATA%\Cortex\`
- **Linux**: `~/.config/Cortex/`

Contains:
- Neo4j database files
- Application settings and logs
- Cached external data

**Ollama Location (System-wide):**
- **macOS**: `~/.ollama/models`
- **Windows**: `%USERPROFILE%\.ollama\models`
- **Linux**: `~/.ollama/models`

Models shared across all applications using Ollama.

### Vault Location
- User selects Obsidian vault location on first launch
- Application monitors vault for changes
- Rebuilds graph index on structural changes

---

## Security Model

### Sandboxed Renderer
The renderer process (UI) runs in a security sandbox:
- Cannot access filesystem directly
- Cannot execute system commands
- Cannot make arbitrary network requests
- Can only communicate via whitelisted IPC channels

### Controlled IPC Surface
Main process exposes specific, validated functions to renderer:
```typescript
// Only these approved functions are callable from UI
ipcMain.handle('query-graph', async (_, cypher) => { ... })
ipcMain.handle('read-file', async (_, filePath) => { ... })
ipcMain.handle('write-file', async (_, filePath, content) => { ... })
ipcMain.handle('ollama-query', async (_, prompt) => { ... })
```

### Data Isolation
- Neo4j database only accessible from main process
- Ollama only accessible through main process
- Vault files validated before read/write operations
- No direct exposure of sensitive data to renderer

---

*This architecture is designed to evolve. As capabilities are proven through use, the system will adapt its structure to better serve the vision of transparent, local-first personal knowledge management.*
