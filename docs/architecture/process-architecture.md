# Process Architecture

## Main Process Responsibilities

### Service Management
- Start/stop Neo4j subprocess on application launch/quit
- Connect to locally installed Ollama
- Restart services on crashes with error reporting

### Data Operations
- Read/write Obsidian vault files
- Execute Neo4j Cypher queries
- Transform data for graph loading (ELT)
- Manage external API integrations

### State Management
- Single source of truth for application state
- Notify renderer of state changes via IPC events
- Handle user actions from renderer

### AI Orchestration
- Connect to local Ollama or cloud APIs
- Manage model selection logic
- Handle LLM → Cypher query generation
- Execute autonomous agent tasks

## Renderer Process Responsibilities

### UI Rendering
- Display data received from main process
- Handle user interactions (clicks, inputs, navigation)
- Render visualizations (graphs, timelines, maps)

### User Input
- Capture chat messages, commands, settings changes
- Send requests to main process via IPC
- Display loading states while main process works

### Local UI State
- Manage transient UI state (modals, dropdowns, scroll position)
- Animation and transition states
- Form input state before submission
