---
date: 2025-01-12
developer: Jp Rowan
agent: Claude Desktop
model: claude-sonnet-4
tags: [architecture, electron, phase-0, tech-stack]
related_files: 
  - docs/ARCHITECTURE.md
  - docs/DEVELOPMENT.md
  - docs/AGENTS.md
  - docs/USE_CASE_WORKFLOW.md
  - docs/PHASE_0.md
related_issues: []
related_devlogs: []
session_duration: ~2 hours
iterations: multiple discussion rounds
outcome: complete architecture redesign with updated documentation
---

# Context

Project Cortex was initially planned as a web application with GraphQL/Apollo backend, separate frontend, and external Neo4j/Ollama services running in Docker. After discussing the end goal (native desktop app) and development workflow needs, we questioned whether building web-first made sense.

Key concern: "I don't feel confident building this as a web application first when the relationship of frontend web UI and backend detached from filesystem and Neo4j doesn't make sense."

# Problem

Several architectural tensions emerged:

1. **Web architecture doesn't match the vision**: Building API layers and network communication when the end goal is a single desktop app felt like unnecessary indirection
2. **Development workflow complexity**: Running multiple services (Docker, backend server, frontend dev server) for a single-user local app
3. **Deployment mismatch**: No need for web deployment, remote access, or stateless server architecture
4. **React overhead**: Using React seemed unnecessary when building with vanilla TS felt more natural
5. **External service management**: Docker + separate Neo4j/Ollama instances added friction

# Solution

## Core Decision: Electron Native App

Pivoted to Electron desktop application with embedded services architecture:

### Neo4j Integration
- **Approach**: Subprocess (not embedded library, not Docker)
- **Rationale**: 
  - Clean process separation (crashes don't take down whole app)
  - Standard bolt protocol connection
  - Can use Neo4j Browser/Desktop for debugging
  - Familiar neo4j-driver API
  - Bundled with app (~100-200MB)

### Ollama Integration  
- **Approach**: Detect and connect to local installation
- **Rationale**:
  - Models stored in system location (`~/.ollama/models`)
  - Shared across all apps using Ollama
  - No duplicate downloads between dev/prod environments
  - User installs once: `brew install ollama`
  - Models downloaded once: `ollama pull llama3.2`
  - App size stays reasonable (~500MB-1GB vs 5-8GB)

### UI Framework
- **Approach**: Vanilla JSX with Tailwind (no React)
- **Rationale**:
  - Familiar from Obsidian plugin development
  - Custom `createElement` function for JSX transformation
  - Direct DOM control, minimal abstraction
  - State lives in main process (not UI layer)
  - Lighter weight, faster

### Build Tooling
- **Approach**: electron-vite
- **Rationale**:
  - Fast HMR during development
  - TypeScript + JSX out of the box
  - Lighter than electron-forge
  - Good balance of features vs complexity

## Architecture Pattern

**Two-Process Model:**
```
Main Process (Node.js)
├── Neo4j subprocess management
├── Ollama connection
├── Filesystem operations
├── Application state (single source of truth)
└── IPC handlers (API for renderer)

Renderer Process (Chromium)
├── UI rendering (vanilla JSX + Tailwind)
├── User interactions
└── IPC calls to main process
```

**Key principle**: Renderer is view-only, main process owns all data and logic.

## Dev Workflow Impact

- **Neo4j**: Separate instances for dev vs packaged app is acceptable (ephemeral graph data)
- **Ollama**: Single installation, models shared between dev and packaged builds
- **Dev cycle**: 
  - `npm run dev` → instant HMR for UI changes
  - Main process changes → automatic restart
  - `npm run package` → creates standalone .app when ready

# Outcome

## Deliverables

1. **Complete documentation rewrite**:
   - `ARCHITECTURE.md`: Electron native app with subprocess model
   - `DEVELOPMENT.md`: Dev workflow, IPC patterns, JSX without React
   - `AGENTS.md`: AI collaboration patterns for Electron development
   - `USE_CASE_WORKFLOW.md`: Updated for main/renderer architecture
   - `PHASE_0.md`: NEW - Step-by-step implementation guide

2. **Clear Phase 0 path**:
   - Step 1: Initialize electron-vite project
   - Step 2: Add Neo4j subprocess
   - Step 3: Connect to local Ollama
   - Step 4: Build test UI
   - Step 5: Connect to vault

3. **Validated technical decisions**:
   - electron-vite for tooling ✓
   - Neo4j as subprocess ✓
   - Ollama local installation ✓
   - Vanilla JSX + Tailwind ✓
   - IPC for all data access ✓

## What Works Now

- Clear mental model of application architecture
- Documented path from zero to working stack
- Confidence in technical approach
- Alignment between vision and implementation plan

## What's Next

- Begin Phase 0 implementation
- Create electron-vite project
- Prove stack works end-to-end
- Build first real feature (Person details)

# Notes

## Key Insights

1. **Question the defaults**: Just because "web-first then package" is common doesn't mean it's right for every project. Desktop-first makes sense when that's the primary interface.

2. **Local installation > bundling (for some things)**: Ollama models are large and shared naturally. Detecting local installation is better than bundling for this use case.

3. **Subprocess > embedded**: Even though "true embedded" sounds appealing, the practical benefits of subprocess (debugging, isolation, familiar tooling) outweigh minor latency.

4. **JSX without React is valid**: The syntax sugar of JSX is valuable even without React's reactivity model. Custom `createElement` is ~20 lines of code.

5. **Separate dev/prod databases is OK**: Since graph is ephemeral (disposable, rebuildable), having separate instances for dev vs packaged app isn't a problem.

## Tradeoffs Made

**Chose:**
- Electron (bundle size, memory) over web (deployment complexity)
- Subprocess (slight latency) over embedded (complexity, debugging difficulty)  
- Local Ollama (prerequisite) over bundled (massive app size)
- Vanilla JSX (manual work) over React (framework weight)

**Did not choose:**
- Web application with separate backend
- Docker containers for services
- Fully embedded everything
- Traditional React SPA

## Future Considerations

1. **User onboarding**: How to handle users without Ollama installed?
   - Error message with install instructions?
   - Auto-install capability?
   - Guided setup flow on first launch?

2. **Model management**: Should app provide UI for downloading additional models?
   - `ollama pull` CLI is simple
   - But UI could be more user-friendly
   - Consider for Phase 1+

3. **Distribution**: 
   - Mac: .app bundle (~500MB-1GB)
   - Windows: .exe installer
   - Linux: AppImage
   - All require separate Ollama installation

4. **Neo4j version management**: 
   - Bundle specific Neo4j version
   - Update strategy for new releases
   - Migration path for database changes

## Gotchas to Remember

- **Ollama models location**: `~/.ollama/models` is system-wide, not app-specific
- **Neo4j data location**: Use app data directory, not bundled resources
- **IPC security**: Always validate inputs from renderer process
- **Process cleanup**: Ensure Neo4j subprocess stops on app quit
- **Dev vs prod**: Different database instances, same Ollama models

## Related Resources

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [electron-vite](https://electron-vite.org/)
- [Neo4j JavaScript Driver](https://neo4j.com/docs/javascript-manual/current/)
- [Ollama](https://ollama.ai/)
