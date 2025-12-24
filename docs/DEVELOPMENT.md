# Development Guide

## Quick Start

### Prerequisites

- Node.js 18+
- Neo4j 5.x running locally
- Ollama installed and running (for local LLM)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.template .env
   ```
   
   Edit `.env` and set:
   - `NEO4J_PASSWORD`: Your Neo4j password
   - `VAULT_PATH`: Path to your Obsidian vault
   - `LLM_ENDPOINT`: Ollama endpoint (default: http://localhost:11434)

3. **Start development servers:**
   ```bash
   npm run dev
   ```
   
   This starts:
   - GraphQL server at http://localhost:4000
   - React dev server at http://localhost:3000

4. **Initialize shadcn/ui components (optional):**
   ```bash
   npx shadcn-ui@latest add button
   ```
   
   Add components as needed for your UI.

### First Run

1. Ensure Neo4j is running: `neo4j start` (or via Docker)
2. Ensure Ollama is running: `ollama serve`
3. Run `npm run dev`
4. Open http://localhost:3000 in your browser

---

## Project Structure

```
cortex-app/
├── src/
│   ├── server/
│   │   ├── schema/        # GraphQL type definitions
│   │   ├── resolvers/     # GraphQL resolvers
│   │   ├── neo4j/         # Database connection, queries
│   │   ├── llm/           # LLM integration, prompt templates
│   │   ├── vault/         # File read/write operations
│   │   └── logging/       # Logging infrastructure
│   ├── client/
│   │   ├── components/    # React components
│   │   ├── pages/         # Top-level views/routes
│   │   ├── hooks/         # Custom React hooks
│   │   ├── graphql/       # GraphQL queries/mutations
│   │   └── styles/        # Global styles, theme
│   ├── shared/
│   │   ├── types/         # TypeScript types/interfaces
│   │   ├── utils/         # Shared utilities
│   │   └── constants/     # Shared constants
│   └── integrations/
│       └── [future external API connectors]
├── devlogs/               # Development decision logs
├── docs/                  # Project documentation
└── logs/                  # Runtime logs output (default location)
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `ChatInterface.tsx`)
- Utilities/helpers: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `PascalCase.ts` (e.g., `GraphTypes.ts`)
- Constants: `SCREAMING_SNAKE.ts` (e.g., `API_ENDPOINTS.ts`)
- GraphQL operations: `ComponentName.queries.ts` (e.g., `ChatInterface.queries.ts`)

**Directories:**
- Always `kebab-case/` (e.g., `chat-interface/`, `person-timeline/`)

**Component Organization:**
Components are colocated with their tests and GraphQL operations:
```
components/
  chat-interface/
    ChatInterface.tsx          # Main component
    ChatInterface.test.tsx     # Tests
    ChatInterface.queries.ts   # GraphQL queries (gql tagged templates)
    index.ts                   # Re-exports for cleaner imports
```

**Import pattern:**
```typescript
// Clean imports via index.ts re-exports
import { ChatInterface } from 'components/chat-interface';
```

---

## Configuration

### Environment Variables (.env)

Required configuration for secrets and paths:

```env
# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# Obsidian Vault
VAULT_PATH=/path/to/your/obsidian/vault

# LLM Configuration
LLM_PROVIDER=local  # or 'cloud'
LLM_API_KEY=your_api_key_if_using_cloud
LLM_ENDPOINT=http://localhost:11434  # for local LLM

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

### Application Config (TypeScript)

Optional configuration file with type-safe defaults. Create `config.ts` to override defaults:

```typescript
import { AppConfig } from './shared/types/Config';

export const config: Partial<AppConfig> = {
  logging: {
    outputPath: './custom-logs',  // Override default logs/ directory
    enableFileLogging: true,
    enableConsoleLogging: true,
  },
  llm: {
    temperature: 0.7,
    maxTokens: 2000,
  },
  // ... other configurable preferences
};
```

**Default behavior:** App runs with sensible defaults if no config file exists. Override only what you need.

---

## Development Workflow

### Starting the Application

**Single command starts both server and client:**
```bash
npm run dev
```

This launches:
- GraphQL API server with hot reload
- React development server with hot reload
- Both watch for file changes and reload automatically

### Graph Rebuild

When you modify transformation logic or add new entity types:

```bash
npm run rebuild-graph
```

**Note:** This is manual for now. Future versions will support triggering rebuilds from the configuration UI.

### Development Cycle

**Typical iteration flow:**
1. Make changes to code (components, resolvers, etc.)
2. Hot reload picks up changes automatically
3. Test in browser
4. If transformation logic changed → manually rebuild graph
5. Repeat

### Debugging

**Available tools:**
- GraphQL Playground for testing queries
- Neo4j Browser for inspecting graph directly
- Real-time log viewing in terminal
- Standard browser DevTools

**Note:** Debugging strategies will evolve organically as development progresses.

---

## Foundational Setup (Step 0)

Before building any specific use case, these components form the complete infrastructure needed to support the full value cycle: chat exploration → bespoke UI → data integration → automation preparation.

### Core Infrastructure

**Application Framework:**
- React + TypeScript project structure
- Apollo Server (GraphQL API layer)
- Apollo Client (GraphQL state management)
- Neo4j connection and configuration

**User Interface:**
- Basic chat UI component (input/output)
- shadcn/ui component library
- Tailwind CSS for styling
- Layout system for switching views

**AI Integration:**
- LLM integration point (local or cloud configurable)
- Prompt templates for Cypher generation
- Query result formatting

**Data Layer:**
- File read capability (read Obsidian vault files)
- Local file write-back (update Obsidian vault files with formatting preservation)
- GraphQL schema exposing Neo4j graph queries

**System Observability:**
- Comprehensive logging infrastructure
  - All AI queries and responses
  - File read/write operations
  - User actions and interactions
  - Query performance metrics
- Chat session persistence (JSONL format)

### Why These Components

This foundational setup enables the complete proof-of-concept cycle:

1. ✅ **Chat interface queries Neo4j via LLM-generated Cypher** - Chat UI + LLM + Apollo Client
2. ✅ **Bespoke UI components render graph data** - shadcn/ui + component patterns
3. ✅ **External data sources enrich files** - File write-back + integration patterns
4. ✅ **Automation opportunities identified** - Comprehensive logging + session persistence
5. ✅ **Foundation supports multiple use cases** - All core pieces in place

---

## Tech Stack Reference

### Core Dependencies (Locked In)

| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| TypeScript | Language | Code reuse across web/desktop/plugins |
| React | UI Framework | Component patterns + desktop compatibility |
| GraphQL | API Layer | Unified interface for AI + UI, graph-friendly |
| Neo4j | Graph Database | Mature ecosystem, Cypher, Bolt protocol, APOC |

### Recommended Tools (Swappable)

| Tool | Purpose | Alternative Options |
|------|---------|---------------------|
| Apollo Server/Client | GraphQL implementation | urql, Relay |
| Vitest | Testing framework | Jest, Playwright |
| shadcn/ui | Component library | Any React components |
| Tailwind CSS | Styling | CSS Modules, styled-components |

### Version Requirements

- **Node.js**: 18+ (for native fetch and modern features)
- **Neo4j**: 5.x (for latest Cypher and APOC)
- **TypeScript**: 5.x (for latest type system features)

---

## Development Principles

### Testing Strategy

**Principle**: Regression prevention over coverage targets.

**Approach**:
- Focus on integration tests validating real workflows
- When bugs occur, write test first, then fix
- Test user-facing behavior, not implementation details
- Build test suite organically based on actual problems encountered
- Don't over-optimize testing early - code evolves rapidly

**Tools**: Vitest for test execution, focus on integration over unit tests

### State Management

**Principle**: Keep state colocated, avoid prop drilling.

**Approach**:
- React Context for global app state
- Component-local state when possible
- Apollo Client for server state (GraphQL data)
- Add state management library only if complexity demands it

### Styling Approach

**Principle**: Component-based styling with utility classes.

**Approach**:
- Tailwind for rapid iteration
- shadcn/ui for consistent, accessible components
- Colocate styles with components
- Design tokens for theme consistency

---

## TODO: Remaining Development Documentation

### Adding New Use Cases
- [ ] Step-by-step guide following the use case pattern
- [ ] How to add new GraphQL queries
- [ ] Creating bespoke UI components
- [ ] Integrating external data sources
- [ ] Documenting automation opportunities

### Common Development Tasks
- [ ] Adding new entity types
- [ ] Modifying transformation logic
- [ ] Writing to Obsidian vault files
- [ ] Working with chat session logs
- [ ] Viewing and analyzing logged data

### Troubleshooting
- [ ] Common issues and solutions
- [ ] Neo4j connection problems
- [ ] GraphQL query debugging
- [ ] File write-back issues
- [ ] LLM integration problems

---

## Development Logs

When working on significant features or solving complex problems, create a development log to document decisions and solutions for future reference.

Use the template at `devlogs/devlog-template.md` to create new entries with format: `YYYYMMDD-descriptive-title.md`

Development logs help:
- Preserve context about technical decisions
- Document how challenges were overcome
- Provide reference for reconsidering decisions later
- Track AI agent effectiveness and efficiency
- Build institutional knowledge

---

*This document will be expanded as the project evolves. Sections marked TODO will be completed as we work through project setup and initial development.*
