[Docs](../README.md) / [Architecture](./README.md) / Core Architectural Principles

# Core Architectural Principles

## 1. Local-First Data Sovereignty

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

## 2. Bundled Services Architecture

**What it is:**
Rather than requiring external services (Docker, cloud APIs, separate database servers), Cortex bundles everything needed to run:

- **Neo4j Server**: Graph database runs as managed subprocess, bundled with app
- **Ollama**: Auto-detects existing installation or guides user through setup on first launch
- **Application Data**: Databases and caches in App Support directory; models in standard Ollama location

**Why it matters:**
- Minimal configuration: Ollama detected or installed automatically
- No Docker or cloud services to manage
- Single application to start/stop
- Clean process separation (services can restart independently)
- Standard tooling (Neo4j Browser, ollama CLI) works for debugging
- Models shared across all apps using Ollama
- Complete control over data location

**Example:**
User downloads and launches Cortex. App detects no Ollama installation and guides user through automated setup. Neo4j starts as subprocess automatically. User configures where to store their data. Everything works without manual service management.

---

## 3. ELT Architecture with Graph-Layer Transformation

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

## 4. Flexible Storage with Unified Graph

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

## 5. Source-Appropriate Data Flow

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

## 6. Adaptive Intelligence

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

## 7. Tool/Plugin Architecture & Extensibility

**What it is:**
From the start, Cortex is designed to support extensible tools and plugins. Built-in functionality uses the exact same patterns that user-contributed plugins will use, ensuring the architecture genuinely supports extensibility rather than bolting it on later.

**Core Patterns:**
- **Directory-per-tool organization**: Each tool isolated in its own directory
- **ToolRegistry pattern**: Centralized management of all tools (built-in and user-added)
- **Auto-registration**: Built-in tools automatically register on initialization
- **Manifest-ready structure**: Directories organized for future plugin manifest files
- **Plugin equality**: Built-in tools work exactly like user plugins would

**Why it matters:**
- Proves extensibility works from day one
- Avoids technical debt from "we'll add plugins later"
- Built-in tools serve as reference implementations
- Users can extend functionality without core code changes
- Community can contribute tools following established patterns

**Example Structure:**
```
src/main/services/llm/tools/
├── registry.ts              # ToolRegistry class
├── builtin/                 # Built-in tools
│   ├── echo/
│   │   └── echo.tool.ts
│   ├── neo4j/
│   │   └── count-nodes.tool.ts
│   └── index.ts             # Auto-registration
└── user/                    # Future: User-installed plugins
    └── [plugin-directories]
```

---

## 8. Progressive Enhancement

**What it is:**
Build foundational capabilities first, then add complexity incrementally. Each implementation delivers immediate value. The system learns and improves both its data model and tooling continuously through AI assistance and user feedback.

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

## 9. Structured Configuration for Early Development

**What it is:**
During initial development, configuration values are structured as TypeScript constants rather than loaded from files. Services are designed to accept configuration objects, preparing for a future full configuration system without adding that complexity prematurely.

**Implementation Pattern:**
```typescript
// src/main/config/defaults.ts
export const DEFAULT_OLLAMA_CONFIG = {
  host: 'localhost',
  port: 11434,
  model: 'llama3.2'
}

// Services accept config objects
class LLMService {
  constructor(private config: OllamaConfig) {}
  // Implementation uses config.host, config.port, etc.
}
```

**Why it matters:**
- Avoids premature complexity of config file loading, validation, hot reload
- Services are designed for eventual configuration from day one
- Clear separation between defaults and service implementation
- Easy to transition to full config system when needed
- Development speed prioritized while maintaining good patterns

**When to transition:**
- Build full configuration system (file loading, UI, validation) as separate backlog item
- Until then, all configuration changes require code updates
- This trade-off is intentional and appropriate for foundational development

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
